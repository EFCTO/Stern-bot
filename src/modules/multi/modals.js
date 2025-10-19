const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const CUSTOM_IDS = {
  createModal: channelId => `officialMulti:create:${channelId}`,
  joinModal: messageId => `officialMulti:join_modal:${messageId}`,
  infoModal: messageId => `officialMulti:info_modal:${messageId}`
};

function createOfficialMultiCreateModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.createModal(channelId))
    .setTitle("공식 멀티 생성");

  const idInput = new TextInputBuilder()
    .setCustomId("multiId")
    .setLabel("멀티 ID")
    .setPlaceholder("세션 ID 또는 방 번호")
    .setRequired(true)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short);

  const pwInput = new TextInputBuilder()
    .setCustomId("password")
    .setLabel("접속 PW")
    .setPlaceholder("비밀번호가 없다면 '없음'이라고 적어주세요")
    .setRequired(true)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(idInput),
    new ActionRowBuilder().addComponents(pwInput)
  );

  return modal;
}

function createOfficialMultiJoinModal(messageId) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.joinModal(messageId))
    .setTitle("공식 멀티 참가 신청");

  const nicknameInput = new TextInputBuilder()
    .setCustomId("nickname")
    .setLabel("HOI4 닉네임")
    .setRequired(true)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short);

  const countryInput = new TextInputBuilder()
    .setCustomId("country")
    .setLabel("희망 국가")
    .setPlaceholder("이미 선택된 국가는 사용할 수 없습니다")
    .setRequired(true)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nicknameInput),
    new ActionRowBuilder().addComponents(countryInput)
  );

  return modal;
}

function createOfficialMultiInfoModal(messageId, multi) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.infoModal(messageId))
    .setTitle("공식 멀티 정보 수정");

  const idInput = new TextInputBuilder()
    .setCustomId("multiId")
    .setLabel("멀티 ID")
    .setRequired(true)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short);
  if (multi?.multiId) {
    idInput.setValue(String(multi.multiId));
  }

  const pwInput = new TextInputBuilder()
    .setCustomId("password")
    .setLabel("접속 PW")
    .setRequired(true)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short);
  if (multi?.password) {
    pwInput.setValue(String(multi.password));
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(idInput),
    new ActionRowBuilder().addComponents(pwInput)
  );

  return modal;
}

module.exports = {
  CUSTOM_IDS,
  createOfficialMultiCreateModal,
  createOfficialMultiJoinModal,
  createOfficialMultiInfoModal
};


