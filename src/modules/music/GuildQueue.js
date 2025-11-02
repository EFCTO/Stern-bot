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

// 간단 URL 체크
function isLikelyHttpUrl(s) {
  if (typeof s !== "string") return false;
  const t = s.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://");
}

// 로깅용 요약
function summarizeTrack(t) {
  if (!t || typeof t !== "object") return t;
  return {
    title: t.title,
    url: t.url,
    author: t.author,
    durationMS: t.durationMS,
    requestedBy: t.requestedBy?.id || t.requestedBy?.username || t.requestedBy
  };
}

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
      this.#processQueue().catch(error => console.error("재생 대기열 처리 실패", error));
    });

    this.audioPlayer.on("error", error => {
      console.error(`길드 ${guild.id} 오디오 플레이어 오류`, error);

      const message = error?.message || "";
      if (/Status code:\s*403/.test(message) && this.current) {
        const urlKey = typeof this.current.url === "string" ? this.current.url.trim() : "";
        const previousRetries = urlKey ? this.http403RetryCount.get(urlKey) ?? 0 : 0;

        if (urlKey) {
          this.http403RetryCount.set(urlKey, previousRetries + 1);
        }

        if (urlKey && previousRetries < 1) {
          console.warn(
            "403 응답 감지 – yt-dlp 오디오 스트림으로 재시도합니다.",
            summarizeTrack(this.current)
          );
          this.service.markTrack403(urlKey);
          this.queue.unshift({
            ...this.current,
            forceYtDlp: true,
            disableYtdl: true
          });
        } else {
          console.warn(
            "403 응답이 반복되어 트랙을 건너뜁니다.",
            summarizeTrack(this.current)
          );
          if (urlKey) {
            this.service.markTrack403(urlKey);
          }
        }
      }

      this.current = null;
      this.startedAt = null;
      this.#processQueue().catch(err => console.error("재생 큐 처리 실패", err));
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
    this.http403RetryCount = new Map();
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

    // 🔎 어떤 트랙이 들어왔는지 요약 로깅 (과도한 raw 출력 방지)
    console.log(`🎵 다음 트랙 선택 [${this.guild.id}]`, summarizeTrack(nextTrack));

    // ⛔ URL 없거나 이상하면 스킵 (여기가 핵심 가드)
    const url = typeof nextTrack.url === "string" ? nextTrack.url.trim() : "";
    if (!isLikelyHttpUrl(url)) {
      console.error("❌ 유효하지 않은 트랙 URL, 스킵:", url, "원본:", summarizeTrack(nextTrack));
      this.current = null;
      this.startedAt = null;
      // 다음 항목 처리
      await this.#processQueue();
      return;
    }

    this.queueLock = true;
    try {
      console.log("🎧 createStream 호출:", url);
      const stream = await this.service.createStream({ ...nextTrack, url });

      if (!stream || !stream.stream) {
        throw new Error("play-dl에서 유효한 스트림을 받지 못했습니다.");
      }

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

      console.log("✅ 재생 시작:", summarizeTrack(this.current));
    } catch (error) {
      // 에러 상세 로깅 (play-dl 특유의 input 필드 같이)
      console.error("트랙 재생 실패", {
        message: error?.message,
        input: error?.input,
        stack: error?.stack?.split("\n").slice(0, 5).join("\n")
      });
      this.current = null;
      this.startedAt = null;
      // 다음 트랙 계속 시도
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
