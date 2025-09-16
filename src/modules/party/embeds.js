const { EmbedBuilder } = require("discord.js");

function formatDate(date) {
  const dt = date instanceof Date ? date : new Date(date);
  const pad = value => value.toString().padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function participantsBlock(party, limit = 20) {
  if (!party.members || party.members.length === 0) return "없음";
  const ids = party.members.slice(0, limit);
  const rest = party.members.length - ids.length;
  let text = "  • " + ids.map(id => `<@${id}>`).join("\n  • ");
  if (rest > 0) text += `\n  • …외 ${rest}명`;
  return text;
}

function authorFromUser(user) {
  if (!user) {
    return { name: "알 수 없음" };
  }
  return {
    name: user.displayName || user.username || user.tag || "알 수 없음",
    iconURL: typeof user.displayAvatarURL === "function" ? user.displayAvatarURL() : null
  };
}

function makeCoh3Embed(party, author) {
  const embed = new EmbedBuilder()
    .setTitle("COH3 파티 모집")
    .setColor(0x5865f2)
    .setTimestamp(new Date())
    .setAuthor(authorFromUser(author));

  embed.addFields(
    { name: "게임모드", value: party.mode || "빠른대전", inline: true },
    { name: "인원", value: `${party.members?.length ?? 0}/${party.maxSlots || 0}`, inline: true },
    { name: "진영", value: party.faction || "상관없음", inline: true },
    { name: "시작시간", value: formatDate(party.createdAt), inline: false },
    { name: `참가자 (${party.members?.length ?? 0}명)`, value: participantsBlock(party), inline: false }
  );

  embed.setFooter({ text: "참가/탈퇴 버튼으로 변경 · 방장은 /party_end /party_transfer 사용" });
  return embed;
}

function makeHoi4Embed(party, author) {
  const embed = new EmbedBuilder()
    .setTitle("HOI4 파티 모집")
    .setColor(0x57f287)
    .setTimestamp(new Date())
    .setAuthor(authorFromUser(author));

  embed.addFields(
    { name: "게임모드", value: party.mode || "바닐라", inline: true },
    { name: "시작시간", value: formatDate(party.createdAt), inline: true },
    { name: "ID", value: party.hoi4ServerId || "미입력", inline: true },
    { name: "PW", value: party.hoi4Pw || "없음", inline: true },
    { name: "버전", value: party.hoi4Version || "미입력", inline: true }
  );
  if (party.mode === "모드") {
    embed.addFields({ name: "모드", value: party.hoi4Mods || "미입력", inline: false });
  }
  embed.addFields({ name: `참가자 (${party.members?.length ?? 0}명)`, value: participantsBlock(party), inline: false });

  embed.setFooter({ text: "참가/탈퇴 버튼으로 변경 · 방장은 /party_end /party_transfer 사용" });
  return embed;
}

function makePartyEndEmbed(beforeEmbed, party, author) {
  const base = beforeEmbed ? EmbedBuilder.from(beforeEmbed) : new EmbedBuilder();
  const authorName = (author && (author.displayName || author.username || author.tag)) || "방장";

  base.setTitle(`${authorName}님의 파티가 끝났어요`)
    .setColor(0xed4245)
    .setFields([])
    .setTimestamp(new Date());

  if (party.game === "COH3") {
    base.addFields(
      { name: "게임모드", value: party.mode || "빠른대전", inline: true },
      { name: "진영", value: party.faction || "상관없음", inline: true }
    );
  } else {
    base.addFields({ name: "게임모드", value: party.mode || "바닐라", inline: true });
  }

  base.addFields({ name: "시작시간", value: formatDate(party.createdAt), inline: false });
  if (party.endedAt) {
    base.addFields({ name: "종료시간", value: formatDate(party.endedAt), inline: false });
  }

  return base;
}

module.exports = {
  makeCoh3Embed,
  makeHoi4Embed,
  makePartyEndEmbed,
  participantsBlock
};
