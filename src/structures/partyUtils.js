const { EmbedBuilder, AllowedMentions, ActionRowBuilder } = require("discord.js");
const Party = require("./Party");

class PartyStore {
  constructor() {
    this._byMessage = new Map();
  }

  put(messageId, party) {
    this._byMessage.set(messageId, party);
  }

  get(messageId) {
    return this._byMessage.get(messageId);
  }

  remove(messageId) {
    this._byMessage.delete(messageId);
  }

  lastPartyByHostInChannel(channelId, hostId) {
    const parties = [...this._byMessage.values()].filter(
      p => p.channelId === channelId && p.hostId === hostId && !p.endedAt
    );
    if (parties.length === 0) return null;
    return parties.sort((a, b) => b.createdAt - a.createdAt)[0];
  }
}

const PARTIES = new PartyStore();

function fmtTime(date) {
  const pad = n => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function makeNoticeEmbed(title, desc, color = 0x5865f2) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setTimestamp(new Date());
}

function participantsBlock(party, limit = 20) {
  if (!party.members || party.members.length === 0) return "없음";
  const ids = party.members.slice(0, limit);
  const rest = party.members.length - ids.length;
  let text = "  • " + ids.map(id => `<@${id}>`).join("\n  • ");
  if (rest > 0) text += `\n  • …외 ${rest}명`;
  return text;
}

function makeCoh3Embed(party, author) {
  const embed = new EmbedBuilder()
    .setTitle("COH3 파티 모집")
    .setColor(0x5865f2)
    .setTimestamp(new Date())
    .setAuthor({ name: author.displayName || author.username, iconURL: author.displayAvatarURL() });

  embed.addFields(
    { name: "게임모드", value: party.mode || "빠른대전", inline: true },
    { name: "인원", value: `${party.members.length}/${party.maxSlots || 0}`, inline: true },
    { name: "진영", value: party.faction || "상관없음", inline: true },
    { name: "시작시간", value: fmtTime(party.createdAt), inline: false },
    { name: `참가자 (${party.members.length}명)`, value: participantsBlock(party), inline: false }
  );

  embed.setFooter({ text: "참가/탈퇴 버튼으로 변경 · 방장은 /party_end /party_transfer 사용" });
  return embed;
}

function makeHoi4Embed(party, author) {
  const embed = new EmbedBuilder()
    .setTitle("HOI4 파티 모집")
    .setColor(0x57f287)
    .setTimestamp(new Date())
    .setAuthor({ name: author.displayName || author.username, iconURL: author.displayAvatarURL() });

  embed.addFields(
    { name: "게임모드", value: party.mode || "바닐라", inline: true },
    { name: "시작시간", value: fmtTime(party.createdAt), inline: true },
    { name: "ID", value: party.hoi4ServerId || "미입력", inline: true },
    { name: "PW", value: party.hoi4Pw || "없음", inline: true },
    { name: "버전", value: party.hoi4Version || "미입력", inline: true }
  );
  if (party.mode === "모드") {
    embed.addFields({ name: "모드", value: party.hoi4Mods || "미입력", inline: false });
  }
  embed.addFields({ name: `참가자 (${party.members.length}명)`, value: participantsBlock(party), inline: false });

  embed.setFooter({ text: "참가/탈퇴 버튼으로 변경 · 방장은 /party_end /party_transfer 사용" });
  return embed;
}

function makePartyEndEmbed(beforeEmbed, party, author) {
  const embed = EmbedBuilder.from(beforeEmbed);
  embed.setTitle(`${author.displayName || author.username}님의 파티가 끝났어요`)
    .setColor(0xed4245)
    .setFields([]);

  if (party.game === "COH3") {
    embed.addFields(
      { name: "게임모드", value: party.mode || "빠른대전", inline: true },
      { name: "진영", value: party.faction || "상관없음", inline: true }
    );
  } else {
    embed.addFields({ name: "게임모드", value: party.mode || "바닐라", inline: true });
  }

  embed.addFields(
    { name: "시작시간", value: fmtTime(party.createdAt), inline: false }
  );
  if (party.endedAt) {
    embed.addFields({ name: "종료시간", value: fmtTime(party.endedAt), inline: false });
  }
  return embed;
}

async function endPartyAndEdit(interaction, party, reason = "종료") {
  party.endedAt = new Date();

  const channel = interaction.channel;
  const baseMsg = await channel.messages.fetch(party.messageId);
  const host = await getUserSafe(interaction.client, interaction.guild, party.hostId);

  const endedEmbed = makePartyEndEmbed(baseMsg.embeds[0], party, host);

  await baseMsg.edit({ embeds: [endedEmbed], components: [] });
  PARTIES.remove(party.messageId);

  await baseMsg.reply({ embeds: [makeNoticeEmbed("파티 종료", `사유: ${reason}`, 0xed4245)] });
}

async function getUserSafe(client, guild, userId) {
  if (guild) {
    const m = await guild.members.fetch(userId).catch(() => null);
    if (m) return m.user;
  }
  return await client.users.fetch(userId);
}

module.exports = {
  PARTIES,
  makeNoticeEmbed,
  makeCoh3Embed,
  makeHoi4Embed,
  makePartyEndEmbed,
  endPartyAndEdit,
  getUserSafe
};
