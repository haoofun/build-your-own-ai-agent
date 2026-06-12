import dotenv from "dotenv";

dotenv.config();

/**
 * 为什么是post请求而不是get请求？
 * 大模型调用不是“获取资源（GET）”，而是“提交一个推理任务（POST）”，而且请求体通常很大，必须放在 body 里。
 */
// const response = await fetch("https://api.anthropic.com/v1/messages", {
//   method: "POST",
//   headers: {
//     "x-api-key": process.env.ANTHROPIC_API_KEY!,
//     "anthropic-version": "2023-06-01",
//     "content-type": "application/json",
//   },
//   body: JSON.stringify({
//     model: "claude-haiku-4-5",
//     max_tokens: 1000,
//     messages: [
//       {
//         role: "user",
//         content: "Hello, Claude!",
//       },
//     ],
//   }),
// });

// if (!response.ok) {
//     throw new Error(await response.text());
// }

// const data = await response.json();
// console.log(data);

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



/**
 * 接下来给大模型添加 tool，让大模型具备调用工具的能力，根据 claude 官方文档的表述，tool 需要以下四个字段
 *  name	        工具的名称。必须匹配正则表达式 ^[a-zA-Z0-9_-]{1,64}$。
 *  description	    Detailed(详细的)纯文本描述，说明工具的功能、何时应使用以及其行为方式。
 *  input_schema	一个 JSON Schema 对象，定义工具的预期 parameter(参数)。
 *  input_examples	（可选）示例输入对象的数组，帮助 Claude 理解如何使用该 tool。
 *  claude 官方的最佳实践，给出了以下几个建议：
 *  1、提供极其详细的描述
 *  2、优先编写描述，但对于复杂工具可考虑使用 input_examples
 *  3、将相关操作整合到更少的工具中。
 *  4、在工具名称中使用有意义的命名空间。
 *  5、设计工具响应时只返回高价值信息。
 * 
 */

// const response = await fetch("https://api.anthropic.com/v1/messages", {
//   method: "POST",
//   headers: {
//     "x-api-key": process.env.ANTHROPIC_API_KEY!,
//     "anthropic-version": "2023-06-01",
//     "content-type": "application/json",
//   },
//   body: JSON.stringify({
//     model: "claude-haiku-4-5",
//     max_tokens: 1000,
//     tools: [
//         {
//             name: "read_file",
//             description: "Read the file at the given path.",
//             input_schema: {
//                 type: "object",
//                 properties:{
//                     path: {
//                         type: "string",
//                         description: "The path of the file."
//                     }
//                 },
//                 required: ["path"]
//             },
//             input_examples: [
//                 {
//                     path:"/build-your-own-ai-agent/CLAUDE.md"
//                 }
//             ]
//         }
//     ],
//     messages: [
//       {
//         role: "user",
//         content: "Read `package.json` and tell me which dependencies are installed.",
//       },
//     ],
//   }),
// });

// if (!response.ok) {
//     throw new Error(await response.text());
// }

// const data = await response.json();
// console.log(data);

/**
 *  我们写好了一个工具定义，但是发现模型的返回并没有直接返回读完文件之后的结果，并且返回的结果中
 *  content 的 type 变成了 tool_use，stop_reason 变成了 tool_use
 *  对比之前我们输入 ' Hello, Claude!' 的返回，content type 是 text，stop_reason 是 end_turn
 *  API 返回的 tool_use block 只是一个结构化的调用意图——
 *  "我想让你帮我跑 read_file({path: "package.json"})，跑完告诉我"。
 *  stop_reason: "tool_use" 的含义是"我停在这里等你"。
 *  Anthropic 的服务器永远碰不到你的文件系统，能力和执行权全在你这一侧
 * （这叫 client tools；server tools 如 web_search 才在对方侧执行）。
 * （这是否说明 llm 能自动区分 client tool 和 server tool ？）
 *  因此我们还缺少一个能够真正读取文本的 readFile 函数，接下来我们补齐这个函数，并且引入多轮对话需要的循环
 * （实际上 claude 官方推荐的是使用 action 来管理文件的增删改查吧？而不是每个动作都写一个函数和对应的工具定义？）
 * 
➜  spike git:(spike) npx tsx d1-fetch.ts                       
◇ injected env (1) from .env // tip: ⌘ suppress logs { quiet: true }
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01PyncVaiFGmnhaqxpSfsPwH',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_01UGf45EQgPLWxTVD7KKTGTb',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 678,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 57,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}
 */


/**
 * 实现读文件函数
 * 
 */

// import { readFile } from "fs/promises";

