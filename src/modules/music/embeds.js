const { EmbedBuilder } = require("discord.js");
const { formatDuration } = require("./utils");

function createTrackEmbed(track, { title = "🎶 재생 목록에 추가됨", position, queueLength } = {}) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(`[${track.title}](${track.url})`)
    .addFields(
      { name: "길이", value: formatDuration(track.durationMS), inline: true },
      { name: "요청자", value: track.requestedBy?.toString() ?? "알 수 없음", inline: true }
    )
    .setTimestamp();

  if (track.author) {
    embed.addFields({ name: "채널", value: track.author, inline: true });
  }

  if (typeof position === "number") {
    embed.addFields({ name: "대기열 위치", value: position === 0 ? "현재 재생" : `#${position + 1}`, inline: true });
  }

  if (typeof queueLength === "number") {
    embed.setFooter({ text: `대기열 길이: ${queueLength}곡` });
  }

  if (track.thumbnail) {
    embed.setThumbnail(track.thumbnail);
  }

  return embed;
}

function createQueueEmbed(queue) {
  const description = queue.tracks.length
    ? queue.tracks
        .slice(0, 10)
        .map((track, index) => `**${index + 1}.** [${track.title}](${track.url}) · ${formatDuration(track.durationMS)} · 요청자: ${track.requestedBy}`)
        .join("\n")
    : "대기열이 비어 있습니다.";

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("📜 현재 대기열")
    .setDescription(description)
    .setTimestamp();

  if (queue.tracks.length > 10) {
    embed.setFooter({ text: `외 ${queue.tracks.length - 10}곡 더 있음` });
  }

  return embed;
}

function createNowPlayingEmbed(track, progressText) {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("▶️ 지금 재생 중")
    .setDescription(`[${track.title}](${track.url})`)
    .addFields({ name: "길이", value: formatDuration(track.durationMS), inline: true })
    .setTimestamp();

  if (progressText) {
    embed.addFields({ name: "진행도", value: progressText, inline: false });
  }

  if (track.author) {
    embed.addFields({ name: "채널", value: track.author, inline: true });
  }

  if (track.requestedBy) {
    embed.addFields({ name: "요청자", value: track.requestedBy.toString(), inline: true });
  }

  if (track.thumbnail) {
    embed.setThumbnail(track.thumbnail);
  }

  return embed;
}

module.exports = {
  createTrackEmbed,
  createQueueEmbed,
  createNowPlayingEmbed
};
