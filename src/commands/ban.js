const { SlashCommandBuilder } = require("discord.js");
const { ensureTechRole } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("서버에서 유저를 밴합니다")
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName("target")
        .setDescription("차단할 유저")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("사유 (선택)")
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName("days")
        .setDescription("메시지 삭제 일수 (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
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
    const reason = interaction.options.getString("reason") || "No reason provided.";
    const deleteDays = interaction.options.getInteger("days") ?? 0;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.reply({ content: "봇 권한이 부족해서 해당 유저를 차단할 수 없어요.", ephemeral: true });
      return;
    }

    try {
      await interaction.guild.members.ban(targetUser.id, {
        reason: `${reason} (by ${interaction.user.tag})`,
        deleteMessageDays: deleteDays,
      });
      await interaction.reply({ content: `${targetUser.tag} 님을 차단했어요.`, ephemeral: true });
    } catch (error) {
      console.error("Ban failed", error);
      await interaction.reply({ content: "유저를 차단하는 중 오류가 발생했어요.", ephemeral: true });
    }
  },
};
