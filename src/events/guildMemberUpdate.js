const { EmbedBuilder } = require("discord.js");
const { sendManagementLog } = require("../utils/managementLog");

function formatUserTag(user) {
  if (!user) return "알 수 없음";
  if (typeof user.tag === "string") return user.tag;
  const discriminator = user.discriminator && user.discriminator !== "0" ? `#${user.discriminator}` : "";
  return `${user.username ?? user.id}${discriminator}`;
}

function diffRoles(oldMember, newMember) {
  const oldSet = new Set(oldMember.roles.cache.keys());
  const newSet = new Set(newMember.roles.cache.keys());
  const guildId = newMember.guild.id;

  const added = [];
  for (const id of newSet) {
    if (id === guildId) continue;
    if (!oldSet.has(id)) added.push(id);
  }

  const removed = [];
  for (const id of oldSet) {
    if (id === guildId) continue;
    if (!newSet.has(id)) removed.push(id);
  }

  return { added, removed };
}

function formatRoleList(guild, ids) {
  if (!ids.length) return null;
  return ids.map((id) => guild.roles.cache.get(id)?.toString() ?? `\`${id}\``).join(", ");
}

module.exports = {
  name: "guildMemberUpdate",
  once: false,
  async execute(oldMember, newMember) {
    try {
      if (!newMember.guild) return;
      if (newMember.user?.bot) return;

      const changes = [];
      if (oldMember.displayName !== newMember.displayName) {
        changes.push({
          name: "닉네임 변경",
          value: `\`${oldMember.displayName ?? "(없음)"}\` → \`${newMember.displayName ?? "(없음)"}\``,
        });
      }

      if (oldMember.user?.username !== newMember.user?.username) {
        changes.push({
          name: "사용자명 변경",
          value: `\`${oldMember.user.username ?? "(없음)"}\` → \`${newMember.user.username ?? "(없음)"}\``,
        });
      }

      if (oldMember.user?.globalName !== newMember.user?.globalName) {
        changes.push({
          name: "프로필 이름 변경",
          value: `\`${oldMember.user.globalName ?? "(없음)"}\` → \`${newMember.user.globalName ?? "(없음)"}\``,
        });
      }

      if (oldMember.user?.avatar !== newMember.user?.avatar) {
        changes.push({
          name: "아바타 변경",
          value: newMember.user.displayAvatarURL?.({ size: 256 }) ?? "(변경된 아바타 URL을 확인할 수 없습니다)",
        });
      }

      const { added, removed } = diffRoles(oldMember, newMember);
      const addedText = formatRoleList(newMember.guild, added);
      const removedText = formatRoleList(newMember.guild, removed);
      if (addedText) {
        changes.push({ name: "추가된 역할", value: addedText });
      }
      if (removedText) {
        changes.push({ name: "제거된 역할", value: removedText });
      }

      if (!changes.length) {
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
          name: formatUserTag(newMember.user),
          iconURL: newMember.user.displayAvatarURL?.({ size: 256 }),
        })
        .setTitle("프로필 변경")
        .setDescription(`${newMember} \`${newMember.id}\``)
        .addFields(changes)
        .setTimestamp(new Date());

      await sendManagementLog(newMember.client, { embeds: [embed] });
    } catch (error) {
      console.error("[guildMemberUpdate] error", error);
    }
  },
};
