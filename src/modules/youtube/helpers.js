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

    // Migrate any previous in-memory state
    if (Array.isArray(previous?.channels)) {
      svc.channels = previous.channels.map(c => ({ ...c }));
    } else if (previous?.state && typeof previous.state === "object") {
      // backward-compat: single state -> channels[0]
      const s = previous.state;
      if (s.channelId) {
        svc.channels = [{
          channelId: s.channelId,
          channelTitle: s.channelTitle ?? null,
          notifyChannelId: s.notifyChannelId ?? null,
          lastVideoId: s.lastVideoId ?? null,
          lastAnnouncedAt: s.lastAnnouncedAt ?? null,
        }];
      }
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
