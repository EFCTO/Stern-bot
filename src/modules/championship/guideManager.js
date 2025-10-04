const { EmbedBuilder } = require("discord.js");

const TARGET_CHANNEL_ID = "1423741987105800313";
const GUIDE_TITLE = "⭐ 대회 참여 지원 양식";
const GUIDE_FOOTER = "Championship Application";
const GUIDE_KEYWORD = "Championship of Heroes";
const GUIDE_DESCRIPTION = [
  "Championship of Heroes 참가 조건은 **ELO 1200 이상**입니다.",
  "참가를 희망하시면 닉네임과 ELO가 보이는 프로필 이미지를 함께 올려 주세요.",
  "제출하신 정보를 확인한 뒤 운영진이 답장 안내를 드립니다."
].join("\n\n");

const guideState = {
  messageId: null,
  inflight: null,
};

function isTargetChannel(channelId) {
  return channelId === TARGET_CHANNEL_ID;
}

function matchesGuideEmbed(embed) {
  if (!embed) return false;
  if (embed.title === GUIDE_TITLE) return true;
  return embed.description?.includes(GUIDE_KEYWORD);
}

function messageHasGuideEmbed(message) {
  return Boolean(message?.embeds?.some(matchesGuideEmbed));
}

function createGuidePayload() {
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle(GUIDE_TITLE)
    .setDescription(GUIDE_DESCRIPTION)
    .setFooter({ text: GUIDE_FOOTER });

  return {
    embeds: [embed],
    allowedMentions: { parse: [] },
  };
}

async function fetchGuideChannel(client) {
  if (!client) return null;
  try {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel?.isTextBased?.()) return null;
    return channel;
  } catch (error) {
    console.error("[ChampionshipGuide] Failed to fetch channel", error);
    return null;
  }
}

async function fetchExistingGuideMessages(channel, botUserId) {
  if (!channel || !botUserId) return [];
  try {
    const collection = await channel.messages.fetch({ limit: 50 });
    const matches = [];
    for (const message of collection.values()) {
      if (message.author?.id !== botUserId) continue;
      if (messageHasGuideEmbed(message)) {
        matches.push(message);
      }
    }
    matches.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    return matches;
  } catch (error) {
    console.error("[ChampionshipGuide] Failed to inspect existing messages", error);
    return [];
  }
}

async function deleteMessageQuietly(message) {
  if (!message) return;
  try {
    await message.delete();
  } catch (error) {
    if (error?.code !== 10008) {
      console.error("[ChampionshipGuide] Failed to delete message", error);
    }
  }
}

async function refreshGuideMessage(channel) {
  if (!channel) return null;
  if (guideState.inflight) {
    return guideState.inflight;
  }

  guideState.inflight = (async () => {
    if (guideState.messageId) {
      try {
        const previous = await channel.messages.fetch(guideState.messageId);
        if (previous) {
          await deleteMessageQuietly(previous);
        }
      } catch (error) {
        if (error?.code !== 10008) {
          console.error("[ChampionshipGuide] Failed to remove previous guide", error);
        }
      }
      guideState.messageId = null;
    }

    const payload = createGuidePayload();
    const message = await channel.send(payload);
    guideState.messageId = message.id;
    return message;
  })();

  try {
    return await guideState.inflight;
  } finally {
    guideState.inflight = null;
  }
}

async function bootstrapGuide(client) {
  const channel = await fetchGuideChannel(client);
  if (!channel) return;

  const botUserId = client.user?.id;
  const matches = await fetchExistingGuideMessages(channel, botUserId);
  const [latest, ...duplicates] = matches;

  for (const duplicate of duplicates) {
    await deleteMessageQuietly(duplicate);
  }

  if (latest) {
    try {
      await latest.edit(createGuidePayload());
      guideState.messageId = latest.id;
      return;
    } catch (error) {
      console.error("[ChampionshipGuide] Failed to update existing guide", error);
    }
  }

  await refreshGuideMessage(channel);
}

async function handleOwnGuideMessage(message) {
  if (!isTargetChannel(message.channelId)) return;
  if (!messageHasGuideEmbed(message)) return;
  guideState.messageId = message.id;
}

async function handleParticipantMessage(message) {
  if (!isTargetChannel(message.channelId)) return;
  const channel = message.channel ?? (await fetchGuideChannel(message.client));
  if (!channel) return;
  await refreshGuideMessage(channel);
}

module.exports = {
  TARGET_CHANNEL_ID,
  isTargetChannel,
  bootstrapGuide,
  handleOwnGuideMessage,
  handleParticipantMessage,
};
