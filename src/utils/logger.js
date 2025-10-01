const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "../../data");
fs.mkdirSync(dataDir, { recursive: true });

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const fileName = `log${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.txt`;
const logPath = path.join(dataDir, fileName);
const stream = fs.createWriteStream(logPath, { flags: "a" });

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "1413928068036296765";
let discordClient = null;
let pendingLines = [];
let flushing = false;
let resolvedChannel = null;

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

function formatArgs(args) {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function queueForDiscord(level, line) {
  if (!LOG_CHANNEL_ID) return;
  if (level !== "ERROR" && level !== "WARN") return;
  pendingLines.push(`[${level}] ${line}`);
  flushDiscordLogs();
}

async function resolveChannel() {
  if (!discordClient) return null;
  if (resolvedChannel?.isTextBased()) return resolvedChannel;
  try {
    const cached = discordClient.channels.cache.get(LOG_CHANNEL_ID);
    if (cached?.isTextBased()) {
      resolvedChannel = cached;
      return resolvedChannel;
    }
    const fetched = await discordClient.channels.fetch(LOG_CHANNEL_ID);
    if (fetched?.isTextBased()) {
      resolvedChannel = fetched;
      return resolvedChannel;
    }
  } catch (err) {
    originalConsole.error("[Logger] failed to resolve log channel", err);
  }
  return null;
}

async function flushDiscordLogs() {
  if (flushing) return;
  if (!discordClient || !discordClient.isReady?.()) return;
  if (!pendingLines.length) return;

  flushing = true;
  try {
    const channel = await resolveChannel();
    if (!channel) return;

    while (pendingLines.length) {
      let chunk = "";
      while (pendingLines.length) {
        const next = pendingLines[0];
        if ((chunk.length + next.length + 1) > 1800) break;
        chunk += (chunk ? "\n" : "") + pendingLines.shift();
      }
      if (!chunk) {
        chunk = pendingLines.shift();
      }
      if (chunk) {
        await channel.send({ content: `\u200b
\`\`\`${chunk}\`\`\`` });
      }
    }
  } catch (err) {
    originalConsole.error("[Logger] failed to send log to Discord", err);
  } finally {
    flushing = false;
  }
}

function write(level, args) {
  const timestamp = new Date().toISOString();
  const line = formatArgs(args);
  try {
    stream.write(`[${timestamp}] [${level}] ${line}\n`);
  } catch (err) {
    originalConsole.error("[Logger] failed to write file log", err);
  }
  queueForDiscord(level, line);
}

function patch(level, original) {
  return (...args) => {
    write(level, args);
    original(...args);
  };
}

console.log = patch("INFO", originalConsole.log);
console.info = patch("INFO", originalConsole.info);
console.warn = patch("WARN", originalConsole.warn);
console.error = patch("ERROR", originalConsole.error);
console.debug = patch("DEBUG", originalConsole.debug);

process.on("exit", () => {
  try {
    stream.end();
  } catch (err) {
    originalConsole.error("[Logger] failed to close stream", err);
  }
});

function attachClient(client) {
  discordClient = client;
  const readyHandler = () => {
    flushDiscordLogs();
  };
  if (client?.isReady?.()) {
    readyHandler();
  } else {
    client?.once?.("ready", readyHandler);
  }
}

module.exports = { logPath, attachClient };
