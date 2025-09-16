const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function isPartyFull(party) {
  if (!party) return false;
  if (typeof party.isFull === "function") {
    return party.isFull();
  }
  if (party.maxSlots == null) {
    return false;
  }
  const memberCount = Array.isArray(party.members) ? party.members.length : 0;
  return memberCount >= party.maxSlots;
}

function createPartyControls(party) {
  const joinDisabled = isPartyFull(party);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("party:join")
      .setLabel("참가")
      .setStyle(ButtonStyle.Success)
      .setDisabled(joinDisabled),
    new ButtonBuilder()
      .setCustomId("party:leave")
      .setLabel("탈퇴")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

module.exports = {
  createPartyControls
};
