const { makeOfficialMultiEmbed } = require("./embeds");
const { createOfficialMultiControls } = require("./components");

async function fetchHostUser(client, guild, hostId) {
  if (!hostId) {
    return null;
  }
  if (guild) {
    const member = await guild.members.fetch(hostId).catch(() => null);
    if (member) {
      return member.user;
    }
  }
  return await client.users.fetch(hostId).catch(() => null);
}

async function refreshOfficialMultiMessage(client, service, messageId) {
  if (!client || !service || !messageId) {
    return false;
  }

  const multi = service.getByMessageId(messageId);
  if (!multi) {
    return false;
  }

  const channel = await client.channels.fetch(multi.channelId).catch(() => null);
  if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
    return false;
  }

  const message = await channel.messages.fetch(multi.messageId).catch(() => null);
  if (!message) {
    return false;
  }

  const hostUser = await fetchHostUser(client, message.guild, multi.hostId);
  const embed = makeOfficialMultiEmbed(multi, hostUser);
  const components = multi.status === "ended" ? [] : createOfficialMultiControls(multi);

  await message.edit({ embeds: [embed], components }).catch(error => {
    console.error("공식 멀티 메시지 갱신 실패", error);
  });
  return true;
}

module.exports = {
  refreshOfficialMultiMessage
};
