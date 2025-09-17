// src/commands/chzzk.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chzzk")
    .setDescription("치지직 방송 알림을 설정합니다.")
    .setDefaultMemberPermissions(PermissionFlagsBits.undefined)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName("register")
        .setDescription("치지직 방송 닉네임을 등록합니다.")
        .addStringOption(opt =>
          opt.setName("nickname").setDescription("치지직 방송 닉네임").setRequired(true),
        ),
    )
    .addSubcommand(sub => sub.setName("clear").setDescription("등록된 치지직 방송인을 제거합니다."))
    .addSubcommand(sub => sub.setName("status").setDescription("현재 등록된 치지직 방송 정보를 확인합니다.")),

  async execute(interaction) {
    // ✅ 지연 로드: 배포 시(require 시)에는 실행되지 않음
    const { ensureChzzkService } = require("../modules/chzzk/helpers");

    const service = await ensureChzzkService(interaction);
    if (!service) return;

    const sub = interaction.options.getSubcommand();
    if (sub === "register") return handleRegister(interaction, service);
    if (sub === "clear") return handleClear(interaction, service);
    if (sub === "status") return handleStatus(interaction, service);
  },
};

async function handleRegister(interaction, service) {
  // ✅ 지연 로드
  const { searchChannels, getChannel } = require("../modules/chzzk/api");

  const nickname = interaction.options.getString("nickname", true).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = interaction.channel;
    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
      await interaction.editReply("이 위치에서는 알림 채널을 설정할 수 없습니다. 텍스트 채널에서 다시 시도해주세요.");
      return;
    }

    const candidates = await searchChannels(nickname, { size: 10 });
    if (!Array.isArray(candidates) || candidates.length === 0) {
      await interaction.editReply(`\`${nickname}\` 닉네임으로 검색된 치지직 방송인이 없습니다.`);
      return;
    }

    const normalized = nickname.toLowerCase();
    const matched = candidates.find(e => String(e.channelName || "").toLowerCase() === normalized) || candidates[0];

    const channelInfo = await getChannel(matched.channelId);
    if (!channelInfo) {
      await interaction.editReply("치지직 채널 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    await service.registerBroadcaster({
      channelId: matched.channelId,
      channelName: matched.channelName,
      notifyChannelId: channel.id,
      profileImageUrl: matched.channelImageUrl,
      isLive: !!channelInfo.openLive,
    });

    const parts = [
      `치지직 방송인이 **${matched.channelName}**(채널 ID: \`${matched.channelId}\`)으로 등록되었습니다.`,
      `알림 채널: <#${channel.id}>`,
    ];
    if (channelInfo.openLive) parts.push("현재 방송이 진행 중입니다. 방송 종료 후 다시 켜지면 알림이 전송됩니다.");

    await interaction.editReply(parts.join("\n"));
  } catch (err) {
    console.error("치지직 방송인 등록 실패", err);
    await interaction.editReply("치지직 API 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}

async function handleClear(interaction, service) {
  await interaction.deferReply({ ephemeral: true });

  const broadcaster = service.getBroadcaster();
  if (!broadcaster) {
    await interaction.editReply("등록된 치지직 방송인이 없습니다.");
    return;
  }

  await service.clearBroadcaster();
  await interaction.editReply(`치지직 방송인 **${broadcaster.channelName}** 등록을 해제했습니다.`);
}

async function handleStatus(interaction, service) {
  const broadcaster = service.getBroadcaster();
  if (!broadcaster) {
    await interaction.reply({ content: "등록된 치지직 방송인이 없습니다.", ephemeral: true });
    return;
  }

  const lines = [
    `현재 등록된 방송인: **${broadcaster.channelName}**`,
    `채널 ID: \`${broadcaster.channelId}\``,
    `알림 채널: <#${broadcaster.notifyChannelId}>`,
    `최근 상태: ${broadcaster.isLive ? "방송 중" : "오프라인"}`,
  ];

  if (broadcaster.lastAnnouncedAt) {
    const t = new Date(broadcaster.lastAnnouncedAt);
    if (!Number.isNaN(t.getTime())) lines.push(`마지막 알림: <t:${Math.floor(t.getTime() / 1000)}:R>`);
  }

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}
