import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { sendMessage } from './messages';


const app = express();
const PORT = process.env.PORT || 3001;
const RESPOND_TO_DMS = process.env.RESPOND_TO_DMS === 'true';
const RESPOND_TO_MENTIONS = process.env.RESPOND_TO_MENTIONS === 'true';
const RESPOND_TO_BOTS = process.env.RESPOND_TO_BOTS === 'true';
const RESPOND_TO_GENERIC = process.env.RESPOND_TO_GENERIC === 'true';
const TIMEOUT = 1000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Needed for commands and mentions
    GatewayIntentBits.GuildMessages, // Needed to read messages in servers
    GatewayIntentBits.MessageContent, // Required to read message content
    GatewayIntentBits.DirectMessages, // Needed to receive DMs
  ],
  partials: [Partials.Channel] // Required for handling DMs
});

// Discord Bot Ready Event
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user?.tag}!`);
});

// Handle messages mentioning the bot
client.on('messageCreate', async (message) => {

  if (message.author.id === client.user?.id) {
    // Ignore messages from the bot itself
    console.log(`📩 Ignoring message from myself...`);
    return;
  }


  if (message.author.bot && !RESPOND_TO_BOTS) {
    // Ignore other bots
      console.log(`📩 Ignoring other bot...`);
    return; 
  }

  // 📨 Handle Direct Messages (DMs)
  if (message.guild === null) { // If no guild, it's a DM
    console.log(`📩 Received DM from ${message.author.username}: ${message.content}`);
    if (RESPOND_TO_DMS) {
      await message.channel.sendTyping();
      setTimeout(async () => {
        const msg = await sendMessage(message.author.username, message.author.id, message.content);
        await message.reply(msg);
      }, TIMEOUT);
    } else {
      console.log(`📩 Ignoring DM...`);
    }
    return;
  }

  // Check if the bot is mentioned
  if (RESPOND_TO_MENTIONS && message.mentions.has(client.user || '')) {
    console.log(`📩 Received mention message from ${message.author.username}: ${message.content}`);
    await message.channel.sendTyping();
    setTimeout(async () => {
      const msg = await sendMessage(message.author.username, message.author.id, message.content);
      await message.reply(msg);
    }, TIMEOUT);
    return;
  }

  // Catch-all, generic non-mention message
  if (RESPOND_TO_GENERIC) {
    console.log(`📩 Received (non-mention) message from ${message.author.username}: ${message.content}`);
    await message.channel.sendTyping();
    setTimeout(async () => {
      const msg = await sendMessage(message.author.username, message.author.id, message.content);
      await message.reply(msg);
    }, TIMEOUT);
    return;
  }

});


// Start the Discord bot
app.listen(PORT, () => {
  console.log('Listening on port', PORT);
  client.login(process.env.DISCORD_TOKEN);
});