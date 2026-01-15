const path = require("path");

const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

const TARGET_CHANNEL_ID = "1385538235601522748";
const GUIDE_TITLE = "파티 제작 방법";
const GUIDE_FOOTER = "군수부";
const GUIDE_KEYWORD = "Holstein Land";
const GUIDE_DESCRIPTION = [
  "* `/coh3_create` 명령어를 사용하여 파티 설정을 열수 있습니다",
  "* 파티 참가는 초록색 참가 버튼, 파티 탈퇴는 회색 탈퇴 버튼을 누르시면 됩니다.",
  "* 방장은 `/party_end` 명령어를 이용하여 파티를 종료할 수 있습니다",
  "* 방장은 `/party_trasfer` 명령어를 이용하여 방장 권한을 다른 참가자에게 양도할 수 있습니다",
].join("\n");

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
  const filePath = path.join(process.cwd(), "src/modules/guide/coh3guide.png");
  const file = new AttachmentBuilder(filePath, { name: "coh3guide.png" });

  const embed = new EmbedBuilder()
    .setColor(0x0066FF)
    .setTitle(GUIDE_TITLE)
    .setDescription(GUIDE_DESCRIPTION)
    .setImage("attachment://coh3guide.png")
    .setFooter({ text: GUIDE_FOOTER });

  return {
    embeds: [embed],
    files: [file],
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
    console.error("[coh3Guide] Failed to fetch channel", error);
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
    console.error("[coh3Guide] Failed to inspect existing messages", error);
    return [];
  }
}

async function deleteMessageQuietly(message) {
  if (!message) return;
  try {
    await message.delete();
  } catch (error) {
    if (error?.code !== 10008) {
      console.error("[coh3Guide] Failed to delete message", error);
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
          console.error("[coh3Guide] Failed to remove previous guide", error);
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
      console.error("[coh3Guide] Failed to update existing guide", error);
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

