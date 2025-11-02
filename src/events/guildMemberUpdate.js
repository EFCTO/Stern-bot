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

      // Ensure we have freshest user profile for banner/accentColor comparisons
      let oldUser = oldMember.user;
      let newUser = newMember.user;
      try {
        // fetch() returns the same User instance updated; capture shallow copies for diff text
        oldUser = { ...oldUser };
        newUser = await newMember.user.fetch();
      } catch {
        // ignore fetch failures; use cached values
      }
      if (oldMember.displayName !== newMember.displayName) {
        changes.push({
          name: "닉네임 변경",
          value: `\`${oldMember.displayName ?? "(없음)"}\` → \`${newMember.displayName ?? "(없음)"}\``,
        });
      }

      if (oldUser?.username !== newUser?.username) {
        changes.push({
          name: "사용자명 변경",
          value: `\`${oldUser.username ?? "(없음)"}\` → \`${newUser.username ?? "(없음)"}\``,
        });
      }

      if (oldUser?.globalName !== newUser?.globalName) {
        changes.push({
          name: "프로필 이름 변경",
          value: `\`${oldUser.globalName ?? "(없음)"}\` → \`${newUser.globalName ?? "(없음)"}\``,
        });
      }

      if (oldUser?.avatar !== newUser?.avatar) {
        changes.push({
          name: "아바타 변경",
          value: [
            oldUser?.avatar ? `[이전](${newMember.user.client?.users?.resolve(newMember.id)?.displayAvatarURL?.({ size: 256, forceStatic: false }) ?? ""})` : "[이전](없음)",
            newUser?.displayAvatarURL?.({ size: 256 }) ? `[새로](${newUser.displayAvatarURL({ size: 256 })})` : "[새로](없음)",
          ].join(" → "),
        });
      }

      // Banner / Accent Color
      const oldBanner = oldUser?.banner ?? null;
      const newBanner = newUser?.banner ?? null;
      if (oldBanner !== newBanner) {
        const oldUrl = typeof newMember.user.bannerURL === "function" && oldBanner ? newMember.user.bannerURL({ size: 512 }) : null;
        const newUrl = typeof newUser.bannerURL === "function" && newBanner ? newUser.bannerURL({ size: 512 }) : null;
        changes.push({
          name: "배너 변경",
          value: `${oldUrl ? `[이전](${oldUrl})` : "(없음)"} → ${newUrl ? `[새로](${newUrl})` : "(없음)"}`,
        });
      }

      const oldAccent = oldUser?.hexAccentColor ?? null;
      const newAccent = newUser?.hexAccentColor ?? null;
      if (oldAccent !== newAccent) {
        changes.push({
          name: "강조 색상 변경",
          value: `\`${oldAccent ?? "(없음)"}\` → \`${newAccent ?? "(없음)"}\``,
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

      // Timeout (communication disabled until)
      const oldTimeout = oldMember.communicationDisabledUntilTimestamp || null;
      const newTimeout = newMember.communicationDisabledUntilTimestamp || null;
      if (oldTimeout !== newTimeout) {
        const oldTxt = oldTimeout ? `<t:${Math.floor(oldTimeout / 1000)}:R>` : "(없음)";
        const newTxt = newTimeout ? `<t:${Math.floor(newTimeout / 1000)}:R>` : "(없음)";
        changes.push({ name: "타임아웃 변경", value: `${oldTxt} → ${newTxt}` });
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
