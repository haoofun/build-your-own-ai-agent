import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

// const client = new Anthropic();

// const message = await client.messages.create({
//   model: "claude-haiku-4-5",
//   max_tokens: 1000,
//   messages: [
//     {
//       role: "user",
//       content: "Hello, Claude!"
//     }
//   ]
// });
// console.log(message);


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


import { readFile } from "fs/promises";

const client = new Anthropic();

export async function readFileTool(path: string) {
  const content = await readFile(path, "utf-8");
  return {
    content,
  };
}

const messages: any[] = [{
        role: "user",
        // content: "Read `/Users/lixianzhe/work/build-your-own-ai-agent/spike/package.json` and tell me which dependencies are installed.",
        content: "对比 /Users/lixianzhe/work/build-your-own-ai-agent/package.json 和 /Users/lixianzhe/work/build-your-own-ai-agent/spike/package.json",
    },
]

while(true) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1000,
    messages: messages,
    tools: [
                {
                    name: "read_file",
                    description: "Read the file at the given path.",
                    input_schema: {
                        type: "object",
                        properties:{
                            path: {
                                type: "string",
                                description: "The path of the file."
                            }
                        },
                        required: ["path"]
                    },
                    input_examples: [
                        {
                            path:"/build-your-own-ai-agent/CLAUDE.md"
                        }
                    ]
                }
            ],
  });
  console.log(message);
  messages.push({
    role: 'assistant',
    content: message.content
  })
  const toolUses = message.content.filter((c: any) => c.type === "tool_use")
  if (!toolUses.length) {
    break
  }
  const content: any[] = []
  for (const toolUse of toolUses){
    const result = await readFileTool(toolUse.input.path)
    content.push({
      type: "tool_result",
      tool_use_id: toolUse.id,
      content: result.content,
    })
    
  }
  messages.push({
    role: "user",
    content: content
  });
}

/**
 * 
➜  spike git:(spike) ✗ npx tsx d1-sdk.ts
◇ injected env (1) from .env // tip: ⌘ suppress logs { quiet: true }
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01SyztAzns2bgYnCy7g8MJWY',
  type: 'message',
  role: 'assistant',
  content: [
    { type: 'text', text: '我来帮你读取这两个 package.json 文件进行对比。' },
    {
      type: 'tool_use',
      id: 'toolu_014eVCNLaWMPi35hhgufwPoi',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    },
    {
      type: 'tool_use',
      id: 'toolu_01YJXh3kLMDajkwCwwCEs2HM',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 721,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 161,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01XQJx7EZQT4A9m2x5C94qBZ',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: '## 对比分析\n' +
        '\n' +
        '### 📊 **两个 package.json 的主要差异**\n' +
        '\n' +
        '| 项目 | 根目录 (build-your-own-ai-agent) | spike 子目录 |\n' +
        '|------|--------------------------------|-----------|\n' +
        '| **name** | `build-your-own-ai-agent` | `spike` |\n' +
        '| **version** | ❌ 无 | `1.0.0` |\n' +
        '| **description** | ❌ 无 | 空字符串 |\n' +
        '| **main** | ❌ 无 | `index.js` |\n' +
        '| **type** | ✅ `module` | ✅ `module` |\n' +
        '| **engines** | ✅ `node >= 22` | ❌ 无 |\n' +
        '| **private** | ✅ `true` | ❌ 无 |\n' +
        '\n' +
        '### 📦 **Dependencies 对比**\n' +
        '\n' +
        '**根目录：** 无 dependencies\n' +
        '\n' +
        '**spike 目录：** \n' +
        '- `@anthropic-ai/sdk` ^0.104.1\n' +
        '- `dotenv` ^17.4.2  \n' +
        '- `tsx` ^4.22.4\n' +
        '\n' +
        '### 🔧 **Scripts 对比**\n' +
        '\n' +
        '| 项目 | 根目录 | spike |\n' +
        '|------|------|-------|\n' +
        '| **docs:dev** | ✅ vitepress dev | ❌ |\n' +
        '| **docs:build** | ✅ vitepress build | ❌ |\n' +
        '| **docs:preview** | ✅ vitepress preview | ❌ |\n' +
        '| **ebook** | ✅ bash scripts/build-ebook.sh | ❌ |\n' +
        '| **test** | ❌ | ✅ (占位) |\n' +
        '\n' +
        '### 📋 **DevDependencies 对比**\n' +
        '\n' +
        '**根目录：**\n' +
        '- `markdown-it-container` ^4.0.0\n' +
        '- `vitepress` ^1.6.4\n' +
        '- `vitepress-plugin-llms` ^1.13.1\n' +
        '\n' +
        '**spike 目录：**\n' +
        '- `@types/node` ^25.9.3\n' +
        '\n' +
        '---\n' +
        '\n' +
        '## 🎯 **核心差异总结**\n' +
        '\n' +
        '1. **项目定位不同**：\n' +
        '   - 根目录是文档/电子书项目（VitePress）\n' +
        '   - spike 是实际的 AI 代理项目（需要 Anthropic SDK）\n' +
        '\n' +
        '2. **依赖完全不同**：spike 需要 AI 相关库，而主目录专注文档\n' +
        '\n' +
        '3. **Node 版本要求**：根目录要求 Node >= 22，spike 无要求\n' +
        '\n' +
        '4. **项目类型**：根目录标记为 `private`，spike 为可发布项目'
    }
  ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 1299,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 697,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}
 * 
 */