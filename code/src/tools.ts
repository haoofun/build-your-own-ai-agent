export const tools = [
  {
    name: 'get_current_time',
    description: 'Get the current date and time in an IANA time zone.',
    input_schema: {
      type: 'object',
      properties: {
        time_zone: {
          type: 'string',
          description: 'IANA time zone, for example Asia/Shanghai.',
        },
      },
      required: ['time_zone'],
    },
  },
]

type ToolInput = Record<string, unknown>

function asObject(input: unknown): ToolInput {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new Error('tool input must be an object')
  }

  return input as ToolInput
}

export function getCurrentTime(input: unknown): string {
  const args = asObject(input)

  if (typeof args.time_zone !== 'string') {
    throw new Error('time_zone must be a string')
  }

  const now = new Date()

  const formatter = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: args.time_zone,
  })

  return formatter.format(now)
}
