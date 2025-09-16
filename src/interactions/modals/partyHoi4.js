const { ensurePartyService } = require("../../modules/party/helpers");
const { CUSTOM_IDS } = require("../../modules/party/setup/hoi4");

module.exports = {
  id: CUSTOM_IDS.infoModal,
  async execute(interaction) {
    const partyService = await ensurePartyService(interaction);
    if (!partyService) return;

    const draft = partyService.getDraft(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: "파티 정보를 찾을 수 없습니다. 처음부터 다시 시도해주세요.", ephemeral: true });
    }

    const serverId = interaction.fields.getTextInputValue("serverId").trim();
    const password = interaction.fields.getTextInputValue("pw").trim();
    const version = interaction.fields.getTextInputValue("version").trim();
    const mods = interaction.fields.getTextInputValue("mods").trim();

    partyService.updateDraft(interaction.user.id, {
      hoi4ServerId: serverId.length ? serverId : null,
      hoi4Pw: password.length ? password : null,
      hoi4Version: version.length ? version : null,
      hoi4Mods: mods.length ? mods : null
    });

    await interaction.reply({ content: "정보가 업데이트되었습니다.", ephemeral: true });
  }
};
