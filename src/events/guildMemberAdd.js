const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../db/mysql");
const { buildRolePanelPayload } = require("../utils/rolePanel");

module.exports = {
  name: "guildMemberAdd",
  once: false,
  async execute(member) {
    try {
      const chId = process.env.JOIN_LOG_CHANNEL_ID;
      if (chId) {
        const ch = member.client.channels.cache.get(chId);
        if (ch && ch.isTextBased()) {
          const avatar = member.user.displayAvatarURL({ size: 1024, extension: "png" });
          const emb = new EmbedBuilder()
            .setColor(0x57F287)
            .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
            .setDescription(`**${member}** 님이 서버에 들어오셨어요. glhf!`)
            .setImage(avatar)
            .setTimestamp();
          await ch.send({ embeds: [emb] });
        }
      }

      try {
        const { embed, components } = buildRolePanelPayload();
        const displayName = member.displayName || member.user.username;
        await member.send({
          content: `홀슈타인 란드에 오신 걸 환영합니다 ${displayName}님!\n아래 역할 패널에서 원하시는 역할을 선택해 주세요!`,
          embeds: [embed],
          components,
        });
      } catch (error) {
        // DM이 막혀 있을 수 있으니 조용히 무시
        if (process.env.DEBUG_DM_FAILURE === "true") {
          console.warn("[guildMemberAdd] failed to DM role panel", error);
        }
      }

      const pool = await getPool();
      const now = new Date();

      const [rows] = await pool.query("SELECT user_id FROM users WHERE user_id = ?", [member.id]);
      if (rows.length === 0) {
        await pool.query(
          `INSERT INTO users (user_id, first_seen, last_seen, last_display, last_username, join_count)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            member.id,
            now,
            now,
            member.displayName ?? member.user.username,
            member.user.username
          ]
        );
      } else {
        await pool.query(
          `UPDATE users
             SET last_seen = ?, last_display = ?, last_username = ?, join_count = join_count + 1
           WHERE user_id = ?`,
          [
            now,
            member.displayName ?? member.user.username,
            member.user.username,
            member.id
          ]
        );
      }

      await pool.query(
        `INSERT INTO membership_log (user_id, event, occurred_at)
         VALUES (?, 'join', ?)`,
        [member.id, now]
      );
    } catch (err) {
      console.error("[guildMemberAdd] error", err);
    }
  }
};
