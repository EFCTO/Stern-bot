const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../db/mysql");

/** 통계: 지정 일자(로컬 날짜 문자열 'YYYY-MM-DD') */
async function computeDaily(pool, dateStr) {
  // joins, leaves
  const [j] = await pool.query(
    `SELECT COUNT(*) AS c FROM membership_log
     WHERE event='join' AND DATE(occurred_at)=?`, [dateStr]
  );
  const [l] = await pool.query(
    `SELECT COUNT(*) AS c FROM membership_log
     WHERE event='leave' AND DATE(occurred_at)=?`, [dateStr]
  );

  // new_joins: users.first_seen이 해당 날짜
  const [n] = await pool.query(
    `SELECT COUNT(*) AS c FROM users WHERE DATE(first_seen)=?`, [dateStr]
  );

  const joins = j[0].c|0;
  const leaves = l[0].c|0;
  const new_joins = n[0].c|0;
  const retention = joins - leaves;

  await pool.query(
    `INSERT INTO daily_stats (stat_date, joins, leaves, new_joins, retention)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE joins=VALUES(joins), leaves=VALUES(leaves),
                             new_joins=VALUES(new_joins), retention=VALUES(retention)`,
    [dateStr, joins, leaves, new_joins, retention]
  );

  return { joins, leaves, new_joins, retention };
}

/** 월간: 'YYYY-MM' */
async function computeMonthly(pool, ym) {
  const [j] = await pool.query(
    `SELECT COUNT(*) AS c FROM membership_log
     WHERE event='join' AND DATE_FORMAT(occurred_at,'%Y-%m')=?`, [ym]
  );
  const [l] = await pool.query(
    `SELECT COUNT(*) AS c FROM membership_log
     WHERE event='leave' AND DATE_FORMAT(occurred_at,'%Y-%m')=?`, [ym]
  );
  const [n] = await pool.query(
    `SELECT COUNT(*) AS c FROM users
     WHERE DATE_FORMAT(first_seen,'%Y-%m')=?`, [ym]
  );

  const joins = j[0].c|0;
  const leaves = l[0].c|0;
  const new_joins = n[0].c|0;
  const retention = joins - leaves;

  await pool.query(
    `INSERT INTO monthly_stats (stat_month, joins, leaves, new_joins, retention)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE joins=VALUES(joins), leaves=VALUES(leaves),
                             new_joins=VALUES(new_joins), retention=VALUES(retention)`,
    [ym, joins, leaves, new_joins, retention]
  );

  return { joins, leaves, new_joins, retention };
}

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toYM(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2, "0");
  return `${y}-${m}`;
}

function startStatsJobs(client) {
  const statsChannelId = process.env.STATS_CHANNEL_ID;

  // 매일 0시 (Asia/Seoul 은 .env TZ로 지정)
  cron.schedule("0 0 * * *", async () => {
    const pool = await getPool();
    const today = new Date(); // 0시 트리거: 직전 날짜 집계가 필요하면 하루 빼도 됨
    const ymd = toYMD(today);
    const { joins, leaves, new_joins, retention } = await computeDaily(pool, ymd);

    if (statsChannelId) {
      const ch = client.channels.cache.get(statsChannelId);
      if (ch && ch.isTextBased()) {
        const emb = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`📊 일간 통계 (${ymd})`)
          .setDescription([
            `입장유저 : **${joins}**`,
            `퇴장유저 : **${leaves}**`,
            `신규입장유저 : **${new_joins}**`,
            `유지인원 : **${retention}** (입장 - 퇴장)`
          ].join("\n"))
          .setTimestamp();
        await ch.send({ embeds: [emb] });
      }
    }
  });

  // 매월 1일 0시
  cron.schedule("0 0 1 * *", async () => {
    const pool = await getPool();
    const today = new Date();
    const ym = toYM(today);
    const { joins, leaves, new_joins, retention } = await computeMonthly(pool, ym);

    if (statsChannelId) {
      const ch = client.channels.cache.get(statsChannelId);
      if (ch && ch.isTextBased()) {
        const emb = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle(`📈 월간 통계 (${ym})`)
          .setDescription([
            `입장유저 : **${joins}**`,
            `퇴장유저 : **${leaves}**`,
            `신규입장유저 : **${new_joins}**`,
            `유지인원 : **${retention}** (입장 - 퇴장)`
          ].join("\n"))
          .setTimestamp();
        await ch.send({ embeds: [emb] });
      }
    }
  });
}

module.exports = { startStatsJobs };
