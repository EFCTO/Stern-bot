function getOfficialMultiService(client) {
  if (!client || typeof client.getService !== "function") {
    return null;
  }
  return client.getService("officialMulti") ?? null;
}

async function ensureOfficialMultiService(interaction) {
  const service = getOfficialMultiService(interaction?.client);
  if (service) {
    return service;
  }

  if (!interaction) {
    return null;
  }

  const payload = {
    content: "공식 멀티 기능이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
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
  getOfficialMultiService,
  ensureOfficialMultiService
};
