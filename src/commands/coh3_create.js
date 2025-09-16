const { SlashCommandBuilder } = require("discord.js");
const { makeSetupEmbed } = require("../utils/embed");
const { createSetupComponents } = require("../modules/party/setup/coh3");
const { ensurePartyService } = require("../modules/party/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coh3_create")
    .setDescription("COH3 파티 만들기"),

  async execute(interaction) {
    const partyService = await ensurePartyService(interaction);
    if (!partyService) return;

    partyService.createDraft({
      hostId: interaction.user.id,
      game: "COH3",
      mode: "빠른대전",
      faction: "상관없음",
      maxSlots: 4,
      members: [interaction.user.id]
    });

    await interaction.reply({
      embeds: [makeSetupEmbed("COH3 파티만들기", "옵션을 선택하고 ‘생성’을 누르세요.")],
      components: createSetupComponents(),
      ephemeral: true
    });
  }
};
