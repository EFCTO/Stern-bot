const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { getPool } = require("../db/mysql");

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quick_statistics")
    .setDescription("금일(자정~현재) 집계를 즉시 확인합니다. (관리자용)"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    try {
      const pool = await getPool();
      if (!pool) {
        await interaction.editReply("데이터베이스 연결을 사용할 수 없어 통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const now = new Date();
      const ymd = toYMD(now);

      const [[joinRow]] = await pool.query(
        `SELECT COUNT(*) AS c FROM membership_log
         WHERE event='join' AND DATE(occurred_at)=?`,
        [ymd]
      );
      const [[leaveRow]] = await pool.query(
        `SELECT COUNT(*) AS c FROM membership_log
         WHERE event='leave' AND DATE(occurred_at)=?`,
        [ymd]
      );
      const [[newRow]] = await pool.query(
        `SELECT COUNT(*) AS c FROM users
         WHERE DATE(first_seen)=?`,
        [ymd]
      );

      const joins = joinRow.c | 0;
      const leaves = leaveRow.c | 0;
      const new_joins = newRow.c | 0;
      const retention = joins - leaves;

      const emb = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🧮 금일 통계 (실시간) — ${ymd}`)
        .setDescription(
          [
            `입장유저 : **${joins}**`,
            `퇴장유저 : **${leaves}**`,
            `신규입장유저 : **${new_joins}**`,
            `유지인원 : **${retention}** (입장 - 퇴장)`,
          ].join("\n")
        )
        .setFooter({ text: "자정 집계는 자동으로 /daily, /monthly 테이블에 저장됩니다." })
        .setTimestamp();

      await interaction.editReply({ embeds: [emb] });
    } catch (err) {
      console.error("[/quick_statistics] error", err);
      await interaction.editReply("통계 계산 중 오류가 발생했습니다.");
    }
  },
};
