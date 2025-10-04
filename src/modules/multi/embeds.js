const { EmbedBuilder, time, TimestampStyles } = require("discord.js");

function formatParticipants(participants) {
  if (!participants?.length) {
    return "현재 참가자가 없습니다.";
  }
  return participants
    .map((participant, index) => {
      const nickname = participant.nickname?.trim() || "닉네임 미입력";
      const country = participant.country?.trim() || "국가 미입력";
      return `${index + 1}. ${nickname} (${country}) - <@${participant.userId}>`;
    })
    .join("\n");
}

function resolveStatusText(multi) {
  if (multi.status === "started") {
    const startedAt = multi.startedAt instanceof Date ? multi.startedAt : new Date(multi.startedAt);
    return `진행 중 ${time(startedAt, TimestampStyles.RelativeTime)}`;
  }
  if (multi.status === "ended") {
    const endedAt = multi.endedAt instanceof Date ? multi.endedAt : new Date(multi.endedAt ?? Date.now());
    return `종료 ${time(endedAt, TimestampStyles.RelativeTime)}`;
  }
  return "진행 대기";
}

function resolveColor(multi) {
  if (multi.status === "started") {
    return 0xFEE75C;
  }
  if (multi.status === "ended") {
    return 0xED4245;
  }
  return 0x57F287;
}

function makeOfficialMultiEmbed(multi, hostUser) {
  const hostTag = hostUser?.tag ?? "정보 없음";
  const embed = new EmbedBuilder()
    .setTitle("공식 멀티")
    .setColor(resolveColor(multi))
    .setTimestamp(new Date())
    .setFooter({ text: `호스트: ${hostTag}` });

  const createdAt = multi.createdAt instanceof Date ? multi.createdAt : new Date(multi.createdAt);

  embed.addFields(
    { name: "멀티 ID", value: multi.multiId ? `\`${multi.multiId}\`` : "미설정", inline: true },
    { name: "접속 PW", value: multi.password ? `\`${multi.password}\`` : "미설정", inline: true },
    { name: "상태", value: resolveStatusText(multi), inline: true },
    {
      name: `참여자 (${multi.participants.length})`,
      value: formatParticipants(multi.participants),
      inline: false
    }
  );

  const blockedCount = multi.blockedUserIds instanceof Set
    ? multi.blockedUserIds.size
    : Array.isArray(multi.blockedUserIds)
      ? multi.blockedUserIds.length
      : 0;
  if (blockedCount > 0) {
    embed.addFields({
      name: "참여 차단 인원",
      value: String(blockedCount),
      inline: true
    });
  }

  embed.setDescription(`생성 시각: ${time(createdAt, TimestampStyles.RelativeTime)}`);

  return embed;
}

module.exports = {
  makeOfficialMultiEmbed
};
