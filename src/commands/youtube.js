const { SlashCommandBuilder } = require("discord.js");
const { ensureYoutubeService } = require("../modules/youtube/helpers");
const { resolveYoutubeChannelId } = require("../modules/youtube/api");
const { ensureTechRole } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("유튜브 채널 등록/알림 관리")
    .addSubcommand(sub =>
      sub
        .setName("register")
        .setDescription("유튜브 채널을 등록합니다")
        .addStringOption(opt =>
          opt
            .setName("channel")
            .setDescription("채널 ID, URL 또는 @핸들")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("clear")
        .setDescription("현재 유튜브 채널 알림을 초기화 (모두 삭제)")
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("등록된 유튜브 채널 삭제")
        .addStringOption(opt =>
          opt
            .setName("channel_id")
            .setDescription("채널 ID 또는 @handle/채널명")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("현재 등록된 유튜브 채널 상태를 확인합니다")
    ),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) return;

    const service = await ensureYoutubeService(interaction);
    if (!service) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "register") return handleRegister(interaction, service);
    if (subcommand === "clear") return handleClear(interaction, service);
    if (subcommand === "remove") return handleRemove(interaction, service);
    if (subcommand === "status") return handleStatus(interaction, service);
  }
};

async function handleRegister(interaction, service) {
  const channelInput = interaction.options.getString("channel", true).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const targetChannel = interaction.channel;
    if (!targetChannel || typeof targetChannel.isTextBased !== "function" || !targetChannel.isTextBased()) {
      await interaction.editReply(
        "현재 텍스트 채널이 아니므로 알림 채널로 사용할 수 없습니다. 텍스트 채널에서 다시 시도해 주세요."
      );
      return;
    }

    const resolvedId = await resolveYoutubeChannelId(channelInput);
    if (!resolvedId) {
      await interaction.editReply(
        "유효한 유튜브 채널을 찾을 수 없어요. 채널 ID, URL 또는 @핸들을 입력해 주세요."
      );
      return;
    }

    await service.registerChannel({ channelId: resolvedId, notifyChannelId: targetChannel.id });

    await interaction.editReply(
      `유튜브 채널(ID: \`${resolvedId}\`)을 등록했어요. 알림 채널: <#${targetChannel.id}>`
    );
  } catch (error) {
    console.error("유튜브 채널 등록 중 오류", error);
    await interaction.editReply("유튜브 채널 정보를 가져오는 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleClear(interaction, service) {
  await interaction.deferReply({ ephemeral: true });

  const list = service.getChannels?.() || [];
  if (!list || list.length === 0) {
    await interaction.editReply("등록된 유튜브 채널이 없어요.");
    return;
  }

  await service.clearChannels();
  await interaction.editReply(`유튜브 채널 ${list.length}개를 모두 삭제했어요.`);
}

async function handleRemove(interaction, service) {
  const idOr = interaction.options.getString("channel_id", true).trim();
  await interaction.deferReply({ ephemeral: true });
  const ok = await service.removeChannel(idOr);
  if (ok) {
    await interaction.editReply(`채널 ID/handle/채널명 \`${idOr}\` 에 해당하는 채널을 삭제했어요.`);
  } else {
    await interaction.editReply(`채널 ID/handle/채널명 \`${idOr}\` 에 해당하는 채널을 찾을 수 없어요.`);
  }
}

async function handleStatus(interaction, service) {
  const list = service.getChannels?.() || [];
  if (!list || list.length === 0) {
    await interaction.reply({ content: "등록된 유튜브 채널이 없어요.", ephemeral: true });
    return;
  }

  const lines = [`현재 등록된 유튜브 채널 ${list.length}개`];
  for (const c of list) {
    const row = [
      `• **${c.channelTitle || "Channel"}** (ID: \`${c.channelId}\`)`,
      `  알림 채널: <#${c.notifyChannelId}>`,
    ];
    if (c.lastAnnouncedAt) {
      const t = new Date(c.lastAnnouncedAt);
      if (!Number.isNaN(t.getTime())) {
        row.push(`  마지막 알림: <t:${Math.floor(t.getTime() / 1000)}:R>`);
      }
    }
    if (c.lastVideoId) {
      row.push(`  마지막 영상 ID: \`${c.lastVideoId}\``);
    }
    lines.push(row.join("\n"));
  }

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}

