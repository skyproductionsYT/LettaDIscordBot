// src/vision.ts
import type { Message, Attachment, Embed } from "discord.js";
import { Letta } from "@letta-ai/letta-client";

/**
 * Build a Letta client once (reused across calls).
 */
const letta = new Letta({
  apiKey: process.env.LETTA_API_KEY || "",
});

/**
 * Quick helpers to detect & extract image URLs from a Discord message.
 */
function isImageAttachment(att: Attachment): boolean {
  if (att.contentType && att.contentType.startsWith("image/")) return true;
  const url = (att.proxyURL || att.url || "").toLowerCase();
  return url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".gif") || url.endsWith(".webp");
}

function extractEmbedImageUrls(embeds: Embed[]): string[] {
  const urls: string[] = [];
  for (const e of embeds) {
    const u =
      e.image?.url ||
      e.thumbnail?.url ||
      // Some bots put the image as the embed "url"
      (typeof e.url === "string" ? e.url : undefined);
    if (u) urls.push(u);
  }
  return urls;
}

/**
 * Convert a Discord message to Letta "content" parts including input_text + input_image.
 * This does NOT send anything—just builds the payload.
 */
export function buildVisionContentFromDiscordMessage(msg: Message<boolean>) {
  const parts: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string }
  > = [];

  const userText = msg.content?.trim() || "";
  if (userText.length > 0) {
    parts.push({ type: "input_text", text: userText });
  }

  // Attachments
  for (const att of msg.attachments.values()) {
    if (isImageAttachment(att)) {
      parts.push({ type: "input_image", image_url: att.proxyURL || att.url });
    }
  }

  // Embeds (images/thumbnails)
  const embedImageUrls = extractEmbedImageUrls(msg.embeds);
  for (const url of embedImageUrls) {
    parts.push({ type: "input_image", image_url: url });
  }

  return parts;
}

/**
 * Send a single user message (with images) to Letta and return a plain text reply.
 * Requires: process.env.LETTA_AGENT_ID and process.env.LETTA_API_KEY
 */
export async function sendVisionReply(msg: Message<boolean>): Promise<string> {
  const agentId = process.env.LETTA_AGENT_ID;
  if (!agentId) {
    throw new Error("Missing LETTA_AGENT_ID env var.");
  }
  if (!(process.env.LETTA_API_KEY || "")) {
    throw new Error("Missing LETTA_API_KEY env var.");
  }

  const content = buildVisionContentFromDiscordMessage(msg);
  if (content.length === 0) {
    // No text or images—give the model *something* so it can reply.
    content.push({ type: "input_text", text: "User sent an empty message but may have attached non-image content." });
  }

  // Non-streaming call: simpler to parse and avoids the hidden_reasoning stream events.
  const resp = await letta.agents.messages.create({
    agentId,
    messages: [{ role: "user", content }],
  });

  // The response can include multiple message types. We want the assistant text.
  // Find the last assistant_message and join its output_text parts.
  let assistant = resp.messages?.slice().reverse().find(m => m.messageType === "assistant_message");
  if (!assistant || !assistant.content) {
    // Fallback: sometimes the API returns "response" with content
    const fallback = (resp as any).content;
    if (Array.isArray(fallback)) {
      return fallback
        .filter((p: any) => p?.type === "output_text")
        .map((p: any) => p.text)
        .join("\n")
        .trim();
    }
    return "Sorry, I couldn't generate a response.";
  }

  const outText = assistant.content
    .filter((p: any) => p?.type === "output_text")
    .map((p: any) => p.text || "")
    .join("\n")
    .trim();

  return outText || "Got the image(s)!";
}

/**
 * Convenience checker so server.ts can decide whether to route a message to vision.
 */
export function messageHasImages(msg: Message<boolean>): boolean {
  if (msg.attachments.size > 0) {
    for (const a of msg.attachments.values()) {
      if (isImageAttachment(a)) return true;
    }
  }
  if (extractEmbedImageUrls(msg.embeds).length > 0) return true;
  return false;
}
