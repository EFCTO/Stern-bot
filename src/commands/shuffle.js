const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService, getMusicTargetErrorMessage, resolveMusicTarget } = require("../modules/music/helpers");

module.exports = {
  data: new SlashCommandBuilder().setName("shuffle").setDescription("대기열을 무작위로 섞습니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const target = await resolveMusicTarget(interaction);
    if (target.error) {
      await interaction.reply({ content: getMusicTargetErrorMessage(target.error), ephemeral: true });
      return;
    }

    const queue = service.getExistingQueue(target.guild);
    if (!queue || queue.tracks.length < 2) {
      await interaction.reply({ content: "섞을 대기열이 없습니다.", ephemeral: true });
      return;
    }

    const userChannelId = target.member.voice?.channelId;
    const botChannelId = target.botMember?.voice?.channelId;

    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({ content: "같은 음성 채널에 있어야 대기열을 섞을 수 있습니다.", ephemeral: true });
      return;
    }

    queue.shuffle();
    await interaction.reply("🔀 대기열을 섞었습니다.");
  }
};
