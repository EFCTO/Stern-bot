const { SlashCommandBuilder } = require("discord.js");
const { PARTIES, endPartyAndEdit, makeNoticeEmbed } = require("../structures/partyUtils");

const SPECIAL_DESTROY_USER_ID = process.env.SPECIAL_DESTROY_USER_ID || "0";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("party_destroy")
    .setDescription("(관리자/특정계정) 파티 강제 폭파")
    .addStringOption(opt =>
      opt.setName("message_id")
        .setDescription("파티 메시지 ID (선택)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has("Administrator");
    const isSpecial = interaction.user.id === SPECIAL_DESTROY_USER_ID;
    if (!isAdmin && !isSpecial) {
      return await interaction.reply({ embeds: [makeNoticeEmbed("권한 부족", "관리자 또는 허용된 계정만 사용 가능")], ephemeral: true });
    }

    const messageId = interaction.options.getString("message_id");
    let party = null;

    if (messageId && !isNaN(messageId)) {
      party = PARTIES.get(Number(messageId));
    }
    if (!party) {
      const candidates = [...PARTIES._byMessage.values()]
        .filter(p => p.channelId === interaction.channel.id && !p.endedAt);
      if (candidates.length > 0) {
        party = candidates.sort((a, b) => b.createdAt - a.createdAt)[0];
      }
    }

    if (!party) {
      return await interaction.reply({ embeds: [makeNoticeEmbed("오류", "이 채널에서 진행 중인 파티를 찾지 못했어요.")], ephemeral: true });
    }

    await interaction.reply({ embeds: [makeNoticeEmbed("처리중", "파티를 강제 종료합니다.")], ephemeral: true });
    await endPartyAndEdit(interaction, party, "관리자/특정계정 강제 폭파");
  }
};
