const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolepanel")
    .setDescription("역할 선택 패널을 이 채널에 게시합니다.")
    .setDMPermission(false),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("역할 선택 패널")
      .setDescription(
        [
          "아래 버튼을 눌러 원하는 **역할**을 켜고(추가) 끌 수(제거) 있습니다.",
          "",
          "— **재단 유저** : *SCP SL 재단 유저 권한을 받으실 수 있습니다*",
          "────────────────────────────────",
          "— **방송국 유저** : *위드고 유튜브 업로드 혹은 방송 시작 알림을 받습니다.*",
          "맨션이 잦습니다. 일반 SCP SL 유저분들께는 **비추천**합니다.",
          "────────────────────────────────",
          "— **전쟁관 방문객** : *하츠 오브 아이언4, 컴퍼니 오브 히어로즈3 등*",
          "유저 주최 **비공식 멀티** 참여용 역할입니다.",
          "전쟁관의 **공식 전쟁관 유저** 역할은 https://discord.com/channels/879204407496028201/1313044803801321492 채널에서 별도 인증해주세요.",
        ].join("\n")
      )
      .setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("role:foundation")
        .setLabel("재단 유저")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("role:broadcast")
        .setLabel("방송국 유저")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("role:warvisitor")
        .setLabel("전쟁관 방문객")
        .setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
