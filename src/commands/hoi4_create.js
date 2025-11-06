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

    const draft = partyService.createDraft({
      hostId: interaction.user.id,
      game: "HOI4",
      mode: "자유전",
      maxSlots: 8,
      members: [interaction.user.id]
    });

    await interaction.reply({
      embeds: [makeSetupEmbed("HOI4 파티만들기", "드롭다운에서 옵션을 선택하고 추가 정보가 있으면 버튼으로 입력하세요.")],
      components: createSetupComponents(draft),
      ephemeral: true
    });
  }
};

