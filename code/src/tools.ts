import { readFile, writeFile } from 'node:fs/promises'
import {
  exec,
  execFile,
} from 'node:child_process'
import { promisify } from 'node:util'
import type { ProcessError, Tool } from './types.js'


const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

export const tools: Tool[] = [
  {
    definition: {
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
    execute: getCurrentTime,
  },
  {
    definition: {
      name: 'read_file',
      description: 'Read a UTF-8 text file from disk.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to the current working directory, for example "src/index.ts".',
          },
        },
        required: ['path'],
      },
    },
    execute: readFileTool,
  },
  {
    definition: {
      name: 'write_file',
      description: 'Create or overwrite a UTF-8 text file.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file, relative to the current working directory.',
          },
          content: {
            type: 'string',
            description: 'The complete content to write.',
          },
        },
        required: ['path', 'content'],
      },
    },
    execute: writeFileTool,
  },
  {
    definition: {
      name: 'edit_file',
      description: 'Replace one exact, unique string in a UTF-8 text file.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to edit.',
          },
          old_string: {
            type: 'string',
            description: 'Exact text to replace. It must appear exactly once, including whitespace.',
          },
          new_string: {
            type: 'string',
            description: 'Replacement text.',
          },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
    execute: editFileTool,
  },
  {
    definition: {
      name: 'grep',
      description: 'Search files recursively with a regular expression. Returns file paths, line numbers, and matching lines.',
      input_schema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Regular expression to search for.',
          },
          path: {
            type: 'string',
            description: 'File or directory to search.',
          },
        },
        required: ['pattern', 'path'],
      },
    },
    execute: grepTool,
  },
  {
    definition: {
      name: 'bash',
      description: 'Run a shell command and return its exit code, stdout, and stderr. Each call starts a new shell.',
      input_schema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute. A cd command does not persist into later calls.',
          },
        },
        required: ['command'],
      },
    },
    execute: bashTool,
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

function stringField(input: ToolInput, key: string): string {
  const value = input[key]

  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string`)
  }

  return value
}

function formatCommandResult(code: number | string, stdout: string, stderr: string): string {
  return [
    `exit code: ${code}`, '',
    'stdout:', stdout || '(empty)', '',
    'stderr:', stderr || '(empty)',
  ].join('\n')
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

export async function readFileTool(input: unknown): Promise<string> {
  const args = asObject(input)
  const path = stringField(args, "path")

  return await readFile(path, 'utf8')
}

export async function writeFileTool(input: unknown): Promise<string> {
  const args = asObject(input)
  const path = stringField(args, 'path')
  const content = stringField(args, 'content')

  await writeFile(path, content, 'utf8')

  return `wrote ${Buffer.byteLength(content, 'utf8')} bytes to ${path}`
}

export async function editFileTool(input: unknown): Promise<string> {
  const args = asObject(input)
  const path = stringField(args, "path")
  const oldString = stringField(args, "old_string")
  const newString = stringField(args, "new_string")

  if (oldString === "") {
    throw new Error('old_string must not be empty')
  }

  if (oldString === newString) {
    throw new Error(
      'old_string and new_string must be different',
    )
  }

  const content = await readFile(path, 'utf8')
  const count = content.split(oldString).length - 1

  if (count === 0) {
    throw new Error(
      `old_string was not found in ${path}; read the file again`,
    )
  }

  if (count > 1) {
    throw new Error(
      `old_string appears ${count} times in ${path}; include more surrounding text`,
    )
  }

  const next = content.replace(
    oldString,
    () => newString,
  )

  await writeFile(path, next, 'utf8')

  return `edited ${path}`
}

export async function grepTool(input: unknown): Promise<string> {
  const args = asObject(input)
  const pattern = stringField(args, 'pattern')
  const path = stringField(args, 'path')

  try {
    const { stdout, stderr } = await execFileAsync(
      'grep',
      [
        '-RInE',
        '--exclude-dir=.git',
        '--exclude-dir=node_modules',
        '--',
        pattern,
        path,
      ],
      {
        encoding: 'utf8',
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
      },
    )

    return stdout || stderr || 'No matches found.'
  } catch (error) {
    const failure = error as ProcessError

    if (failure.code === 1) {
      return `No matches found for ${JSON.stringify(pattern)} in ${path}.`
    }

    return formatCommandResult(
      failure.code ?? 'unknown',
      failure.stdout ?? '',
      failure.stderr ?? failure.message,
    )
  }
}

export async function bashTool(input: unknown): Promise<string> {
  const args = asObject(input)
  const command = stringField(args, 'command')

  try {
    const { stdout, stderr } = await execAsync(
      command,
      {
        encoding: 'utf8',
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
      },
    )

    return formatCommandResult(0, stdout, stderr)
  } catch (error) {
    const failure = error as ProcessError

    return formatCommandResult(
      failure.code ?? 'unknown',
      failure.stdout ?? '',
      failure.stderr ?? failure.message,
    )
  }
}

export async function runTool(name: string, input: unknown): Promise<string> {
  if (name === 'get_current_time') {
    return getCurrentTime(input)
  }

  if (name === 'read_file') {
    return await readFileTool(input)
  }

  throw new Error(`unknown tool: ${name}`)
}
