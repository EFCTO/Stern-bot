const { SlashCommandBuilder } = require("discord.js");
const { makeSetupEmbed } = require("../utils/embed");
const Hoi4SetupView = require("../structures/Hoi4SetupView");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hoi4_create")
    .setDescription("HOI4 파티 만들기"),

  async execute(interaction) {
    const view = new Hoi4SetupView(interaction.user);
    await interaction.reply({
      embeds: [makeSetupEmbed("HOI4 파티만들기", "‘정보 입력/수정’으로 ID/PW/버전/모드 입력 후 ‘생성’")],
      components: [view],
      ephemeral: true
    });
  }
};
