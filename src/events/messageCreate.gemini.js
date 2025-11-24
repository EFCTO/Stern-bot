const { Events, AttachmentBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const MAX_TEXT_LENGTH = 1800;
const TALK_MODEL = process.env.GEMINI_TALK_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-1.5-flash";
// Imagen 3 endpoints support image generation; override with GEMINI_IMAGE_MODEL if needed.
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "imagen-3.0-fast-generate-001";
const IMAGE_MIME = process.env.GEMINI_IMAGE_MIME || "image/png";

let geminiClient = null;

function getClient() {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

async function resolveMessage(message) {
  if (!message?.partial) return message;
  try {
    return await message.fetch();
  } catch (error) {
    console.error("[gemini] Failed to fetch partial message", error);
    return null;
  }
}

function parseCommand(content) {
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith("!")) return null;

  const paint = /^!painting\s+(.+)/i.exec(trimmed);
  if (paint) {
    return { type: "painting", prompt: paint[1].trim() };
  }

  const talk = /^!talk\s+(.+)/i.exec(trimmed);
  if (talk) {
    return { type: "talk", prompt: talk[1].trim() };
  }

  return null;
}

const TALK_PERSONA = [
  "당신은 홀슈타인 란드 소속의 로봇 '슈테른'입니다.",
  "위드고는 크릭스마리네 대제독입니다.",
  "모르는 정보는 추측하지 말고 '근거가 부족합니다.'라고 답하세요.",
  "친근하고 유쾌하게 대답하세요.",

].join(" ");

async function handleTalk(prompt) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: TALK_MODEL });
  const result = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: TALK_PERSONA }] },
      { role: "user", parts: [{ text: prompt }] },
    ],
  });
  const text = result?.response?.text?.()
    || flattenParts(result?.response?.candidates?.[0]?.content?.parts);
  if (!text) throw new Error("Empty response from Gemini");
  return text.trim();
}

async function handlePainting(prompt) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: IMAGE_MODEL });
  const request = {
    contents: [{ role: "user", parts: [{ text: prompt }]}],
  };
  if (isImageModel(IMAGE_MODEL) && IMAGE_MIME) {
    request.generationConfig = { responseMimeType: IMAGE_MIME };
  }
  const result = await model.generateContent(request);

  const inlineData = extractInlineData(result?.response);
  if (inlineData?.data) {
    const buffer = Buffer.from(inlineData.data, "base64");
    const ext = (inlineData.mimeType === "image/jpeg" || inlineData.mimeType === "jpeg") ? "jpg" : "png";
    const filename = `gemini.${ext}`;
    const attachment = new AttachmentBuilder(buffer, { name: filename });
    return { attachment };
  }

  const fileData = extractFileData(result?.response);
  if (fileData?.fileUri) {
    const buffer = await fetchFileData(fileData.fileUri);
    const ext = (fileData.mimeType === "image/jpeg" || fileData.mimeType === "jpeg") ? "jpg" : "png";
    const filename = `gemini.${ext}`;
    const attachment = new AttachmentBuilder(buffer, { name: filename });
    return { attachment };
  }

  const fallbackText = flattenParts(result?.response?.candidates?.[0]?.content?.parts);
  if (fallbackText) {
    return { text: fallbackText };
  }

  if (!isImageModel(IMAGE_MODEL)) {
    throw new Error("Configured image model does not return images. Set GEMINI_IMAGE_MODEL to an image-capable model (e.g., imagen-3.0-fast-generate-001).");
  }
  throw new Error("No image data returned");
}

function extractInlineData(response) {
  if (!response?.candidates?.length) return null;
  for (const candidate of response.candidates) {
    if (!candidate?.content?.parts) continue;
    for (const part of candidate.content.parts) {
      if (part.inlineData) return part.inlineData;
    }
  }
  return null;
}

function extractFileData(response) {
  if (!response?.candidates?.length) return null;
  for (const candidate of response.candidates) {
    if (!candidate?.content?.parts) continue;
    for (const part of candidate.content.parts) {
      if (part.fileData) return part.fileData;
    }
  }
  return null;
}

async function fetchFileData(uri) {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function truncate(text, limit = MAX_TEXT_LENGTH) {
  if (typeof text !== "string") return "";
  return text.length > limit ? text.slice(0, limit) : text;
}

function flattenParts(parts) {
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => p?.text || "")
    .filter(Boolean)
    .join(" ");
}

function formatError(error) {
  if (error?.status === 429 || /quota/i.test(error?.message || "")) {
    return "Error: Gemini quota exceeded or not enabled. Check billing/quotas and try again.";
  }
  const msg = error?.message || String(error);
  return `Error: ${truncate(msg)}`;
}

function isImageModel(name) {
  if (!name) return false;
  return /imagen|image|img/i.test(name);
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const resolved = await resolveMessage(message);
    if (!resolved || resolved.author?.bot) return;

    const parsed = parseCommand(resolved.content ?? "");
    if (!parsed) return;

    if (!process.env.GEMINI_API_KEY) {
      await resolved.reply({
        content: "Gemini API 키(GEMINI_API_KEY)가 설정되지 않았습니다.",
        allowedMentions: { repliedUser: false },
      }).catch(() => null);
      return;
    }

    if (!parsed.prompt) {
      await resolved.reply({
        content: "내용을 입력해 주세요.",
        allowedMentions: { repliedUser: false },
      }).catch(() => null);
      return;
    }

    try {
      if (parsed.type === "talk") {
        const replyText = await handleTalk(parsed.prompt);
        await resolved.reply({
          content: truncate(replyText),
          allowedMentions: { repliedUser: false },
        });
      } else if (parsed.type === "painting") {
        const { attachment } = await handlePainting(parsed.prompt);
        await resolved.reply({
          content: "",
          files: [attachment],
          allowedMentions: { repliedUser: false },
        });
      }
    } catch (error) {
      console.error("[gemini]", error);
      await resolved.reply({
        content: formatError(error),
        allowedMentions: { repliedUser: false },
      }).catch(() => null);
    }
  },
};
