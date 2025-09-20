// src/commands/db_dump.js
const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const { getPool } = require("../db/mysql");

function toCSV(rows) {
  const headers = [
    "user_id",
    "username",
    "display_name",
    "first_seen",
    "last_seen",
    "last_username",
    "last_display",
    "is_bot",
    "join_count",
    "leave_count",
  ];
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // 따옴표/줄바꿈/콤마 포함 시 CSV 규칙에 따라 감싸기
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(","));
  }
  // UTF-8 BOM 넣으면 엑셀에서 한글 깨짐 방지
  return "\uFEFF" + lines.join("\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("db_dump")
    .setDescription("DB의 전체 유저(users) 테이블을 파일로 내보냅니다. (관리자용)")
    .setDMPermission(false)
    .addStringOption((opt) =>
      opt
        .setName("format")
        .setDescription("내보내기 형식")
        .addChoices(
          { name: "CSV", value: "csv" },
          { name: "JSON", value: "json" },
        )
        .setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("include_bots")
        .setDescription("봇 계정도 포함할지 여부 (기본: 포함)"),
    ),

// src/commands/db_dump.js (execute 내부)
async execute(interaction) {
  // 공개로 defer (에페메랄 아님)
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply(); 
  }

  try {
    const format = interaction.options.getString("format", true);
    const includeBots = interaction.options.getBoolean("include_bots") ?? true;

    const pool = await getPool();

    const where = includeBots ? "" : "WHERE is_bot = 0";
    const [rows] = await pool.query(
      `
      SELECT user_id, username, display_name,
             first_seen, last_seen,
             last_username, last_display,
             is_bot, join_count, leave_count
      FROM users
      ${where}
      ORDER BY first_seen ASC
      `
    );

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    let attachment;
    if (format === "json") {
      const json = JSON.stringify(rows, null, 2);
      attachment = new AttachmentBuilder(Buffer.from(json, "utf8"), {
        name: `users_${ts}.json`,
      });
    } else {
      const csv = toCSV(rows);
      attachment = new AttachmentBuilder(Buffer.from(csv, "utf8"), {
        name: `users_${ts}.csv`,
      });
    }

    await interaction.editReply({
      content: `총 **${rows.length}명** 내보내기 완료 (${format.toUpperCase()}, ${includeBots ? "봇 포함" : "봇 제외"})`,
      files: [attachment],
    });
  } catch (err) {
    console.error("[/db_dump] error", err);
    const payload = {
      content: `내보내기 중 오류가 발생했습니다.\n\`\`\`\n${err?.message || String(err)}\n\`\`\``,
    };

    // 이미 defer/reply 했다면 editReply, 아니면 reply
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  }
}
};
