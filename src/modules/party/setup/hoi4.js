const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const CUSTOM_ID_PREFIX = "party:hoi4";

const CUSTOM_IDS = {
  infoButton: `${CUSTOM_ID_PREFIX}:info`,
  modeButton: `${CUSTOM_ID_PREFIX}:mode`,
  createButton: `${CUSTOM_ID_PREFIX}:create`,
  infoModal: `${CUSTOM_ID_PREFIX}:infoModal`
};

function createSetupComponents() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.infoButton).setLabel("정보 입력/수정").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.modeButton).setLabel("모드 선택").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.createButton).setLabel("생성").setStyle(ButtonStyle.Success)
  );
  return [row];
}

function createInfoModal(draft) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.infoModal)
    .setTitle("HOI4 정보 입력");

  const serverIdInput = new TextInputBuilder()
    .setCustomId("serverId")
    .setLabel("서버 ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  if (draft.hoi4ServerId) serverIdInput.setValue(String(draft.hoi4ServerId));

  const passwordInput = new TextInputBuilder()
    .setCustomId("pw")
    .setLabel("비밀번호")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  if (draft.hoi4Pw) passwordInput.setValue(String(draft.hoi4Pw));

  const versionInput = new TextInputBuilder()
    .setCustomId("version")
    .setLabel("버전")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  if (draft.hoi4Version) versionInput.setValue(String(draft.hoi4Version));

  const modsInput = new TextInputBuilder()
    .setCustomId("mods")
    .setLabel("모드")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder("모드 사용 시 입력");
  if (draft.hoi4Mods) modsInput.setValue(String(draft.hoi4Mods));

  modal.addComponents(
    new ActionRowBuilder().addComponents(serverIdInput),
    new ActionRowBuilder().addComponents(passwordInput),
    new ActionRowBuilder().addComponents(versionInput),
    new ActionRowBuilder().addComponents(modsInput)
  );

  return modal;
}

module.exports = {
  CUSTOM_IDS,
  createSetupComponents,
  createInfoModal
};
