const { makeCoh3Embed, makeHoi4Embed } = require("../../modules/party/embeds");
const { createPartyControls } = require("../../modules/party/components");
const { fetchUserSafe, ensurePartyService } = require("../../modules/party/helpers");

function resolveEmbed(party, host) {
  if (party.game === "COH3") {
    return makeCoh3Embed(party, host);
  }
  return makeHoi4Embed(party, host);
}

async function refreshPartyMessage(interaction, party) {
  const host = await fetchUserSafe(interaction.client, interaction.guild, party.hostId) || interaction.user;
  const embed = resolveEmbed(party, host);
  const components = createPartyControls(party);
  await interaction.message.edit({ embeds: [embed], components }).catch(error => {
    console.error("파티 메시지 갱신 실패", error);
  });
}

async function handleMissingParty(interaction) {
  await interaction.message.edit({ components: [] }).catch(() => null);
  await interaction.reply({ content: "이 파티는 더 이상 활성 상태가 아니에요.", ephemeral: true });
}

module.exports = [
  {
    id: "party:join",
    async execute(interaction) {
      const partyService = await ensurePartyService(interaction);
      if (!partyService) return;

      const messageId = interaction.message?.id;
      if (!messageId) {
        await interaction.reply({ content: "파티 정보를 찾지 못했어요.", ephemeral: true });
        return;
      }

      const result = await partyService.addMember(messageId, interaction.user.id);
      if (result.status === "not_found") {
        await handleMissingParty(interaction);
        return;
      }
      if (result.status === "already_member") {
        await interaction.reply({ content: "이미 참가 중인 파티입니다.", ephemeral: true });
        return;
      }
      if (result.status === "full") {
        await interaction.reply({ content: "파티 인원이 가득 찼어요.", ephemeral: true });
        return;
      }

      await refreshPartyMessage(interaction, result.party);
      await interaction.reply({ content: "파티에 참가했어요!", ephemeral: true });
    }
  },
  {
    id: "party:leave",
    async execute(interaction) {
      const partyService = await ensurePartyService(interaction);
      if (!partyService) return;

      const messageId = interaction.message?.id;
      if (!messageId) {
        await interaction.reply({ content: "파티 정보를 찾지 못했어요.", ephemeral: true });
        return;
      }

      const result = await partyService.removeMember(messageId, interaction.user.id);
      if (result.status === "not_found") {
        await handleMissingParty(interaction);
        return;
      }
      if (result.status === "is_host") {
        await interaction.reply({ content: "방장은 파티를 종료하거나 양도해야 합니다.", ephemeral: true });
        return;
      }
      if (result.status === "not_member") {
        await interaction.reply({ content: "해당 파티에 참가하고 있지 않아요.", ephemeral: true });
        return;
      }

      await refreshPartyMessage(interaction, result.party);
      await interaction.reply({ content: "파티에서 나갔어요.", ephemeral: true });
    }
  }
];
