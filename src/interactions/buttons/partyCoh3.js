const { makeCoh3Embed } = require("../../modules/party/embeds");
const { createInfoModal, CUSTOM_IDS } = require("../../modules/party/setup/coh3");
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
        return interaction.reply({ content: "먼저 /coh3_create 명령어로 파티 생성을 시작해주세요.", ephemeral: true });
      }
      const modal = createInfoModal(draft);
      await interaction.showModal(modal);
    }
  },
  {
    id: CUSTOM_IDS.factionButton,
    async execute(interaction) {
      const partyService = await ensurePartyService(interaction);
      if (!partyService) return;

      let draft = partyService.getDraft(interaction.user.id);
      if (!draft) {
        return interaction.reply({ content: "먼저 정보를 입력해주세요.", ephemeral: true });
      }
      const order = ["상관없음", "연합군", "추축군"];
      const currentIndex = order.indexOf(draft.faction || "상관없음");
      const nextFaction = order[(currentIndex + 1) % order.length];
      draft = partyService.updateDraft(interaction.user.id, { faction: nextFaction });
      await interaction.reply({ content: `진영이 ${draft.faction}으로 변경되었습니다.`, ephemeral: true });
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

      const embed = makeCoh3Embed(draft, interaction.user);
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
      const finalizedEmbed = makeCoh3Embed(party, host);
      await message.edit({ embeds: [finalizedEmbed], components: createPartyControls(party) }).catch(error => {
        console.error("파티 메시지 초기화 실패", error);
      });

      await interaction.reply({ content: "파티가 생성되었습니다.", ephemeral: true });
    }
  }
];
