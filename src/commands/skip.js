const { SlashCommandBuilder } = require("discord.js");
const { ensureMusicService } = require("../modules/music/helpers");

module.exports = {
  data: new SlashCommandBuilder().setName("skip").setDescription("현재 재생 중인 곡을 건너뜁니다."),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const queue = service.getExistingQueue(interaction.guild);
    if (!queue || (!queue.current && queue.tracks.length === 0)) {
      await interaction.reply({ content: "건너뛸 음악이 없습니다.", ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const userChannelId = member.voice?.channelId;
    const botChannelId = interaction.guild.members.me?.voice?.channelId;

    if (!userChannelId || userChannelId !== botChannelId) {
      await interaction.reply({ content: "같은 음성 채널에 있어야 건너뛸 수 있습니다.", ephemeral: true });
      return;
    }

    await interaction.deferReply();
    try {
      await queue.skip();
      await interaction.editReply("⏭️ 곡을 건너뛰었습니다.");
    } catch (error) {
      console.error("/skip 처리 실패", error);
      await interaction.editReply("건너뛰는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }
};
