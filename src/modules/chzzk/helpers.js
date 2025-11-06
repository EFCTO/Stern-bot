const ChzzkService = require("./ChzzkService");

function getChzzkService(client) {
  if (!client || typeof client.getService !== "function") {
    return null;
  }
  return client.getService("chzzk") ?? null;
}

async function ensureChzzkService(interaction) {
  const client = interaction?.client;
  let service = getChzzkService(client);
  if (service && typeof service.sendDebugNotification !== "function") {
    const repository = service.repository ?? null;
    if (repository) {
      const replacement = new ChzzkService(repository, { pollInterval: service.pollInterval });
      // Carry over any previously loaded broadcasters if present
      if (Array.isArray(service.broadcasters)) {
        replacement.broadcasters = service.broadcasters.map(b => ({ ...b }));
      } else if (service.broadcaster) {
        replacement.broadcasters = [ { ...service.broadcaster } ];
      }
      if (typeof service.shutdown === "function") {
        await service.shutdown().catch(() => {});
      }
      client?.registerService?.("chzzk", replacement);
      service = replacement;
      if (client) {
        await service.start(client).catch(() => {});
      }
    }
  }

  if (service) {
    return service;
  }

  if (!interaction) {
    return null;
  }

  const payload = {
    content: "치지직 연동 서비스가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
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
  getChzzkService,
  ensureChzzkService
};
