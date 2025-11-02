const { MessageFlags } = require("discord.js");
const LOG_CHANNEL_ID = process.env.MANAGEMENT_LOG_CHANNEL_ID || "1422873243554943037";
const cache = new WeakMap();

async function resolveChannel(client) {
  if (!client || !LOG_CHANNEL_ID) {
    return null;
  }

  if (cache.has(client)) {
    const cached = cache.get(client);
    if (cached?.isTextBased()) {
      return cached;
    }
  }

  try {
    let channel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      channel = await client.channels.fetch(LOG_CHANNEL_ID);
    }
    if (channel?.isTextBased()) {
      cache.set(client, channel);
      return channel;
    }
  } catch (error) {
    console.error("[ManagementLog] failed to resolve log channel", error);
  }
  return null;
}

async function sendManagementLog(client, payload) {
  try {
    const channel = await resolveChannel(client);
    if (!channel) {
      return false;
    }
    const finalPayload = { ...payload };

    // Avoid pings in management logs
    if (!finalPayload.allowedMentions) {
      finalPayload.allowedMentions = { parse: [] };
    }

    // Send as a silent message (no push notification)
    // Prefer API flag; discord.js v14 supports MessageFlags.SuppressNotifications at send
    if (finalPayload.flags == null) {
      finalPayload.flags = MessageFlags.SuppressNotifications;
    } else if (typeof finalPayload.flags === "number") {
      finalPayload.flags |= MessageFlags.SuppressNotifications;
    } else {
      // Fallback in case a different resolvable is provided; also set silent for future compatibility
      finalPayload.silent = true;
    }

    // Also set silent flag for clients that support it (harmless if ignored)
    if (finalPayload.silent == null) finalPayload.silent = true;

    await channel.send(finalPayload);
    return true;
  } catch (error) {
    console.error("[ManagementLog] send failed", error);
    return false;
  }
}

module.exports = {
  MANAGEMENT_LOG_CHANNEL_ID: LOG_CHANNEL_ID,
  sendManagementLog,
};
