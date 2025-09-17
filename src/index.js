require("dotenv").config();

const { GatewayIntentBits, Partials } = require("discord.js");
const BotClient = require("./core/BotClient");
const { initializeServices, shutdownServices, partyService, musicService } = require("./services");

async function bootstrap() {
  const client = new BotClient({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    partials: [Partials.Channel]
  });

  await initializeServices();
  client.registerService("party", partyService);
  client.registerService("music", musicService);
  await client.initialize();
  registerShutdownHandlers(client);
  await client.login(process.env.DISCORD_TOKEN);
}

function registerShutdownHandlers(client) {
  const signals = ["SIGINT", "SIGTERM"];

  const handle = async signal => {
    console.log(`${signal} 신호 감지, 봇을 종료합니다...`);
    try {
      await shutdownServices();
      await client.destroy();
    } catch (error) {
      console.error("종료 처리 중 오류", error);
      process.exit(1);
      return;
    }
    process.exit(0);
  };

  for (const signal of signals) {
    process.once(signal, () => {
      handle(signal).catch(error => {
        console.error("종료 처리 실패", error);
        process.exit(1);
      });
    });
  }
}

bootstrap().catch(err => {
  console.error("봇 초기화 실패:", err);
  process.exit(1);
});
