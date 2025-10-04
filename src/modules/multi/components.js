const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function createOfficialMultiControls() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("officialMulti:join")
        .setLabel("참가")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("officialMulti:leave")
        .setLabel("탈퇴")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("officialMulti:info")
        .setLabel("정보 변경")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function createLeaveConfirmationComponents(messageId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`officialMulti:leave_confirm:${messageId}`)
        .setLabel("탈퇴")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`officialMulti:leave_cancel:${messageId}`)
        .setLabel("유지")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

module.exports = {
  createOfficialMultiControls,
  createLeaveConfirmationComponents
};
