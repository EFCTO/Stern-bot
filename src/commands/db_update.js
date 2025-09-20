const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getPool } = require("../db/mysql");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("db_update")
    .setDescription("현재 서버의 모든 유저 정보를 DB에 업데이트합니다. (관리자용)")
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply("길드(서버)에서만 사용할 수 있습니다.");
    }

    try {
      const members = await guild.members.fetch();
      const pool = await getPool();

      let processed = 0;
      const total = members.size;
      const now = new Date();

      const progressTick = Math.max(50, Math.floor(total / 10));

      for (const [, m] of members) {
        const userId   = m.user.id;
        const username = m.user.username ?? "";
        const display  = m.displayName ?? username; 
        const isBot    = m.user.bot ? 1 : 0;

        await pool.query(
          `
          INSERT INTO users (
            user_id, username, display_name,
            first_seen, last_seen,
            last_username, last_display,
            is_bot, join_count, leave_count
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
          ON DUPLICATE KEY UPDATE
            last_seen     = VALUES(last_seen),
            last_username = VALUES(last_username),
            last_display  = VALUES(last_display),
            username      = VALUES(username),
            display_name  = VALUES(display_name),
            is_bot        = VALUES(is_bot)
          `,
          [userId, username, display, now, now, username, display, isBot]
        );

        processed += 1;
        if (processed % progressTick === 0) {
          await interaction.editReply(`진행 중… ${processed}/${total}명 처리`);
        }
      }

      await interaction.editReply(`완료! 총 **${processed}명**의 유저 정보를 DB에 반영했습니다.`);
    } catch (err) {
      console.error("[/db_update] error", err);
      const msg = err?.message || String(err);
      await interaction.editReply(`업데이트 중 오류가 발생했습니다.\n\`\`\`\n${msg}\n\`\`\``);
    }
  },
};