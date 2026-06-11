import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Anthropic();

const message = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: "Hello, Claude!"
    }
  ]
});
console.log(message);


/**
    npm init -y
    npm pkg set type=module
    npm install @anthropic-ai/sdk
    npm install dotenv
    npm install tsx 

➜  spike git:(spike) ✗ npx tsx d1-sdk.ts
◇ injected env (1) from .env // tip: ⌁ auth for agents [www.vestauth.com]
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01X4eMzAMgoZiM21GmNyjbeL',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: "Hello! It's nice to meet you. How can I help you today?"
    }
  ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 11,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 19,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}
 */