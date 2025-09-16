const { ensurePartyService } = require("../../modules/party/helpers");
const { CUSTOM_IDS } = require("../../modules/party/setup/coh3");

module.exports = {
  id: CUSTOM_IDS.infoModal,
  async execute(interaction) {
    const partyService = await ensurePartyService(interaction);
    if (!partyService) return;

    const draft = partyService.getDraft(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: "파티 정보를 찾을 수 없습니다. 처음부터 다시 시도해주세요.", ephemeral: true });
    }

    const modeInput = interaction.fields.getTextInputValue("mode").trim();
    const slotsInput = interaction.fields.getTextInputValue("slots").trim();

    const changes = {};
    if (modeInput.length > 0) {
      changes.mode = modeInput;
    }
    if (slotsInput.length > 0) {
      const slots = parseInt(slotsInput, 10);
      if (!Number.isInteger(slots) || slots <= 0) {
        return interaction.reply({ content: "최대 인원은 1 이상의 숫자로 입력해주세요.", ephemeral: true });
      }
      changes.maxSlots = slots;
    }

    if (Object.keys(changes).length > 0) {
      partyService.updateDraft(interaction.user.id, changes);
      await interaction.reply({ content: "정보가 업데이트되었습니다.", ephemeral: true });
    } else {
      await interaction.reply({ content: "변경된 정보가 없습니다.", ephemeral: true });
    }
  }
};
