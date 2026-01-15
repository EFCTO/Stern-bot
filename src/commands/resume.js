const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService, getMusicTargetErrorMessage, resolveMusicTarget } = require("../modules/music/helpers");

module.exports = {
  data: new SlashCommandBuilder().setName("resume").setDescription("일시정지한 곡을 다시 재생합니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const target = await resolveMusicTarget(interaction);
    if (target.error) {
      await interaction.reply({ content: getMusicTargetErrorMessage(target.error), ephemeral: true });
      return;
    }

    const queue = service.getExistingQueue(target.guild);
    if (!queue || !queue.current || !queue.isPaused()) {
      await interaction.reply({ content: "재개할 곡이 없습니다.", ephemeral: true });
      return;
    }

    const userChannelId = target.member.voice?.channelId;
    const botChannelId = target.botMember?.voice?.channelId;

    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({ content: "같은 음성 채널에 있어야 재생을 재개할 수 있습니다.", ephemeral: true });
      return;
    }

    try {
      queue.resume();
      await interaction.reply("▶️ 재생을 다시 시작했습니다.");
    } catch (error) {
      console.error("/resume 처리 실패", error);
      await interaction.reply({ content: "재개 중 오류가 발생했습니다.", ephemeral: true });
    }
  }
};
