// src/modules/youtube/helpers.js
const YoutubeService = require("./service");

async function ensureYoutubeService(interaction) {
  const client = interaction.client;
  let svc = client.getService?.("youtube");
  if (!svc) {
    svc = new YoutubeService(client);
    client.registerService?.("youtube", svc);
    svc.start();
  }
  return svc;
}

module.exports = { ensureYoutubeService };
