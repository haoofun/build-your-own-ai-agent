import dotenv from "dotenv";

dotenv.config();

/**
 * 为什么是post请求而不是get请求？
 * 大模型调用不是“获取资源（GET）”，而是“提交一个推理任务（POST）”，而且请求体通常很大，必须放在 body 里。
 */
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: "Hello, Claude!",
      },
    ],
  }),
});

if (!response.ok) {
    throw new Error(await response.text());
}

const data = await response.json();
console.log(data);

/**
 * npm install -D @types/node
 * 没有执行这个之前环境变量process.env爆红了，原因是：TypeScript 没有 Node.js 类型定义
 * 一些疑问：根据官方文档 anthropic-version 这个入参是必带的，并且只有 “2023-06-01”？为什么要这样设计？
 *          为什么有：“tip: ⌁ auth for agents [www.vestauth.com]”，这个是干嘛的？

➜  spike git:(spike) ✗ npx tsx d1-fetch.ts
◇ injected env (1) from .env // tip: ⌁ auth for agents [www.vestauth.com]
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_013fiD75fng6NuG4j1qJ1vCX',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: '# Hello! 👋\n' +
        '\n' +
        "Nice to meet you! I'm Claude, an AI assistant made by Anthropic. How can I help you today? Feel free to ask me anything—whether it's questions, creative projects, analysis, coding help, or just a conversation."
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
    output_tokens: 60,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}


apikey 错误时：
➜  spike git:(spike) ✗ npx tsx d1-fetch.ts    
◇ injected env (1) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
/Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts:29
    throw new Error(await response.text());
          ^

Error: {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_011CbwGxT4dMaZHkvBn3usb4"}
    at <anonymous> (/Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts:29:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)

Node.js v24.11.1
 */