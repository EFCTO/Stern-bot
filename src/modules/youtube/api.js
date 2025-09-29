// src/modules/youtube/api.js
const https = require("node:https");

const DEFAULT_HEADERS = {
  "Accept-Encoding": "identity",
  "User-Agent": "HolsteinLandBot/1.0 (+discord)"
};

function mergeHeaders(extra) {
  return { ...DEFAULT_HEADERS, ...(extra || {}) };
}

// 간단한 GET(JSON)
function getJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: mergeHeaders(headers) }, res => {
      res.setEncoding("utf8");
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage || ""}`.trim()));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON 파싱 실패: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
  });
}

// 간단한 GET(텍스트)
function getText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: mergeHeaders(headers) }, res => {
      res.setEncoding("utf8");
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage || ""}`.trim()));
          return;
        }
        resolve(data);
      });
    });
    req.on("error", reject);
  });
}

const YT_API = process.env.YOUTUBE_API_KEY || null;

// 채널 입력을 channelId로 정규화
async function resolveYoutubeChannelId(input) {
  const s = String(input || "").trim();

  // 이미 채널 ID 형식 (UC로 시작, 24자 내외)
  if (/^UC[0-9A-Za-z_-]{20,}$/.test(s)) return s;

  // URL?
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      // /channel/UCxxxx
      if (u.pathname.startsWith("/channel/")) {
        const id = u.pathname.split("/")[2];
        if (/^UC[0-9A-Za-z_-]{20,}$/.test(id)) return id;
      }
      // /@handle → API 필요
      if (u.pathname.startsWith("/@")) {
        const handle = u.pathname.slice(1); // @xxx
        return await handleToChannelId(handle);
      }
    } catch (_) {}
  }

  // @핸들
  if (s.startsWith("@")) {
    return await handleToChannelId(s);
  }

  // 나머지는 실패
  return null;
}

async function handleToChannelId(handle) {
  const h = handle.startsWith("@") ? handle : `@${handle}`;
  if (!YT_API) return null;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(h)}&key=${YT_API}`;
  const json = await getJSON(url);
  const item = json.items?.[0];
  return item?.id || null;
}

// 채널 제목 얻기 (API 모드 우선, 없으면 RSS 제목 fallback)
async function getChannelTitle(channelId) {
  if (YT_API) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YT_API}`;
    const j = await getJSON(url);
    const snip = j.items?.[0]?.snippet;
    if (snip?.title) return snip.title;
  }
  // RSS 파싱으로 대체
  const rss = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const m = rss.match(/<title>([^<]+)<\/title>/); // 첫 title은 채널명
  return m ? m[1] : "YouTube 채널";
}

// 최신 영상 1개 가져오기 (videoId, title, published)
// 1) API 모드(uploads playlist) → 2) RSS 모드
async function fetchLatestVideo(channelId) {
  if (YT_API) {
    // 채널의 업로드 재생목록 ID 가져오기
    const ch = await getJSON(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_API}`);
    const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (uploads) {
      const p = await getJSON(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=1&playlistId=${uploads}&key=${YT_API}`);
      const it = p.items?.[0]?.snippet;
      if (it?.resourceId?.videoId) {
        return {
          videoId: it.resourceId.videoId,
          title: it.title,
          publishedAt: it.publishedAt
        };
      }
    }
  }

  // RSS fallback (try uploads playlist first, then channel feed)
  const feedCandidates = [];
  if (channelId.startsWith("UC") && channelId.length > 2) {
    const uploadsId = `UU${channelId.slice(2)}`;
    feedCandidates.push(`https://www.youtube.com/feeds/videos.xml?playlist_id=${uploadsId}`);
  }
  feedCandidates.push(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);

  for (const url of feedCandidates) {
    const xml = await getText(url).catch(() => null);
    if (!xml) continue;

    const entry = xml.match(/<entry>[\s\S]*?<\/entry>/);
    if (!entry) continue;

    const vid = entry[0].match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const title = entry[0].match(/<title>([^<]+)<\/title>/);
    const pub = entry[0].match(/<published>([^<]+)<\/published>/);

    if (!vid) continue;
    return {
      videoId: vid[1],
      title: title ? title[1] : "새 영상",
      publishedAt: pub ? pub[1] : null
    };
  }

  return null;
}

module.exports = {
  resolveYoutubeChannelId,
  getChannelTitle,
  fetchLatestVideo,
};
