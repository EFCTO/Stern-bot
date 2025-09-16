const { makeNoticeEmbed } = require("../../utils/embed");
const { makePartyEndEmbed } = require("./embeds");
const { fetchUserSafe } = require("./helpers");

async function closeParty(client, partyService, target, reason) {
  const party = typeof target === "string" ? partyService.getByMessageId(target) : target;
  if (!party) {
    throw new Error("파티를 찾지 못했습니다.");
  }

  let channel;
  try {
    channel = await client.channels.fetch(party.channelId);
  } catch (error) {
    await partyService.removeParty(party.messageId);
    throw new Error("파티 채널을 찾을 수 없습니다. 데이터는 정리되었습니다.");
  }

  let baseMessage;
  try {
    baseMessage = await channel.messages.fetch(party.messageId);
  } catch (error) {
    await partyService.removeParty(party.messageId);
    throw new Error("파티 메시지를 찾을 수 없습니다. 데이터는 정리되었습니다.");
  }

  const host = await fetchUserSafe(client, channel.guild, party.hostId);
  party.endedAt = new Date();

  const originalEmbed = baseMessage.embeds?.[0] ?? null;
  const endedEmbed = makePartyEndEmbed(originalEmbed, party, host);

  await baseMessage.edit({ embeds: [endedEmbed], components: [] });
  await baseMessage.reply({ embeds: [makeNoticeEmbed("파티 종료", `사유: ${reason}`, 0xed4245)] });

  await partyService.removeParty(party.messageId);
  return party;
}

module.exports = {
  closeParty
};
