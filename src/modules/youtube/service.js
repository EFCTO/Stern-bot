const fs = require("node:fs");
const path = require("node:path");
const { EmbedBuilder } = require("discord.js");
const { fetchLatestVideo, getChannelTitle } = require("./api");

const SAVE_PATH = path.join(__dirname, "../../../data/youtube.json");
const POLL_MS = 2 * 60 * 1000;
const ALERT_ROLE_ID = "1313043777929216020";

function readJSONSafe(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSONSafe(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function loadChannelsFromSaved(saved) {
  if (!saved || typeof saved !== "object") return [];
  if (Array.isArray(saved.channels)) {
    return saved.channels.map(c => ({ ...c }));
  }
  if (saved.channelId) {
    const { channelId, channelTitle = null, notifyChannelId = null, lastVideoId = null, lastAnnouncedAt = null } = saved;
    return [{ channelId, channelTitle, notifyChannelId, lastVideoId, lastAnnouncedAt }];
  }
  return [];
}

class YoutubeService {
  constructor(client) {
    this.client = client;
    const saved = readJSONSafe(SAVE_PATH, null) ?? {};
    this.channels = loadChannelsFromSaved(saved);
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this._tick().catch(err => console.error("[YouTube] poll error", err));
    }, POLL_MS).unref();
    this._tick().catch(err => console.error("[YouTube] poll error", err));
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getChannels() {
    return Array.isArray(this.channels) ? this.channels.map(c => ({ ...c })) : [];
  }

  async registerChannel({ channelId, notifyChannelId }) {
    const title = await getChannelTitle(channelId).catch(() => "YouTube Channel");
    const latest = await fetchLatestVideo(channelId).catch(() => null);

    const entry = {
      channelId,
      channelTitle: title,
      notifyChannelId,
      lastVideoId: latest?.videoId || null,
      lastAnnouncedAt: latest?.videoId ? new Date().toISOString() : null,
    };

    const idx = this.channels.findIndex(c => c.channelId === channelId);
    if (idx >= 0) {
      this.channels[idx] = { ...this.channels[idx], ...entry };
    } else {
      this.channels.push(entry);
    }
    writeJSONSafe(SAVE_PATH, { channels: this.channels });
  }

  async clearChannels() {
    this.channels = [];
    writeJSONSafe(SAVE_PATH, { channels: this.channels });
  }

  async removeChannel(channelIdOrTitle) {
    const before = this.channels.length;
    const key = String(channelIdOrTitle || "").toLowerCase();
    this.channels = this.channels.filter(
      c => !(c.channelId === channelIdOrTitle || String(c.channelTitle || "").toLowerCase() === key)
    );
    const changed = this.channels.length !== before;
    if (changed) writeJSONSafe(SAVE_PATH, { channels: this.channels });
    return changed;
  }

  async _tick() {
    if (!Array.isArray(this.channels) || this.channels.length === 0) return;

    for (let i = 0; i < this.channels.length; i++) {
      const entry = this.channels[i];
      if (!entry || !entry.channelId || !entry.notifyChannelId) continue;

      const latest = await fetchLatestVideo(entry.channelId).catch(err => {
        console.error("[YouTube] fetchLatestVideo failed", err);
        return null;
      });
      if (!latest?.videoId) continue;

      if (!entry.lastVideoId) {
        entry.lastVideoId = latest.videoId;
        entry.lastAnnouncedAt = new Date().toISOString();
        writeJSONSafe(SAVE_PATH, { channels: this.channels });
        continue;
      }

      if (latest.videoId === entry.lastVideoId) continue;

      const channel = await this.client.channels.fetch(entry.notifyChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;

      await this.#announce(channel, entry, latest);
    }
  }

  async #announce(targetChannel, entry, latest, options = {}) {
    const { thumbnailAttachment = null, files: extraFiles = [], content, allowedMentions, skipStateUpdate = false } = options;

    const url = `https://youtu.be/${latest.videoId}`;
    const publishDate = latest.publishedAt ? new Date(latest.publishedAt) : new Date();

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(latest.title || "New Video")
      .setURL(url)
      .setAuthor({
        name: entry.channelTitle || "YouTube",
        iconURL: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
      })
      .setDescription(`**${entry.channelTitle || "Channel"}** just uploaded a new video!`)
      .setThumbnail(`https://i.ytimg.com/vi/${latest.videoId}/hqdefault.jpg`)
      .setTimestamp(!Number.isNaN(publishDate.getTime()) ? publishDate : new Date());

    const files = Array.isArray(extraFiles) ? [...extraFiles] : [];
    if (thumbnailAttachment) {
      const filename = thumbnailAttachment.name ?? "thumbnail.png";
      embed.setThumbnail(`attachment://${filename}`);
      files.push(thumbnailAttachment);
    }

    await targetChannel
      .send({
        content: content ?? `[YouTube] <@&${ALERT_ROLE_ID}> **${entry.channelTitle || "Channel"}** 새 영상이 올라왔습니다!\n${url}`,
        embeds: [embed],
        allowedMentions: allowedMentions ?? { roles: [ALERT_ROLE_ID], users: [] },
        files: files.length ? files : undefined,
      })
      .catch(err => {
        console.error("[YouTube] notify failed", err);
      });

    if (!skipStateUpdate) {
      entry.lastVideoId = latest.videoId;
      entry.lastAnnouncedAt = new Date().toISOString();
      writeJSONSafe(SAVE_PATH, { channels: this.channels });
    }
  }

  async sendDebugNotification(
    targetChannel,
    { attachment = null, title, videoId, publishedAt, mentionContent, allowedMentions } = {}
  ) {
    if (!targetChannel || typeof targetChannel.isTextBased !== "function" || !targetChannel.isTextBased()) {
      throw new Error("Debug notification channel must be text-based.");
    }

    const latest = {
      videoId: videoId || `debug-${Date.now()}`,
      title: title || "Debug Video",
      publishedAt: publishedAt || new Date().toISOString(),
    };

    const entry = (Array.isArray(this.channels) && this.channels[0]) ? this.channels[0] : { channelTitle: "Channel" };

    await this.#announce(targetChannel, entry, latest, {
      thumbnailAttachment: attachment,
      skipStateUpdate: true,
      content: mentionContent ?? `[YouTube] <@&${ALERT_ROLE_ID}> Debug notification preview\nhttps://youtu.be/${latest.videoId}`,
      allowedMentions: allowedMentions ?? { parse: [] },
    });
  }
}

YoutubeService.ALERT_ROLE_ID = ALERT_ROLE_ID;

module.exports = YoutubeService;

