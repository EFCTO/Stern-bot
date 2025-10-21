function getMusicService(client) {
  return client.getService("music");
}

async function ensureMusicService(interaction) {
  let service = getMusicService(interaction.client);

  if (!service) {
    try {
      const services = require("../../services");
      if (services?.musicService) {
        interaction.client.registerService?.("music", services.musicService);
        service = getMusicService(interaction.client);
      }
    } catch (_) {
      // ignore resolution failures and fall back to reply below
    }
  }

  if (!service) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: "음악 서비스가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.",
        ephemeral: true
      });
    }
    return null;
  }
  return service;
}

module.exports = {
  getMusicService,
  ensureMusicService
};
