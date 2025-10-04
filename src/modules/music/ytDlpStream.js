const { StreamType } = require("@discordjs/voice");
const ytdlp = require("yt-dlp-exec");

async function createYtDlpAudioStream(url) {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new Error("유효한 URL이 필요합니다.");
  }

  const child = ytdlp.exec(url, {
    o: "-",
    f: "bestaudio[acodec=opus]/bestaudio",
    q: true,
    n: true,
    "no-warnings": true,
    "no-call-home": true,
    "no-check-certificates": true
  }, { stdio: ["ignore", "pipe", "pipe"] });

  if (!child.stdout) {
    throw new Error("yt-dlp stdout가 생성되지 않았습니다.");
  }

  child.stderr?.on("data", chunk => {
    const message = chunk.toString();
    if (message.trim().length > 0) {
      console.warn("[yt-dlp]", message.trim());
    }
  });

  child.once("error", error => {
    child.stdout.destroy(error);
  });

  child.stdout.once("close", () => {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  });

  return {
    stream: child.stdout,
    type: StreamType.WebmOpus
  };
}

module.exports = {
  createYtDlpAudioStream
};
