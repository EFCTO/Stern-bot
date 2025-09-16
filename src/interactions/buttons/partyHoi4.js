const { makeHoi4Embed } = require("../../modules/party/embeds");
const { createInfoModal, CUSTOM_IDS } = require("../../modules/party/setup/hoi4");
const { createPartyControls } = require("../../modules/party/components");
const { fetchUserSafe, ensurePartyService } = require("../../modules/party/helpers");

module.exports = [
  {
    id: CUSTOM_IDS.infoButton,
    async execute(interaction) {
      const partyService = await ensurePartyService(interaction);
      if (!partyService) return;

      const draft = partyService.getDraft(interaction.user.id);
      if (!draft) {
        return interaction.reply({ content: "먼저 /hoi4_create 명령어로 파티 생성을 시작해주세요.", ephemeral: true });
      }
      const modal = createInfoModal(draft);
      await interaction.showModal(modal);
    }
  },
  {
    id: CUSTOM_IDS.modeButton,
    async execute(interaction) {
      const partyService = await ensurePartyService(interaction);
      if (!partyService) return;

      let draft = partyService.getDraft(interaction.user.id);
      if (!draft) {
        return interaction.reply({ content: "먼저 정보를 입력해주세요.", ephemeral: true });
      }
      const nextMode = draft.mode === "모드" ? "바닐라" : "모드";
      draft = partyService.updateDraft(interaction.user.id, { mode: nextMode });
      await interaction.reply({ content: `모드가 ${draft.mode}로 변경되었습니다.`, ephemeral: true });
    }
  },
  {
    id: CUSTOM_IDS.createButton,
    async execute(interaction) {
      const partyService = await ensurePartyService(interaction);
      if (!partyService) return;

      const draft = partyService.getDraft(interaction.user.id);
      if (!draft) {
        return interaction.reply({ content: "먼저 정보를 입력해주세요.", ephemeral: true });
      }

      const embed = makeHoi4Embed(draft, interaction.user);
      const message = await interaction.channel.send({ embeds: [embed], components: createPartyControls(draft) });

      let party;
      try {
        party = await partyService.activateDraft(interaction.user.id, interaction.channel.id, message.id);
      } catch (error) {
        console.error("파티 승격 실패", error);
        await message.delete().catch(() => null);
        await interaction.reply({ content: "파티 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", ephemeral: true });
        return;
      }

      const host = await fetchUserSafe(interaction.client, interaction.guild, party.hostId) || interaction.user;
      const finalizedEmbed = makeHoi4Embed(party, host);
      await message.edit({ embeds: [finalizedEmbed], components: createPartyControls(party) }).catch(error => {
        console.error("파티 메시지 초기화 실패", error);
      });

      await interaction.reply({ content: "파티가 생성되었습니다.", ephemeral: true });
    }
  }
];
