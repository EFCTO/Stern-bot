const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { ensureTechRole } = require("../utils/permissions");

const DEFAULT_ALERT_CHANNEL_ID = "1223198323528437790";

async function resolveChannel(client, channelId) {
  if (!channelId || !client) return null;
  const cached = client.channels.cache.get(channelId);
  if (cached?.isTextBased()) return cached;
  try {
    const fetched = await client.channels.fetch(channelId);
    return fetched?.isTextBased() ? fetched : null;
  } catch (error) {
    console.error("[bot_alert] failed to fetch channel", error);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot_alert")
    .setDescription("지정된 공지 채널에 알림 메시지를 전송합니다")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("알림 제목")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("text")
        .setDescription("본문 내용")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("link")
        .setDescription("선택 링크 URL")
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) {
      return;
    }

    const alertChannelId = process.env.BOT_ALERT_CHANNEL_ID || DEFAULT_ALERT_CHANNEL_ID;
    const title = interaction.options.getString("title", true);
    const text = interaction.options.getString("text", true);
    const link = interaction.options.getString("link", false);

    await interaction.deferReply({ ephemeral: true });

    const channel = await resolveChannel(interaction.client, alertChannelId);
    if (!channel) {
      await interaction.editReply("알림 채널을 찾지 못했어요. 환경 변수를 확인해 주세요.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(title)
      .setDescription(text)
      .setTimestamp(new Date());

    const components = [];
    if (link) {
      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL(link)
            .setLabel("Link")
        )
      );
    }

    await channel.send({ embeds: [embed], components });

    await interaction.editReply({
      content: `알림을 <#${channel.id}> 채널에 전송했어요.`,
    });
  },
};