// export async function readFileTool(path: string) {
//   const content = await readFile(path, "utf-8");
//   return {
//     content,
//   };
// }

// const response1 = await fetch("https://api.anthropic.com/v1/messages", {
//   method: "POST",
//   headers: {
//     "x-api-key": process.env.ANTHROPIC_API_KEY!,
//     "anthropic-version": "2023-06-01",
//     "content-type": "application/json",
//   },
//   body: JSON.stringify({
//     model: "claude-haiku-4-5",
//     max_tokens: 1000,
//     tools: [
//         {
//             name: "read_file",
//             description: "Read the file at the given path.",
//             input_schema: {
//                 type: "object",
//                 properties:{
//                     path: {
//                         type: "string",
//                         description: "The path of the file."
//                     }
//                 },
//                 required: ["path"]
//             },
//             input_examples: [
//                 {
//                     path:"/build-your-own-ai-agent/CLAUDE.md"
//                 }
//             ]
//         }
//     ],
//     messages: [
//       {
//         role: "user",
//         content: "Read `package.json` and tell me which dependencies are installed.",
//       },
//     ],
//   }),
// });

// if (!response1.ok) {
//     throw new Error(await response1.text());
// }

// const data1 = await response1.json();
// console.log("first reply", data1, "\n");

// const toolUse = data1.content.find((c: any) => c.type === "tool_use")

// if (!toolUse){
//     throw new Error(await data1.content);
// }else{
//     console.log(toolUse, "\n");
// }

// const result = await readFileTool(toolUse.input.path);


// // 第二次调用
// const response2 = await fetch("https://api.anthropic.com/v1/messages", {
//   method: "POST",
//   headers: {
//     "x-api-key": process.env.ANTHROPIC_API_KEY!,
//     "anthropic-version": "2023-06-01",
//     "content-type": "application/json",
//   },
//   body: JSON.stringify({
//     model: "claude-haiku-4-5",
//     max_tokens: 1000,
//     tools: [
//         {
//             name: "read_file",
//             description: "Read the file at the given path.",
//             input_schema: {
//                 type: "object",
//                 properties:{
//                     path: {
//                         type: "string",
//                         description: "The path of the file."
//                     }
//                 },
//                 required: ["path"]
//             },
//             input_examples: [
//                 {
//                     path:"/build-your-own-ai-agent/CLAUDE.md"
//                 }
//             ]
//         }
//     ],
//     messages: [
//       {
//         role: "user",
//         content: "Read `package.json` and tell me which dependencies are installed.",
//       },
//       {
//         role: "assistant",
//         content: data1.content,
//       },
//       {
//         role: "user",
//         content: [{
//             type: "tool_result",
//             tool_use_id: toolUse.id,
//             content: JSON.stringify(result),
//             },
//         ],
//       }
//     ],
//   }),
// });

// if (!response2.ok) {
//     throw new Error(await response2.text());
// }

// const data2 = await response2.json();
// console.log(data2);

/**
 * 
 *  读取了不存在的文件，报错了，如下：
spike git:(spike) ✗ npx tsx d1-fetch.ts
◇ injected env (1) from .env // tip: ⌘ override existing { override: true }
first reply {
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01299G56uJLubuvy1rPpN2w2',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_01WvmjY9byuR9cBdTSrk4z8R',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 678,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 57,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
} 

{
  type: 'tool_use',
  id: 'toolu_01WvmjY9byuR9cBdTSrk4z8R',
  name: 'read_file',
  input: { path: '/package.json' },
  caller: { type: 'direct' }
} 

node:internal/fs/promises:642
  return new FileHandle(await PromisePrototypeThen(
                        ^

Error: ENOENT: no such file or directory, open '/package.json'
    at async open (node:internal/fs/promises:642:25)
    at async readFile (node:internal/fs/promises:1279:14)
    at async readFileTool (/Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts:202:19)
    at async <anonymous> (/Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts:263:16) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/package.json'
}

Node.js v24.11.1
 */

/**
 * 接下来尝试一下第二次回复不带 tool 呢，正确文件夹的请求
 */

// import { readFile } from "fs/promises";

// export async function readFileTool(path: string) {
//   const content = await readFile(path, "utf-8");
//   return {
//     content,
//   };
// }

