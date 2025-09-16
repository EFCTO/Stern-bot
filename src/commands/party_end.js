const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { makeNoticeEmbed } = require("../utils/embed");
const { closeParty } = require("../modules/party/lifecycle");
const { ensurePartyService } = require("../modules/party/helpers");

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
    const partyService = await ensurePartyService(interaction);
    if (!partyService) return;

    const messageId = interaction.options.getString("message_id");
    let party = null;

    if (messageId) {
      party = partyService.getByMessageId(messageId);
    }
    if (!party) {
      party = partyService.getLastPartyByHostInChannel(interaction.channel.id, interaction.user.id);
    }
    if (!party) {
      return await interaction.reply({
        embeds: [makeNoticeEmbed("오류", "대상 파티를 찾지 못했어요.")],
        ephemeral: true
      });
    }

    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
    if (interaction.user.id !== party.hostId && !isAdmin) {
      return await interaction.reply({
        embeds: [makeNoticeEmbed("권한 부족", "방장 또는 관리자만 종료할 수 있어요.")],
        ephemeral: true
      });
    }

    await interaction.reply({
      embeds: [makeNoticeEmbed("처리중", "파티를 종료합니다.")],
      ephemeral: true
    });

    try {
      await closeParty(interaction.client, partyService, party, "방장/관리자 종료");
      await interaction.editReply({ embeds: [makeNoticeEmbed("완료", "파티를 종료했습니다.")] });
    } catch (error) {
      console.error("파티 종료 처리 실패", error);
      await interaction.editReply({
        embeds: [makeNoticeEmbed("오류", "파티 종료 처리 중 문제가 발생했습니다. 관리자에게 문의해주세요.")]
      });
    }
  }
};
