const https = require("https");
const dns = require("dns");

const BASE_URL = "https://api.chzzk.naver.com/service/v1/";
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; HolsteinLandBot/1.0; +https://github.com/holstein-land)",
  "Accept": "application/json",
  "Referer": "https://chzzk.naver.com"
};

const LOOKUP_HINTS = (dns.ADDRCONFIG || 0) | (dns.V4MAPPED || 0);

function lookup(hostname, options, callback) {
  const merged = { ...options, family: 4, hints: LOOKUP_HINTS };
  return dns.lookup(hostname, merged, callback);
}

async function request(path, { params } = {}) {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const safeResolve = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const safeReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const req = https.request(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
      lookup
    }, res => {
      const chunks = [];
      res.on("error", safeReject);
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode < 200 || res.statusCode >= 300) {
          safeReject(new Error(`Chzzk API 요청 실패 (${res.statusCode})`));
          return;
        }

        let payload;
        try {
          payload = JSON.parse(body);
        } catch (error) {
          safeReject(new Error("Chzzk API 응답 파싱 실패"));
          return;
        }

        if (payload.code !== 200) {
          const message = payload.message || "알 수 없는 오류";
          safeReject(new Error(`Chzzk API 오류: ${message}`));
          return;
        }

        safeResolve(payload.content);
      });
    });

    req.on("error", safeReject);
    req.setTimeout(10_000, () => {
      safeReject(new Error("Chzzk API 요청이 시간 초과되었습니다."));
      req.destroy();
    });
    req.end();
  });
}

async function searchChannels(keyword, { size = 10 } = {}) {
  if (!keyword) return [];
  const content = await request("search/channels", {
    params: {
      keyword,
      size
    }
  });
  if (!content?.data) return [];
  return content.data
    .map(entry => entry?.channel)
    .filter(Boolean);
}

async function getChannel(channelId) {
  if (!channelId) return null;
  return await request(`channels/${channelId}`);
}

module.exports = {
  searchChannels,
  getChannel
};
