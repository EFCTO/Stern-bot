const { EmbedBuilder, MessageFlags } = require("discord.js");

const GLOBAL_LOG_CHANNEL_ID = process.env.GLOBAL_LOG_CHANNEL_ID || "1318490571844751392";
const GLOBAL_LOG_GUILD_ID = process.env.GLOBAL_LOG_GUILD_ID || "1318259993753161749";
const cache = new WeakMap();

function truncate(text, limit = 1024) {
  if (text === null || text === undefined || text === "") return "(no content)";
  const value = String(text);
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3)}...`;
}

function formatUserLabel(user, member) {
  const resolved = user ?? member?.user ?? member ?? null;
  if (!resolved) return "(unknown)";
  const id = resolved.id ?? member?.id ?? "unknown";
  const name =
    member?.displayName ||
    resolved.tag ||
    resolved.username ||
    resolved.globalName ||
    resolved.name ||
    resolved.id ||
    "unknown";
  return `${name} (\`${id}\`)`;
}

function formatServerLabel(guild) {
  if (!guild) return "(unknown)";
  const name = guild.name ?? "Unknown";
  const id = guild.id ?? "unknown";
  return `${name} (\`${id}\`)`;
}

function formatChannelLink(guildId, channelId) {
  if (!guildId) return "(unknown)";
  if (!channelId) {
    return `https://discord.com/channels/${guildId}`;
  }
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function buildGlobalLogEmbed({ type, user, member, content, guild, channelId, color }) {
  if (!type || !guild) return null;
  const embed = new EmbedBuilder()
    .setColor(typeof color === "number" ? color : 0x2F3136)
    .setTitle(type)
    .addFields(
      { name: "User", value: formatUserLabel(user, member), inline: false },
      { name: "Content", value: truncate(content), inline: false },
      { name: "Server", value: formatServerLabel(guild), inline: false },
      { name: "Channel", value: formatChannelLink(guild.id, channelId), inline: false }
    )
    .setTimestamp(new Date());
  return embed;
}

async function resolveChannel(client) {
  if (!client || !GLOBAL_LOG_CHANNEL_ID) {
    return null;
  }

  if (cache.has(client)) {
    const cached = cache.get(client);
    if (cached?.isTextBased()) {
      return cached;
    }
  }

  try {
    let channel = client.channels.cache.get(GLOBAL_LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      channel = await client.channels.fetch(GLOBAL_LOG_CHANNEL_ID);
    }
    if (channel?.isTextBased()) {
      if (GLOBAL_LOG_GUILD_ID && channel.guildId && channel.guildId !== GLOBAL_LOG_GUILD_ID) {
        return null;
      }
      cache.set(client, channel);
      return channel;
    }
  } catch (error) {
    console.error("[GlobalLog] failed to resolve log channel", error);
  }
  return null;
}

async function sendGlobalLog(client, payload) {
  try {
    const channel = await resolveChannel(client);
    if (!channel) {
      return false;
    }
    const finalPayload = { ...payload };

    if (!finalPayload.allowedMentions) {
      finalPayload.allowedMentions = { parse: [] };
    }

    if (finalPayload.flags == null) {
      finalPayload.flags = MessageFlags.SuppressNotifications;
    } else if (typeof finalPayload.flags === "number") {
      finalPayload.flags |= MessageFlags.SuppressNotifications;
    } else {
      finalPayload.silent = true;
    }

    if (finalPayload.silent == null) finalPayload.silent = true;

    await channel.send(finalPayload);
    return true;
  } catch (error) {
    console.error("[GlobalLog] send failed", error);
    return false;
  }
}

async function sendGlobalLogEmbed(client, data) {
  const embed = buildGlobalLogEmbed(data);
  if (!embed) return false;
  return sendGlobalLog(client, { embeds: [embed] });
}

module.exports = {
  GLOBAL_LOG_CHANNEL_ID,
  GLOBAL_LOG_GUILD_ID,
  buildGlobalLogEmbed,
  formatChannelLink,
  formatUserLabel,
  sendGlobalLog,
  sendGlobalLogEmbed,
};
