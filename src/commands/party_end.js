const { SlashCommandBuilder } = require("discord.js");
const { makeNoticeEmbed } = require("../utils/embed");
const { closeParty } = require("../modules/party/lifecycle");
const { ensurePartyService } = require("../modules/party/helpers");
const { ensureTechRole } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("party_end")
    .setDescription("현재 파티를 종료합니다")
    .addStringOption(opt =>
      opt.setName("message_id")
        .setDescription("파티 메시지 ID (선택)")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) {
      return;
    }

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
      party = partyService.getLatestPartyInChannel?.(interaction.channel.id) ?? null;
    }
    if (!party) {
      return await interaction.reply({
        embeds: [makeNoticeEmbed("오류", "종료할 파티를 찾지 못했어요.")],
        ephemeral: true
      });
    }

    await interaction.reply({
      embeds: [makeNoticeEmbed("처리 중", "파티를 종료하고 있어요...")],
      ephemeral: true
    });

    try {
      await closeParty(interaction.client, partyService, party, "기술팀 종료");
      await interaction.editReply({ embeds: [makeNoticeEmbed("완료", "파티를 종료했어요.")] });
    } catch (error) {
      console.error("파티 종료 처리 실패", error);
      await interaction.editReply({
        embeds: [makeNoticeEmbed("오류", "파티 종료 처리 중 문제가 발생했어요. 관리자에게 문의해 주세요.")]
      });
    }
  }
};
