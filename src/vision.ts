// src/vision.ts
import { Attachment, Message, OmitPartialGroupDMChannel } from "discord.js";
import Letta from "@letta-ai/letta-client";

// ---- Env / client ----
const LETTA_API_KEY = process.env.LETTA_API_KEY!;
const LETTA_AGENT_ID = process.env.LETTA_AGENT_ID!; // This agent MUST use a vision-capable model (e.g., gpt-4o-mini)

const letta = new Letta({ apiKey: LETTA_API_KEY });

// ---- Helpers ----
export function messageHasImages(msg: OmitPartialGroupDMChannel<Message<boolean>>): boolean {
  // Discord attachments with image/* content-type
  const hasImageAttachments =
    msg.attachments?.some((a: Attachment) => (a.contentType || "").startsWith("image/")) ?? false;

  // Very light URL sniff (optional)
  const urlRegex = /(https?:\/\/[^\s)]+?\.(?:png|jpg|jpeg|gif|webp))/i;
  const hasLinkedImage = urlRegex.test(msg.content || "");

  return hasImageAttachments || hasLinkedImage;
}

function getImageUrls(msg: OmitPartialGroupDMChannel<Message<boolean>>): string[] {
  const urls: string[] = [];

  // Attachments
  msg.attachments?.forEach((a: Attachment) => {
    if ((a.contentType || "").startsWith("image/") && a.url) urls.push(a.url);
  });

  // Simple image URL catch in text
  const urlRegexGlobal = /(https?:\/\/[^\s)]+?\.(?:png|jpg|jpeg|gif|webp))/gi;
  const text = msg.content || "";
  let m: RegExpExecArray | null;
  while ((m = urlRegexGlobal.exec(text)) !== null) {
    urls.push(m[0]);
  }

  // De-dup
  return Array.from(new Set(urls));
}

// ---- Vision send ----
export async function sendVisionReply(
  msg: OmitPartialGroupDMChannel<Message<boolean>>
): Promise<string> {
  const images = getImageUrls(msg);
  if (images.length === 0) return "";

  // Build multimodal content parts for Letta
  const parts: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string }
  > = [
    {
      type: "input_text",
      text:
        "You are a concise vision assistant. Only use the provided image(s). " +
        "Identify what is shown and answer the user directly. Do not include any 'Thinking:' text."
    }
  ];

  for (const url of images) {
    parts.push({ type: "input_image", image_url: url });
  }

  // Stream from Letta Agents API (multimodal)
  const stream = await letta.agents.messages.createStreamed(LETTA_AGENT_ID, {
    input: [{ role: "user", content: parts }]
  });

  let out = "";
  for await (const ev of stream) {
    if (ev.messageType === "assistant_message" && ev.content) {
      // ev.content is an array of assistant parts; collect text pieces
      for (const c of ev.content) {
        if (c.type === "output_text" && typeof c.text === "string") out += c.text;
      }
    }
    if (ev.messageType === "stop_reason") break;
  }

  // Safety net
  return out.trim().slice(0, 2000);
}
