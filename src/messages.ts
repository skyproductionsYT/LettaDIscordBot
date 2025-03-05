import { LettaClient } from "@letta-ai/letta-client";
import { LettaStreamingResponse } from "@letta-ai/letta-client/api/resources/agents/resources/messages/types/LettaStreamingResponse";
import { Stream } from "@letta-ai/letta-client/core";
import { Message, OmitPartialGroupDMChannel } from "discord.js";

// If the token is not set, just use a dummy value
const client = new LettaClient({ token: process.env.LETTA_TOKEN || 'dummy', baseUrl: process.env.LETTA_BASE_URL });
const AGENT_ID = process.env.LETTA_AGENT_ID;
const USE_SENDER_PREFIX = process.env.LETTA_USE_SENDER_PREFIX === 'true';
const SURFACE_ERRORS = process.env.SURFACE_ERRORS === 'true';

enum MessageType {
  DM = "DM",
  MENTION = "MENTION",
  REPLY = "REPLY",
  GENERIC = "GENERIC"
}

// Helper function to process stream
const processStream = async (response: Stream<LettaStreamingResponse>) => {
  let agentMessageResponse = '';
  for await (const chunk of response) {
    if ('content' in chunk && typeof chunk.content === 'string') {
      agentMessageResponse += chunk.content;
    }
  }
  return agentMessageResponse;
}

// Send message and receive response
async function sendMessage(discordMessageObject: OmitPartialGroupDMChannel<Message<boolean>>, messageType: MessageType) {
  const { author: { username: sender_name, id: sender_id }, content: message } = discordMessageObject;

  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return SURFACE_ERRORS ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾` : "";
  }

  // We include a sender receipt so that agent knows which user sent the message
  // We also include the Discord ID so that the agent can tag the user with @
  const sender_name_receipt = `${sender_name} (id=${sender_id})`;
  
  // If LETTA_USE_SENDER_PREFIX, then we put the receipt in the front of the message
  // If it's false, then we put the receipt in the name field (the backend must handle it)
  const message_dict = {
    role: "user" as const,
    name: USE_SENDER_PREFIX ? undefined : sender_name_receipt,
    content: USE_SENDER_PREFIX ? 
      (messageType === MessageType.MENTION ? `[${sender_name_receipt} sent a message mentioning you] ${message}` : 
        messageType === MessageType.REPLY ? `[${sender_name_receipt} replied to you] ${message}` : 
        messageType === MessageType.DM ? `[${sender_name_receipt} sent you a direct message] ${message}` : 
      `[${sender_name_receipt} sent a message to the channel] ${message}`) 
      : message
  }

  try {
    console.log(`🛜 Sending message to Letta server (agent=${AGENT_ID}): ${JSON.stringify(message_dict)}`)
    const response = await client.agents.messages.createStream(AGENT_ID, {
      messages: [message_dict]
    });

    if (response) { // show typing indicator and process message if there is a stream
      const [_, agentMessageResponse] = await Promise.all([
        discordMessageObject.channel.sendTyping(),
        await processStream(response)
      ]);
  
      return agentMessageResponse || ""
    }

    return ""
  } catch (error) {
    console.error(error)
    return SURFACE_ERRORS ? 'Beep boop. An error occurred while communicating with the Letta server. Please message me again later 👾' : "";
  }
}

export { sendMessage, MessageType };
