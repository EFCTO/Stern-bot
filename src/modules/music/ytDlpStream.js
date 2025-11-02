const { StreamType } = require("@discordjs/voice");
const { existsSync } = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { YOUTUBE_DL_PATH } = require("yt-dlp-exec/src/constants");
const ytdlp = require("yt-dlp-exec");

async function ensureBinaryAvailable() {
  const binaryPath = YOUTUBE_DL_PATH;
  if (!binaryPath || !existsSync(binaryPath)) {
    const hint = binaryPath || "(unknown)";
    const error = new Error("yt-dlp binary is not available at " + hint + ".");
    error.code = "YTDLP_BINARY_MISSING";
    throw error;
  }
  return binaryPath;
}

function resolveFfmpegBinary(providedPath) {
  const trimmed = (providedPath || "").trim();
  if (trimmed) {
    if (existsSync(trimmed)) {
      if (trimmed.toLowerCase().endsWith("ffmpeg") || trimmed.toLowerCase().endsWith("ffmpeg.exe")) {
        return trimmed;
      }
      const guess = path.join(
        trimmed,
        process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
      );
      if (existsSync(guess)) {
        return guess;
      }
    }
    return trimmed;
  }

  try {
    // Lazy require to avoid hard dependency if not installed.
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch (_) {
    // ignore resolution errors
  }

  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

async function createYtDlpAudioStream(url) {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new Error("A valid URL must be provided.");
  }

  await ensureBinaryAvailable();

  let child;
  const cookieHeader = (process.env.MUSIC_YT_COOKIE_HEADER || "").trim() ||
    (process.env.MUSIC_YT_COOKIE_HEADER_FILE && (require("fs").existsSync(process.env.MUSIC_YT_COOKIE_HEADER_FILE)
      ? require("fs").readFileSync(process.env.MUSIC_YT_COOKIE_HEADER_FILE, "utf8").trim()
      : "")) || "";
  const ytdlpCookiesFile = (process.env.MUSIC_YTDLP_COOKIES_FILE || "").trim();
  const ytdlpCookiesFromBrowser = (process.env.MUSIC_YTDLP_COOKIES_FROM_BROWSER || "").trim();
  const extractorArgsEnv = (process.env.MUSIC_YTDLP_EXTRACTOR_ARGS || "").trim();
  const extractorArgs = extractorArgsEnv || "youtube:player_client=web";
  const forceIPv4 = (process.env.MUSIC_YTDLP_FORCE_IPV4 || "").trim().toLowerCase() === "true";
  const ffmpegPath = (process.env.FFMPEG_PATH || "").trim();
  const defaultUA = process.env.MUSIC_YT_UA ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

  const tryBrowserCookies = Boolean(ytdlpCookiesFromBrowser);
  const phases = tryBrowserCookies ? [true, false] : [false];
  let spawnErr = null;

  for (const useBrowser of phases) {
    try {
      const ytdlpArgs = {
       o: "-",
       // ✅ WebM/Opus만 선택. 없으면 실패시켜서 아래 트랜스코드로 넘김
        f: "bestaudio[acodec*=opus][vcodec=none]/bestaudio[ext=webm][vcodec=none]",
        q: true,
        "no-warnings": true,
        "no-check-certificates": true,
        "no-playlist": true,
        print: "selected:%(format_id)s %(acodec)s %(vcodec)s %(ext)s"
      };

      const addHeaders = [];
      if (cookieHeader) {
        addHeaders.push(`Cookie: ${cookieHeader}`);
      }
      if (defaultUA) {
        addHeaders.push(`User-Agent: ${defaultUA}`);
      }
      if (addHeaders.length > 0) {
        ytdlpArgs["add-header"] = addHeaders;
      }
      if (ytdlpCookiesFile) {
        ytdlpArgs.cookies = ytdlpCookiesFile;
      }
      if (useBrowser && ytdlpCookiesFromBrowser) {
        ytdlpArgs["cookies-from-browser"] = ytdlpCookiesFromBrowser;
      }
      if (extractorArgs) {
        ytdlpArgs["extractor-args"] = extractorArgs;
      }
      if (forceIPv4) {
        ytdlpArgs["force-ipv4"] = true;
      }
      if (ffmpegPath) {
        // yt-dlp accepts directory or full path
        ytdlpArgs["ffmpeg-location"] = existsSync(ffmpegPath) ? (ffmpegPath.endsWith(".exe") || ffmpegPath.endsWith("ffmpeg")
          ? ffmpegPath
          : path.dirname(ffmpegPath)) : ffmpegPath;
      }

      child = ytdlp.exec(url, ytdlpArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      // Spawned successfully; stop loop
      spawnErr = null;
      break;
    } catch (error) {
      if (error?.code === "ENOENT") {
        const spawnError = new Error("Failed to spawn yt-dlp binary.");
        spawnError.code = "YTDLP_SPAWN_FAILED";
        spawnError.cause = error;
        throw spawnError;
      }
      spawnErr = error;
    }
  }

  if (!child) {
    throw spawnErr || new Error("Failed to spawn yt-dlp.");
  }

  const stderrBuffer = [];

  // prevent unhandled rejection warnings when spawn fails
  child.catch?.(() => {});

  child.stderr?.on("data", chunk => {
    const message = chunk.toString();
    if (message.trim().length > 0) {
      stderrBuffer.push(message.trim());
      console.warn("[yt-dlp]", message.trim());
    }
  });

  let awaitedError = null;
  await new Promise((resolve, reject) => {
    let settled = false;
    let hasReadable = false;

    function cleanup() {
      if (child.stdout) {
        child.stdout.removeListener("data", onFirstData);
        child.stdout.removeListener("error", onStdoutError);
      }
      child.removeListener("spawn", onSpawn);
      child.removeListener("error", onChildError);
      child.removeListener("close", onClose);
    }

    function finishSuccess() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }

    function finishError(error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }

    function onFirstData() {
      hasReadable = true;
      finishSuccess();
    }

    function onStdoutError(error) {
      finishError(error);
    }

    function onChildError(error) {
      finishError(error);
    }

    function onClose(code, signal) {
      if (settled) return;

      if (code === 0 && hasReadable) {
        finishSuccess();
        return;
      }

      const stderrText = stderrBuffer.join(" ").trim();
      const details = [
        "yt-dlp process exited before producing audio.",
        Number.isInteger(code) ? `Exit code: ${code}.` : null,
        signal ? `Signal: ${signal}.` : null,
        stderrText ? `Details: ${stderrText}` : null
      ]
        .filter(Boolean)
        .join(" ");

      const error = new Error(details || "yt-dlp process exited before producing audio.");
      error.code = code;
      error.signal = signal;
      if (stderrText) {
        error.stderr = stderrText;
        if (/requested format is not available/i.test(stderrText)) {
          error.isFormatUnavailable = true;
        }
        const httpMatch = /HTTP Error\s+(\d{3})/i.exec(stderrText);
        if (httpMatch) {
          const status = Number.parseInt(httpMatch[1], 10);
          if (!Number.isNaN(status)) {
            error.httpStatus = status;
          }
          error.isHttpError = true;
        }
        if (/Failed to decrypt with DPAPI/i.test(stderrText)) {
          error.code = error.code || "YTDLP_COOKIES_FROM_BROWSER_FAILED";
          error.dpapi = true;
        }
      }
      finishError(error);
    }

    function onSpawn() {
      if (!child.stdout) {
        finishError(new Error("yt-dlp did not provide a stdout stream."));
        return;
      }
      // Wait for the first actual data chunk to ensure the process
      // is producing audio, not just becoming readable.
      child.stdout.once("data", onFirstData);
      child.stdout.once("error", onStdoutError);
    }

    child.once("spawn", onSpawn);
    child.once("error", onChildError);
    child.once("close", onClose);
  }).catch(error => {
    awaitedError = error;
  });

  if (awaitedError) {
    if (awaitedError.isFormatUnavailable) {
      console.warn("[yt-dlp] Falling back to ffmpeg transcode for URL:", url);
      return createYtDlpOpusTranscodeStream(url);
    }
    throw awaitedError;
  }

  if (!child.stdout) {
    throw new Error("yt-dlp did not provide a stdout stream.");
  }

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

async function createYtDlpOpusTranscodeStream(url) {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new Error("A valid URL must be provided.");
  }

  await ensureBinaryAvailable();

  const cookieHeader = (process.env.MUSIC_YT_COOKIE_HEADER || "").trim() ||
    (process.env.MUSIC_YT_COOKIE_HEADER_FILE && (require("fs").existsSync(process.env.MUSIC_YT_COOKIE_HEADER_FILE)
      ? require("fs").readFileSync(process.env.MUSIC_YT_COOKIE_HEADER_FILE, "utf8").trim()
      : "")) || "";
  const ytdlpCookiesFile = (process.env.MUSIC_YTDLP_COOKIES_FILE || "").trim();
  const ytdlpCookiesFromBrowser = (process.env.MUSIC_YTDLP_COOKIES_FROM_BROWSER || "").trim();
  const extractorArgsEnv = (process.env.MUSIC_YTDLP_EXTRACTOR_ARGS || "").trim();
  const extractorArgs = extractorArgsEnv || "youtube:player_client=android";
  const forceIPv4 = (process.env.MUSIC_YTDLP_FORCE_IPV4 || "").trim().toLowerCase() === "true";
  const ffmpegPath = (process.env.FFMPEG_PATH || "").trim();
  const defaultUA = process.env.MUSIC_YT_UA ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

  const ffmpegBinary = resolveFfmpegBinary(ffmpegPath);

  const ytdlpArgs = {
    o: "-",
    f: "bestaudio/best",
    q: true,
    "no-warnings": true,
    "no-check-certificates": true,
    "no-playlist": true
  };

  const addHeaders = [];
  if (cookieHeader) addHeaders.push(`Cookie: ${cookieHeader}`);
  if (defaultUA) addHeaders.push(`User-Agent: ${defaultUA}`);
  if (addHeaders.length > 0) ytdlpArgs["add-header"] = addHeaders;
  if (ytdlpCookiesFile) ytdlpArgs.cookies = ytdlpCookiesFile;
  if (ytdlpCookiesFromBrowser) ytdlpArgs["cookies-from-browser"] = ytdlpCookiesFromBrowser;
  if (extractorArgs) ytdlpArgs["extractor-args"] = extractorArgs;
  if (forceIPv4) ytdlpArgs["force-ipv4"] = true;
  if (ffmpegPath) {
    ytdlpArgs["ffmpeg-location"] = existsSync(ffmpegPath)
      ? (ffmpegPath.endsWith(".exe") || ffmpegPath.endsWith("ffmpeg") ? ffmpegPath : path.dirname(ffmpegPath))
      : ffmpegPath;
  }

  let ytdlpChild;
  try {
    ytdlpChild = ytdlp.exec(url, ytdlpArgs, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      const spawnError = new Error("Failed to spawn yt-dlp binary.");
      spawnError.code = "YTDLP_SPAWN_FAILED";
      spawnError.cause = error;
      throw spawnError;
    }
    throw error;
  }

  if (!ytdlpChild.stdout) {
    ytdlpChild.kill?.("SIGKILL");
    throw new Error("yt-dlp did not provide a stdout stream.");
  }

  const ffmpegArgs = [
    "-loglevel", "error",
    "-i", "pipe:0",
    "-vn",
    "-f", "s16le",
    "-acodec", "pcm_s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1"
  ];

  const ffmpegChild = spawn(ffmpegBinary, ffmpegArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });

  const stderrBuffer = [];

  function appendStderr(prefix) {
    return chunk => {
      const message = chunk.toString();
      if (message.trim().length === 0) return;
      stderrBuffer.push(`${prefix} ${message.trim()}`);
      console.warn(prefix, message.trim());
    };
  }

  ytdlpChild.catch?.(() => {});
  ytdlpChild.stderr?.on("data", appendStderr("[yt-dlp]"));
  ffmpegChild.stderr?.on("data", appendStderr("[ffmpeg]"));

  ytdlpChild.stdout.pipe(ffmpegChild.stdin);
  ffmpegChild.stdin.on("error", error => {
    if (error?.code !== "EPIPE" && error?.code !== "ERR_STREAM_DESTROYED") {
      console.warn("[ffmpeg] stdin error:", error);
    }
  });

  function cleanup() {
    ytdlpChild.stdout?.unpipe(ffmpegChild.stdin);
    try {
      ffmpegChild.stdin?.destroy();
    } catch (_) {}
  }

  let awaitedError = null;
  await new Promise((resolve, reject) => {
    let settled = false;
    let hasReadable = false;

    const finishSuccess = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const finishError = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const onFirstData = () => {
      hasReadable = true;
      finishSuccess();
    };

    const onFfmpegError = error => {
      finishError(error);
    };

    const onYtdlpError = error => {
      finishError(error);
    };

    const onYtdlpClose = (code, signal) => {
      if (settled) return;
      if (code === 0 || code === null) {
        return;
      }
      const stderrText = stderrBuffer.join(" ").trim();
      const error = new Error(
        (stderrText && `yt-dlp transcode failed: ${stderrText}`) || "yt-dlp transcode failed."
      );
      error.code = code;
      error.signal = signal;
      const httpMatch = /HTTP Error\s+(\d{3})/i.exec(stderrText);
      if (httpMatch) {
        const status = Number.parseInt(httpMatch[1], 10);
        if (!Number.isNaN(status)) {
          error.httpStatus = status;
        }
        error.isHttpError = true;
      }
      finishError(error);
    };

    const onFfmpegClose = (code, signal) => {
      if (settled) return;
      if (code === 0 && hasReadable) {
        finishSuccess();
        return;
      }
      const stderrText = stderrBuffer.join(" ").trim();
      const error = new Error(
        (stderrText && `ffmpeg transcode failed: ${stderrText}`) || "ffmpeg transcode failed."
      );
      error.code = code;
      error.signal = signal;
      const httpMatch = /HTTP Error\s+(\d{3})/i.exec(stderrText);
      if (httpMatch) {
        const status = Number.parseInt(httpMatch[1], 10);
        if (!Number.isNaN(status)) {
          error.httpStatus = status;
        }
        error.isHttpError = true;
      }
      finishError(error);
    };

    if (!ffmpegChild.stdout) {
      finishError(new Error("ffmpeg did not provide a stdout stream."));
      return;
    }

    ffmpegChild.stdout.once("data", onFirstData);
    ffmpegChild.stdout.once("error", onFfmpegError);
    ffmpegChild.once("error", onFfmpegError);
    ffmpegChild.once("close", onFfmpegClose);

    ytdlpChild.once("error", onYtdlpError);
    ytdlpChild.once("close", onYtdlpClose);
  }).catch(error => {
    awaitedError = error;
  });

  if (awaitedError) {
    cleanup();
    try { ffmpegChild.kill("SIGKILL"); } catch (_) {}
    try { ytdlpChild.kill("SIGKILL"); } catch (_) {}
    throw awaitedError;
  }

  ffmpegChild.once("error", error => {
    ffmpegChild.stdout?.destroy(error);
  });

  ffmpegChild.stdout.once("close", () => {
    cleanup();
    if (!ffmpegChild.killed) {
      try { ffmpegChild.kill("SIGKILL"); } catch (_) {}
    }
    if (!ytdlpChild.killed) {
      try { ytdlpChild.kill("SIGKILL"); } catch (_) {}
    }
  });

  return {
    stream: ffmpegChild.stdout,
    // Transcode outputs raw signed 16-bit PCM at 48 kHz stereo.
    type: StreamType.Raw
  };
}

module.exports = {
  createYtDlpAudioStream,
  createYtDlpOpusTranscodeStream
};
