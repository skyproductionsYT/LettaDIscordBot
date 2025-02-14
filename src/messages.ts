import { LettaClient } from "@letta-ai/letta-client";

const client = new LettaClient({ token: process.env.LETTA_TOKEN, baseUrl: process.env.LETTA_BASE_URL });
const AGENT_ID = process.env.LETTA_AGENT_ID;

// Send message and receive response
async function sendMessage(message: string) {
  let agentMessageResponse = ''

  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return `Hey there! Something has happened to me. Please message me again later 👾`;
  }

  const response = await client.agents.messages.createStream(AGENT_ID, {
    messages: [{
      role: "user",
      content: message
    }]
  });
  for await (const chunk of response) {
    if ('content' in chunk && typeof chunk.content === 'string') {
      agentMessageResponse += chunk.content;
    }
  }
  return agentMessageResponse;
}

export { sendMessage };