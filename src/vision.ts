// src/vision.ts
import { Attachment, Message } from "discord.js";
import { Client as LettaClient } from "@letta-ai/letta-client";

// ---- Env / Letta client ----
const LETTA_API_KEY = process.env.LETTA_API_KEY!;
if (!LETTA_API_KEY) {
  throw new Error("LETTA_API_KEY is not set");
}

const letta = new LettaClient({ apiKey: LETTA_API_KEY });

// ---- Helpers ----
export function messageHasImages(msg: Message): boolean {
  // Discord attachments with image/* content-type
  const hasImageAttachments =
    (msg.attachments?.some((a: Attachment) => (a.contentType || "").startsWith("image/"))) ?? false;

  // Very light URL sniff (optional) for linked images in the text
  const hasLinkedImage = /(https?:\/\/[^\s)]+?\.(?:png|jpg|jpeg|gif|webp))/i.test(msg.content || "");

  return hasImageAttachments || hasLinkedImage;
}

function getImageUrlsFromMessage(msg: Message): string[] {
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

function getImageUrlsFromPrompt(prompt: string): string[] {
  // pulls out any http(s) URLs that look like images (works with the prompt we build below)
  const urls: string[] = [];
  const urlRegexGlobal = /(https?:\/\/[^\s)]+?\.(?:png|jpg|jpeg|gif|webp))/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRegexGlobal.exec(prompt)) !== null) {
    urls.push(m[0]);
  }
  return Array.from(new Set(urls));
}

// ---- Prompt builder used by server.ts (keeps things deterministic) ----
export function buildVisionPrompt(msg: Message): string {
  const imageUrls = getImageUrlsFromMessage(msg);

  const header =
    "You are a concise vision assistant. Use ONLY the linked image(s) below. " +
    "Describe what is shown and answer the user directly in plain text. " +
    "Do not include any internal thoughts or 'Thinking:' text.\n";

  const list =
    imageUrls.length > 0
      ? "\n[IMAGES]\n" +
        imageUrls.map((u, i) => `Image ${i + 1}: ${u}`).join("\n")
      : "";

  const userLine =
    "\n\nUser message/context:\n" +
    (msg.content?.trim() || "(no additional text)");

  return `${header}${list}${userLine}`.trim();
}

// ---- Letta send (works for vision & plain text) ----
export async function sendVisionReply(
  agentId: string,
  prompt: string
): Promise<string> {
  // Extract any image URLs from the prompt and keep the rest as text
  const imageUrls = getImageUrlsFromPrompt(prompt);

  const textOnly = prompt; // we can keep URLs in text too; Letta will use input_image parts explicitly

  const parts: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string }
  > = [{ type: "input_text", text: textOnly }];

  for (const url of imageUrls) {
    parts.push({ type: "input_image", image_url: url });
  }

  // stream a response from Letta Agents
  const stream = await letta.agents.messages.createStreamed(agentId, {
    input: [{ role: "user", content: parts }],
  });

  let out = "";
  for await (const ev of stream) {
    if (ev.messageType === "assistant_message" && Array.isArray(ev.content)) {
      for (const c of ev.content) {
        if (c.type === "output_text" && typeof c.text === "string") {
          out += c.text;
        }
      }
    }
    if (ev.messageType === "stop_reason") break;
  }

  return out.trim().slice(0, 2000);
}
