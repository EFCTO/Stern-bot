const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

const CUSTOM_ID_PREFIX = "party:coh3";

const CUSTOM_IDS = {
  selectMode: `${CUSTOM_ID_PREFIX}:mode`,
  selectSlots: `${CUSTOM_ID_PREFIX}:slots`,
  selectFaction: `${CUSTOM_ID_PREFIX}:faction`,
  createButton: `${CUSTOM_ID_PREFIX}:create`
};

function createSetupComponents(draft = {}) {
  const currentMode = draft.mode || "빠른대전";
  const currentSlots = String(draft.maxSlots || 4);
  const currentFaction = draft.faction || "상관없음";

  const modeOptions = [
    { label: "커스텀 게임", value: "커스텀 게임" },
    { label: "AI대전", value: "AI대전" },
    { label: "빠른대전", value: "빠른대전" },
  ].map(o => ({ ...o, default: o.value === currentMode }));

  const slotOptions = ["2","3","4","5","6","7","8"].map(n => ({ label: `${n}명`, value: n, default: n === currentSlots }));

  const factionOptions = [
    { label: "상관없음", value: "상관없음" },
    { label: "연합군", value: "연합군" },
    { label: "추축군", value: "추축군" },
  ].map(o => ({ ...o, default: o.value === currentFaction }));

  const modeRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.selectMode)
      .setPlaceholder("게임 모드")
      .addOptions(modeOptions)
  );

  const slotsRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.selectSlots)
      .setPlaceholder("인원")
      .addOptions(slotOptions)
  );

  const factionRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.selectFaction)
      .setPlaceholder("진영")
      .addOptions(factionOptions)
  );

  const createRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.createButton).setLabel("생성").setStyle(ButtonStyle.Success)
  );

  return [modeRow, slotsRow, factionRow, createRow];
}

module.exports = {
  CUSTOM_IDS,
  createSetupComponents,
};

