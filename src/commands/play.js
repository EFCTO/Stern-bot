const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { ensureMusicService } = require("../modules/music/helpers");
const { createTrackEmbed } = require("../modules/music/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("유튜브 음악을 검색하거나 URL로 재생합니다.")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("검색어 또는 URL")
        .setRequired(true)
    ),
  async execute(interaction) {
    const service = await ensureMusicService(interaction);
    if (!service) return;

    const query = interaction.options.getString("query", true);

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice?.channel;

    const isStageChannel = voiceChannel && voiceChannel.type === ChannelType.GuildStageVoice;

    if (!voiceChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(voiceChannel.type)) {
      await interaction.reply({ content: "먼저 음성 채널에 접속해주세요!", ephemeral: true });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (botMember?.voice?.channelId && botMember.voice.channelId !== voiceChannel.id) {
      await interaction.reply({ content: "이미 다른 음성 채널에서 음악을 재생 중입니다.", ephemeral: true });
      return;
    }

    if (!voiceChannel.joinable || (!voiceChannel.speakable && !isStageChannel)) {
      await interaction.reply({ content: "이 음성 채널에 접근할 수 없습니다. 권한을 확인해주세요.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const tracks = await service.resolveTracks(query, interaction.user);
      if (tracks.length === 0) {
        await interaction.editReply("검색 결과가 없습니다. 다른 키워드나 URL을 시도해보세요.");
        return;
      }

      const queue = service.getQueue(interaction.guild);
      queue.setTextChannel(interaction.channelId);
      await queue.connect(voiceChannel);

      queue.enqueue(tracks);
      await queue.play();

      if (tracks.length === 1) {
        const track = tracks[0];
        const isNowPlaying = queue.current === track;
        const position = isNowPlaying ? 0 : queue.tracks.findIndex(item => item === track);
        const embed = createTrackEmbed(track, {
          title: isNowPlaying ? "▶️ 재생을 시작합니다" : "🎶 대기열에 추가됨",
          position: position >= 0 ? position : 0,
          queueLength: queue.tracks.length + (queue.current ? 1 : 0)
        });
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const playlistPlaying = queue.current === tracks[0];
      const total = queue.tracks.length + (queue.current ? 1 : 0);
      await interaction.editReply(
        playlistPlaying
          ? `▶️ 총 **${tracks.length}곡**을 불러왔습니다. 지금 바로 재생을 시작합니다!`
          : `🎶 총 **${tracks.length}곡**을 대기열에 추가했습니다. (총 ${total}곡)`
      );
    } catch (error) {
      console.error("/play 처리 실패", error);
      await interaction.editReply("음악을 재생하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }
};
