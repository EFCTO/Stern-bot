const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../db/mysql");
const { sendGlobalLogEmbed } = require("../utils/globalLog");

module.exports = {
  name: "guildMemberRemove",
  once: false,
  async execute(member) {
    try {
      const chId = process.env.LEAVE_LOG_CHANNEL_ID;
      if (chId) {
        const ch = member.client.channels.cache.get(chId);
        if (ch && ch.isTextBased()) {
          const emb = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`**${member.user?.tag || member.id}** 님이 서버에서 퇴장했습니다.`)
            .setTimestamp();
          await ch.send({ embeds: [emb] });
        }
      }

      const logLines = ["Member left."];
      await sendGlobalLogEmbed(member.client, {
        type: "Member Left",
        user: member.user,
        member,
        content: logLines.join("\n"),
        guild: member.guild,
        channelId: member.guild.systemChannelId
          ?? member.guild.rulesChannelId
          ?? member.guild.publicUpdatesChannelId
          ?? null,
        color: 0xED4245,
      });

      const pool = await getPool();
      if (!pool) {
        if (process.env.DEBUG_DB_FAILURE === "true") {
          console.warn("[guildMemberRemove] Skip database logging: MySQL pool unavailable.");
        }
        return;
      }
      const now = new Date();
      const guildId = member.guild?.id ?? null;
      const username = member.user?.username ?? null;
      const displayName = member.nickname ?? username ?? null;

      await pool.query(
        `UPDATE users
            SET guild_id = COALESCE(?, guild_id),
                username = COALESCE(?, username),
                display_name = COALESCE(?, display_name),
                last_seen = ?,
                last_display = COALESCE(?, last_display),
                last_username = COALESCE(?, last_username)
          WHERE user_id = ?`,
        [
          guildId,
          username,
          displayName,
          now,
          displayName,
          username,
          member.id
        ]
      );

      await pool.query(
        `INSERT INTO membership_log (user_id, guild_id, event, occurred_at)
         VALUES (?, ?, 'leave', ?)`,
        [member.id, guildId, now]
      );
    } catch (err) {
      console.error("[guildMemberRemove] error", err);
    }
  }
};
