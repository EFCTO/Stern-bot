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

class YoutubeService {
  constructor(client) {
    this.client = client;
    const saved = readJSONSafe(SAVE_PATH, null) ?? {};
    this.state = {
      channelId: null,
      channelTitle: null,
      notifyChannelId: null,
      lastVideoId: null,
      lastAnnouncedAt: null,
      ...saved,
    };
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

  getChannel() {
    const { channelId } = this.state;
    if (!channelId) return null;
    return { ...this.state };
  }

  async registerChannel({ channelId, notifyChannelId }) {
    const title = await getChannelTitle(channelId).catch(() => "YouTube Channel");
    this.state.channelId = channelId;
    this.state.channelTitle = title;
    this.state.notifyChannelId = notifyChannelId;

    const latest = await fetchLatestVideo(channelId).catch(() => null);
    if (latest?.videoId) {
      this.state.lastVideoId = latest.videoId;
    }
    writeJSONSafe(SAVE_PATH, this.state);
  }

  async clearChannel() {
    this.state = {
      channelId: null,
      channelTitle: null,
      notifyChannelId: null,
      lastVideoId: null,
      lastAnnouncedAt: null,
    };
    writeJSONSafe(SAVE_PATH, this.state);
  }

  async _tick() {
    const { channelId, notifyChannelId, lastVideoId } = this.state;
    if (!channelId || !notifyChannelId) return;

    const latest = await fetchLatestVideo(channelId).catch(err => {
      console.error("[YouTube] fetchLatestVideo failed", err);
      return null;
    });
    if (!latest?.videoId) return;

    if (!lastVideoId) {
      this.state.lastVideoId = latest.videoId;
      this.state.lastAnnouncedAt = new Date().toISOString();
      writeJSONSafe(SAVE_PATH, this.state);
      return;
    }

    if (latest.videoId === lastVideoId) return;

    const channel = await this.client.channels.fetch(notifyChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    await this.#announce(channel, latest);
  }

  async #announce(targetChannel, latest, options = {}) {
    const {
      thumbnailAttachment = null,
      files: extraFiles = [],
      content,
      allowedMentions,
      skipStateUpdate = false,
    } = options;

    const url = `https://youtu.be/${latest.videoId}`;
    const publishDate = latest.publishedAt ? new Date(latest.publishedAt) : new Date();

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(latest.title || "New Video")
      .setURL(url)
      .setAuthor({
        name: this.state.channelTitle || "YouTube",
        iconURL: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
      })
      .setDescription(`**${this.state.channelTitle || "Channel"}** just uploaded a new video!`)
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
        content: content ?? `[YouTube] <@&${ALERT_ROLE_ID}> **${this.state.channelTitle || "Channel"}** posted a new video!\n${url}`,
        embeds: [embed],
        allowedMentions: allowedMentions ?? { roles: [ALERT_ROLE_ID], users: [] },
        files: files.length ? files : undefined,
      })
      .catch(err => {
        console.error("[YouTube] notify failed", err);
      });

    if (!skipStateUpdate) {
      this.state.lastVideoId = latest.videoId;
      this.state.lastAnnouncedAt = new Date().toISOString();
      writeJSONSafe(SAVE_PATH, this.state);
    }
  }

  async sendDebugNotification(targetChannel, {
    attachment = null,
    title,
    videoId,
    publishedAt,
    mentionContent,
    allowedMentions,
  } = {}) {
    if (!targetChannel || typeof targetChannel.isTextBased !== "function" || !targetChannel.isTextBased()) {
      throw new Error("Debug notification channel must be text-based.");
    }

    const latest = {
      videoId: videoId || `debug-${Date.now()}`,
      title: title || "Debug Video",
      publishedAt: publishedAt || new Date().toISOString(),
    };

    await this.#announce(targetChannel, latest, {
      thumbnailAttachment: attachment,
      skipStateUpdate: true,
      content: mentionContent ?? `[YouTube] <@&${ALERT_ROLE_ID}> Debug notification preview\nhttps://youtu.be/${latest.videoId}`,
      allowedMentions: allowedMentions ?? { parse: [] },
    });
  }
}

YoutubeService.ALERT_ROLE_ID = ALERT_ROLE_ID;

module.exports = YoutubeService;
