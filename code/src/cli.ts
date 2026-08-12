import readline from 'node:readline/promises'
import type {
  Message,
  MessageParam,
  TextBlock,
  ToolResultBlock,
  ToolUseBlock,
} from './types.js'
import { getCurrentTime, tools } from './tools.js'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'
const API_KEY = process.env.ANTHROPIC_API_KEY

async function callModel(messages: MessageParam[]): Promise<Message> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages,
      tools,
      tool_choice: {
        type: 'auto',
        disable_parallel_tool_use: true,
      },
    }),
  })

  if (!res.ok) {
    throw new Error(
      `API returned ${res.status}: ${await res.text()}`,
    )
  }

  return await res.json() as Message
}

if (!API_KEY) {
  console.error('Please set your ANTHROPIC_API_KEY')
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
console.log(`model: ${MODEL} (input /exit to exit)`)

function isTextBlock(block: Message['content'][number]): block is TextBlock {
  return block.type === 'text'
}

function isToolUseBlock(block: Message['content'][number]): block is ToolUseBlock {
  return block.type === 'tool_use'
}

function printMessage(message: Message): void {
  const text = message.content.filter(isTextBlock).map((block) => block.text).join('')

  if (text) console.log(`claude> ${text}`)

  console.log(`  · ${message.usage.input_tokens} in / ${message.usage.output_tokens} out · ${message.stop_reason}`)
}

async function answerOnce(userInput: string): Promise<void> {
  const messages: MessageParam[] = [
    {
      role: 'user',
      content: userInput,
    },
  ]
  const first = await callModel(messages)
  printMessage(first)

  const toolUse = first.content.find(isToolUseBlock)

  if (!toolUse) return

  console.log(
    `tool_use> ${toolUse.name}: ${JSON.stringify(toolUse.input)}`,
  )

  if (toolUse.name !== 'get_current_time') {
    throw new Error(`unknown tool: ${toolUse.name}`)
  }

  const output = getCurrentTime(toolUse.input)
  console.log(`tool_result> ${output}`)

  const toolResult: ToolResultBlock = {
    type: 'tool_result',
    tool_use_id: toolUse.id,
    content: output,
  }

  messages.push(
    {
      role: 'assistant',
      content: first.content,
    },
    {
      role: 'user',
      content: [toolResult],
    },
  )

  const second = await callModel(messages)
  printMessage(second)
}

while (true) {
  const line = (await rl.question('you> ')).trim()
  if (line === '/exit') break
  if (line === '') continue

  await answerOnce(line)
}

rl.close()
