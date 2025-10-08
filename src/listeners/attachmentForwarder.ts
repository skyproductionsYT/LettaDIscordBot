// src/listeners/attachmentForwarder.ts
import { Client, Events, Message } from "discord.js";
import { LettaClient } from "@letta-ai/letta-client";
import axios from "axios";
import sharp from "sharp";

// ---- Tunables ---------------------------------------------------------------
const INITIAL_GRACE_MS = 800;     // first small pause before checking attachments
const POLL_INTERVAL_MS = 800;     // how often to poll message for attachments
const MAX_WAIT_MS = 12_000;       // max total wait for attachments to show up
const REPLY_MAX = 2000;           // Discord message char limit
const DEDUPE_TTL_MS = 60_000;     // how long to remember a processed msg id
// ----------------------------------------------------------------------------

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// Simple dedupe cache with TTL
const processed = new Map<string, number>();
function alreadyProcessed(id: string): boolean {
  const now = Date.now();
  // Cleanup expired
  for (const [k, t] of processed) if (now > t) processed.delete(k);
  if (processed.has(id)) return true;
  processed.set(id, now + DEDUPE_TTL_MS);
  return false;
}

function extractAssistantText(ns: any): string {
  try {
    let out = "";
    const arr = ns?.messages || ns?.data || [];
    for (const m of arr) {
      const type = m?.messageType || m?.message_type || m?.role;
      if (type === "assistant_message" || type === "assistant") {
        const c = m?.content;
        if (Array.isArray(c)) {
          for (const p of c) {
            if (
              (p?.type === "text" || p?.type === "output_text") &&
              typeof p?.text === "string"
            ) out += p.text;
          }
        } else if (typeof c?.text === "string") {
          out += c.text;
        } else if (typeof c === "string") {
          out += c;
        }
      }
    }
    return out || (typeof ns?.content === "string" ? ns.content : "");
  } catch {
    return "";
  }
}

function hasImageAttachment(msg: Message<boolean>): boolean {
  for (const [, att] of msg.attachments) {
    const ct = (att as any).contentType || (att as any).content_type || "";
    if (typeof ct === "string" && ct.startsWith("image/")) return true;
  }
  return false;
}

/** Wait briefly in case Discord is still attaching images to the message */
async function waitForAttachments(msg: Message<boolean>, maxMs = MAX_WAIT_MS): Promise<boolean> {
  const start = Date.now();
  if (hasImageAttachment(msg)) return true;

  await sleep(INITIAL_GRACE_MS);
  if (hasImageAttachment(msg)) return true;

  while (Date.now() - start < maxMs) {
    await sleep(POLL_INTERVAL_MS);
    const fresh = await msg.channel.messages.fetch(msg.id).catch(() => null);
    if (fresh && hasImageAttachment(fresh)) return true;
  }
  return false;
}

export function registerAttachmentForwarder(client: Client) {
  console.log("📦 AttachmentForwarder loaded (typing + compression + multi-image + dedupe)");

  client.on(Events.MessageCreate, async (msg) => {
    try {
      if (msg.author.bot) return;

      // Prevent double-processing (Discord edits / multiple handlers / retries)
      if (alreadyProcessed(msg.id)) return;

      // Wait for attachments if needed
      const ready = await waitForAttachments(msg);
      if (!ready) return;

      // Collect image URLs
      const urls: string[] = [];
      for (const [, att] of msg.attachments) {
        const ct = (att as any).contentType || (att as any).content_type || "";
        const url = (att as any).url || (att as any).proxyURL;
        if (typeof ct === "string" && ct.startsWith("image/") && url) {
          urls.push(String(url));
        }
      }
      if (urls.length === 0) return;

      // Keep typing while working
      try { await msg.channel.sendTyping(); } catch {}
      const typingInterval = setInterval(() => {
        try { (msg.channel as any).sendTyping(); } catch {}
      }, 8000);

      try {
        const userText = (msg.content || "").trim();
        const reply = await forwardImagesToLetta(urls, msg.author.id, userText);
        const trimmed = (reply || "").trim().slice(0, REPLY_MAX);
        if (trimmed) await msg.reply(trimmed);
      } finally {
        clearInterval(typingInterval);
      }
    } catch (err) {
      console.error("Image forward failed:", err);
      try { await msg.reply("❌ Couldn’t process the image."); } catch {}
    }
  });
}

