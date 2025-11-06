const { EmbedBuilder } = require("discord.js");
const { getChannel } = require("./api");

const ALERT_ROLE_ID = "1313043777929216020";

class ChzzkService {
  constructor(repository, { pollInterval = 60_000 } = {}) {
    this.repository = repository;
    this.pollInterval = pollInterval;
    this.broadcasters = [];
    this.timer = null;
    this.client = null;
    this._checking = false;
  }

  async initialize() {
    await this.repository.load();
    this.broadcasters = this.repository.getBroadcasters();
  }

  async start(client) {
    this.client = client;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    await this.#runCheck();
    this.timer = setInterval(() => {
      this.#runCheck();
    }, this.pollInterval);
  }

  async shutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.client = null;
  }

  getBroadcasters() {
    return Array.isArray(this.broadcasters) ? this.broadcasters.map(b => ({ ...b })) : [];
  }

  async registerBroadcaster({ channelId, channelName, notifyChannelId, profileImageUrl = null, isLive = false }) {
    const entry = {
      channelId,
      channelName,
      notifyChannelId,
      profileImageUrl,
      isLive: Boolean(isLive),
      lastAnnouncedAt: null,
    };
    const idx = this.broadcasters.findIndex(b => b.channelId === channelId);
    if (idx >= 0) {
      this.broadcasters[idx] = { ...this.broadcasters[idx], ...entry };
    } else {
      this.broadcasters.push(entry);
    }
    await this.repository.upsertBroadcaster(entry);
    await this.#runCheck();
  }

  async clearBroadcasters() {
    this.broadcasters = [];
    await this.repository.setBroadcasters([]);
  }

  async removeBroadcaster(channelIdOrName) {
    const before = this.broadcasters.length;
    const key = String(channelIdOrName || "").toLowerCase();
    this.broadcasters = this.broadcasters.filter(
      b => !(b.channelId === channelIdOrName || String(b.channelName || "").toLowerCase() === key)
    );
    const removed = this.broadcasters.length !== before;
    if (removed) await this.repository.removeBroadcaster(channelIdOrName);
    return removed;
  }

  async #runCheck() {
    if (this._checking) return;
    this._checking = true;
    try {
      await this.#checkAndAnnounce();
    } catch (error) {
      console.error("[Chzzk] status check failed", error);
    } finally {
      this._checking = false;
    }
  }

  async #checkAndAnnounce() {
    if (!Array.isArray(this.broadcasters) || this.broadcasters.length === 0) return;

    for (let i = 0; i < this.broadcasters.length; i++) {
      const b = this.broadcasters[i];
      if (!b || !b.channelId) continue;

      const channelInfo = await getChannel(b.channelId).catch(error => {
        console.error("[Chzzk] channel lookup failed", error);
        return null;
      });
      if (!channelInfo) continue;

      const isLive = Boolean(channelInfo.openLive);
      const wasLive = Boolean(b.isLive);

      if (isLive && !wasLive) {
        await this.#announceLive(channelInfo, { broadcaster: b });
        b.lastAnnouncedAt = new Date().toISOString();
      }

      if (wasLive !== isLive) {
        b.isLive = isLive;
        await this.repository.upsertBroadcaster(b);
      } else if (isLive && !wasLive) {
        await this.repository.upsertBroadcaster(b);
      }
    }
  }

  async #announceLive(channelInfo, options = {}) {
    if (!this.client) return;

    const { overrideChannel = null, broadcaster: broadcasterOverride = null, thumbnailAttachment = null, content, allowedMentions } = options;

    const broadcaster = broadcasterOverride ?? this.broadcasters[0] ?? null;
    if (!broadcaster) return;

    let channel = overrideChannel;
    if (!channel) {
      try {
        channel = await this.client.channels.fetch(broadcaster.notifyChannelId);
      } catch (error) {
        console.error("[Chzzk] notify channel fetch failed", error);
        return;
      }
    }

    if (!channel || typeof channel.send !== "function") {
      console.warn("[Chzzk] unable to send to notify channel");
      return;
    }

    const liveUrl = `https://chzzk.naver.com/live/${broadcaster.channelId}`;
    const liveInfo = channelInfo?.openLive ?? null;

    const embed = new EmbedBuilder()
      .setColor(0x03c75a)
      .setTitle(liveInfo?.liveTitle || `${broadcaster.channelName} 의 라이브 방송`)
      .setURL(liveUrl)
      .setDescription(`**${broadcaster.channelName}** 방송이 시작됐어요!`)
      .setTimestamp(liveInfo?.openDate ? new Date(liveInfo.openDate) : new Date());

    if (broadcaster.profileImageUrl) {
      embed.setThumbnail(broadcaster.profileImageUrl);
    }

    const files = [];
    if (thumbnailAttachment) {
      const filename = thumbnailAttachment.name ?? "thumbnail.png";
      embed.setImage(`attachment://${filename}`);
      files.push(thumbnailAttachment);
    } else if (liveInfo?.imageUrl) {
      embed.setImage(liveInfo.imageUrl);
    }

    const fields = [];
    if (liveInfo?.categoryName) {
      fields.push({ name: "Category", value: liveInfo.categoryName, inline: true });
    }
    if (typeof liveInfo?.viewCount === "number") {
      fields.push({ name: "Viewers", value: liveInfo.viewCount.toLocaleString(), inline: true });
    }

    if (fields.length > 0) {
      embed.addFields(fields);
    }

    if (typeof liveInfo?.openLiveId === "string") {
      embed.setFooter({ text: `Live ID ${liveInfo.openLiveId}` });
    }

    await channel
      .send({
        content: content ?? `[LIVE] <@&${ALERT_ROLE_ID}> **${broadcaster.channelName}** 라이브가 시작됐어요!\n${liveUrl}`,
        embeds: [embed],
        allowedMentions: allowedMentions ?? { roles: [ALERT_ROLE_ID], users: [] },
        files: files.length ? files : undefined,
      })
      .catch(error => {
        console.error("[Chzzk] live notification failed", error);
      });
  }

  async sendDebugNotification(targetChannel, { attachment = null, title, category, viewCount, mentionContent, allowedMentions } = {}) {
    if (!targetChannel || typeof targetChannel.isTextBased !== "function" || !targetChannel.isTextBased()) {
      throw new Error("Debug notification channel must be text-based.");
    }

    const now = new Date();
    const broadcaster = (Array.isArray(this.broadcasters) && this.broadcasters[0])
      ? this.broadcasters[0]
      : {
          channelId: "debug-channel",
          channelName: "Debug Broadcaster",
          notifyChannelId: targetChannel.id,
          profileImageUrl: null,
        };

    const channelInfo = {
      openLive: {
        liveTitle: title || "Debug Live Stream",
        openDate: now.toISOString(),
        imageUrl: null,
        categoryName: category || "Debug",
        viewCount: typeof viewCount === "number" ? viewCount : Math.floor(Math.random() * 5000),
        openLiveId: `debug-${now.getTime()}`,
      },
    };

    await this.#announceLive(channelInfo, {
      overrideChannel: targetChannel,
      broadcaster,
      thumbnailAttachment: attachment,
      content: mentionContent ?? `[LIVE] <@&${ALERT_ROLE_ID}> 디버그 라이브 알림입니다!\nhttps://chzzk.naver.com/live/${broadcaster.channelId}`,
      allowedMentions: allowedMentions ?? { parse: [] },
    });
  }
}

ChzzkService.ALERT_ROLE_ID = ALERT_ROLE_ID;

module.exports = ChzzkService;

