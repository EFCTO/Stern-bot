const { EmbedBuilder } = require("discord.js");
const { sendManagementLog } = require("../utils/managementLog");

function safeFetch(message) {
  if (!message.partial) return Promise.resolve(message);
  return message.fetch().catch(() => null);
}

function truncate(text, limit = 1024) {
  if (!text) return "(no content)";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 3)}...`;
}

module.exports = {
  name: "messageDelete",
  once: false,
  async execute(message) {
    try {
      const fetched = await safeFetch(message);
      if (!fetched || !fetched.guild) return;
      const author = fetched.author;
      if (!author || author.bot) return;

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({
          name: `${author.tag ?? author.username ?? author.id}`,
          iconURL: author.displayAvatarURL?.({ size: 256 }),
        })
        .setTitle("Message Deleted")
        .setDescription(truncate(fetched.content ?? ""))
        .addFields(
          { name: "User", value: `${author} \`${author.id}\``, inline: false },
          { name: "Channel", value: `<#${fetched.channelId}>`, inline: true },
          { name: "Message ID", value: fetched.id ?? "unknown", inline: true }
        )
        .setTimestamp(new Date());

      const attachments = fetched.attachments ? [...fetched.attachments.values()] : [];
      if (attachments.length) {
        const list = attachments.map((att) => att.url).slice(0, 5).join("\n");
        embed.addFields({ name: "Attachments", value: truncate(list, 1000) });
        if (attachments.length > 5) {
          embed.addFields({ name: "More", value: `${attachments.length - 5} more attachments` });
        }
      }

      // Embeds / Stickers summary
      if (Array.isArray(fetched.embeds) && fetched.embeds.length) {
        embed.addFields({ name: "Embeds", value: `${fetched.embeds.length} embed(s)` });
      }
      if (fetched.stickers && fetched.stickers.size) {
        const stickerNames = [...fetched.stickers.values()].map(s => s.name).slice(0, 5).join(", ");
        embed.addFields({ name: "Stickers", value: stickerNames || `${fetched.stickers.size} sticker(s)` });
      }

      // If the message was a reply, include reference
      const ref = fetched.reference;
      if (ref?.guildId && ref?.channelId && ref?.messageId) {
        const link = `https://discord.com/channels/${ref.guildId}/${ref.channelId}/${ref.messageId}`;
        embed.addFields({ name: "Reply To", value: link });
      }

      await sendManagementLog(fetched.client, { embeds: [embed] });
    } catch (error) {
      console.error("[messageDelete] error", error);
    }
  },
};
