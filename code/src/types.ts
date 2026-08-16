export type TextBlock = {
  type: 'text'
  text: string
}

export type ToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock

export type MessageParam =
  | {
      role: 'user'
      content: string | ToolResultBlock[]
    }
  | {
      role: 'assistant'
      content: ContentBlock[]
    }

export type Message = {
  role: 'assistant'
  content: ContentBlock[]
  stop_reason: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export type ProcessError = Error & {
  code?: number | string
  stdout?: string
  stderr?: string
}

export type ToolDefinition = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: 'string'
      description: string
    }>
    required: string[]
  }
}

export type Tool = {
  definition: ToolDefinition
  execute(input: unknown): string | Promise<string>
}
