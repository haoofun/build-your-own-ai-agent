import type {
  Message,
  MessageParam,
  TextBlock,
  ToolResultBlock,
  ToolUseBlock,
} from './types.js'
import { tools } from './tools.js'

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
      tools: tools.map((tool) => tool.definition),
      tool_choice: {
        type: 'auto',
        disable_parallel_tool_use: false,
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

function isTextBlock(block: Message['content'][number]): block is TextBlock {
  return block.type === 'text'
}

function isToolUseBlock(block: Message['content'][number]): block is ToolUseBlock {
  return block.type === 'tool_use'
}

function printMessage(message: Message): void {
  const text = message.content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join('')

  if (text) {
    console.log(`claude> ${text}`)
  }

  console.log(`  · ${message.usage.input_tokens} in / ${message.usage.output_tokens} out · ${message.stop_reason}`)
}

export async function runAgent(messages: MessageParam[]): Promise<void> {
  while (true) {
    const message = await callModel(messages)
    printMessage(message)

    messages.push({
      role: 'assistant',
      content: message.content,
    })

    if (message.stop_reason === 'end_turn') {
      return
    }

    if (message.stop_reason !== 'tool_use') {
      throw new Error(
        `unexpected stop reason: ${message.stop_reason}`,
      )
    }

    const toolUses = message.content.filter(isToolUseBlock)

    if (toolUses.length === 0) {
      throw new Error(
        'stop_reason is tool_use but no tool_use block was found',
      )
    }

    const toolResults: ToolResultBlock[] = []

    for (const toolUse of toolUses) {
      console.log(
        `tool_use> ${toolUse.name}: ${JSON.stringify(toolUse.input)}`,
      )

      let toolResult: ToolResultBlock

      const tool = tools.find(
        (candidate) =>
          candidate.definition.name === toolUse.name,
      )

      if (!tool) {
        throw new Error(`unknown tool: ${toolUse.name}`)
      }

      try {
        const output = await tool.execute(toolUse.input)

        console.log(`tool_result> ${output}`)

        toolResult = {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: output,
        }
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        console.log(`tool_error> ${error}`)

        toolResult = {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: errMessage,
          is_error: true,
        }
      }

      toolResults.push(toolResult)
    }

    messages.push({
      role: 'user',
      content: toolResults,
    })
  }
}
