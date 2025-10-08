// src/server.ts
import "dotenv/config";
import express from "express";
import {
  Client,
  GatewayIntentBits,
  Message,
  OmitPartialGroupDMChannel,
  Partials,
} from "discord.js";
import { sendMessage, sendTimerMessage, MessageType } from "./messages";
import { limitEmojis } from "./limitEmojis";
import { registerAttachmentForwarder } from "./listeners/attachmentForwarder";

const app = express();
const PORT = process.env.PORT || 3001;
const RESPOND_TO_DMS = process.env.RESPOND_TO_DMS === "true";
const RESPOND_TO_MENTIONS = process.env.RESPOND_TO_MENTIONS === "true";
const RESPOND_TO_BOTS = process.env.RESPOND_TO_BOTS === "true";
const RESPOND_TO_GENERIC = process.env.RESPOND_TO_GENERIC === "true";
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const MESSAGE_REPLY_TRUNCATE_LENGTH = 100;
const ENABLE_TIMER = process.env.ENABLE_TIMER === "true";
const TIMER_INTERVAL_MINUTES = parseInt(process.env.TIMER_INTERVAL_MINUTES || "15", 10);
const FIRING_PROBABILITY = parseFloat(process.env.FIRING_PROBABILITY || "0.1");

function truncateMessage(message: string, maxLength: number): string {
  return message.length > maxLength ? message.substring(0, maxLength - 3) + "..." : message;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user?.tag}!`);
  registerAttachmentForwarder(client); // vision listener
});

// === helper to detect image uploads so we don't double-reply ===
function hasImageAttachment(msg: Message<boolean>): boolean {
  for (const [, att] of msg.attachments) {
    const ct = (att as any).contentType || (att as any).content_type || "";
    if (typeof ct === "string" && ct.startsWith("image/")) return true;
  }
  return false;
}
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
async function isImageUploadingSoon(msg: Message<boolean>): Promise<boolean> {
  if (hasImageAttachment(msg)) return true;
  if ((msg.content || "").trim() === "") {
    // give Discord a moment, then re-fetch to see if attachments landed
    await sleep(1200);
    const fresh = await msg.channel.messages.fetch(msg.id).catch(() => null);
    if (fresh && hasImageAttachment(fresh)) return true;
  }
  return false;
}

// Helper to send a message and receive a response
async function processAndSendMessage(
  message: OmitPartialGroupDMChannel<Message<boolean>>,
  messageType: MessageType
) {
  try {
    const msg = await sendMessage(message, messageType);
    if (msg !== "") {
      const cleaned = limitEmojis(msg).slice(0, 2000);
      await message.reply(cleaned);
      console.log(`Message sent: ${cleaned}`);
    }
  } catch (error) {
    console.error("🛑 Error processing and sending message:", error);
  }
}

// Randomized event timer (unchanged)
async function startRandomEventTimer() {
  if (!ENABLE_TIMER) {
    console.log("Timer feature is disabled.");
    return;
  }
  const minMinutes = 1;
  const randomMinutes = minMinutes + Math.floor(Math.random() * (TIMER_INTERVAL_MINUTES - minMinutes));
  console.log(`⏰ Timer scheduled to fire in ${randomMinutes} minutes`);
  const delay = randomMinutes * 60 * 1000;

  setTimeout(async () => {
    console.log(`⏰ Timer fired after ${randomMinutes} minutes`);

    if (Math.random() < FIRING_PROBABILITY) {
      console.log(`⏰ Random event triggered (${FIRING_PROBABILITY * 100}% chance)`);

      let channel: { send: (content: string) => Promise<any> } | undefined = undefined;
      if (CHANNEL_ID) {
        try {
          const fetchedChannel = await client.channels.fetch(CHANNEL_ID);
          if (fetchedChannel && "send" in fetchedChannel) {
            channel = fetchedChannel as any;
          } else {
            console.log("⏰ Channel not found or is not a text channel.");
          }
        } catch (error) {
          console.error("⏰ Error fetching channel:", error);
        }
      }

      const msg = await sendTimerMessage(channel);

      if (msg !== "" && channel) {
        try {
          const cleaned = limitEmojis(msg).slice(0, 2000);
          await channel.send(cleaned);
          console.log("⏰ Timer message sent to channel");
        } catch (error) {
          console.error("⏰ Error sending timer message:", error);
        }
      } else if (!channel) {
        console.log("⏰ No CHANNEL_ID defined or channel not available; message not sent.");
      }
    } else {
      console.log(`⏰ Random event not triggered (${(1 - FIRING_PROBABILITY) * 100}% chance)`);
    }

    setTimeout(() => startRandomEventTimer(), 1000);
  }, delay);
}

// Message handler
client.on("messageCreate", async (message) => {
  if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) {
    console.log(`📩 Ignoring message from other channels (only listening on channel=${CHANNEL_ID})...`);
    return;
  }
  if (message.author.id === client.user?.id) {
    console.log(`📩 Ignoring message from myself...`);
    return;
  }
  if (message.author.bot && !RESPOND_TO_BOTS) {
    console.log(`📩 Ignoring other bot...`);
    return;
  }
  if (message.content.startsWith("!")) {
    console.log(`📩 Ignoring message that starts with !...`);
    return;
  }

  // ⛔ NEW: if there are (or will soon be) images, let the vision listener handle it
  if (await isImageUploadingSoon(message as Message<boolean>)) {
    console.log("🖼️ Image detected/likely — deferring to AttachmentForwarder.");
    return;
  }

  // DMs
  if (message.guild === null) {
    console.log(`📩 Received DM from ${message.author.username}: ${message.content}`);
    if (RESPOND_TO_DMS) {
      processAndSendMessage(message, MessageType.DM);
    } else {
      console.log(`📩 Ignoring DM...`);
    }
    return;
  }

  // Mentions or replies
  if (RESPOND_TO_MENTIONS && (message.mentions.has(client.user || "") || message.reference)) {
    console.log(`📩 Received message from ${message.author.username}: ${message.content}`);
    await message.channel.sendTyping();

    let msgContent = message.content;
    let messageType = MessageType.MENTION;

    if (message.reference && message.reference.messageId) {
      const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (originalMessage.author.id === client.user?.id) {
        messageType = MessageType.REPLY;
        msgContent = `[Replying to previous message: "${truncateMessage(
          originalMessage.content,
          MESSAGE_REPLY_TRUNCATE_LENGTH
        )}"] ${msgContent}`;
      } else {
        messageType = message.mentions.has(client.user || "")
          ? MessageType.MENTION
          : MessageType.GENERIC;
      }
    }

    const msg = await sendMessage(message, messageType);
    if (msg !== "") {
      const cleaned = limitEmojis(msg).slice(0, 2000);
      await message.reply(cleaned);
    }
    return;
  }

  // Generic
  if (RESPOND_TO_GENERIC) {
    console.log(`📩 Received (non-mention) message from ${message.author.username}: ${message.content}`);
    processAndSendMessage(message, MessageType.GENERIC);
    return;
  }
});

// Start
app.listen(PORT, () => {
  console.log("Listening on port", PORT);
  client.login(process.env.DISCORD_TOKEN);
  startRandomEventTimer();
});
