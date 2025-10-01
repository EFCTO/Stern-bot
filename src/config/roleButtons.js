module.exports = {
  DEBUG: process.env.ROLE_DEBUG === "1",

  map: {
    //"role:foundation": "879206385143939072", // 재단 유저
    "role:broadcast":  "1313043777929216020", // 방송국 유저
    "role:militaryuser": "1313069120371032085", // 군수부 유저
    "role:libraryuser" : "1422835277587546303", //도서관 유저
    "role:strategicuser" : "1313044605054488626", //전략부 유저
  },

  labels: {
    //"role:foundation": {
      //label: "재단 유저",
      //emoji: "🧪",
      //description: "SCP SL 재단 유저 권한을 받으실 수 있습니다",
    //},
    "role:broadcast": {
      label: "방송국 유저",
      emoji: "📢",
      description:
        "위드고 유튜브 업로드/방송 시작 알림을 받습니다. 멘션이 잦을 수 있어 일반 유저에게는 비추천 합니다",
    },
    "role:militaryuser": {
      label: "군수부 유저",
      emoji: "🪖",
      description:
        "유저 주최 비공식 멀티(컴퍼니 오브 히어로즈 시리즈)에 참여할 수 있습니다.",
    },
        "role:libraryuser": {
      label: "도서관 유저",
      emoji: "📚",
      description:
        "프로젝트 문 관련 게임과 관련된 역할입니다",
    },
        "role:strategicuser": {
      label: "전략부 유저",
      emoji: "🗺️",
      description:
        "유저 주최 비공식 멀티(하츠 오브 아이언 시리즈)에 참여할 수 있습니다. 공식 멀티 참여 역할은 별도 인증 채널에서 진행하세요.",
    },
  },
};
