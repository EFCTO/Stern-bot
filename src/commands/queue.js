const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService } = require("../modules/music/helpers");
const { createQueueEmbed, createNowPlayingEmbed } = require("../modules/music/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("queue").setDescription("현재 재생 중인 곡과 대기열을 확인합니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const queue = service.getExistingQueue(interaction.guild);
    if (!queue || (!queue.current && queue.tracks.length === 0)) {
      await interaction.reply({ content: "재생 중인 곡이 없습니다.", ephemeral: true });
      return;
    }

    const embeds = [];
    if (queue.current) {
      embeds.push(createNowPlayingEmbed(queue.current, queue.getProgressBar()));
    }
    embeds.push(createQueueEmbed(queue));

    await interaction.reply({ embeds });
  }
};
