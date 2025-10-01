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
    await channel.send(payload);
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
