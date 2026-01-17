const { AuditLogEvent } = require("discord.js");
const { sendGlobalLogEmbed } = require("../utils/globalLog");

function resolveAuditActionName(action) {
  const entry = Object.entries(AuditLogEvent).find(([, value]) => value === action);
  return entry ? entry[0] : `Unknown (${action})`;
}

function humanizeAction(name) {
  if (name.startsWith("Unknown")) return name;
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function formatTarget(target) {
  if (!target) return "(unknown)";
  if (typeof target === "string") return target;
  const id = target.id ?? target.user?.id ?? target.member?.id ?? null;
  const name =
    target.tag ||
    target.username ||
    target.globalName ||
    target.name ||
    target.user?.tag ||
    target.user?.username ||
    target.id ||
    null;
  if (id && name && name !== id) return `${name} (\`${id}\`)`;
  if (id) return `\`${id}\``;
  return name ?? "(unknown)";
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "(none)";
  if (typeof value === "string") return value || "(empty)";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return "(empty)";
    return value.map((entry) => normalizeValue(entry)).join(", ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncateValue(value, limit = 120) {
  const text = normalizeValue(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 3)}...`;
}

function resolveChannelId(entry) {
  if (entry?.extra?.channel?.id) return entry.extra.channel.id;
  if (entry?.extra?.channelId) return entry.extra.channelId;
  if (typeof entry?.target?.type === "number" && entry?.target?.id) return entry.target.id;
  return null;
}

module.exports = {
  name: "guildAuditLogEntryCreate",
  once: false,
  async execute(entry, guild) {
    try {
      if (!guild) return;

      const actionName = resolveAuditActionName(entry.action);
      const type = `Audit Log: ${humanizeAction(actionName)}`;

      const contentLines = [];
      if (entry.target) {
        contentLines.push(`Target: ${formatTarget(entry.target)}`);
      }
      if (entry.reason) {
        contentLines.push(`Reason: ${entry.reason}`);
      }
      if (entry.changes?.length) {
        const changeLines = entry.changes
          .slice(0, 6)
          .map((change) => `${change.key}: ${truncateValue(change.old)} -> ${truncateValue(change.new)}`);
        contentLines.push(`Changes:\n${changeLines.join("\n")}`);
        if (entry.changes.length > 6) {
          contentLines.push(`(+${entry.changes.length - 6} more changes)`);
        }
      }
      if (entry?.extra?.count != null) {
        contentLines.push(`Count: ${entry.extra.count}`);
      }

      const channelId = resolveChannelId(entry)
        ?? guild.systemChannelId
        ?? guild.rulesChannelId
        ?? guild.publicUpdatesChannelId
        ?? null;

      await sendGlobalLogEmbed(guild.client, {
        type,
        user: entry.executor,
        content: contentLines.join("\n"),
        guild,
        channelId,
        color: 0x5865F2,
      });
    } catch (error) {
      console.error("[guildAuditLogEntryCreate] error", error);
    }
  },
};
