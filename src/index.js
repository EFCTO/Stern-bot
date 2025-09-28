// src/index.js
require("dotenv").config();

// ── FFmpeg 경로 자동 세팅 ─────────────────────────────────────────────
const ffmpegPath = require("ffmpeg-static");
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
  console.log(`[FFmpeg] Using binary: ${ffmpegPath}`);
}

const { GatewayIntentBits, Partials } = require("discord.js");
const { generateDependencyReport } = require("@discordjs/voice");
const BotClient = require("./core/BotClient");

const services = require("./services");

async function bootstrap() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("❌ DISCORD_TOKEN 이 .env 에 없습니다.");
    process.exit(1);
  }

  // ── 디스코드 클라이언트 ─────────────────────────────────────────────
  const client = new BotClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers, // 입/퇴장, 역할 토글 등에 필요 (개발자 포털에서 Privileged Intents 활성화!)
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.User,
      Partials.Message,
    ],
  });

  // ── 서비스 초기화 & 등록 ─────────────────────────────────────────────
  await services.initializeServices?.();

  // 필수 서비스
  if (services.partyService)  client.registerService("party",  services.partyService);
  if (services.musicService)  client.registerService("music",  services.musicService);
  if (services.chzzkService)  client.registerService("chzzk",  services.chzzkService);

  // 선택: youtubeService 가 export 되어 있으면 등록
  if (services.youtubeService) {
    client.registerService("youtube", services.youtubeService);
  }

  await client.initialize();

  // ── 종료 핸들러 등록 ─────────────────────────────────────────────────
  registerShutdownHandlers(client, services.shutdownServices);

  // ── 로그인 ──────────────────────────────────────────────────────────
  await client.login(token);
  console.log("✅ Logged in and ready.");

  // ── @discordjs/voice 의존성 보고서 (문제 디버깅에 도움) ─────────────
  try {
    const report = generateDependencyReport();
    console.log("[@discordjs/voice] Dependency report:\n" + report);
  } catch {
    // 구버전 호환 등으로 실패해도 무시
  }
}

function registerShutdownHandlers(client, shutdownServices) {
  const safeExit = async (label, code) => {
    console.log(`${label ?? "PROCESS_EXIT"} 감지, 종료 처리 중...`);
    try {
      await shutdownServices?.();
      await client.destroy();
      console.log("🧹 종료 완료");
    } catch (err) {
      console.error("종료 처리 중 오류:", err);
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
    // 치명적 예외면 안전 종료 시도
    safeExit("UNCAUGHT_EXCEPTION", 1);
  });
}

bootstrap().catch((err) => {
  console.error("봇 초기화 실패:", err);
  process.exit(1);
});
