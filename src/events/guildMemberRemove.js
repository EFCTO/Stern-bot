const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../db/mysql");

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

      const pool = await getPool();
      const now = new Date();

      await pool.query(
        `UPDATE users
            SET last_seen = ?, last_display = COALESCE(?, last_display), last_username = COALESCE(?, last_username)
          WHERE user_id = ?`,
        [
          now,
          member.nickname ?? member.user?.username ?? null,
          member.user?.username ?? null,
          member.id
        ]
      );

      await pool.query(
        `INSERT INTO membership_log (user_id, event, occurred_at)
         VALUES (?, 'leave', ?)`,
        [member.id, now]
      );
    } catch (err) {
      console.error("[guildMemberRemove] error", err);
    }
  }
};
