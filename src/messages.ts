import { LettaClient } from "@letta-ai/letta-client";

// If the token is not set, just use a dummy value
const client = new LettaClient({ token: process.env.LETTA_TOKEN || 'dummy', baseUrl: process.env.LETTA_BASE_URL });
const AGENT_ID = process.env.LETTA_AGENT_ID;
const USE_SENDER_PREFIX = process.env.LETTA_USE_SENDER_PREFIX === 'true';
const ERROR_MESSAGE = "Hey there! Something has happened to me. Please message me again later 👾";

enum MessageType {
  DM = "DM",
  MENTION = "MENTION",
  REPLY = "REPLY",
  GENERIC = "GENERIC"
}

// Send message and receive response
async function sendMessage(sender_name: string, sender_id: string, message: string, message_type: MessageType) {
  let agentMessageResponse = ''

  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return ERROR_MESSAGE;
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
      (message_type === MessageType.MENTION ? `[${sender_name_receipt} sent a message mentioning you] ${message}` : 
      message_type === MessageType.REPLY ? `[${sender_name_receipt} replied to you] ${message}` : 
      message_type === MessageType.DM ? `[${sender_name_receipt} sent you a direct message] ${message}` : 
      `[${sender_name_receipt} sent a message to the channel] ${message}`) 
      : message
  }

  try {
    const response = await client.agents.messages.createStream(AGENT_ID, {
      messages: [message_dict]
    });
    for await (const chunk of response) {
      if ('content' in chunk && typeof chunk.content === 'string') {
        agentMessageResponse += chunk.content;
      }
    }
    return agentMessageResponse;
  } catch (error) {
    console.error('Error:', error);
    return ERROR_MESSAGE;
  }

}

export { sendMessage, MessageType };