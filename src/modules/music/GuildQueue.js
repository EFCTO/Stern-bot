const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus
} = require("@discordjs/voice");

const { formatDuration } = require("./utils");

class GuildQueue {
  constructor(guild, service) {
    this.guild = guild;
    this.service = service;

    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.current = null;
      this.startedAt = null;
      this.#processQueue().catch(error => console.error("대기열 처리 실패", error));
    });

    this.audioPlayer.on("error", error => {
      console.error(`길드 ${guild.id} 오디오 플레이어 오류`, error);
      this.#processQueue().catch(err => console.error("대기열 처리 실패", err));
    });

    this.queue = [];
    this.connection = null;
    this.current = null;
    this.startedAt = null;
    this.queueLock = false;
    this.destroyed = false;
    this.volume = 0.5;
    this.textChannelId = null;
    this.leaveTimeout = null;
  }

  get tracks() {
    return this.queue.slice();
  }

  get channelId() {
    return this.connection?.joinConfig?.channelId ?? null;
  }

  get playbackDuration() {
    if (!this.startedAt || !this.current) return 0;
    return Date.now() - this.startedAt;
  }

  async connect(voiceChannel) {
    if (this.destroyed) {
      throw new Error("이 대기열은 이미 정리되었습니다.");
    }

    if (this.connection && this.channelId === voiceChannel.id) {
      return this.connection;
    }

    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.error("기존 음성 연결 제거 실패", error);
      }
    }

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    this.connection.on("stateChange", (oldState, newState) => {
      if (oldState.status !== VoiceConnectionStatus.Ready && newState.status === VoiceConnectionStatus.Ready) {
        console.log(`길드 ${this.guild.id} 음성 연결 준비 완료`);
      }
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Signalling || newState.status === VoiceConnectionStatus.Connecting) {
        try {
          await entersState(this.connection, VoiceConnectionStatus.Ready, 5_000);
        } catch {
          this.destroy();
        }
      } else {
        this.destroy();
      }
    });

    this.connection.subscribe(this.audioPlayer);
    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    this.#clearLeaveTimer();
    return this.connection;
  }

  enqueue(tracks) {
    const items = Array.isArray(tracks) ? tracks : [tracks];
    this.queue.push(...items);
    return this.queue.length;
  }

  async play() {
    if (this.queueLock) return;
    await this.#processQueue();
  }

  async skip() {
    if (!this.audioPlayer) return false;
    this.audioPlayer.stop(true);
    return true;
  }

  stop(destroy = false) {
    this.queue = [];
    this.audioPlayer.stop(true);
    if (destroy) {
      this.destroy();
    }
  }

  pause() {
    return this.audioPlayer.pause();
  }

  resume() {
    return this.audioPlayer.unpause();
  }

  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  remove(position) {
    if (position < 0 || position >= this.queue.length) {
      return null;
    }
    return this.queue.splice(position, 1)[0];
  }

  setTextChannel(channelId) {
    this.textChannelId = channelId;
  }

  isPlaying() {
    return this.audioPlayer.state.status === AudioPlayerStatus.Playing;
  }

  isPaused() {
    return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.queue = [];
    this.current = null;
    this.startedAt = null;
    this.audioPlayer.stop(true);
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (error) {
        console.error("음성 연결 파기 실패", error);
      }
      this.connection = null;
    }
    this.service.removeQueue(this.guild.id);
    this.#clearLeaveTimer();
  }

  startLeaveTimer() {
    this.#clearLeaveTimer();
    this.leaveTimeout = setTimeout(() => {
      this.destroy();
    }, 120_000);
  }

  #clearLeaveTimer() {
    if (this.leaveTimeout) {
      clearTimeout(this.leaveTimeout);
      this.leaveTimeout = null;
    }
  }

  async #processQueue() {
    if (this.queueLock || this.destroyed) return;

    if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
      return;
    }

    const nextTrack = this.queue.shift();
    if (!nextTrack) {
      this.current = null;
      this.startedAt = null;
      this.startLeaveTimer();
      return;
    }

    this.queueLock = true;
    try {
      const stream = await this.service.createStream(nextTrack);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(this.volume);
      }

      this.audioPlayer.play(resource);
      this.current = nextTrack;
      this.startedAt = Date.now();
      this.#clearLeaveTimer();
    } catch (error) {
      console.error("트랙 재생 실패", error);
      this.current = null;
      this.startedAt = null;
      this.queueLock = false;
      await this.#processQueue();
      return;
    } finally {
      this.queueLock = false;
    }
  }

  getProgressBar(length = 20) {
    if (!this.current || !this.startedAt || !Number.isFinite(this.current.durationMS) || this.current.durationMS <= 0) {
      return null;
    }

    const elapsed = Math.min(this.playbackDuration, this.current.durationMS);
    const ratio = elapsed / this.current.durationMS;
    const progressIndex = Math.min(length - 1, Math.round(ratio * length));

    const bar = Array.from({ length }, (_, idx) => (idx === progressIndex ? "🔘" : "▬")).join("");
    return `${bar}\n${formatDuration(elapsed)} / ${formatDuration(this.current.durationMS)}`;
  }
}

module.exports = GuildQueue;
