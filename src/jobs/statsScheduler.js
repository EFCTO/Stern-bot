const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../db/mysql");

const DEFAULT_STATS_GUILD_ID = "1318259993753161749";
const DEFAULT_STATS_CHANNEL_ID = "1318490571844751392";
const DEFAULT_TZ = "Asia/Seoul";

async function computeDaily(pool, dateStr) {
  const [j] = await pool.query(
    `SELECT COUNT(*) AS c FROM membership_log
     WHERE event='join' AND DATE(occurred_at)=?`, [dateStr]
  );
  const [l] = await pool.query(
    `SELECT COUNT(*) AS c FROM membership_log
     WHERE event='leave' AND DATE(occurred_at)=?`, [dateStr]
  );
  const [n] = await pool.query(
    `SELECT COUNT(*) AS c FROM users WHERE DATE(first_seen)=?`, [dateStr]
  );

  const joins = j[0].c | 0;
  const leaves = l[0].c | 0;
  const new_joins = n[0].c | 0;
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

  const joins = j[0].c | 0;
  const leaves = l[0].c | 0;
  const new_joins = n[0].c | 0;
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
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toYM(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function resolveChannel(client, channelId) {
  if (!channelId) return null;
  const cached = client.channels.cache.get(channelId);
  if (cached?.isTextBased()) return cached;
  try {
    const fetched = await client.channels.fetch(channelId);
    return fetched?.isTextBased() ? fetched : null;
  } catch {
    return null;
  }
}

function startStatsJobs(client) {
  const statsChannelId = process.env.STATS_CHANNEL_ID || DEFAULT_STATS_CHANNEL_ID;
  const statsGuildId = process.env.STATS_GUILD_ID || DEFAULT_STATS_GUILD_ID;
  const timezone = process.env.STATS_TZ || DEFAULT_TZ;

  async function sendDaily(ymd, payload) {
    const channel = await resolveChannel(client, statsChannelId);
    if (!channel) return;

    const emb = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 Daily Stats (${ymd})`)
      .setDescription([
        `Joins : **${payload.joins}**`,
        `Leaves : **${payload.leaves}**`,
        `New Joins : **${payload.new_joins}**`,
        `Net Change : **${payload.retention}** (joins - leaves)`
      ].join("\n"))
      .setFooter({ text: `Guild ${statsGuildId}` })
      .setTimestamp();

    await channel.send({ embeds: [emb] });
  }

  async function sendMonthly(ym, payload) {
    const channel = await resolveChannel(client, statsChannelId);
    if (!channel) return;

    const emb = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`📈 Monthly Stats (${ym})`)
      .setDescription([
        `Joins : **${payload.joins}**`,
        `Leaves : **${payload.leaves}**`,
        `New Joins : **${payload.new_joins}**`,
        `Net Change : **${payload.retention}** (joins - leaves)`
      ].join("\n"))
      .setFooter({ text: `Guild ${statsGuildId}` })
      .setTimestamp();

    await channel.send({ embeds: [emb] });
  }

  cron.schedule("0 0 * * *", async () => {
    try {
      const pool = await getPool();
      if (!pool) {
        console.warn("[StatsScheduler] Skip daily job: MySQL pool unavailable.");
        return;
      }
      const target = new Date();
      target.setDate(target.getDate() - 1);
      const ymd = toYMD(target);
      const payload = await computeDaily(pool, ymd);
      await sendDaily(ymd, payload);
    } catch (error) {
      console.error("[StatsScheduler] daily job failed", error);
    }
  }, { timezone });

  cron.schedule("0 0 1 * *", async () => {
    try {
      const pool = await getPool();
      if (!pool) {
        console.warn("[StatsScheduler] Skip monthly job: MySQL pool unavailable.");
        return;
      }
      const target = new Date();
      target.setMonth(target.getMonth() - 1);
      const ym = toYM(target);
      const payload = await computeMonthly(pool, ym);
      await sendMonthly(ym, payload);
    } catch (error) {
      console.error("[StatsScheduler] monthly job failed", error);
    }
  }, { timezone });
}

module.exports = { startStatsJobs };
