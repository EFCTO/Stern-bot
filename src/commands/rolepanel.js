const { SlashCommandBuilder } = require("discord.js");
const { buildRolePanelPayload } = require("../utils/rolePanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolepanel")
    .setDescription("역할 선택 패널을 채널에 게시합니다")
    .setDMPermission(false),

  async execute(interaction) {
    const { embed, components } = buildRolePanelPayload();
    await interaction.reply({ embeds: [embed], components });
  },
};
