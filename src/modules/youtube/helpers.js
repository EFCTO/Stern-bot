// src/modules/youtube/helpers.js
const YoutubeService = require("./service");

function getYoutubeService(target) {
  const client = target?.client ?? target;
  if (!client || typeof client.getService !== "function") {
    return null;
  }
  return client.getService("youtube") ?? null;
}

async function ensureYoutubeService(target) {
  const client = target?.client ?? target;
  if (!client) {
    return null;
  }

  let svc = getYoutubeService(client);
  if (!svc || typeof svc.sendDebugNotification !== "function") {
    const previous = svc ?? null;
    svc = new YoutubeService(client);

    if (previous?.state && typeof previous.state === "object") {
      svc.state = { ...svc.state, ...previous.state };
    }

    if (typeof previous?.stop === "function") {
      previous.stop();
    }

    client.registerService?.("youtube", svc);
    svc.start();
  }
  return svc;
}

module.exports = { ensureYoutubeService, getYoutubeService };
