const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService, getMusicTargetErrorMessage, resolveMusicTarget } = require("../modules/music/helpers");
const { createTrackEmbed } = require("../modules/music/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("대기열에서 특정 곡을 제거합니다.")
    .addIntegerOption(option =>
      option
        .setName("position")
        .setDescription("제거할 곡의 대기열 위치 (1부터 시작)")
        .setRequired(true)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const target = await resolveMusicTarget(interaction);
    if (target.error) {
      await interaction.reply({ content: getMusicTargetErrorMessage(target.error), ephemeral: true });
      return;
    }

    const queue = service.getExistingQueue(target.guild);
    if (!queue || queue.tracks.length === 0) {
      await interaction.reply({ content: "제거할 곡이 없습니다.", ephemeral: true });
      return;
    }

    const position = interaction.options.getInteger("position", true) - 1;
    if (position < 0 || position >= queue.tracks.length) {
      await interaction.reply({ content: "해당 위치에는 곡이 없습니다.", ephemeral: true });
      return;
    }

    const userChannelId = target.member.voice?.channelId;
    const botChannelId = target.botMember?.voice?.channelId;

    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({ content: "같은 음성 채널에 있어야 대기열을 관리할 수 있습니다.", ephemeral: true });
      return;
    }

    const removed = queue.remove(position);
    const embed = createTrackEmbed(removed, { title: "🗑️ 대기열에서 제거됨", position });
    await interaction.reply({ embeds: [embed] });
  }
};
