const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { PARTIES, endPartyAndEdit, makeNoticeEmbed } = require("../structures/partyUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("party_end")
    .setDescription("(방장/관리자) 현재 파티를 종료합니다.")
    .addStringOption(opt =>
      opt.setName("message_id")
        .setDescription("파티 메시지 ID (선택)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const messageId = interaction.options.getString("message_id");
    let party = null;

    if (messageId && !isNaN(messageId)) {
      party = PARTIES.get(Number(messageId));
    }
    if (!party) {
      party = PARTIES.lastPartyByHostInChannel(interaction.channel.id, interaction.user.id);
    }
    if (!party) {
      return await interaction.reply({ embeds: [makeNoticeEmbed("오류", "대상 파티를 찾지 못했어요.")], ephemeral: true });
    }

    if (interaction.user.id !== party.hostId && !interaction.member.permissions.has("Administrator")) {
      return await interaction.reply({ embeds: [makeNoticeEmbed("권한 부족", "방장 또는 관리자만 종료할 수 있어요.")], ephemeral: true });
    }

    await interaction.reply({ embeds: [makeNoticeEmbed("처리중", "파티를 종료합니다.")], ephemeral: true });
    await endPartyAndEdit(interaction, party, "방장/관리자 종료");
  }
};
