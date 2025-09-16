const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { sweepExpired } = require("./structures/partyStore");
const { endPartyAndEdit } = require("./structures/partyUtils");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// 명령어 로드
const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  setInterval(() => {
    sweepExpired(async party => {
      try {
        const channel = await client.channels.fetch(party.channelId);
        const msg = await channel.messages.fetch(party.messageId);
        await endPartyAndEdit({ client, channel }, party, "24시간 만료 자동 종료");
      } catch (e) {
        console.error("자동폭파 실패:", e.message);
      }
    });
  }, 10 * 60 * 1000);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: "명령 실행 중 오류 발생", ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
