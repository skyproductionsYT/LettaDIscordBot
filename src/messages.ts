import { LettaClient } from "@letta-ai/letta-client";

const client = new LettaClient({ token: process.env.LETTA_TOKEN, baseUrl: process.env.LETTA_BASE_URL });
const AGENT_ID = process.env.LETTA_AGENT_ID;
const USE_SENDER_PREFIX = process.env.LETTA_USE_SENDER_PREFIX === 'true';

// Send message and receive response
async function sendMessage(sender_name: string, sender_id: string, message: string) {
  let agentMessageResponse = ''

  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return `Hey there! Something has happened to me. Please message me again later 👾`;
  }

  // We include a sender receipt so that agent knows which user sent the message
  // We also include the Discord ID so that the agent can tag the user with @
  const sender_name_receipt = `${sender_name} (id=${sender_id})`;
  
  // If LETTA_USE_SENDER_PREFIX, then we put the receipt in the front of the message
  // If it's false, then we put the receipt in the name field (the backend must handle it)
  const message_dict = {
    role: "user" as const,
    name: USE_SENDER_PREFIX ? sender_name_receipt : undefined,
    content: USE_SENDER_PREFIX ? `[${sender_name_receipt} sent a message] ${message}` : message
  }

  const response = await client.agents.messages.createStream(AGENT_ID, {
    messages: [message_dict]
  });
  for await (const chunk of response) {
    if ('content' in chunk && typeof chunk.content === 'string') {
      agentMessageResponse += chunk.content;
    }
  }
  return agentMessageResponse;
}

export { sendMessage };