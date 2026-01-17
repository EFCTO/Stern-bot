const { sendGlobalLogEmbed, formatChannelLink } = require("../utils/globalLog");

module.exports = {
  name: "voiceStateUpdate",
  once: false,
  async execute(oldState, newState) {
    try {
      const member = newState.member ?? oldState.member;
      if (!member?.guild) return;
      if (member.user?.bot) return;

      const guild = member.guild;
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      if (oldChannelId !== newChannelId) {
        if (!oldChannelId && newChannelId) {
          await sendGlobalLogEmbed(guild.client, {
            type: "Voice Join",
            user: member.user,
            member,
            content: "Joined voice channel.",
            guild,
            channelId: newChannelId,
            color: 0x57F287,
          });
        } else if (oldChannelId && !newChannelId) {
          await sendGlobalLogEmbed(guild.client, {
            type: "Voice Leave",
            user: member.user,
            member,
            content: "Left voice channel.",
            guild,
            channelId: oldChannelId,
            color: 0xED4245,
          });
        } else if (oldChannelId && newChannelId) {
          const fromLink = formatChannelLink(guild.id, oldChannelId);
          const toLink = formatChannelLink(guild.id, newChannelId);
          await sendGlobalLogEmbed(guild.client, {
            type: "Voice Move",
            user: member.user,
            member,
            content: `Moved voice channel.\nFrom: ${fromLink}\nTo: ${toLink}`,
            guild,
            channelId: newChannelId,
            color: 0xFEE75C,
          });
        }
      }

      if (oldState.streaming !== newState.streaming) {
        const channelId = newState.channelId ?? oldState.channelId;
        if (channelId) {
          const started = newState.streaming;
          await sendGlobalLogEmbed(guild.client, {
            type: started ? "Screen Share Started" : "Screen Share Ended",
            user: member.user,
            member,
            content: started ? "Started screen sharing." : "Stopped screen sharing.",
            guild,
            channelId,
            color: 0x5865F2,
          });
        }
      }
    } catch (error) {
      console.error("[voiceStateUpdate] error", error);
    }
  },
};
