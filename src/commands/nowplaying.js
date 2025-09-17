const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService } = require("../modules/music/helpers");
const { createNowPlayingEmbed } = require("../modules/music/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("현재 재생 중인 곡의 정보를 확인합니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const queue = service.getExistingQueue(interaction.guild);
    if (!queue || !queue.current) {
      await interaction.reply({ content: "재생 중인 곡이 없습니다.", ephemeral: true });
      return;
    }

    const embed = createNowPlayingEmbed(queue.current, queue.getProgressBar());
    await interaction.reply({ embeds: [embed] });
  }
};
