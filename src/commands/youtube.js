const { SlashCommandBuilder } = require("discord.js");
const { ensureYoutubeService } = require("../modules/youtube/helpers");
const { resolveYoutubeChannelId } = require("../modules/youtube/api");
const { ensureTechRole } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("유튜브 채널 등록/알림 설정")
    .addSubcommand(sub =>
      sub.setName("register")
        .setDescription("유튜브 채널을 등록합니다")
        .addStringOption(opt =>
          opt.setName("channel")
            .setDescription("채널 ID, URL 또는 @핸들")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("clear")
        .setDescription("등록된 유튜브 채널을 제거합니다")
    )
    .addSubcommand(sub =>
      sub.setName("status")
        .setDescription("현재 등록된 유튜브 채널 정보를 확인합니다")
    ),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) {
      return;
    }

    const service = await ensureYoutubeService(interaction);
    if (!service) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "register") {
      await handleRegister(interaction, service);
      return;
    }

    if (subcommand === "clear") {
      await handleClear(interaction, service);
      return;
    }

    if (subcommand === "status") {
      await handleStatus(interaction, service);
    }
  }
};

async function handleRegister(interaction, service) {
  const channelInput = interaction.options.getString("channel", true).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const targetChannel = interaction.channel;
    if (!targetChannel || typeof targetChannel.isTextBased !== "function" || !targetChannel.isTextBased()) {
      await interaction.editReply("여기는 텍스트 채널이 아니라서 알림 채널로 지정할 수 없어요. 텍스트 채널에서 다시 시도해 주세요.");
      return;
    }

    const resolvedId = await resolveYoutubeChannelId(channelInput);
    if (!resolvedId) {
      await interaction.editReply("유효한 유튜브 채널을 찾을 수 없어요. 채널 ID, URL 또는 @핸들을 입력해 주세요.");
      return;
    }

    await service.registerChannel({
      channelId: resolvedId,
      notifyChannelId: targetChannel.id
    });

    const channel = service.getChannel();
    const lines = [
      `유튜브 채널 **${channel.channelTitle}**(ID: \`${channel.channelId}\`)을 등록했어요.`,
      `알림 채널: <#${targetChannel.id}>`
    ];

    if (channel.lastVideoId) {
      lines.push("기존 영상 이후 새 영상이 올라오면 알림을 보낼게요.");
    }

    await interaction.editReply(lines.join("\n"));
  } catch (error) {
    console.error("유튜브 채널 등록 실패", error);
    await interaction.editReply("유튜브 정보를 불러오는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleClear(interaction, service) {
  await interaction.deferReply({ ephemeral: true });

  const channel = service.getChannel();
  if (!channel) {
    await interaction.editReply("등록된 유튜브 채널이 없어요.");
    return;
  }

  await service.clearChannel();
  await interaction.editReply(`유튜브 채널 **${channel.channelTitle}** 등록을 해제했어요.`);
}

async function handleStatus(interaction, service) {
  const channel = service.getChannel();
  if (!channel) {
    await interaction.reply({
      content: "등록된 유튜브 채널이 없어요.",
      ephemeral: true
    });
    return;
  }

  const lines = [
    `현재 등록된 채널: **${channel.channelTitle}**`,
    `채널 ID: \`${channel.channelId}\``,
    `알림 채널: <#${channel.notifyChannelId}>`
  ];

  if (channel.lastVideoId) {
    lines.push(`최근 영상 ID: \`${channel.lastVideoId}\``);
  }

  if (channel.lastAnnouncedAt) {
    const lastDate = new Date(channel.lastAnnouncedAt);
    if (!Number.isNaN(lastDate.getTime())) {
      lines.push(`마지막 알림: <t:${Math.floor(lastDate.getTime() / 1000)}:R>`);
    }
  }

  await interaction.reply({
    content: lines.join("\n"),
    ephemeral: true
  });
}
