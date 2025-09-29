const { PermissionFlagsBits } = require("discord.js");
const config = require("../../config/roleButtons");

const TARGET_GUILD_ID = process.env.ROLE_PANEL_GUILD_ID || "879204407496028201";

function makeReply(interaction, message) {
  const payload = { content: message };
  if (interaction.inGuild?.() ?? Boolean(interaction.guild)) {
    payload.ephemeral = true;
  }
  return payload;
}

module.exports = {
  customIdStartsWith: "role:",

  async handle(interaction) {
    const cid = interaction.customId;
    const roleId = config.map[cid];

    if (config.DEBUG) {
      console.log("[ROLE] button click", {
        guild: interaction.guildId,
        user: interaction.user.id,
        customId: cid,
        mappedRoleId: roleId,
      });
    }

    if (!roleId) {
      await interaction.reply(makeReply(interaction, `알 수 없는 역할 버튼이에요.\n(customId: \`${cid}\`)`)).catch(() => null);
      return;
    }

    let guild = interaction.guild;
    if (!guild) {
      guild = interaction.client.guilds.cache.get(TARGET_GUILD_ID)
        || await interaction.client.guilds.fetch(TARGET_GUILD_ID).catch(() => null);
      if (!guild) {
        await interaction.reply(makeReply(interaction,
          "서버 정보를 불러오지 못했어요. 잠시 후 다시 시도하거나 서버에 다시 입장해 주세요."))
          .catch(() => null);
        return;
      }
    }

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    const me = await guild.members.fetchMe().catch(() => null);

    if (!member || !me) {
      await interaction.reply(makeReply(interaction,
        "역할 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."))
        .catch(() => null);
      return;
    }

    const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      if (config.DEBUG) console.error("[ROLE] role not found in guild", { roleId });
      await interaction.reply(makeReply(interaction,
        `역할을 찾지 못했어요. (roleId: \`${roleId}\`)`)).catch(() => null);
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
      await interaction.reply(makeReply(interaction,
        "봇에게 역할 관리 권한이 부족해요. 서버 관리자에게 문의해 주세요.")).catch(() => null);
      return;
    }

    const has = member.roles.cache.has(role.id);
    try {
      if (has) {
        await member.roles.remove(role);
        await interaction.reply(makeReply(interaction,
          `**${role.name}** 역할을 제거했어요.`));
      } else {
        await member.roles.add(role);
        await interaction.reply(makeReply(interaction,
          `**${role.name}** 역할이 부여되었어요.`));
      }
    } catch (err) {
      console.error("[ROLE] toggle failed", { err });
      await interaction.reply(makeReply(interaction,
        `역할을 변경하는 중 오류가 발생했어요: \`${err.message}\``)).catch(() => null);
    }
  },
};