// const response1 = await fetch("https://api.anthropic.com/v1/messages", {
//   method: "POST",
//   headers: {
//     "x-api-key": process.env.ANTHROPIC_API_KEY!,
//     "anthropic-version": "2023-06-01",
//     "content-type": "application/json",
//   },
//   body: JSON.stringify({
//     model: "claude-haiku-4-5",
//     max_tokens: 1000,
//     tools: [
//         {
//             name: "read_file",
//             description: "Read the file at the given path.",
//             input_schema: {
//                 type: "object",
//                 properties:{
//                     path: {
//                         type: "string",
//                         description: "The path of the file."
//                     }
//                 },
//                 required: ["path"]
//             },
//             input_examples: [
//                 {
//                     path:"/build-your-own-ai-agent/CLAUDE.md"
//                 }
//             ]
//         }
//     ],
//     messages: [
//       {
//         role: "user",
//         content: "Read `/Users/lixianzhe/work/build-your-own-ai-agent/package.json` and tell me which dependencies are installed.",
//       },
//     ],
//   }),
// });

// if (!response1.ok) {
//     throw new Error(await response1.text());
// }

// const data1 = await response1.json();
// console.log("first reply", data1, "\n");

// const toolUse = data1.content.find((c: any) => c.type === "tool_use")

// if (!toolUse){
//     throw new Error(await data1.content);
// }else{
//     console.log(toolUse, "\n");
// }

// const result = await readFileTool(toolUse.input.path);


// // 第二次调用
// const response2 = await fetch("https://api.anthropic.com/v1/messages", {
//   method: "POST",
//   headers: {
//     "x-api-key": process.env.ANTHROPIC_API_KEY!,
//     "anthropic-version": "2023-06-01",
//     "content-type": "application/json",
//   },
//   body: JSON.stringify({
//     model: "claude-haiku-4-5",
//     max_tokens: 1000,
//     messages: [
//       {
//         role: "user",
//         content: "Read `package.json` and tell me which dependencies are installed.",
//       },
//       {
//         role: "assistant",
//         content: data1.content,
//       },
//       {
//         role: "user",
//         content: [{
//             type: "tool_result",
//             tool_use_id: toolUse.id,
//             content: JSON.stringify(result),
//             },
//         ],
//       }
//     ],
//   }),
// });

// if (!response2.ok) {
//     throw new Error(await response2.text());
// }

// const data2 = await response2.json();
// console.log(data2);


/**
 *  模型成功回复了，倒也没有拒绝
➜  spike git:(spike) ✗ npx tsx d1-fetch.ts
◇ injected env (1) from .env // tip: ⌁ auth for agents [www.vestauth.com]
first reply {
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01FGBHB7J2Z5d9v3tiir1UnZ',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_01GmGNNR563ufwh8fk6MjrKs',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 698,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 77,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
} 

{
  type: 'tool_use',
  id: 'toolu_01GmGNNR563ufwh8fk6MjrKs',
  name: 'read_file',
  input: {
    path: '/Users/lixianzhe/work/build-your-own-ai-agent/package.json'
  },
  caller: { type: 'direct' }
} 

{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_016BRZ75tKqAdYPxMQcYPk62',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Based on the `package.json` file, here are the installed dependencies:\n' +
        '\n' +
        '## Dev Dependencies:\n' +
        '1. **markdown-it-container** (^4.0.0) - A plugin for markdown-it that adds support for custom containers\n' +
        '2. **vitepress** (^1.6.4) - A static site generator built on Vite, used for documentation\n' +
        '3. **vitepress-plugin-llms** (^1.13.1) - A VitePress plugin for LLMs (Large Language Models)\n' +
        '\n' +
        'There are **no production dependencies** listed in this project - only dev dependencies.\n' +
        '\n' +
        'The project also specifies:\n' +
        '- **Node version requirement**: >= 22\n' +
        '- **Module type**: ES modules (`"type": "module"`)'
    }
  ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 328,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 171,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}

 */


/**
 * 
 * 接下来我们实现了一个简单的读文件函数，引入一个粗糙的循环，只要能跑通我们工具调用就行了
 * message 需要作为一个可变数组，用来追加 assistant 消息（content 原样）+ user 消息（tool_result，tool_use_id 用 block 的 id，content 放读到的文本）
 * 我注意到模型的返回里，tool_use 阶段，input 和 caller 是 Object，我怎么知道 Object 是什么？
 */

// import { readFile } from "fs/promises";

// export async function readFileTool(path: string) {
//   const content = await readFile(path, "utf-8");
//   return {
//     content,
//   };
// }

// const messages: any[] = [{
//         role: "user",
//         // content: "Read `/Users/lixianzhe/work/build-your-own-ai-agent/spike/package.json` and tell me which dependencies are installed.",
//         content: "对比 /Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts 和 /Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-sdk.ts",
//     },
// ]

