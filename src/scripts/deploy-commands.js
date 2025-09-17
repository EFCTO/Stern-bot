// src/scripts/deploy-commands.js
const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");
require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID || process.env.APP_ID || process.env.DISCORD_CLIENT_ID;
const GUILD_ID  = process.env.GUILD_ID;
const TOKEN     = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!CLIENT_ID || !TOKEN) {
  console.error("❌ 환경변수 누락: CLIENT_ID / DISCORD_TOKEN 필수");
  process.exit(1);
}

const commandsDir = path.join(__dirname, "../commands");

// 파일 로드
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith(".js"));
console.log(`📦 commands 디렉토리: ${commandsDir}`);
console.log(`🗂️  발견된 파일: ${files.join(", ") || "(없음)"}`);

const commands = [];
for (const file of files) {
  const full = path.join(commandsDir, file);
  try {
    const mod = require(full);
    if (!mod || !mod.data) {
      console.warn(`⚠️  ${file}: 'data' export 없음 → 건너뜀`);
      continue;
    }
    const json = mod.data.toJSON?.() || mod.data;
    if (!json?.name || !json?.description) {
      console.warn(`⚠️  ${file}: name/description 누락 → 건너뜀`, json);
      continue;
    }
    commands.push(json);
    console.log(`✅ 로드: ${file} → /${json.name}`);
  } catch (err) {
    console.error(`❌ 로드 실패: ${file}`, err);
  }
}

if (commands.length === 0) {
  console.error("❌ 등록할 커맨드가 없습니다.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    if (GUILD_ID) {
      console.log(`🚀 길드 등록 시작: client=${CLIENT_ID}, guild=${GUILD_ID}, 개수=${commands.length}`);
      const res = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log("✅ 길드 등록 완료:", Array.isArray(res) ? res.map(c => c.name) : res);
    } else {
      console.log(`🕊️ 전역 등록 시작: client=${CLIENT_ID}, 개수=${commands.length}`);
      const res = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("✅ 전역 등록 완료:", Array.isArray(res) ? res.map(c => c.name) : res);
      console.log("⏳ 전역은 반영까지 수 분 걸릴 수 있어요. 테스트는 GUILD_ID로 길드 등록이 빠릅니다.");
    }
  } catch (err) {
    console.error("❌ 배포 실패", err);
    process.exit(1);
  }
})();
