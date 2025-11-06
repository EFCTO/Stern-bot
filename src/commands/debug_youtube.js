const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { ensureYoutubeService } = require("../modules/youtube/helpers");
const { prepareDebugThumbnail, DEBUG_IMAGE_PATH } = require("../utils/debugThumbnail");

const ALERT_ROLE_ID = "1313043777929216020";
const SAFE_MENTIONS = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName("debug_youtube")
    .setDescription("Send a debug YouTube notification preview in the current channel")
    .setDMPermission(false),

  async execute(interaction) {
    const service = await ensureYoutubeService(interaction);
    if (!service) return;

    const targetChannel = interaction.channel;
    if (!targetChannel || typeof targetChannel.isTextBased !== "function" || !targetChannel.isTextBased()) {
      await interaction.reply({
        content: "이 명령은 텍스트 채널에서만 사용할 수 있어요.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let attachment = null;
    try {
      const buffer = await prepareDebugThumbnail({ width: 640, height: 360 });
      if (buffer) {
        attachment = new AttachmentBuilder(buffer, { name: "debug-youtube-thumbnail.png" });
      }
    } catch (error) {
      console.error("[YouTube Debug] thumbnail preparation failed", error);
    }

    const mentionContent = `[YouTube] <@&${ALERT_ROLE_ID}> 테스트용 알림 미리보기입니다! (디버그)`;
    const firstConfigured = typeof service.getChannels === "function" ? (service.getChannels()[0] ?? null) : null;
    const channelTitle = firstConfigured?.channelTitle || "Channel";
    const debugVideoId = `debug-${Date.now()}`;

    try {
      if (typeof service.sendDebugNotification === "function") {
        await service.sendDebugNotification(targetChannel, {
          attachment,
          videoId: debugVideoId,
          title: "Debug Video",
          mentionContent,
          allowedMentions: SAFE_MENTIONS,
        });
      } else {
        const url = `https://youtu.be/${debugVideoId}`;
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Debug Video")
          .setURL(url)
          .setAuthor({
            name: channelTitle,
            iconURL: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
          })
          .setDescription(`**${channelTitle}** channel debug preview notification.`)
          .setTimestamp(new Date());

        const files = [];
        if (attachment) {
          embed.setThumbnail("attachment://debug-youtube-thumbnail.png");
          files.push(attachment);
        }

        await targetChannel.send({
          content: `${mentionContent}\n${url}`,
          embeds: [embed],
          files: files.length ? files : undefined,
          allowedMentions: SAFE_MENTIONS,
        });
      }
    } catch (error) {
      console.error("[YouTube Debug] notification failed", error);
      await interaction.editReply("테스트 알림을 전송하는 중 오류가 발생했어요. 자세한 로그를 확인해 주세요.");
      return;
    }

    const footerLines = ["유튜브 알림 미리보기 완료."];
    if (!attachment) {
      footerLines.push(`참고: ${DEBUG_IMAGE_PATH} 에서 이미지를 찾지 못해 기본 이미지를 사용했어요.`);
    }

    await interaction.editReply(footerLines.join("\n"));
  },
};

