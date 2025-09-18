const { PermissionFlagsBits } = require("discord.js");
const config = require("../../config/roleButtons");

module.exports = {
  customIdStartsWith: "role:",

  async handle(interaction) {
    const cid = interaction.customId;
    const roleId = config.map[cid];

    if (config.DEBUG) {
      console.log("[ROLE] button click",
        { guild: interaction.guildId, user: interaction.user.id, customId: cid, mappedRoleId: roleId });
    }

    if (!roleId) {
      await interaction.reply({ content: `알 수 없는 역할 버튼입니다.\n(customId: \`${cid}\`)`, ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);
    const me = await guild.members.fetchMe();

    const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      if (config.DEBUG) console.error("[ROLE] role not found in guild", { roleId });
      await interaction.reply({ content: `역할을 찾지 못했습니다. (roleId: \`${roleId}\`)`, ephemeral: true });
      return;
    }

    const botCanManage =
      me.permissions.has(PermissionFlagsBits.ManageRoles) &&
      me.roles.highest.comparePositionTo(role) > 0;

    if (!botCanManage) {
      if (config.DEBUG) {
        console.error("[ROLE] bot cannot manage role", {
          botHighest: me.roles.highest?.rawPosition,
          rolePos: role.rawPosition,
          hasManageRoles: me.permissions.has(PermissionFlagsBits.ManageRoles),
        });
      }
      await interaction.reply({
        content: "봇에게 역할 관리 권한이 없거나 역할 순서가 더 낮습니다. (서버 설정 → 역할 순서에서 봇 역할을 위로 올려주세요)",
        ephemeral: true
      });
      return;
    }

    const has = member.roles.cache.has(role.id);
    try {
      if (has) {
        await member.roles.remove(role);
        await interaction.reply({ content: `**${role.name}** 역할이 제거되었습니다.`, ephemeral: true });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: `**${role.name}** 역할이 부여되었습니다.`, ephemeral: true });
      }
    } catch (err) {
      console.error("[ROLE] toggle failed", { err });
      await interaction.reply({
        content: `역할 변경 중 오류가 발생했습니다: \`${err.message}\``,
        ephemeral: true
      });
    }
  }
};