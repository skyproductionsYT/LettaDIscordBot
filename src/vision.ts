import { Message } from "discord.js";

/** Minimal shape for an image attachment we care about */
export type ImageAttachment = {
  url: string;
  filename?: string;
  contentType?: string;
};

/**
 * Collect image URLs from a Discord message.
 * - Includes real attachments (contentType starts with image/)
 * - Also checks embeds (image/thumbnail)
 */
export function getImageAttachments(msg: Message): ImageAttachment[] {
  const images: ImageAttachment[] = [];

  // 1) File attachments (PNG/JPG/GIF/WebP, etc.)
  msg.attachments.forEach((att) => {
    const ct = att.contentType ?? "";
    if (ct.startsWith("image/")) {
      images.push({
        url: att.url,
        filename: att.name ?? undefined,
        contentType: ct,
      });
    }
  });

  // 2) Embeds with images (e.g., when a link unfurls)
  msg.embeds.forEach((emb) => {
    const url = emb.image?.url || emb.thumbnail?.url;
    if (url) {
      images.push({ url });
    }
  });

  return images;
}

/**
 * If you want to pass a simple text hint to your LLM when images are present,
 * this appends a human-readable line listing them.
 * (This doesn’t give the model “vision”; it just tells it there are images + URLs.)
 */
export function appendImageHintToText(
  original: string,
  images: ImageAttachment[]
): string {
  if (images.length === 0) return original;

  const hints = images
    .map((img, idx) => {
      const label = img.filename ? `${img.filename}` : img.url;
      return `[image ${idx + 1}: ${label}]`;
    })
    .join(" ");

  // Feel free to customize this phrasing:
  return `${original}\n\n(Attached ${images.length} image${
    images.length > 1 ? "s" : ""
  }: ${hints})`;
}
