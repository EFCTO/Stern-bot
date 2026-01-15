const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService, getMusicTargetErrorMessage, resolveMusicTarget } = require("../modules/music/helpers");
const { createNowPlayingEmbed } = require("../modules/music/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("현재 재생 중인 곡의 정보를 확인합니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const target = await resolveMusicTarget(interaction);
    if (target.error) {
      await interaction.reply({ content: getMusicTargetErrorMessage(target.error), ephemeral: true });
      return;
    }

    const queue = service.getExistingQueue(target.guild);
    if (!queue || !queue.current) {
      await interaction.reply({ content: "재생 중인 곡이 없습니다.", ephemeral: true });
      return;
    }

    const embed = createNowPlayingEmbed(queue.current, queue.getProgressBar());
    await interaction.reply({ embeds: [embed] });
  }
};