async function forwardImagesToLetta(
  urls: string[],
  userId: string,
  userText?: string
): Promise<string> {
  const token = process.env.LETTA_API_KEY || process.env.LETTA_KEY || "";
  const baseUrl = (process.env.LETTA_BASE_URL || process.env.LETTA_API || "https://api.letta.com").replace(/\/$/, "");
  const agentId = process.env.LETTA_AGENT_ID || process.env.AGENT_ID || "";
  if (!agentId || !token) throw new Error("LETTA_AGENT_ID and LETTA_API_KEY must be set");

  const client = new LettaClient({ token, baseUrl } as any);

  // First try: URL payload (cheaper/faster)
  const payloadUrl: any = {
    messages: [
      {
        role: "user",
        content: [
          ...urls.map(u => ({ type: "image", source: { type: "url", url: u } })),
          ...(userText && userText.trim()
            ? [{ type: "text", text: userText }]
            : [{ type: "text", text: `Describe the image(s) sent by user ${userId}.` }]),
        ],
      },
    ],
  };

  try {
    const ns: any = await (client as any).agents.messages.create(agentId, payloadUrl as any);
    const text = extractAssistantText(ns);
    if (text?.trim()) return text;
  } catch (e: any) {
    console.error("URL image send failed; attempting base64 fallback", e?.status || e?.response?.status);
  }

  // Fallback: compress to <5MB and send base64
  const MAX = 5 * 1024 * 1024;
  const base64Images: any[] = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const res = await axios.get(u, {
      responseType: "arraybuffer",
      timeout: 20000,
      maxContentLength: 25 * 1024 * 1024,
    });
    let mediaType = (res.headers["content-type"] as string) || "image/jpeg";
    let buf = Buffer.from(res.data);

    if (buf.length > MAX) {
      let width = 1400, quality = 70;
      let fmt: "webp" | "jpeg" = "webp";
      let attempts = 0;
      while (buf.length > MAX && attempts < 10) {
        const pipe = sharp(buf).rotate().resize({ width, withoutEnlargement: true });
        const out = fmt === "webp"
          ? await pipe.webp({ quality }).toBuffer()
          : await pipe.jpeg({ quality, mozjpeg: true }).toBuffer();
        buf = out;
        mediaType = fmt === "webp" ? "image/webp" : "image/jpeg";
        if (buf.length > MAX) {
          if (quality > 40) quality = Math.max(35, quality - 10);
          else if (width > 640) width = Math.max(640, Math.floor(width * 0.8));
          else if (fmt === "webp") { fmt = "jpeg"; quality = 55; width = Math.min(width, 1024); }
          else { quality = Math.max(30, quality - 5); width = Math.max(480, Math.floor(width * 0.85)); }
        }
        attempts++;
      }
      if (buf.length > MAX) throw new Error(`compressed image #${i + 1} still >5MB`);
    }

    base64Images.push({ type: "image", source: { type: "base64", mediaType, data: buf.toString("base64") } });
  }

  const payloadB64: any = {
    messages: [
      {
        role: "user",
        content: [
          ...base64Images,
          ...(userText && userText.trim()
            ? [{ type: "text", text: userText }]
            : [{ type: "text", text: `Describe the image(s) sent by user ${userId}.` }]),
        ],
      },
    ],
  };

  const ns2: any = await (client as any).agents.messages.create(agentId, payloadB64 as any);
  return extractAssistantText(ns2) || "";
}
