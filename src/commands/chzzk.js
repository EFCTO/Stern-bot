const { SlashCommandBuilder } = require("discord.js");
const { ensureChzzkService } = require("../modules/chzzk/helpers");
const { searchChannels, getChannel } = require("../modules/chzzk/api");
const { ensureTechRole } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chzzk")
    .setDescription("치지직 라이브 알림을 관리합니다")
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName("register")
        .setDescription("치지직 라이브 채널을 등록합니다")
        .addStringOption(opt =>
          opt
            .setName("nickname")
            .setDescription("치지직 라이브 닉네임")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("clear")
        .setDescription("현재 치지직 라이브 알림을 초기화 (모두 삭제)")
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("등록된 치지직 라이브 삭제")
        .addStringOption(opt =>
          opt
            .setName("channel_id")
            .setDescription("채널 ID 또는 닉네임")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("현재 등록된 치지직 라이브 상태를 확인합니다")
    ),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) return;

    const service = await ensureChzzkService(interaction);
    if (!service) return;

    const sub = interaction.options.getSubcommand();
    if (sub === "register") return handleRegister(interaction, service);
    if (sub === "clear") return handleClear(interaction, service);
    if (sub === "remove") return handleRemove(interaction, service);
    if (sub === "status") return handleStatus(interaction, service);
  },
};

async function handleRegister(interaction, service) {
  const nickname = interaction.options.getString("nickname", true).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = interaction.channel;
    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
      await interaction.editReply(
        "현재 텍스트 채널이 아니므로 알림 채널로 사용할 수 없습니다. 텍스트 채널에서 다시 시도해 주세요."
      );
      return;
    }

    const candidates = await searchChannels(nickname, { size: 10 });
    if (!Array.isArray(candidates) || candidates.length === 0) {
      await interaction.editReply(`\`${nickname}\` 닉네임으로 검색한 치지직 채널을 찾지 못했어요.`);
      return;
    }

    const normalized = nickname.toLowerCase();
    const matched =
      candidates.find(e => String(e.channelName || "").toLowerCase() === normalized) ?? candidates[0];
    const channelMeta = matched;

    const channelInfo = await getChannel(channelMeta.channelId);
    if (!channelInfo) {
      await interaction.editReply("치지직 채널 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    await service.registerBroadcaster({
      channelId: channelMeta.channelId,
      channelName: channelMeta.channelName,
      notifyChannelId: channel.id,
      profileImageUrl: channelMeta.channelImageUrl,
      isLive: !!channelInfo.openLive,
    });

    const parts = [
      `치지직 라이브 **${channelMeta.channelName}** (채널 ID: \`${channelMeta.channelId}\`)를 등록했어요.`,
      `알림 채널: <#${channel.id}>`,
    ];
    if (channelInfo.openLive) {
      parts.push("현재 라이브 중이에요. 중복 알림 방지를 위해 곧 자동으로 알림됩니다.");
    }

    await interaction.editReply(parts.join("\n"));
  } catch (err) {
    console.error("치지직 라이브 등록 중 오류", err);
    await interaction.editReply("치지직 API 요청 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
  }
}

async function handleClear(interaction, service) {
  await interaction.deferReply({ ephemeral: true });

  const list = service.getBroadcasters();
  if (!list || list.length === 0) {
    await interaction.editReply("등록된 치지직 채널이 없어요.");
    return;
  }

  await service.clearBroadcasters();
  await interaction.editReply(`치지직 라이브 ${list.length}개를 모두 삭제했어요.`);
}

async function handleRemove(interaction, service) {
  const channelId = interaction.options.getString("channel_id", true).trim();
  await interaction.deferReply({ ephemeral: true });

  const ok = await service.removeBroadcaster(channelId);
  if (ok) {
    await interaction.editReply(`채널 ID/닉네임 \`${channelId}\` 에 해당하는 항목을 삭제했어요.`);
  } else {
    await interaction.editReply(`채널 ID/닉네임 \`${channelId}\` 에 해당하는 항목을 찾을 수 없어요.`);
  }
}

async function handleStatus(interaction, service) {
  const list = service.getBroadcasters();
  if (!list || list.length === 0) {
    await interaction.reply({ content: "등록된 치지직 채널이 없어요.", ephemeral: true });
    return;
  }

  const lines = [`현재 등록된 목록 ${list.length}개`];
  for (const b of list) {
    const row = [
      `• **${b.channelName}** (ID: \`${b.channelId}\`) — ${b.isLive ? "라이브 중" : "오프라인"}`,
      `  알림 채널: <#${b.notifyChannelId}>`,
    ];
    if (b.lastAnnouncedAt) {
      const t = new Date(b.lastAnnouncedAt);
      if (!Number.isNaN(t.getTime())) {
        row.push(`  마지막 알림: <t:${Math.floor(t.getTime() / 1000)}:R>`);
      }
    }
    lines.push(row.join("\n"));
  }

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}

