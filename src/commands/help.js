const { SlashCommandBuilder, EmbedBuilder, inlineCode } = require("discord.js");

// Curated docs so 처음 사용자도 바로 사용할 수 있게 안내
const DOCS = {
  // 음악
  play: {
    desc: "현재 음성 채널에서 음악을 재생합니다.",
    examples: [
      "/play never gonna give you up",
      "/play https://youtu.be/dQw4w9WgXcQ",
    ],
  },
  queue: { desc: "대기열을 표시합니다.", examples: ["/queue"] },
  nowplaying: { desc: "현재 재생 중인 곡을 보여줍니다.", examples: ["/nowplaying"] },
  skip: { desc: "다음 곡으로 넘어갑니다.", examples: ["/skip"] },
  pause: { desc: "재생을 일시정지합니다.", examples: ["/pause"] },
  resume: { desc: "일시정지한 곡을 다시 재생합니다.", examples: ["/resume"] },
  shuffle: { desc: "대기열을 섞습니다.", examples: ["/shuffle"] },
  remove: { desc: "대기열에서 N번째 곡을 삭제합니다.", examples: ["/remove position:3"] },
  stop: { desc: "재생을 멈추고 큐를 비웁니다.", examples: ["/stop"] },

  // 파티
  coh3_create: {
    desc: "COH3 파티를 만들고 설정 화면을 띄웁니다.",
    examples: ["/coh3_create (버튼으로 모드/진영/인원 설정)"]
  },
  hoi4_create: {
    desc: "HOI4 파티를 만들고 설정 화면을 띄웁니다.",
    examples: ["/hoi4_create (버튼으로 옵션 설정)"]
  },

  // 유틸리티
  ping: { desc: "봇 응답 지연을 확인합니다.", examples: ["/ping"] },
};

const CATEGORY_GROUPS = [
  {
    title: "시작하기",
    lines: [
      "1) 음성 채널에 먼저 들어갑니다.",
      "2) /play <검색어|URL> 로 음악을 재생합니다.",
      "3) /skip, /pause, /resume, /queue 등으로 제어합니다.",
      "4) 파티 모집은 /coh3_create 또는 /hoi4_create 를 사용해 생성한 뒤 메시지의 버튼으로 진행합니다.",
    ],
  },
  {
    title: "음악",
    keys: [
      "play -  검색어, URL을 이용하여 음악을 재생합니다",
      "queue - 재생중인 곡, 대기열을 확인합니다",
      "nowplaying - 현재 재생중인 곡 정보를 확인합니다",
      "skip - 다음 곡으로 넘어갑니다",
      "pause - 재생을 일시정지합니다",
      "resume - 일시정지한 곡을 다시 재생합니다",
      "shuffle - 대기열을 섞습니다",
      "remove - 대기열에서 N번째 곡을 삭제합니다",
      "stop - 재생을 멈추고 큐를 비웁니다",
    ],
  },
  { title: "파티", keys: ["coh3_create", "hoi4_create"] },
  { title: "유틸리티", keys: ["ping"] },
];

// 관리자용(운영/디버그) 명령어는 도움말에서 제외
const ADMIN_NAME_PATTERNS = [
  /^(ban|kick|timeout)$/i,
  /^(db_dump|db_update)$/i,
  /^debug_/i,
  /^multi_/i,
  /^(party_destroy|party_end|party_transfer)$/i,
  /^(youtube|chzzk)$/i,
  /^(bot_alert|alert)$/i,
  /^(quick_statistics)$/i,
  /^(rolepanel)$/i,
];

function isAdminName(name) {
  return ADMIN_NAME_PATTERNS.some(r => r.test(name));
}

function getCommandMeta(command) {
  const name = command?.data?.name ?? command?.data?.toJSON?.().name;
  const description = command?.data?.description ?? command?.data?.toJSON?.().description ?? "";
  return { name, description };
}

function formatDocLine(name) {
  const doc = DOCS[name];
  if (!doc) return `/${name}`;
  return `/${name} — ${doc.desc}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("슈퍼 이지 명령어 사용 가이드")
    .addStringOption(opt =>
      opt
        .setName("command")
        .setDescription("특정 명령어 자세히 보기 (선택)")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const query = interaction.options.getString("command");

    const availableNames = new Set(
      Array.from(client.commands.values())
        .map(c => getCommandMeta(c).name)
        .filter(Boolean)
    );

    // 상세 조회가 들어오면, 관리자용은 가려두고 문서 기반으로 안내
    if (query) {
      const key = query.toLowerCase();
      if (!availableNames.has(key) || isAdminName(key) || !DOCS[key]) {
        return interaction.reply({
          content: `알 수 없거나 사용자용이 아닌 명령어입니다: ${inlineCode(query)}\n/help 로 사용 가능한 명령어와 예시를 확인하세요.`,
          ephemeral: true,
        });
      }

      const doc = DOCS[key];
      const emb = new EmbedBuilder()
        .setTitle(`/${key} 사용법`)
        .setDescription(doc.desc)
        .setColor(0x5865F2)
        .setTimestamp();

      if (Array.isArray(doc.examples) && doc.examples.length) {
        emb.addFields({ name: "예시", value: doc.examples.map(e => `• ${e}`).join("\n") });
      }

      return interaction.reply({ embeds: [emb], ephemeral: true });
    }

    // 기본 도움말: 카테고리별로 사용자용 명령어만 노출
    const emb = new EmbedBuilder()
      .setTitle("슈테른 봇 도움말")
      .setColor(0x57F287)
      .setTimestamp();

    for (const group of CATEGORY_GROUPS) {
      if (group.lines) {
        emb.addFields({ name: group.title, value: group.lines.map(l => `• ${l}`).join("\n") });
        continue;
      }

      const names = (group.keys || []).filter(k => availableNames.has(k) && !isAdminName(k));
      if (names.length === 0) continue;

      const value = names.map(n => `• ${formatDocLine(n)}`).join("\n");
      emb.addFields({ name: group.title, value });
    }

    emb.setFooter({ text: "자세한 사용법은 /help command:<이름> 으로 확인하세요." });

    await interaction.reply({ embeds: [emb], ephemeral: true });
  }
};
