const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { makeSetupEmbed } = require("../utils/embed");
const Coh3SetupView = require("../structures/Coh3SetupView");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coh3_create")
    .setDescription("COH3 파티 만들기"),

  async execute(interaction) {
    const view = new Coh3SetupView(interaction.user);
    await interaction.reply({
      embeds: [makeSetupEmbed("COH3 파티만들기", "옵션을 선택하고 ‘생성’을 누르세요.")],
      components: [view],
      ephemeral: true
    });
  }
};
