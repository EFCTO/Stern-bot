const { getChannel } = require("./api");

class ChzzkService {
  constructor(repository, { pollInterval = 60_000 } = {}) {
    this.repository = repository;
    this.pollInterval = pollInterval;
    this.broadcaster = null;
    this.timer = null;
    this.client = null;
    this._checking = false;
  }

  async initialize() {
    await this.repository.load();
    this.broadcaster = this.repository.getBroadcaster();
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

  getBroadcaster() {
    return this.broadcaster ? { ...this.broadcaster } : null;
  }

  async registerBroadcaster({ channelId, channelName, notifyChannelId, profileImageUrl = null, isLive = false }) {
    this.broadcaster = {
      channelId,
      channelName,
      notifyChannelId,
      profileImageUrl,
      isLive: Boolean(isLive),
      lastAnnouncedAt: null
    };
    await this.repository.setBroadcaster(this.broadcaster);
    await this.#runCheck();
  }

  async clearBroadcaster() {
    this.broadcaster = null;
    await this.repository.setBroadcaster(null);
  }

  async #runCheck() {
    if (this._checking) return;
    this._checking = true;
    try {
      await this.#checkAndAnnounce();
    } catch (error) {
      console.error("치지직 상태 확인 실패", error);
    } finally {
      this._checking = false;
    }
  }

  async #checkAndAnnounce() {
    if (!this.broadcaster) return;

    const channelInfo = await getChannel(this.broadcaster.channelId).catch(error => {
      console.error("치지직 채널 조회 실패", error);
      return null;
    });

    if (!channelInfo) {
      return;
    }

    const isLive = Boolean(channelInfo.openLive);
    const wasLive = Boolean(this.broadcaster.isLive);

    if (isLive && !wasLive) {
      await this.#announceLive();
      this.broadcaster.lastAnnouncedAt = new Date().toISOString();
    }

    if (wasLive !== isLive) {
      this.broadcaster.isLive = isLive;
      await this.repository.setBroadcaster(this.broadcaster);
    }
  }

  async #announceLive() {
    if (!this.client) return;

    let channel = null;
    try {
      channel = await this.client.channels.fetch(this.broadcaster.notifyChannelId);
    } catch (error) {
      console.error("치지직 알림 채널 조회 실패", error);
      return;
    }

    if (!channel || typeof channel.send !== "function") {
      console.warn("치지직 알림 채널에 메시지를 보낼 수 없습니다.");
      return;
    }

    const message = `📺 ${this.broadcaster.channelName}님의 방송이 켜졌습니다!\nhttps://chzzk.naver.com/live/${this.broadcaster.channelId}`;
    await channel.send({ content: message }).catch(error => {
      console.error("치지직 방송 알림 전송 실패", error);
    });
  }
}

module.exports = ChzzkService;
