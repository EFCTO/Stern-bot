const { SlashCommandBuilder } = require("discord.js");
const { ensureTechRole } = require("../utils/permissions");
const { ensureOfficialMultiService } = require("../modules/multi/helpers");
const { makeNoticeEmbed } = require("../utils/embed");
const { refreshOfficialMultiMessage } = require("../modules/multi/message");
const { OFFICIAL_MULTI_ROLE_ID } = require("../modules/multi/constants");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("multi_start")
    .setDescription("공식 멀티 시작을 알립니다")
    .setDMPermission(false)
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

    const result = await service.markStarted(multi.messageId);
    if (result.status === "already_started") {
      await interaction.reply({
        embeds: [makeNoticeEmbed("안내", "이미 시작된 멀티입니다.")],
        ephemeral: true
      });
      return;
    }

    await refreshOfficialMultiMessage(interaction.client, service, multi.messageId);

    const channel = interaction.channel;
    if (channel) {
      await channel.send({ content: `<@&${OFFICIAL_MULTI_ROLE_ID}> 공식 멀티가 시작되었습니다!` }).catch(error => {
        console.error("공식 멀티 역할 멘션 실패", error);
      });
    }

    await interaction.reply({
      embeds: [makeNoticeEmbed("완료", "공식 멀티 시작을 알렸습니다.")],
      ephemeral: true
    });
  }
};
