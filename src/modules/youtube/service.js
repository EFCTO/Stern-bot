// src/modules/youtube/service.js
const fs = require("node:fs");
const path = require("node:path");
const { EmbedBuilder } = require("discord.js");
const { fetchLatestVideo, getChannelTitle } = require("./api");

const SAVE_PATH = path.join(__dirname, "../../../data/youtube.json");
const POLL_MS = 2 * 60 * 1000;

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
    this.state = readJSONSafe(SAVE_PATH, {
      channelId: null,
      channelTitle: null,
      notifyChannelId: null,
      lastVideoId: null,
      lastAnnouncedAt: null,
    });
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this._tick().catch(err => console.error("[YouTube] poll error", err));
    }, POLL_MS).unref();
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
    const title = await getChannelTitle(channelId).catch(() => "YouTube 채널");
    this.state.channelId = channelId;
    this.state.channelTitle = title;
    this.state.notifyChannelId = notifyChannelId;
    // 등록 시점의 최신 영상을 기억 → “이미 올라간 것”은 알리지 않음
    const latest = await fetchLatestVideo(channelId).catch(() => null);
    if (latest?.videoId) this.state.lastVideoId = latest.videoId;
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

  // 주기 체크
  async _tick() {
    const { channelId, notifyChannelId, lastVideoId } = this.state;
    if (!channelId || !notifyChannelId) return;

    const latest = await fetchLatestVideo(channelId);
    if (!latest?.videoId) return;
    if (latest.videoId === lastVideoId) return;

    // 새 영상이다 → 알림
    const ch = await this.client.channels.fetch(notifyChannelId).catch(() => null);
    if (!ch || !ch.isTextBased()) return;

    const url = `https://youtu.be/${latest.videoId}`;
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(latest.title)
      .setURL(url)
      .setAuthor({ name: this.state.channelTitle || "YouTube" })
      .setDescription(`**${this.state.channelTitle}** 님의 새 영상이 업로드되었습니다!`)
      .setTimestamp(new Date(latest.publishedAt || Date.now()));

    await ch.send({
      content: `📺 **${this.state.channelTitle}** 님의 영상이 올라왔습니다!\n${url}`,
      embeds: [embed],  
      allowedMentions: { parse: [] }, // 원치 않는 멘션 방지
    }).catch(() => {});

    this.state.lastVideoId = latest.videoId;
    this.state.lastAnnouncedAt = new Date().toISOString();
    writeJSONSafe(SAVE_PATH, this.state);
  }
}

module.exports = YoutubeService;
