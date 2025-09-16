const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { makeCoh3Embed, PARTIES } = require("./partyUtils");

class Coh3SetupView extends ActionRowBuilder {
  constructor(host) {
    super();
    this.host = host;
    this.partyData = {
      hostId: host.id,
      members: [host.id],
      createdAt: new Date(),
      game: "COH3",
      mode: "빠른대전",
      faction: "상관없음",
      maxSlots: 4
    };
    this.addComponents(
      new ButtonBuilder().setCustomId("coh3_info").setLabel("정보 입력/수정").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("coh3_faction").setLabel("진영 선택").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("coh3_create").setLabel("생성").setStyle(ButtonStyle.Success)
    );
  }
}

async function handleCoh3Interaction(interaction) {
  const customId = interaction.customId;
  if (customId === "coh3_info") {
    const modal = new ModalBuilder()
      .setCustomId("coh3_info_modal")
      .setTitle("COH3 정보 입력");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("mode").setLabel("게임 모드").setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("slots").setLabel("최대 인원").setStyle(TextInputStyle.Short).setRequired(false)
      )
    );
    await interaction.showModal(modal);
  } else if (customId === "coh3_faction") {
    const party = getPartyByHost(interaction.user.id);
    if (!party) return await interaction.reply({ content: "먼저 파티를 생성해주세요.", ephemeral: true });
    party.faction = party.faction === "상관없음" ? "연합군" : party.faction === "연합군" ? "추축군" : "상관없음";
    await interaction.reply({ content: `진영이 ${party.faction}으로 변경되었습니다.`, ephemeral: true });
  } else if (customId === "coh3_create") {
    const party = getPartyByHost(interaction.user.id);
    if (!party) return await interaction.reply({ content: "먼저 정보를 입력해주세요.", ephemeral: true });
    const msg = await interaction.channel.send({ embeds: [makeCoh3Embed(party, interaction.user)] });
    party.messageId = msg.id;
    party.channelId = interaction.channel.id;
    PARTIES.put(msg.id, party);
    await interaction.reply({ content: "파티가 생성되었습니다.", ephemeral: true });
  }
}

function getPartyByHost(hostId) {
  for (const p of PARTIES._byMessage.values()) {
    if (p.hostId === hostId && !p.endedAt) return p;
  }
  return null;
}

async function handleCoh3Modal(interaction) {
  if (interaction.customId !== "coh3_info_modal") return;
  const party = getPartyByHost(interaction.user.id);
  if (!party) return await interaction.reply({ content: "파티를 찾지 못했습니다.", ephemeral: true });
  party.mode = interaction.fields.getTextInputValue("mode") || party.mode;
  const slots = parseInt(interaction.fields.getTextInputValue("slots"));
  if (!isNaN(slots)) party.maxSlots = slots;
  await interaction.reply({ content: "정보가 업데이트되었습니다.", ephemeral: true });
}

module.exports = { Coh3SetupView, handleCoh3Interaction, handleCoh3Modal };
