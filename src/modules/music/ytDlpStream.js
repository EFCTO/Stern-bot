const { StreamType } = require("@discordjs/voice");
const { existsSync } = require("fs");
const { YOUTUBE_DL_PATH } = require("yt-dlp-exec/src/constants");
const ytdlp = require("yt-dlp-exec");

async function ensureBinaryAvailable() {
  const binaryPath = YOUTUBE_DL_PATH;
  if (!binaryPath || !existsSync(binaryPath)) {
    const error = new Error(`yt-dlp binary is not available at ${binaryPath || "(unknown)"}.`);
    error.code = "YTDLP_BINARY_MISSING";
    throw error;
  }
  return binaryPath;
}

async function createYtDlpAudioStream(url) {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new Error("유효한 URL이 필요합니다.");
  }

  await ensureBinaryAvailable();

  let child;
  try {
    child = ytdlp.exec(url, {
      o: "-",
      f: "bestaudio[acodec=opus]/bestaudio",
      q: true,
      n: true,
      "no-warnings": true,
      "no-call-home": true,
      "no-check-certificates": true
    }, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      const spawnError = new Error("Failed to spawn yt-dlp binary.");
      spawnError.code = "YTDLP_SPAWN_FAILED";
      spawnError.cause = error;
      throw spawnError;
    }
    throw error;
  }

  // prevent unhandled rejection warnings when spawn fails
  child.catch?.(() => {});

  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });

  if (!child.stdout) {
    throw new Error("yt-dlp stdout이 생성되지 않았습니다.");
  }

  child.stderr?.on("data", chunk => {
    const message = chunk.toString();
    if (message.trim().length > 0) {
      console.warn("[yt-dlp]", message.trim());
    }
  });

  child.once("error", error => {
    child.stdout?.destroy(error);
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