// while (true){
//     const response = await fetch("https://api.anthropic.com/v1/messages", {
//         method: "POST",
//         headers: {
//             "x-api-key": process.env.ANTHROPIC_API_KEY!,
//             "anthropic-version": "2023-06-01",
//             "content-type": "application/json",
//         },
//         body: JSON.stringify({
//             model: "claude-haiku-4-5",
//             max_tokens: 1000,
//             tools: [
//                 {
//                     name: "read_file",
//                     description: "Read the file at the given path.",
//                     input_schema: {
//                         type: "object",
//                         properties:{
//                             path: {
//                                 type: "string",
//                                 description: "The path of the file."
//                             }
//                         },
//                         required: ["path"]
//                     },
//                     input_examples: [
//                         {
//                             path:"/build-your-own-ai-agent/CLAUDE.md"
//                         }
//                     ]
//                 }
//             ],
//             messages,
//         }),
//     });
//     console.log(response.status); 
//     if (!response.ok) {
//         throw new Error(await response.text());
//     }
    
//     const data = await response.json();
//     console.log(data);

//     const toolUse = data.content.find((c: any) => c.type === "tool_use") // content 是个数组，找到数组中第一个数组中查找第一个 type 属性为 "tool_use" 的元素。
//     if (!toolUse) {
//         console.log("\nFinal Answer:\n", data.content[0].text);
//         break; // 工具调用完了，结束
//     }

//     const result = await readFileTool(toolUse.input.path)

//     messages.push({
//         role: "assistant",
//         content: data.content,
//     });
//     messages.push({
//         role: "user",
//         content: [
//             {
//                 type: "tool_result",
//                 tool_use_id: toolUse.id,
//                 content: result.content,
//             },
//         ],
//     });


// }


/**
 * 结果如下，非常好
➜  spike git:(spike) ✗ npx tsx d1-fetch.ts
◇ injected env (1) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01FA3zBtK3wwCbsVuSYSVxSs',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_013uhWTARSMX1bbTPh3SBFF1',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 700,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 79,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01Qf5anX1kyQG3JJQCsKkwE5',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Based on the package.json file, here are the installed dependencies:\n' +
        '\n' +
        '**Dependencies:**\n' +
        '- `@anthropic-ai/sdk` - version ^0.104.1\n' +
        '- `dotenv` - version ^17.4.2\n' +
        '- `tsx` - version ^4.22.4\n' +
        '\n' +
        '**DevDependencies:**\n' +
        '- `@types/node` - version ^25.9.3\n' +
        '\n' +
        'The project is an npm package named "spike" that uses the Anthropic AI SDK, likely for building an AI agent. It also uses dotenv for environment variable management and tsx for TypeScript execution.'
    }
  ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 1024,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 133,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}

Final Answer:
 Based on the package.json file, here are the installed dependencies:

**Dependencies:**
- `@anthropic-ai/sdk` - version ^0.104.1
- `dotenv` - version ^17.4.2
- `tsx` - version ^4.22.4

**DevDependencies:**
- `@types/node` - version ^25.9.3

The project is an npm package named "spike" that uses the Anthropic AI SDK, likely for building an AI agent. It also uses dotenv for environment variable management and tsx for TypeScript execution.
 */



/**
 * 当模型需要并非两个 tool 调用时，会发生什么？
 * 把提示词改成 对比 /Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts 和 /Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-sdk.ts
 * 模型返回了一个 text 和两个 tool_use，并且在第二次请求中返回了请求码 400，看上去是模型拒绝了请求。
 * 
spike git:(spike) ✗ npx tsx d1-fetch.ts
◇ injected env (1) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01SQ1ixDaXGU5vsKUsXMj7T8',
  type: 'message',
  role: 'assistant',
  content: [
    { type: 'text', text: '我来帮你读取这两个文件进行对比。' },
    {
      type: 'tool_use',
      id: 'toolu_01HacoeK29KUr1wUc5fXvgw4',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    },
    {
      type: 'tool_use',
      id: 'toolu_013YQQAH1Rha3tQj4mhRqAzd',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 729,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 164,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}
/Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts:638
        throw new Error(await response.text());
              ^

Error: {"type":"error","error":{"type":"invalid_request_error","message":"messages.2: `tool_use` ids were found without `tool_result` blocks immediately after: toolu_013YQQAH1Rha3tQj4mhRqAzd. Each `tool_use` block must have a corresponding `tool_result` block in the next message."},"request_id":"req_011Cbxa11WoKDjePYpzHzbM7"}
    at <anonymous> (/Users/lixianzhe/work/build-your-own-ai-agent/spike/d1-fetch.ts:638:15)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)

Node.js v24.11.1
 */


/**
 * 
 * 接下来解决并发 tool_use 导致模型拒绝访问的问题，只需要加一个循环处理 tool_use 数组就行了
 * 
 */

