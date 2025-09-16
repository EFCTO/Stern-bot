const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { makeNoticeEmbed } = require("../utils/embed");
const { closeParty } = require("../modules/party/lifecycle");
const { ensurePartyService } = require("../modules/party/helpers");

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
    const partyService = await ensurePartyService(interaction);
    if (!partyService) return;

    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
    const isSpecial = interaction.user.id === SPECIAL_DESTROY_USER_ID;
    if (!isAdmin && !isSpecial) {
      return await interaction.reply({
        embeds: [makeNoticeEmbed("권한 부족", "관리자 또는 허용된 계정만 사용 가능")],
        ephemeral: true
      });
    }

    const messageId = interaction.options.getString("message_id");
    let party = null;

    if (messageId) {
      party = partyService.getByMessageId(messageId);
    }
    if (!party) {
      party = partyService.getLatestPartyInChannel(interaction.channel.id);
    }

    if (!party) {
      return await interaction.reply({
        embeds: [makeNoticeEmbed("오류", "이 채널에서 진행 중인 파티를 찾지 못했어요.")],
        ephemeral: true
      });
    }

    await interaction.reply({
      embeds: [makeNoticeEmbed("처리중", "파티를 강제 종료합니다.")],
      ephemeral: true
    });

    try {
      await closeParty(interaction.client, partyService, party, "관리자/특정계정 강제 폭파");
      await interaction.editReply({ embeds: [makeNoticeEmbed("완료", "파티를 강제 종료했습니다.")] });
    } catch (error) {
      console.error("파티 강제 종료 실패", error);
      await interaction.editReply({
        embeds: [makeNoticeEmbed("오류", "파티 강제 종료 중 오류가 발생했습니다. 관리자에게 문의해주세요.")]
      });
    }
  }
};
