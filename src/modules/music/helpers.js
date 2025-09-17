function getMusicService(client) {
  return client.getService("music");
}

async function ensureMusicService(interaction) {
  const service = getMusicService(interaction.client);
  if (!service) {
    await interaction.reply({ content: "음악 서비스가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.", ephemeral: true });
    return null;
  }
  return service;
}

module.exports = {
  getMusicService,
  ensureMusicService
};
