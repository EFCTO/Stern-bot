const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const CUSTOM_ID_PREFIX = "party:hoi4";

const CUSTOM_IDS = {
  selectMode: `${CUSTOM_ID_PREFIX}:mode`,
  selectVersion: `${CUSTOM_ID_PREFIX}:version`,
  infoButton: `${CUSTOM_ID_PREFIX}:info`,
  createButton: `${CUSTOM_ID_PREFIX}:create`,
  infoModal: `${CUSTOM_ID_PREFIX}:infoModal`
};

function createSetupComponents(draft = {}) {
  const currentMode = draft.mode || "멀티";
  const currentVersion = draft.hoi4Version || "기본";

  const modeOptions = [
    { label: "멀티", value: "멀티" },
    { label: "코옵", value: "코옵" },
    { label: "기타", value: "기타" }
  ].map(o => ({ ...o, default: o.value === currentMode }));

  const versionOptions = [
    { label: "바닐라", value: "바닐라" },
    { label: "모드", value: "모드" },
    { label: "기타", value: "기타" }
  ].map(o => ({ ...o, default: o.value === currentVersion }));

  const modeRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(CUSTOM_IDS.selectMode).setPlaceholder("모드 선택").addOptions(modeOptions)
  );

  const versionRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(CUSTOM_IDS.selectVersion).setPlaceholder("버전").addOptions(versionOptions)
  );
  const actionsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.infoButton).setLabel("정보 입력/수정").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.createButton).setLabel("생성").setStyle(ButtonStyle.Success)
  );

  return [modeRow, versionRow, actionsRow];
}

function createInfoModal(draft) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.infoModal)
    .setTitle("정보 입력");

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

  const modversionInput = new TextInputBuilder()
    .setCustomId("version_mod")
    .setLabel("모드버전")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  if (draft.hoi4modVersion) modversionInput.setValue(String(draft.hoi4modVersion));

  const modsInput = new TextInputBuilder()
    .setCustomId("mods")
    .setLabel("모드")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder("모드를 줄바꿈으로 입력");
  if (draft.hoi4Mods) modsInput.setValue(String(draft.hoi4Mods));

  modal.addComponents(
    new ActionRowBuilder().addComponents(serverIdInput),
    new ActionRowBuilder().addComponents(passwordInput),
    new ActionRowBuilder().addComponents(versionInput),
    new ActionRowBuilder().addComponents(modversionInput),
    new ActionRowBuilder().addComponents(modsInput)
  );

  return modal;
}

module.exports = {
  CUSTOM_IDS,
  createSetupComponents,
  createInfoModal
};

