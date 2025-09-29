const { SlashCommandBuilder } = require("discord.js");
const { ensureTechRole } = require("../utils/permissions");

const MAX_TIMEOUT_MINUTES = 40320; // 28 days

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("유저를 타임아웃 처리합니다")
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName("target")
        .setDescription("타임아웃할 유저")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("minutes")
        .setDescription("타임아웃 시간 (분, 최대 40320분/28일)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_TIMEOUT_MINUTES)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("사유 (선택)")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) {
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({ content: "이 명령은 서버에서만 사용할 수 있어요.", ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser("target", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") || "No reason provided.";

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "해당 유저를 서버에서 찾을 수 없어요.", ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({ content: "봇 권한이 부족해서 타임아웃할 수 없어요.", ephemeral: true });
      return;
    }

    const durationMs = minutes * 60 * 1000;

    try {
      await member.timeout(durationMs, `${reason} (by ${interaction.user.tag})`);
      await interaction.reply({ content: `${targetUser.tag} 님을 ${minutes}분 동안 타임아웃했어요.`, ephemeral: true });
    } catch (error) {
      console.error("Timeout failed", error);
      await interaction.reply({ content: "타임아웃 처리 중 오류가 발생했어요.", ephemeral: true });
    }
  },
};
