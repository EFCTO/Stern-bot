const { SlashCommandBuilder } = require("discord.js");
const { ensureTechRole } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("서버에서 유저를 추방합니다")
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName("target")
        .setDescription("추방할 유저")
        .setRequired(true)
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

    const targetUser = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") || "No reason provided.";

    if (!interaction.guild) {
      await interaction.reply({ content: "이 명령은 서버에서만 사용할 수 있어요.", ephemeral: true });
      return;
    }

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({ content: "자기 자신을 추방할 수는 없어요.", ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "해당 유저를 서버에서 찾을 수 없어요.", ephemeral: true });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({ content: "봇 권한이 부족해서 유저를 추방할 수 없어요.", ephemeral: true });
      return;
    }

    try {
      await member.kick(`${reason} (by ${interaction.user.tag})`);
      await interaction.reply({ content: `${targetUser.tag} 님을 추방했어요.`, ephemeral: true });
    } catch (error) {
      console.error("Kick failed", error);
      await interaction.reply({ content: "유저를 추방하는 중 오류가 발생했어요.", ephemeral: true });
    }
  },
};
