require("dotenv").config();

const { existsSync } = require("fs");

function resolveFfmpegBinary() {
  const candidates = [];
  const ffmpegStatic = require("ffmpeg-static");
  if (typeof ffmpegStatic === "string") {
    candidates.push(ffmpegStatic);
  }

  try {
    const { path: installerPath } = require("@ffmpeg-installer/ffmpeg");
    if (typeof installerPath === "string") {
      candidates.push(installerPath);
    }
  } catch {
    // optional dependency not installed; ignore
  }

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const ffmpegPath = resolveFfmpegBinary();
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
  console.log(`[FFmpeg] Using binary: ${ffmpegPath}`);
} else {
  console.warn("[FFmpeg] No bundled ffmpeg binary found. Falling back to system PATH lookup.");
}

const { GatewayIntentBits, Partials } = require("discord.js");
const { generateDependencyReport } = require("@discordjs/voice");
const BotClient = require("./core/BotClient");

const services = require("./services");

async function bootstrap() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("DISCORD_TOKEN이 .env에 설정되지 않았습니다.");
    process.exit(1);
  }

  const client = new BotClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.User,
      Partials.Message,
    ],
  });

  await services.initializeServices?.();

  if (services.partyService)  client.registerService("party",  services.partyService);
  if (services.musicService)  client.registerService("music",  services.musicService);
  if (services.chzzkService)  client.registerService("chzzk",  services.chzzkService);
  if (services.officialMultiService)  client.registerService("officialMulti",  services.officialMultiService);

  if (services.youtubeService) {
    client.registerService("youtube", services.youtubeService);
  }

  await client.initialize();

  registerShutdownHandlers(client, services.shutdownServices);

  await client.login(token);
  console.log("[Bot] 로그인 완료. 준비되었습니다.");

  try {
    const report = generateDependencyReport();
    console.log("[@discordjs/voice] Dependency report:\n" + report);
  } catch {}
}

function registerShutdownHandlers(client, shutdownServices) {
  const safeExit = async (label, code) => {
    console.log(`${label ?? "PROCESS_EXIT"} 감지, 종료 처리...`);
    try {
      await shutdownServices?.();

      const youtubeService = client.getService?.("youtube");
      youtubeService?.stop?.();

      await client.destroy();
      console.log("정상 종료 완료");
    } catch (err) {
      console.error("종료 처리 오류:", err);
    } finally {
      process.exit(typeof code === "number" ? code : 0);
    }
  };

  process.once("SIGINT",  () => safeExit("SIGINT"));
  process.once("SIGTERM", () => safeExit("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED_REJECTION:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT_EXCEPTION:", err);
    safeExit("UNCAUGHT_EXCEPTION", 1);
  });
}

bootstrap().catch((err) => {
  console.error("초기화 실패:", err);
  process.exit(1);
});

