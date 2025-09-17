const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService } = require("../modules/music/helpers");

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("음악 재생을 멈추고 대기열을 초기화합니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const queue = service.getExistingQueue(interaction.guild);
    if (!queue || (!queue.current && queue.tracks.length === 0)) {
      await interaction.reply({ content: "정지할 음악이 없습니다.", ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const userChannelId = member.voice?.channelId;
    const botChannelId = interaction.guild.members.me?.voice?.channelId;

    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({ content: "같은 음성 채널에 있어야 정지할 수 있습니다.", ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      queue.stop(true);
      await interaction.editReply("⏹️ 재생을 완전히 종료했습니다.");
    } catch (error) {
      console.error("/stop 처리 실패", error);
      await interaction.editReply("정지하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }
};
