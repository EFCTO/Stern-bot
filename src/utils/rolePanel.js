const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

function buildRolePanelEmbed() {
  return new EmbedBuilder()
    .setTitle("역할 선택 패널")
    .setDescription(
      [
        "아래 버튼을 눌러 원하는 **역할**을 켜고(추가) 끌 수(제거) 있습니다.",
        "",
        "• **방송국 유저** : *위드고 유튜브 업로드 혹은 방송 시작 알림을 받습니다.*",
        "  맨션이 잦습니다. 일반 유저분들께는 **비추천**합니다",
        "━━━━━━━━━━━━━━",
        "• **도서관 유저** : *프로젝트 문 관련*",
        "  유저 역할입니다.",
        "━━━━━━━━━━━━━━",
        "• **군수부 유저** : *컴퍼니 오브 히어로즈 시리즈의*",
        "  유저 주최 **비공식 멀티** 참여자용 역할입니다.",
        "━━━━━━━━━━━━━━",
        "• **전략부 유저** : *하츠 오브 아이언 시리즈의*",
        "  유저 주최 **비공식 멀티** 참여자용 역할입니다.",
        "  공식 멀티 참여는 https://discord.com/channels/879204407496028201/1313044803801321492 에서 별도 인증해주세요",
        
      ].join("\n")
    )
    .setColor(0x5865f2);
}

function buildRolePanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("role:broadcast")
        .setLabel("방송국 유저")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("role:libraryuser")
        .setLabel("도서관 유저")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("role:militaryuser")
        .setLabel("군수부 유저")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("role:strategicuser")
        .setLabel("전략부 유저")
        .setStyle(ButtonStyle.Success),
    ),
  ];
}

function buildRolePanelPayload() {
  return {
    embed: buildRolePanelEmbed(),
    components: buildRolePanelComponents(),
  };
}

module.exports = {
  buildRolePanelEmbed,
  buildRolePanelComponents,
  buildRolePanelPayload,
};
