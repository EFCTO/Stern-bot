const { SlashCommandBuilder } = require("discord.js");
const { makeSetupEmbed } = require("../utils/embed");
const { createSetupComponents } = require("../modules/party/setup/hoi4");
const { ensurePartyService } = require("../modules/party/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hoi4_create")
    .setDescription("HOI4 파티 만들기"),

  async execute(interaction) {
    const partyService = await ensurePartyService(interaction);
    if (!partyService) return;

    partyService.createDraft({
      hostId: interaction.user.id,
      game: "HOI4",
      mode: "바닐라",
      members: [interaction.user.id]
    });

    await interaction.reply({
      embeds: [makeSetupEmbed("HOI4 파티만들기", "옵션을 선택하고 ‘생성’을 누르세요.")],
      components: createSetupComponents(),
      ephemeral: true
    });
  }
};
