const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { makeHoi4Embed, PARTIES } = require("./partyUtils");

class Hoi4SetupView extends ActionRowBuilder {
  constructor(host) {
    super();
    this.host = host;
    this.partyData = {
      hostId: host.id,
      members: [host.id],
      createdAt: new Date(),
      game: "HOI4",
      hoi4ServerId: null,
      hoi4Pw: null,
      hoi4Version: null,
      hoi4Mods: null,
      mode: "바닐라"
    };
    this.addComponents(
      new ButtonBuilder().setCustomId("hoi4_info").setLabel("정보 입력/수정").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("hoi4_mode").setLabel("모드 선택").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("hoi4_create").setLabel("생성").setStyle(ButtonStyle.Success)
    );
  }
}

async function handleHoi4Interaction(interaction) {
  const customId = interaction.customId;
  if (customId === "hoi4_info") {
    const modal = new ModalBuilder()
      .setCustomId("hoi4_info_modal")
      .setTitle("HOI4 정보 입력");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("serverId").setLabel("서버 ID").setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pw").setLabel("비밀번호").setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("version").setLabel("버전").setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("mods").setLabel("모드").setStyle(TextInputStyle.Paragraph).setRequired(false)
      )
    );
    await interaction.showModal(modal);
  } else if (customId === "hoi4_mode") {
    const party = getPartyByHost(interaction.user.id);
    if (!party) return await interaction.reply({ content: "먼저 파티를 생성해주세요.", ephemeral: true });
    party.mode = party.mode === "바닐라" ? "모드" : "바닐라";
    await interaction.reply({ content: `모드가 ${party.mode}로 변경되었습니다.`, ephemeral: true });
  } else if (customId === "hoi4_create") {
    const party = getPartyByHost(interaction.user.id);
    if (!party) return await interaction.reply({ content: "먼저 정보를 입력해주세요.", ephemeral: true });
    const msg = await interaction.channel.send({ embeds: [makeHoi4Embed(party, interaction.user)] });
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

async function handleHoi4Modal(interaction) {
  if (interaction.customId !== "hoi4_info_modal") return;
  const party = getPartyByHost(interaction.user.id);
  if (!party) return await interaction.reply({ content: "파티를 찾지 못했습니다.", ephemeral: true });
  party.hoi4ServerId = interaction.fields.getTextInputValue("serverId") || null;
  party.hoi4Pw = interaction.fields.getTextInputValue("pw") || null;
  party.hoi4Version = interaction.fields.getTextInputValue("version") || null;
  party.hoi4Mods = interaction.fields.getTextInputValue("mods") || null;
  await interaction.reply({ content: "정보가 업데이트되었습니다.", ephemeral: true });
}

module.exports = { Hoi4SetupView, handleHoi4Interaction, handleHoi4Modal };
