const OfficialMulti = require("../../modules/multi/OfficialMulti");
const { ensureOfficialMultiService } = require("../../modules/multi/helpers");
const { makeOfficialMultiEmbed } = require("../../modules/multi/embeds");
const { createOfficialMultiControls } = require("../../modules/multi/components");
const { refreshOfficialMultiMessage } = require("../../modules/multi/message");
const { hasTechRoleOrHigher } = require("../../utils/permissions");

function parseMessageId(customId, prefix) {
  if (!customId.startsWith(prefix)) {
    return null;
  }
  return customId.slice(prefix.length);
}

async function ensureTextChannel(client, channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
    return null;
  }
  return channel;
}

module.exports = [
  {
    prefix: "officialMulti:create:",
    async execute(interaction) {
      const service = await ensureOfficialMultiService(interaction);
      if (!service) {
        return;
      }

      const channelId = parseMessageId(interaction.customId, "officialMulti:create:");
      if (!channelId) {
        await interaction.reply({ content: "채널 정보를 확인하지 못했습니다.", ephemeral: true });
        return;
      }

      const channel = await ensureTextChannel(interaction.client, channelId);
      if (!channel) {
        await interaction.reply({ content: "텍스트 채널에서만 멀티를 생성할 수 있습니다.", ephemeral: true });
        return;
      }

      const multiId = interaction.fields.getTextInputValue("multiId").trim();
      const password = interaction.fields.getTextInputValue("password").trim();

      const multiData = {
        hostId: interaction.user.id,
        channelId,
        messageId: "preview",
        multiId,
        password,
        status: "active",
        createdAt: new Date(),
        participants: [],
        blockedUserIds: []
      };

      const previewMulti = new OfficialMulti(multiData);
      const embed = makeOfficialMultiEmbed(previewMulti, interaction.user);
      const components = createOfficialMultiControls(previewMulti);

      let postedMessage;
      try {
        postedMessage = await channel.send({ embeds: [embed], components });
      } catch (error) {
        console.error("공식 멀티 메시지 전송 실패", error);
        await interaction.reply({ content: "메시지를 전송하지 못했습니다. 권한을 확인해주세요.", ephemeral: true });
        return;
      }

      try {
        await service.createMulti({
          hostId: interaction.user.id,
          channelId,
          messageId: postedMessage.id,
          multiId,
          password,
          status: "active",
          createdAt: new Date(),
          participants: [],
          blockedUserIds: []
        });
        await refreshOfficialMultiMessage(interaction.client, service, postedMessage.id);
        await interaction.reply({ content: "공식 멀티를 생성했습니다.", ephemeral: true });
      } catch (error) {
        console.error("공식 멀티 생성 저장 실패", error);
        await postedMessage.delete().catch(() => null);
        await interaction.reply({ content: "멀티 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", ephemeral: true });
      }
    }
  },
  {
    prefix: "officialMulti:join_modal:",
    async execute(interaction) {
      const service = await ensureOfficialMultiService(interaction);
      if (!service) {
        return;
      }

      const messageId = parseMessageId(interaction.customId, "officialMulti:join_modal:");
      if (!messageId) {
        await interaction.reply({ content: "대상 멀티를 찾지 못했습니다.", ephemeral: true });
        return;
      }

      const multi = service.getByMessageId(messageId);
      if (!multi) {
        await interaction.reply({ content: "이미 종료되었거나 존재하지 않는 멀티입니다.", ephemeral: true });
        return;
      }

      if (multi.status !== "active") {
        await interaction.reply({ content: "현재 참가 신청을 받을 수 없습니다.", ephemeral: true });
        return;
      }

      if (multi.isBlocked(interaction.user.id)) {
        await interaction.reply({ content: "관리자가 참가를 차단했습니다.", ephemeral: true });
        return;
      }
      if (multi.hasParticipant(interaction.user.id)) {
        await interaction.reply({ content: "이미 참가 중입니다.", ephemeral: true });
        return;
      }

      const nickname = interaction.fields.getTextInputValue("nickname").trim();
      const country = interaction.fields.getTextInputValue("country").trim();

      const result = await service.addParticipant(messageId, {
        userId: interaction.user.id,
        nickname,
        country,
        joinedAt: new Date()
      });

      if (result.status === "country_taken") {
        await interaction.reply({ content: "이미 선택된 국가입니다. 다른 국가를 선택해주세요.", ephemeral: true });
        return;
      }
      if (result.status === "already_joined") {
        await interaction.reply({ content: "이미 참가 중입니다.", ephemeral: true });
        return;
      }
      if (result.status === "blocked") {
        await interaction.reply({ content: "관리자가 참가를 차단했습니다.", ephemeral: true });
        return;
      }
      if (result.status === "not_active") {
        await interaction.reply({ content: "현재 참가 신청을 받을 수 없습니다.", ephemeral: true });
        return;
      }
      if (result.status !== "joined") {
        await interaction.reply({ content: "참가 처리 중 문제가 발생했습니다.", ephemeral: true });
        return;
      }

      await refreshOfficialMultiMessage(interaction.client, service, messageId);
      await interaction.reply({ content: "참가 신청이 완료되었습니다!", ephemeral: true });
    }
  },
  {
    prefix: "officialMulti:info_modal:",
    async execute(interaction) {
      const service = await ensureOfficialMultiService(interaction);
      if (!service) {
        return;
      }

      const messageId = parseMessageId(interaction.customId, "officialMulti:info_modal:");
      if (!messageId) {
        await interaction.reply({ content: "대상 멀티를 찾지 못했습니다.", ephemeral: true });
        return;
      }

      const multi = service.getByMessageId(messageId);
      if (!multi) {
        await interaction.reply({ content: "이미 종료되었거나 존재하지 않는 멀티입니다.", ephemeral: true });
        return;
      }

      if (multi.status === "ended") {
        await interaction.reply({ content: "이미 종료된 멀티입니다.", ephemeral: true });
        return;
      }

      const member = interaction.member;
      const isHost = multi.hostId === interaction.user.id;
      const hasPermission = isHost || hasTechRoleOrHigher(member);
      if (!hasPermission) {
        await interaction.reply({ content: "정보를 수정할 권한이 없습니다.", ephemeral: true });
        return;
      }

      const multiId = interaction.fields.getTextInputValue("multiId").trim();
      const password = interaction.fields.getTextInputValue("password").trim();

      await service.updateInfo(messageId, { multiId, password });
      await refreshOfficialMultiMessage(interaction.client, service, messageId);

      await interaction.reply({ content: "멀티 정보를 갱신했습니다.", ephemeral: true });
    }
  }
];
