const playdl = require("play-dl");
const GuildQueue = require("./GuildQueue");
const Track = require("./Track");

function extractDuration(video) {
  if (!video) return 0;

  if (typeof video.durationInSec === "number") {
    return video.durationInSec * 1000;
  }

  if (typeof video.durationInMs === "number") {
    return video.durationInMs;
  }

  if (typeof video.lengthSeconds === "string") {
    const parsed = Number.parseInt(video.lengthSeconds, 10);
    if (!Number.isNaN(parsed)) {
      return parsed * 1000;
    }
  }

  if (typeof video.durationRaw === "string") {
    const segments = video.durationRaw.split(":").map(Number);
    if (segments.every(num => !Number.isNaN(num))) {
      return segments.reduce((acc, cur) => acc * 60 + cur, 0) * 1000;
    }
  }

  return 0;
}

function extractThumbnail(video) {
  const thumbnails = video.thumbnails || video.thumbnail?.thumbnails || video.thumbnail;
  if (Array.isArray(thumbnails) && thumbnails.length > 0) {
    const sorted = thumbnails.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    return sorted[0].url;
  }

  if (typeof video.thumbnail === "string") {
    return video.thumbnail;
  }

  if (video.bestThumbnail?.url) {
    return video.bestThumbnail.url;
  }

  return null;
}

function extractChannelName(video) {
  return (
    video.channel?.name ||
    video.channel?.title ||
    video.author?.name ||
    video.uploader?.name ||
    video.ownerChannelName ||
    null
  );
}

class MusicService {
  constructor() {
    this.queues = new Map();
  }

  getQueue(guild) {
    const guildId = typeof guild === "string" ? guild : guild.id;
    if (!this.queues.has(guildId)) {
      if (typeof guild === "string") {
        throw new Error("길드 객체가 필요합니다.");
      }
      const queue = new GuildQueue(guild, this);
      this.queues.set(guildId, queue);
    }
    return this.queues.get(guildId);
  }

  getExistingQueue(guild) {
    const guildId = typeof guild === "string" ? guild : guild.id;
    return this.queues.get(guildId) ?? null;
  }

  removeQueue(guildId) {
    this.queues.delete(guildId);
  }

  async shutdown() {
    for (const queue of this.queues.values()) {
      try {
        queue.destroy();
      } catch (error) {
        console.error("대기열 정리 실패", error);
      }
    }
    this.queues.clear();
  }

  async resolveTracks(query, requestedBy) {
    const tracks = [];

    const validation = playdl.yt_validate(query);
    if (validation === "video") {
      const info = await playdl.video_basic_info(query);
      const details = info.video_details;
      tracks.push(
        new Track({
          title: details.title,
          url: details.url,
          durationMS: extractDuration(details),
          thumbnail: extractThumbnail(details),
          author: extractChannelName(details),
          requestedBy
        })
      );
      return tracks;
    }

    if (validation === "playlist") {
      const playlist = await playdl.playlist_info(query, { incomplete: true });
      const videos = await playlist.all_videos();
      for (const [index, video] of videos.entries()) {
        if (index >= 100) break;
        tracks.push(
          new Track({
            title: video.title,
            url: video.url,
            durationMS: extractDuration(video),
            thumbnail: extractThumbnail(video),
            author: extractChannelName(video),
            requestedBy
          })
        );
      }
      return tracks;
    }

    const results = await playdl.search(query, { source: { youtube: "video" }, limit: 1 });
    if (results.length === 0) {
      return tracks;
    }

    const video = results[0];
    tracks.push(
      new Track({
        title: video.title,
        url: video.url,
        durationMS: extractDuration(video),
        thumbnail: extractThumbnail(video),
        author: extractChannelName(video),
        requestedBy
      })
    );

    return tracks;
  }

  async createStream(track) {
    return playdl.stream(track.url, { discordPlayerCompatibility: true });
  }
}

module.exports = MusicService;
