require("dotenv").config();

const ffmpegPath = require("ffmpeg-static");
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
  console.log(`[FFmpeg] Using binary: ${ffmpegPath}`);
}

const { GatewayIntentBits, Partials } = require("discord.js");
const BotClient = require("./core/BotClient");
const {
  initializeServices,
  shutdownServices,
  partyService,
  musicService,
  chzzkService,
} = require("./services");

async function bootstrap() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("❌ DISCORD_TOKEN 이 .env 에 없습니다.");
    process.exit(1);
  }

  const client = new BotClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers, // 입/퇴장, 역할 토글 등에 필요
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.User,
      Partials.Message,
    ],
  });

  await initializeServices();
  client.registerService("party", partyService);
  client.registerService("music", musicService);
  client.registerService("chzzk", chzzkService);

  await client.initialize();
  registerShutdownHandlers(client);

  await client.login(token);
  console.log("✅ Logged in and ready.");
}

function registerShutdownHandlers(client) {
  const handle = async (signal, code) => {
    console.log(`${signal ?? "PROCESS_EXIT"} 감지, 종료 처리 중...`);
    try {
      await shutdownServices();
      await client.destroy();
      console.log("🧹 종료 완료");
    } catch (err) {
      console.error("종료 처리 중 오류:", err);
    } finally {
      process.exit(typeof code === "number" ? code : 0);
    }
  };

  process.once("SIGINT", () => handle("SIGINT"));
  process.once("SIGTERM", () => handle("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED_REJECTION:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT_EXCEPTION:", err);
    handle("UNCAUGHT_EXCEPTION", 1);
  });
}

bootstrap().catch((err) => {
  console.error("봇 초기화 실패:", err);
  process.exit(1);
});
