const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { ensureChzzkService } = require("../modules/chzzk/helpers");
const { prepareDebugThumbnail, DEBUG_IMAGE_PATH } = require("../utils/debugThumbnail");

const ALERT_ROLE_ID = "1313043777929216020";
const SAFE_MENTIONS = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName("debug_chzzk")
    .setDescription("Send a debug Chzzk live notification preview in the current channel")
    .setDMPermission(false),

  async execute(interaction) {
    const service = await ensureChzzkService(interaction);
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
      const buffer = await prepareDebugThumbnail({ width: 1280, height: 720 });
      if (buffer) {
        attachment = new AttachmentBuilder(buffer, { name: "debug-chzzk-thumbnail.png" });
      }
    } catch (error) {
      console.error("[Chzzk Debug] thumbnail preparation failed", error);
    }

    const mentionContent = `[LIVE] <@&${ALERT_ROLE_ID}> 테스트용 라이브 알림입니다! (디버그)`;
    const broadcasterName = service.getBroadcaster?.()?.channelName || "Debug Broadcaster";

    try {
      if (typeof service.sendDebugNotification === "function") {
        await service.sendDebugNotification(targetChannel, {
          attachment,
          title: "Debug Live Stream",
          mentionContent,
          allowedMentions: SAFE_MENTIONS,
        });
      } else {
        const url = "https://chzzk.naver.com/live/debug-channel";
        const embed = new EmbedBuilder()
          .setColor(0x03c75a)
          .setTitle("Debug Live Stream")
          .setURL(url)
          .setDescription(`**${broadcasterName}** debug live notification preview.`)
          .setTimestamp(new Date());

        const files = [];
        if (attachment) {
          embed.setImage("attachment://debug-chzzk-thumbnail.png");
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
      console.error("[Chzzk Debug] notification failed", error);
      await interaction.editReply("테스트 알림을 전송하는 중 오류가 발생했어요. 자세한 로그를 확인해 주세요.");
      return;
    }

    const footerLines = ["치지직 알림 미리보기 완료."];
    if (!attachment) {
      footerLines.push(`참고: ${DEBUG_IMAGE_PATH} 에서 이미지를 찾지 못해 기본 이미지를 사용했어요.`);
    }

    await interaction.editReply(footerLines.join("\n"));
  },
};

