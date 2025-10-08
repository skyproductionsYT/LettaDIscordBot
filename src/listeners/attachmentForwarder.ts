import { Client, Events } from "discord.js";
import { LettaClient } from "@letta-ai/letta-client";
import axios from "axios";
import sharp from "sharp";

function extractAssistantText(ns: any): string {
  try {
    let out = '';
    const arr = (ns && (ns.messages || ns.data)) || [];
    if (Array.isArray(arr)) {
      for (const m of arr) {
        const type = (m && (m.messageType || m.message_type || m.role));
        if (type === 'assistant_message' || type === 'assistant') {
          const c = m.content;
          if (Array.isArray(c)) {
            for (const p of c) {
              if (p && p.type === 'text' && typeof p.text === 'string') {
                out += p.text;
              }
            }
          } else if (c && typeof c === 'object' && typeof c.text === 'string') {
            out += c.text;
          } else if (typeof c === 'string') {
            out += c;
          }
        }
      }
    }
    if (!out && typeof ns?.content === 'string') return ns.content;
    return out;
  } catch {
    return '';
  }
}

/**
 * Registers a listener that forwards image attachments to Letta Cloud
 * and replies with the agent response in the same thread.
 */
export function registerAttachmentForwarder(client: Client) {
  try { console.log('📦 AttachmentForwarder loaded (with typing + compression + multi-image + robust parsing)'); } catch {}
  
  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;
    if (!msg.attachments?.size) return;

    const urls: string[] = [];
    for (const [, att] of msg.attachments) {
      const ct = (att as any).contentType || (att as any).content_type || '';
      const url = (att as any).url || (att as any).proxyURL;
      if (ct && typeof ct === 'string' && ct.startsWith('image/') && url) {
        urls.push(String(url));
      }
    }
    if (urls.length === 0) return;

    try {
      await (msg.channel as any).sendTyping();
      const typingInterval = setInterval(() => {
        try { (msg.channel as any).sendTyping(); } catch {}
      }, 8000);

      try {
        const userText = (msg.content || '').trim();
        const reply = await forwardImagesToLetta(urls, msg.author.id, userText);
        if (reply && reply.trim()) {
          try { await msg.reply(reply); } catch {}
        } else {
          await msg.reply("⚠️ The image was processed, but no description was returned.");
        }
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
  const token = process.env.LETTA_API_KEY || process.env.LETTA_KEY || '';
  const baseUrl = (process.env.LETTA_BASE_URL || process.env.LETTA_API || 'https://api.letta.com').replace(/\/$/, '');
  const agentId = process.env.LETTA_AGENT_ID || process.env.AGENT_ID || '';
  if (!agentId || !token) {
    throw new Error("LETTA_AGENT_ID and LETTA_API_KEY (or AGENT_ID/LETTA_KEY) must be set");
  }

  const client = new LettaClient({ token, baseUrl } as any);

  const payloadUrl: any = {
    messages: [
      {
        role: "user",
        content: [
          ...urls.map(u => ({ type: 'image', source: { type: 'url', url: u } })),
          ...(userText && userText.trim()
            ? [{ type: 'text', text: userText }]
            : [{ type: 'text', text: `Describe the image sent by user ${userId}.` }])
        ]
      }
    ]
  };

  try {
    console.log(`🧾 Payload(url): images=${urls.length}, hasText=${!!(userText && userText.trim())}`);
    const ns: any = await (client as any).agents.messages.create(agentId, payloadUrl as any);

    // 🔧 improved parsing logic
    let text = extractAssistantText(ns);
    if (!text && ns?.messages) {
      for (const m of ns.messages) {
        if (m.content && Array.isArray(m.content)) {
          for (const c of m.content) {
            if (c.text) text += c.text;
          }
        }
      }
    }

    return text?.trim() || '⚠️ The image was processed, but no description was returned.';
  } catch (e: any) {
    console.error('Image send failed; attempting compression fallback', e);
    return handleCompressionFallback(client, urls, userId, userText, agentId);
  }
}

async function handleCompressionFallback(
  client: any,
  urls: string[],
  userId: string,
  userText: string | undefined,
  agentId: string
): Promise<string> {
  const MAX = 5 * 1024 * 1024; // 5MB per image
  const base64Images: any[] = [];

  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const res = await axios.get(u, { responseType: 'arraybuffer', timeout: 20000 });
    let mediaType = ((res.headers['content-type'] as string) || 'image/jpeg');
    let buf = Buffer.from(res.data);

    if (buf.length > MAX) {
      let width = 1400;
      let quality = 70;
      let fmt: 'webp' | 'jpeg' = 'webp';
      let attempts = 0;

      while (buf.length > MAX && attempts < 10) {
        const pipeline = sharp(buf).rotate().resize({ width, withoutEnlargement: true });
        buf = fmt === 'webp'
          ? await pipeline.webp({ quality }).toBuffer()
          : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

        mediaType = fmt === 'webp' ? 'image/webp' : 'image/jpeg';
        if (buf.length > MAX) {
          if (quality > 40) quality -= 10;
          else if (width > 640) width = Math.floor(width * 0.8);
          else fmt = 'jpeg';
        }
        attempts++;
      }
    }

    base64Images.push({
      type: 'image',
      source: { type: 'base64', mediaType, data: buf.toString('base64') }
    });
  }

  const payloadB64: any = {
    messages: [
      {
        role: 'user',
        content: [
          ...base64Images,
          ...(userText && userText.trim()
            ? [{ type: 'text', text: userText }]
            : [{ type: 'text', text: `Describe the image sent by user ${userId}.` }])
        ]
      }
    ]
  };

  const ns2: any = await (client as any).agents.messages.create(agentId, payloadB64 as any);
  let text2 = extractAssistantText(ns2);

  // 🔧 fallback improved parsing
  if (!text2 && ns2?.messages) {
    for (const m of ns2.messages) {
      if (m.content && Array.isArray(m.content)) {
        for (const c of m.content) {
          if (c.text) text2 += c.text;
        }
      }
    }
  }

  return text2?.trim() || '⚠️ The image was processed, but no description was returned.';
}
