const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("디버그용 핑 체크"),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle("Ping")
      .setDescription(`${Math.round(client.ws.ping)}ms`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
