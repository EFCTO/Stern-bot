const { hasTechRoleOrHigher } = require("../../utils/permissions");
const { ensureOfficialMultiService } = require("../../modules/multi/helpers");
const { createOfficialMultiJoinModal, createOfficialMultiInfoModal } = require("../../modules/multi/modals");
const { createLeaveConfirmationComponents } = require("../../modules/multi/components");
const { refreshOfficialMultiMessage } = require("../../modules/multi/message");

async function handleMissingMulti(interaction) {
  await interaction.message.edit({ components: [] }).catch(() => null);
  await interaction.reply({ content: "공식 멀티 정보를 찾지 못했습니다.", ephemeral: true }).catch(() => null);
}

module.exports = [
  {
    id: "officialMulti:join",
    async execute(interaction) {
      const service = await ensureOfficialMultiService(interaction);
      if (!service) {
        return;
      }

      const messageId = interaction.message?.id;
      const multi = messageId ? service.getByMessageId(messageId) : null;
      if (!multi) {
        await handleMissingMulti(interaction);
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

      const modal = createOfficialMultiJoinModal(messageId);
      await interaction.showModal(modal);
    }
  },
  {
    id: "officialMulti:leave",
    async execute(interaction) {
      const service = await ensureOfficialMultiService(interaction);
      if (!service) {
        return;
      }

      const messageId = interaction.message?.id;
      const multi = messageId ? service.getByMessageId(messageId) : null;
      if (!multi) {
        await handleMissingMulti(interaction);
        return;
      }

      if (multi.status === "ended") {
        await interaction.reply({ content: "이미 종료된 멀티입니다.", ephemeral: true });
        return;
      }

      if (!multi.hasParticipant(interaction.user.id)) {
        await interaction.reply({ content: "현재 참가 중이 아닙니다.", ephemeral: true });
        return;
      }

      await interaction.reply({
        content: "정말 탈퇴하시겠습니까?",
        components: createLeaveConfirmationComponents(messageId),
        ephemeral: true
      });
    }
  },
  {
    prefix: "officialMulti:leave_confirm:",
    async execute(interaction) {
      const service = await ensureOfficialMultiService(interaction);
      if (!service) {
        return;
      }

      const [, , messageId] = interaction.customId.split(":");
      if (!messageId) {
        await interaction.update({ content: "대상 멀티를 찾지 못했습니다.", components: [] }).catch(() => null);
        return;
      }

      const result = await service.removeParticipant(messageId, interaction.user.id);
      if (result.status === "not_found") {
        await interaction.update({ content: "공식 멀티 정보를 찾지 못했습니다.", components: [] }).catch(() => null);
        return;
      }
      if (result.status === "not_participant") {
        await interaction.update({ content: "이미 탈퇴한 상태입니다.", components: [] }).catch(() => null);
        return;
      }

      await refreshOfficialMultiMessage(interaction.client, service, messageId);
      await interaction.update({ content: "탈퇴 처리되었습니다.", components: [] }).catch(() => null);
    }
  },
  {
    prefix: "officialMulti:leave_cancel:",
    async execute(interaction) {
      await interaction.update({ content: "탈퇴를 취소했습니다.", components: [] }).catch(() => null);
    }
  },
  {
    id: "officialMulti:info",
    async execute(interaction) {
      const service = await ensureOfficialMultiService(interaction);
      if (!service) {
        return;
      }

      const messageId = interaction.message?.id;
      const multi = messageId ? service.getByMessageId(messageId) : null;
      if (!multi) {
        await handleMissingMulti(interaction);
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

      const modal = createOfficialMultiInfoModal(messageId, multi);
      await interaction.showModal(modal);
    }
  }
];
