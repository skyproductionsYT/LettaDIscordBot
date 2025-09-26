// src/vision.ts
import type { Message, Attachment } from "discord.js";
import { sendMessage, MessageType } from "./messages";

/**
 * True if the Discord message includes any image attachments or stickers.
 */
export function messageHasImages(message: Message): boolean {
  // Attachments with image content-types (png, jpg, gif, webp, etc.)
  const hasImageAttachment =
    message.attachments?.some((a: Attachment) =>
      (a.contentType ?? "").toLowerCase().startsWith("image/")
    ) ?? false;

  // Stickers often are treated as graphics as well
  const hasSticker = (message.stickers?.size ?? 0) > 0;

  return hasImageAttachment || hasSticker;
}

/**
 * Build a vision-augmented prompt string from a Discord message:
 * - Keeps the user text
 * - Appends a section with public image URLs (if present)
 */
function buildVisionPrompt(message: Message): string {
  const userText = message.content?.trim() ?? "";

  const imageUrls: string[] = [];
  for (const [, a] of message.attachments) {
    const ct = (a.contentType ?? "").toLowerCase();
    if (ct.startsWith("image/")) {
      // Prefer external (proxyCDN) URL if present, else fallback to .url
      imageUrls.push(a.proxyURL || a.url);
    }
  }

  const hasStickers = (message.stickers?.size ?? 0) > 0;

  let suffix = "";
  if (imageUrls.length > 0) {
    const lines = imageUrls.map((u, i) => `Image ${i + 1}: ${u}`).join("\n");
    suffix += `\n\n[IMAGES]\n${lines}`;
  }
  if (hasStickers) {
    suffix += `\n\n[NOTE] This message also contains ${message.stickers.size} Discord sticker(s).`;
  }

  // Give the model a nudge to actually look at them
  if (suffix) {
    suffix += `\n\nPlease use the linked image(s) to answer.`;
  }

  // If there was no user text, still send something meaningful
  return (userText ? userText : "(no text)") + suffix;
}

/**
 * Sends a Letta response *as if* the user had typed the vision-augmented text.
 * We avoid changing your Letta wiring by creating a "synthetic" Discord message
 * object that only overrides .content, then pass it into your existing sendMessage().
 *
 * Returns the assistant reply string (or empty string if nothing to send).
 */
export async function sendVisionReply(
  message: Message,
  messageType: MessageType
): Promise<string> {
  const augmented = buildVisionPrompt(message);

  // Create a synthetic message that reuses every property from the original,
  // but overrides the textual content we send to Letta:
  const synthetic = Object.create(message) as Message;
  (synthetic as any).content = augmented;

  // Reuse your existing message flow so logs, memory, etc. are consistent
  const reply = await sendMessage(synthetic as any, messageType);
  return reply ?? "";
}
