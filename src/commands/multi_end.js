const { SlashCommandBuilder } = require("discord.js");
const { ensureOfficialMultiService } = require("../modules/multi/helpers");
const { makeNoticeEmbed } = require("../utils/embed");
const { refreshOfficialMultiMessage } = require("../modules/multi/message");
const { hasTechRoleOrHigher } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("multi_end")
    .setDescription("공식 멀티를 종료합니다")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("대상 멀티 메시지 ID (생략 시 현재 채널의 최신 멀티)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const service = await ensureOfficialMultiService(interaction);
    if (!service) {
      return;
    }

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

    const member = interaction.member;
    const isHost = multi.hostId === interaction.user.id;
    const hasPermission = hasTechRoleOrHigher(member);
    if (!isHost && !hasPermission) {
      await interaction.reply({
        embeds: [makeNoticeEmbed("권한 없음", "해당 멀티를 종료할 권한이 없습니다.")],
        ephemeral: true
      });
      return;
    }

    const result = await service.endMulti(multi.messageId);
    if (result.status === "already_ended") {
      await interaction.reply({
        embeds: [makeNoticeEmbed("안내", "이미 종료된 멀티입니다.")],
        ephemeral: true
      });
      return;
    }

    await refreshOfficialMultiMessage(interaction.client, service, multi.messageId);

    await interaction.reply({
      embeds: [makeNoticeEmbed("완료", "공식 멀티를 종료했습니다.")],
      ephemeral: true
    });
  }
};