import { readFile } from "fs/promises";

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

while (true){
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
            messages,
        }),
    });
    console.log(response.status); 
    if (!response.ok) {
        throw new Error(await response.text());
    }
    
    const data = await response.json();
    console.log(data);

    messages.push({
        role: "assistant",
        content: data.content,
    });
    const toolUses = data.content.filter((c: any) => c.type === "tool_use") // content 是个数组
    if (!toolUses.length) { // 这里踩坑了，toolUses 是一个数组对象，数组对象在 typescript 中恒为真值，直接使用 !toolUses 会导致死循环直到达到模型rate limit
        console.log("\nFinal Answer:\n", data.content[0].text);
        break; // 工具调用完了，结束
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
 * 验证成功
◇ injected env (1) from .env // tip: ⌘ override existing { override: true }
200
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_01Fin9qxAyuvRsNVL5eigXkk',
  type: 'message',
  role: 'assistant',
  content: [
    { type: 'text', text: '我来帮你读取这两个文件进行对比。' },
    {
      type: 'tool_use',
      id: 'toolu_01SBsdmPyRBcBGCG96VBorTS',
      name: 'read_file',
      input: [Object],
      caller: [Object]
    },
    {
      type: 'tool_use',
      id: 'toolu_01KAEhDd7bW3p1gtr59hhswx',
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
    output_tokens: 156,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}
200
{
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_014paxSpbT3qL4a5SZUDZnsQ',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: '## 对比结果\n' +
        '\n' +
        '| 项目 | 根目录 package.json | spike/package.json |\n' +
        '|------|-------------------|-------------------|\n' +
        '| **name** | build-your-own-ai-agent | spike |\n' +
        '| **version** | ❌ 无 | 1.0.0 |\n' +
        '| **description** | ❌ 无 | ❌ 空字符串 |\n' +
        '| **main** | ❌ 无 | index.js |\n' +
        '| **type** | module | module |\n' +
        '| **private** | true | ❌ 无 |\n' +
        '| **engines** | node >=22 | ❌ 无 |\n' +
        '\n' +
        '### Scripts 脚本对比\n' +
        '**根目录：**\n' +
        '- docs:dev\n' +
        '- docs:build\n' +
        '- docs:preview\n' +
        '- ebook\n' +
        '\n' +
        '**spike：**\n' +
        '- test（默认错误脚本）\n' +
        '\n' +
        '### 依赖对比\n' +
        '\n' +
        '**devDependencies 共有：**\n' +
        '- `@types/node` 仅在 spike 中\n' +
        '\n' +
        '**根目录 devDependencies：**\n' +
        '- markdown-it-container ^4.0.0\n' +
        '- vitepress ^1.6.4\n' +
        '- vitepress-plugin-llms ^1.13.1\n' +
        '\n' +
        '**spike devDependencies：**\n' +
        '- @types/node ^25.9.3\n' +
        '\n' +
        '**spike 独有的 dependencies：**\n' +
        '- @anthropic-ai/sdk ^0.104.1\n' +
        '- dotenv ^17.4.2\n' +
        '- tsx ^4.22.4\n' +
        '\n' +
        '### 📌 总结\n' +
        '- **根目录**：文档/博客项目（VitePress）\n' +
        '- **spike**：AI 代理项目，使用 Anthropic SDK 进行开发和测试'
    }
  ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 1294,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 429,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}

Final Answer:
 ## 对比结果

| 项目 | 根目录 package.json | spike/package.json |
|------|-------------------|-------------------|
| **name** | build-your-own-ai-agent | spike |
| **version** | ❌ 无 | 1.0.0 |
| **description** | ❌ 无 | ❌ 空字符串 |
| **main** | ❌ 无 | index.js |
| **type** | module | module |
| **private** | true | ❌ 无 |
| **engines** | node >=22 | ❌ 无 |

### Scripts 脚本对比
**根目录：**
- docs:dev
- docs:build
- docs:preview
- ebook

**spike：**
- test（默认错误脚本）

### 依赖对比

**devDependencies 共有：**
- `@types/node` 仅在 spike 中

**根目录 devDependencies：**
- markdown-it-container ^4.0.0
- vitepress ^1.6.4
- vitepress-plugin-llms ^1.13.1

**spike devDependencies：**
- @types/node ^25.9.3

**spike 独有的 dependencies：**
- @anthropic-ai/sdk ^0.104.1
- dotenv ^17.4.2
- tsx ^4.22.4

### 📌 总结
- **根目录**：文档/博客项目（VitePress）
- **spike**：AI 代理项目，使用 Anthropic SDK 进行开发和测试
 * 
 * 
 */