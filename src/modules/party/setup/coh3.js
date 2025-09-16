const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const CUSTOM_ID_PREFIX = "party:coh3";

const CUSTOM_IDS = {
  infoButton: `${CUSTOM_ID_PREFIX}:info`,
  factionButton: `${CUSTOM_ID_PREFIX}:faction`,
  createButton: `${CUSTOM_ID_PREFIX}:create`,
  infoModal: `${CUSTOM_ID_PREFIX}:infoModal`
};

function createSetupComponents() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.infoButton).setLabel("정보 입력/수정").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.factionButton).setLabel("진영 선택").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.createButton).setLabel("생성").setStyle(ButtonStyle.Success)
  );
  return [row];
}

function createInfoModal(draft) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.infoModal)
    .setTitle("COH3 정보 입력");

  const modeInput = new TextInputBuilder()
    .setCustomId("mode")
    .setLabel("게임 모드")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  if (draft.mode) modeInput.setValue(String(draft.mode));

  const slotInput = new TextInputBuilder()
    .setCustomId("slots")
    .setLabel("최대 인원")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("숫자만 입력");
  if (draft.maxSlots) slotInput.setValue(String(draft.maxSlots));

  modal.addComponents(
    new ActionRowBuilder().addComponents(modeInput),
    new ActionRowBuilder().addComponents(slotInput)
  );

  return modal;
}

module.exports = {
  CUSTOM_IDS,
  createSetupComponents,
  createInfoModal
};
