const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService } = require("../modules/music/helpers");

module.exports = {
  data: new SlashCommandBuilder().setName("pause").setDescription("현재 재생 중인 곡을 일시정지합니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const queue = service.getExistingQueue(interaction.guild);
    if (!queue || !queue.current || !queue.isPlaying()) {
      await interaction.reply({ content: "일시정지할 곡이 없습니다.", ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const userChannelId = member.voice?.channelId;
    const botChannelId = interaction.guild.members.me?.voice?.channelId;

    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({ content: "같은 음성 채널에 있어야 일시정지할 수 있습니다.", ephemeral: true });
      return;
    }

    try {
      queue.pause();
      await interaction.reply("⏸️ 재생을 일시정지했습니다.");
    } catch (error) {
      console.error("/pause 처리 실패", error);
      await interaction.reply({ content: "일시정지 중 오류가 발생했습니다.", ephemeral: true });
    }
  }
};
