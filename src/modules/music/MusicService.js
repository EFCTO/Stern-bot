const { StreamType } = require("@discordjs/voice");
let ytdlDistube; // 吏??濡쒕뱶


const playdl = require("play-dl");
const GuildQueue = require("./GuildQueue");
const Track = require("./Track");
const { createYtDlpAudioStream } = require("./ytDlpStream");

const INVALID_URL_PLACEHOLDERS = new Set(["undefined", "null", "about:blank", "data:"]);

function normalizeHttpUrl(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const normalized = trimmed.toLowerCase();
  if (INVALID_URL_PLACEHOLDERS.has(normalized)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch (error) {
    return null;
  }
}

function isValidHttpUrl(value) {
  return normalizeHttpUrl(value) !== null;
}

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

const YOUTUBE_VIDEO_ID_REGEX = /^[\w-]{11}$/;
const INVALID_VIDEO_ID_PLACEHOLDERS = new Set([
  "undefined",
  "deleted video",
  "private video"
]);

const UNAVAILABLE_TITLE_KEYWORDS = [
  "deleted video",
  "private video",
  "video unavailable",
  "removed video"
];

function sanitizeCandidateString(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const normalized = trimmed.toLowerCase();
  if (INVALID_URL_PLACEHOLDERS.has(normalized)) {
    return null;
  }

  return trimmed;
}

function normalizeVideoId(candidate) {
  if (typeof candidate !== "string") return null;

  const trimmed = candidate.trim();
  if (trimmed.length === 0) return null;

  const normalized = trimmed.toLowerCase();
  if (INVALID_VIDEO_ID_PLACEHOLDERS.has(normalized)) {
    return null;
  }

  if (!YOUTUBE_VIDEO_ID_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function extractVideoIdFromUrl(url) {
  const normalizedUrl = normalizeHttpUrl(url);
  if (!normalizedUrl) {
    return { videoId: null, isYoutube: false };
  }

  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const isYoutube =
    hostname === "youtu.be" ||
    hostname.endsWith("youtube.com") ||
    hostname.endsWith("youtube-nocookie.com");

  if (!isYoutube) {
    return { videoId: null, isYoutube: false };
  }

  if (hostname === "youtu.be") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return { videoId: null, isYoutube: true };
    return { videoId: normalizeVideoId(segments[0]), isYoutube: true };
  }

  const directId = normalizeVideoId(parsed.searchParams.get("v"));
  if (directId) {
    return { videoId: directId, isYoutube: true };
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const [first, second] = segments;
    if (["embed", "shorts", "live", "v"].includes(first)) {
      return { videoId: normalizeVideoId(second), isYoutube: true };
    }
  }

  return { videoId: null, isYoutube: true };
}

function extractVideoId(video) {
  if (!video) return null;

  const candidates = [
    video.id,
    video.videoId,
    video.video_id,
    video.identifier,
    video.id?.videoId,
    video.id?.video_id,
    video.id?.id,
    video.videoDetails?.videoId,
    video.video_details?.videoId
  ];

  for (const candidate of candidates) {
    const normalized = normalizeVideoId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function resolveVideoUrl(video, fallbackUrl) {
  const candidates = [
    video?.url,
    video?.shortUrl,
    video?.short_url,
    video?.link,
    video?.permalink,
    video?.webpage_url,
    fallbackUrl
  ];

  for (const candidate of candidates) {
    const sanitizedCandidate = sanitizeCandidateString(candidate);
    if (!sanitizedCandidate) {
      continue;
    }

    const { videoId: candidateVideoId, isYoutube } = extractVideoIdFromUrl(sanitizedCandidate);
    if (candidateVideoId) {
      return `https://www.youtube.com/watch?v=${candidateVideoId}`;
    }

    if (!isYoutube) {
      const normalizedUrl = normalizeHttpUrl(sanitizedCandidate);
      if (normalizedUrl) {
        return normalizedUrl;
      }
    }
  }

  const videoId = extractVideoId(video);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  return null;
}

function isUnavailableVideo(video) {
  const titleCandidates = [
    video?.title,
    video?.name,
    video?.video_title,
    video?.videoTitle
  ];

  for (const candidate of titleCandidates) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) continue;
    if (UNAVAILABLE_TITLE_KEYWORDS.some(keyword => normalized.includes(keyword))) {
      return true;
    }
  }

  if (video?.isPrivate === true || video?.is_private === true) {
    return true;
  }

  if (video?.isLive === false && video?.status === "unavailable") {
    return true;
  }

  return false;
}

function createTrackFromVideo(video, requestedBy, { fallbackUrl = null, fallbackTitle = null } = {}) {
  if (isUnavailableVideo(video)) {
    return null;
  }

  const url = resolveVideoUrl(video, fallbackUrl);
  if (!url || !isValidHttpUrl(url)) {
    return null;
  }

  return new Track({
    title: video?.title ?? fallbackTitle ?? "?쒕ぉ ?놁쓬",
    url,
    durationMS: extractDuration(video),
    thumbnail: extractThumbnail(video),
    author: extractChannelName(video),
    requestedBy,
    raw: video
  });
}

class MusicService {
  constructor() {
    this.queues = new Map();
  }

  getQueue(guild) {
    const guildId = typeof guild === "string" ? guild : guild.id;
    if (!this.queues.has(guildId)) {
      if (typeof guild === "string") {
        throw new Error("湲몃뱶 媛앹껜媛 ?꾩슂?⑸땲??");
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
        console.error("?湲곗뿴 ?뺣━ ?ㅽ뙣", error);
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
      const track = createTrackFromVideo(details, requestedBy, {
        fallbackUrl: query,
        fallbackTitle: details?.title,
      });
      if (track) tracks.push(track);
      return tracks;
    }

    if (validation === "playlist") {
      const playlist = await playdl.playlist_info(query, { incomplete: true });
      const videos = await playlist.all_videos();
      for (const [index, video] of videos.entries()) {
        if (index >= 100) break;
        const track = createTrackFromVideo(video, requestedBy, {
          fallbackTitle: video?.title,
        });
        if (track) tracks.push(track);
      }
      return tracks;
    }

    const results = await playdl.search(query, {
      source: { youtube: "video" },
      limit: 1,
    });
    if (results.length === 0) return tracks;

    const video = results[0];
    const track = createTrackFromVideo(video, requestedBy, {
      fallbackTitle: video?.title,
    });
    if (track) tracks.push(track);

    return tracks;
  }

  async createStream(track) {
    const url = typeof track?.url === "string" ? track.url.trim() : "";
    if (!url || !isValidHttpUrl(url)) {
      throw new Error("유효한 트랙 URL이 아닙니다.");
    }

    const preferYtDlp = Boolean(track?.forceYtDlp);
    let lastError = null;

    const tryPlayDl = async () => {
      try {
        const kind = playdl.yt_validate(url);

        if (kind === "video") {
          try {
            const basic = await playdl.video_basic_info(url);
            if (basic?.video_details) {
              const s1 = await playdl.stream_from_info(basic, {
                discordPlayerCompatibility: true
              });
              if (s1?.stream) return s1;
            }
            throw new Error("stream_from_info 결과 없음");
          } catch (e1) {
            e1.input = url;
            console.warn("⚠️ play-dl basic_info 경로 실패:", e1?.message ?? e1);
          }

          try {
            const info = await playdl.video_info(url);
            const s2 = await playdl.stream_from_info(info, {
              discordPlayerCompatibility: true
            });
            if (s2?.stream) return s2;
            throw new Error("stream_from_info 결과 없음(2차)");
          } catch (e2) {
            e2.input = url;
            console.warn("⚠️ play-dl video_info 경로 실패:", e2?.message ?? e2);
          }
        }

        const s = await playdl.stream(url, { discordPlayerCompatibility: true });
        if (!s?.stream) throw new Error("stream(url) 결과 없음");
        return s;
      } catch (err) {
        err.input = url;
        throw err;
      }
    };

    const tryYtdl = async () => {
      try {
        if (!ytdlDistube) ytdlDistube = require("@distube/ytdl-core");

        const info = await ytdlDistube.getInfo(url);
        const opus = info.formats
          .filter(
            (f) =>
              f.hasAudio &&
              !f.hasVideo &&
              /opus/i.test(f.audioCodec || "") &&
              /webm/i.test(f.container || "")
          )
          .sort(
            (a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0)
          )[0];

        if (!opus) {
          throw new Error("WebM/Opus 포맷을 찾지 못했습니다. (FFmpeg 경로 확인 필요)");
        }

        const streamReadable = ytdlDistube.downloadFromInfo(info, {
          format: opus,
          highWaterMark: 1 << 25
        });

        return { stream: streamReadable, type: StreamType.WebmOpus };
      } catch (err) {
        err.input = url;
        throw err;
      }
    };

    const tryYtDlp = async () => {
      const result = await createYtDlpAudioStream(url);
      if (!result?.stream) {
        throw Object.assign(new Error("yt-dlp 스트림을 생성하지 못했습니다."), { input: url });
      }
      return { stream: result.stream, type: result.type };
    };

    if (!preferYtDlp) {
      try {
        return await tryPlayDl();
      } catch (err) {
        lastError = err;
      }

      try {
        return await tryYtdl();
      } catch (err) {
        lastError = err;
      }
    }

    try {
      return await tryYtDlp();
    } catch (err) {
      lastError = err;
    }

    if (lastError) {
      throw lastError;
    }
    const fallbackError = new Error("음원 스트림을 가져오지 못했습니다.");
    fallbackError.input = url;
    throw fallbackError;
  }

}

module.exports = MusicService;
