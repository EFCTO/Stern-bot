async function fetchUserSafe(client, guild, userId) {
  if (!client || !userId) return null;
  if (guild) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) return member.user;
  }
  return await client.users.fetch(userId).catch(() => null);
}

function getPartyService(client) {
  if (!client || typeof client.getService !== "function") {
    return null;
  }
  return client.getService("party") ?? null;
}

async function ensurePartyService(interaction) {
  const partyService = getPartyService(interaction?.client);
  if (partyService) {
    return partyService;
  }

  if (!interaction) {
    return null;
  }

  const payload = {
    content: "파티 서비스가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
    ephemeral: true
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }

  return null;
}

module.exports = {
  fetchUserSafe,
  getPartyService,
  ensurePartyService
};
