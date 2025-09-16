const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("alert")
    .setDescription("알림")
    .addStringOption(opt =>
      opt.setName("title")
        .setDescription("알림 제목")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("message")
        .setDescription("알림 내용")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const title = interaction.options.getString("title");
    const message = interaction.options.getString("message");

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setColor("Red")
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
