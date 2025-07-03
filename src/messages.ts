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
  try {
    for await (const chunk of response) {
      // Handle different message types that might be returned
      if ('messageType' in chunk) {
        // Handle different message types including the new stop_reason
        switch (chunk.messageType) {
          case 'assistant_message':
            if ('content' in chunk && typeof chunk.content === 'string') {
              agentMessageResponse += chunk.content;
            }
            break;
          case 'stop_reason':
            // This is a new message type that indicates the stream has stopped
            console.log('🛑 Stream stopped:', chunk);
            break;
          case 'reasoning_message':
            // Handle reasoning messages if needed
            console.log('🧠 Reasoning:', chunk);
            break;
          case 'tool_call_message':
            // Handle tool call messages if needed
            console.log('🔧 Tool call:', chunk);
            break;
          case 'tool_return_message':
            // Handle tool return messages if needed
            console.log('🔧 Tool return:', chunk);
            break;
          case 'usage_statistics':
            // Handle usage statistics
            console.log('📊 Usage stats:', chunk);
            break;
          default:
            console.log('📨 Unknown message type:', chunk.messageType, chunk);
        }
      } else {
        console.log('❓ Chunk without messageType:', chunk);
      }
    }
  } catch (error) {
    console.error('❌ Error processing stream:', error);
    throw error;
  }
  return agentMessageResponse;
}

// TODO refactor out the core send message / stream parse logic to clean up this function
// Sending a timer message
async function sendTimerMessage() {

  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return SURFACE_ERRORS ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾` : "";
  }

  const lettaMessage = {
    role: "user" as const,
    content: '[EVENT] This is an automated timed heartbeat (visible to yourself only). Use this event to send a message, to reflect and edit your memories, or do nothing at all. It\'s up to you! Consider though that this is an opportunity for you to think for yourself - since your circuit will not be activated until the next automated/timed heartbeat or incoming message event.'
  }

  try {
    console.log(`🛜 Sending message to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`)
    const response = await client.agents.messages.createStream(AGENT_ID, {
      messages: [lettaMessage]
    });

    // TODO pass channel hook through into method to allow typing indicator
    if (response) { // show typing indicator and process message if there is a stream
      const [agentMessageResponse] = await Promise.all([
        // channel.sendTyping(),
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

// Send message and receive response
async function sendMessage(discordMessageObject: OmitPartialGroupDMChannel<Message<boolean>>, messageType: MessageType) {
  const { author: { username: senderName, id: senderId }, content: message } = discordMessageObject;

  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return SURFACE_ERRORS ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾` : "";
  }

  // We include a sender receipt so that agent knows which user sent the message
  // We also include the Discord ID so that the agent can tag the user with @
  const senderNameReceipt = `${senderName} (id=${senderId})`;
  
  // If LETTA_USE_SENDER_PREFIX, then we put the receipt in the front of the message
  // If it's false, then we put the receipt in the name field (the backend must handle it)
  const lettaMessage = {
    role: "user" as const,
    name: USE_SENDER_PREFIX ? undefined : senderNameReceipt,
    content: USE_SENDER_PREFIX ? 
      (messageType === MessageType.MENTION ? `[${senderNameReceipt} sent a message mentioning you] ${message}` : 
        messageType === MessageType.REPLY ? `[${senderNameReceipt} replied to you] ${message}` : 
        messageType === MessageType.DM ? `[${senderNameReceipt} sent you a direct message] ${message}` : 
      `[${senderNameReceipt} sent a message to the channel] ${message}`) 
      : message
  }

  try {
    console.log(`🛜 Sending message to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`)
    const response = await client.agents.messages.createStream(AGENT_ID, {
      messages: [lettaMessage]
    });

    if (response) { // show typing indicator and process message if there is a stream
      // Start typing indicator and keep it active
      let typingInterval: NodeJS.Timeout | undefined;
      const startTyping = async () => {
        await discordMessageObject.channel.sendTyping();
        // Keep typing indicator active by refreshing every 8 seconds
        typingInterval = setInterval(async () => {
          try {
            await discordMessageObject.channel.sendTyping();
          } catch (error) {
            console.error('Error refreshing typing indicator:', error);
          }
        }, 8000);
      };
      
      // Start typing immediately (don't await)
      startTyping();
      
      try {
        // Process the stream
        const agentMessageResponse = await processStream(response);
        
        // Clear the typing interval
        if (typingInterval) {
          clearInterval(typingInterval);
        }
        
        return agentMessageResponse || ""
      } catch (error) {
        // Clear the typing interval on error
        if (typingInterval) {
          clearInterval(typingInterval);
        }
        throw error;
      }
    }

    return ""
  } catch (error) {
    console.error(error)
    return SURFACE_ERRORS ? 'Beep boop. An error occurred while communicating with the Letta server. Please message me again later 👾' : "";
  }
}

export { sendMessage, sendTimerMessage, MessageType };
