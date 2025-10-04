const { Events } = require("discord.js");
const {
  isTargetChannel,
  handleOwnGuideMessage,
  handleParticipantMessage,
} = require("../modules/championship/guideManager");

async function resolveMessage(message) {
  if (!message?.partial) return message;
  try {
    return await message.fetch();
  } catch (error) {
    console.error("[ChampionshipGuide] Failed to fetch partial message", error);
    return null;
  }
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const resolved = await resolveMessage(message);
    if (!resolved || !resolved.guild) return;
    if (!isTargetChannel(resolved.channelId)) return;

    const authorId = resolved.author?.id;
    const clientId = resolved.client?.user?.id;

    if (authorId && clientId && authorId === clientId) {
      await handleOwnGuideMessage(resolved);
      return;
    }

    if (resolved.author?.bot) return;

    await handleParticipantMessage(resolved);
  },
};
