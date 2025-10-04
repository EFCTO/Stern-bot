const { SlashCommandBuilder } = require("discord.js");
const { ensureTechRole } = require("../utils/permissions");
const { ensureOfficialMultiService } = require("../modules/multi/helpers");
const { makeNoticeEmbed } = require("../utils/embed");
const { refreshOfficialMultiMessage } = require("../modules/multi/message");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("multi_block")
    .setDescription("공식 멀티 참가를 차단합니다")
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("차단할 유저")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("대상 멀티 메시지 ID (생략 시 현재 채널의 최신 멀티)")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) {
      return;
    }

    const service = await ensureOfficialMultiService(interaction);
    if (!service) {
      return;
    }

    const targetUser = interaction.options.getUser("target", true);
    const explicitMessageId = interaction.options.getString("message_id");

    let multi = null;
    if (explicitMessageId) {
      multi = service.getByMessageId(explicitMessageId);
    }
    if (!multi && interaction.channel) {
      multi = service.getLatestInChannel(interaction.channel.id);
    }
    if (!multi) {
      await interaction.reply({
        embeds: [makeNoticeEmbed("실패", "대상 멀티를 찾지 못했습니다.")],
        ephemeral: true
      });
      return;
    }

    const result = await service.blockUser(multi.messageId, targetUser.id);
    await refreshOfficialMultiMessage(interaction.client, service, multi.messageId);

    const description = result.status === "already_blocked"
      ? `<@${targetUser.id}> 님은 이미 차단된 상태입니다.`
      : `<@${targetUser.id}> 님을 공식 멀티에서 차단했습니다.`;

    await interaction.reply({
      embeds: [makeNoticeEmbed("처리 완료", description)],
      ephemeral: true
    });
  }
};
