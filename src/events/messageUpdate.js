const { EmbedBuilder } = require("discord.js");
const { sendManagementLog } = require("../utils/managementLog");
const { sendGlobalLogEmbed } = require("../utils/globalLog");

async function fetchIfPartial(message) {
  if (!message.partial) return message;
  try {
    return await message.fetch();
  } catch {
    return null;
  }
}

function truncate(text, limit = 1024) {
  if (!text) return "(내용 없음)";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 3)}...`;
}

function truncatePlain(text, limit = 400) {
  if (!text) return "(no content)";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 3)}...`;
}

module.exports = {
  name: "messageUpdate",
  once: false,
  async execute(oldMessage, newMessage) {
    try {
      const before = await fetchIfPartial(oldMessage);
      const after = await fetchIfPartial(newMessage);
      if (!before || !after || !after.guild) return;

      const author = after.author ?? before.author;
      if (!author || author.bot) return;

      const beforeContent = before.content ?? "";
      const afterContent = after.content ?? "";
      if (beforeContent === afterContent) return;

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setAuthor({
          name: `${author.tag ?? author.username ?? author.id}`,
          iconURL: author.displayAvatarURL?.({ size: 256 }),
        })
        .setTitle("메시지 수정")
        .setDescription(`채널: <#${after.channelId}>`)
        .addFields(
          { name: "Before", value: truncate(beforeContent), inline: false },
          { name: "After", value: truncate(afterContent), inline: false },
          { name: "메시지 ID", value: after.id ?? "알 수 없음", inline: false }
        )
        .setTimestamp(new Date());

      await sendManagementLog(after.client, { embeds: [embed] });

      const logLines = [
        `Message ID: \`${after.id ?? "unknown"}\``,
        `Before: ${truncatePlain(beforeContent)}`,
        `After: ${truncatePlain(afterContent)}`,
      ];

      await sendGlobalLogEmbed(after.client, {
        type: "Message Edited",
        user: author,
        member: after.member,
        content: logLines.join("\n"),
        guild: after.guild,
        channelId: after.channelId,
        color: 0xFEE75C,
      });
    } catch (error) {
      console.error("[messageUpdate] error", error);
    }
  },
};
