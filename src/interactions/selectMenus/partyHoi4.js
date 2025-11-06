const { ensurePartyService } = require("../../modules/party/helpers");
const { CUSTOM_IDS, createSetupComponents } = require("../../modules/party/setup/hoi4");

async function updateEphemeralReply(interaction, draft) {
  try {
    await interaction.update({ components: createSetupComponents(draft) });
  } catch (_) {
    await interaction.reply({ content: "설정이 업데이트되었습니다.", ephemeral: true }).catch(() => null);
  }
}

module.exports = [
  {
    id: CUSTOM_IDS.selectMode,
    async execute(interaction) {
      const ps = await ensurePartyService(interaction);
      if (!ps) return;
      const draft = ps.getDraft(interaction.user.id);
      if (!draft) return interaction.reply({ content: "먼저 /hoi4_create 로 설정을 여세요.", ephemeral: true });
      const value = interaction.values?.[0] ?? draft.mode;
      const updated = ps.updateDraft(interaction.user.id, { mode: value });
      await updateEphemeralReply(interaction, updated);
    }
  },
  {
    id: CUSTOM_IDS.selectSlots,
    async execute(interaction) {
      const ps = await ensurePartyService(interaction);
      if (!ps) return;
      const draft = ps.getDraft(interaction.user.id);
      if (!draft) return interaction.reply({ content: "먼저 /hoi4_create 로 설정을 여세요.", ephemeral: true });
      const raw = interaction.values?.[0];
      const slots = parseInt(raw, 10);
      if (!Number.isInteger(slots) || slots <= 0) {
        return interaction.reply({ content: "인원은 1 이상 정수로 선택하세요.", ephemeral: true });
      }
      const updated = ps.updateDraft(interaction.user.id, { maxSlots: slots });
      await updateEphemeralReply(interaction, updated);
    }
  },
  {
    id: CUSTOM_IDS.selectVersion,
    async execute(interaction) {
      const ps = await ensurePartyService(interaction);
      if (!ps) return;
      const draft = ps.getDraft(interaction.user.id);
      if (!draft) return interaction.reply({ content: "먼저 /hoi4_create 로 설정을 여세요.", ephemeral: true });
      const value = interaction.values?.[0] ?? draft.hoi4Version;
      const updated = ps.updateDraft(interaction.user.id, { hoi4Version: value });
      await updateEphemeralReply(interaction, updated);
    }
  },
  {
    id: CUSTOM_IDS.selectDuration,
    async execute(interaction) {
      const ps = await ensurePartyService(interaction);
      if (!ps) return;
      const draft = ps.getDraft(interaction.user.id);
      if (!draft) return interaction.reply({ content: "먼저 /hoi4_create 로 설정을 여세요.", ephemeral: true });
      const raw = interaction.values?.[0];
      const hours = parseInt(raw, 10);
      if (!Number.isInteger(hours) || hours <= 0) {
        return interaction.reply({ content: "시간은 1 이상 정수로 선택하세요.", ephemeral: true });
      }
      const updated = ps.updateDraft(interaction.user.id, { durationHours: hours });
      await updateEphemeralReply(interaction, updated);
    }
  }
];

