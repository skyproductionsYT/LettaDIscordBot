import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Message, OmitPartialGroupDMChannel, Partials } from 'discord.js';
import { sendMessage, sendTimerMessage, MessageType } from './messages';
import { limitEmojis } from './limitEmojis';
import { messageHasImages, sendVisionReply } from './vision'; // 👈 vision

const app = express();
const PORT = process.env.PORT || 3001;
const RESPOND_TO_DMS = process.env.RESPOND_TO_DMS === 'true';
const RESPOND_TO_MENTIONS = process.env.RESPOND_TO_MENTIONS === 'true';
const RESPOND_TO_BOTS = process.env.RESPOND_TO_BOTS === 'true';
const RESPOND_TO_GENERIC = process.env.RESPOND_TO_GENERIC === 'true';
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const MESSAGE_REPLY_TRUNCATE_LENGTH = 100;
const ENABLE_TIMER = process.env.ENABLE_TIMER === 'true';
const TIMER_INTERVAL_MINUTES = parseInt(process.env.TIMER_INTERVAL_MINUTES || '15', 10);
const FIRING_PROBABILITY = parseFloat(process.env.FIRING_PROBABILITY || '0.1');

function truncateMessage(message: string, maxLength: number): string {
  if (message.length > maxLength) return message.substring(0, maxLength - 3) + '...';
  return message;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel]
});

// ❗ Update for discord.js deprecation notice you saw in logs:
client.once('clientReady', () => {
  console.log(`🤖 Logged in as ${client.user?.tag}!`);
});

async function safeSend(channelOrMsg: { reply?: (s: string)=>Promise<any>, send?: (s: string)=>Promise<any> }, text: string) {
  const cleaned = limitEmojis(text).slice(0, 2000);
  if (typeof (channelOrMsg as any).reply === 'function') {
    await (channelOrMsg as any).reply(cleaned);
  } else if (typeof (channelOrMsg as any).send === 'function') {
    await (channelOrMsg as any).send(cleaned);
  }
}

// Helper: send a normal (non-vision) message via Letta
async function processAndSendMessage(message: OmitPartialGroupDMChannel<Message<boolean>>, messageType: MessageType) {
  try {
    const msg = await sendMessage(message, messageType);
    if (msg) await safeSend(message, msg);
  } catch (error) {
    console.error("🛑 Error processing and sending message:", error);
  }
}

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
      let channel: { send: (content: string) => Promise<any> } | undefined;
      if (CHANNEL_ID) {
        try {
          const fetched = await client.channels.fetch(CHANNEL_ID);
          if (fetched && 'send' in fetched) channel = fetched as any;
        } catch (error) {
          console.error("⏰ Error fetching channel:", error);
        }
      }
      const msg = await sendTimerMessage(channel);
      if (msg && channel) {
        try { await safeSend(channel, msg); } catch (e) { console.error("⏰ Error sending timer message:", e); }
      } else if (!channel) {
        console.log("⏰ No CHANNEL_ID defined or channel not available; message not sent.");
      }
    } else {
      console.log(`⏰ Random event not triggered (${(1 - FIRING_PROBABILITY) * 100}% chance)`);
    }
    setTimeout(() => startRandomEventTimer(), 1000);
  }, delay);
}

client.on('messageCreate', async (message) => {
  if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) return;
  if (message.author.id === client.user?.id) return;
  if (message.author.bot && !RESPOND_TO_BOTS) return;
  if (message.content.startsWith('!')) return;

  // DMs
  if (!message.guild) {
    if (RESPOND_TO_DMS) {
      // If images in DM, route through vision:
      if (messageHasImages(message)) {
        const visionReply = await sendVisionReply(message, MessageType.DM);
        if (visionReply) await safeSend(message, visionReply);
      } else {
        await processAndSendMessage(message, MessageType.DM);
      }
    }
    return;
  }

  // Mentions / replies
  if (RESPOND_TO_MENTIONS && (message.mentions.has(client.user || '') || message.reference)) {
    await message.channel.sendTyping();

    let msgContent = message.content;
    let messageType = MessageType.MENTION;

    if (message.reference?.messageId) {
      const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (originalMessage.author.id === client.user?.id) {
        messageType = MessageType.REPLY;
        msgContent = `[Replying to previous message: "${truncateMessage(originalMessage.content, MESSAGE_REPLY_TRUNCATE_LENGTH)}"] ${msgContent}`;
      } else {
        messageType = message.mentions.has(client.user || '') ? MessageType.MENTION : MessageType.GENERIC;
      }
    }

    // Vision path for mentions/replies
    if (messageHasImages(message)) {
      const visionReply = await sendVisionReply(message, messageType);
      if (visionReply) await safeSend(message, visionReply);
    } else {
      const msg = await sendMessage(message, messageType);
      if (msg) await safeSend(message, msg);
    }
    return;
  }

  // Generic non-mention messages
  if (RESPOND_TO_GENERIC) {
    if (messageHasImages(message)) {
      const visionReply = await sendVisionReply(message, MessageType.GENERIC);
      if (visionReply) await safeSend(message, visionReply);
    } else {
      await processAndSendMessage(message, MessageType.GENERIC);
    }
  }
});

// Start
app.listen(PORT, () => {
  console.log('Listening on port', PORT);
  client.login(process.env.DISCORD_TOKEN);
  startRandomEventTimer();
});
