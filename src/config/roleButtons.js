module.exports = {
  DEBUG: process.env.ROLE_DEBUG === "1",

  map: {
    "role:foundation": "879206385143939072", // 재단 유저
    "role:broadcast":  "1313043777929216020", // 방송국 유저
    "role:warvisitor": "1313069120371032085", // 전쟁관 방문객
  },

  labels: {
    "role:foundation": {
      label: "재단 유저",
      emoji: "🧪",
      description: "SCP SL 재단 유저 권한을 받으실 수 있습니다",
    },
    "role:broadcast": {
      label: "방송국 유저",
      emoji: "📺",
      description:
        "위드고 유튜브 업로드/방송 시작 알림을 받습니다. 멘션이 잦을 수 있어 일반 유저에게는 비추천!",
    },
    "role:warvisitor": {
      label: "전쟁관 방문객",
      emoji: "⚔️",
      description:
        "유저 주최 비공식 멀티(HoI4, CoH3 등)에 참여할 수 있습니다. 공식 전쟁관 역할은 별도 인증 채널에서 진행하세요.",
    },
  },
};
