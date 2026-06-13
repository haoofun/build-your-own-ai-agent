import { exec } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { promisify } from "util";
// sdk 版本，直接使用 sdk 的 Tool 类型
// import { Tool } from "@anthropic-ai/sdk/resources";

// fetch 版本，自定义类型
import type { ToolDefinition } from "./types.ts";

type TooolInput = Record<string, unknown>

function asObject(input: unknown): TooolInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)){
    throw new Error("工具参数必须是 Object")
  }
  return input as TooolInput
}

function stringField(toolInput: TooolInput, key: string): string {
  const value = toolInput[key]
  if (typeof value !== "string") {
    throw new Error(`${key} 必须是字符串，收到 ${String(value)}`);
  }

  return value
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

// promisify(exec) 在非零 exit 时直接 reject
const execAsync = promisify(exec);

// 取消信号是后来加的
export async function readFileTool(input: unknown, signal?: AbortSignal): Promise<string>{
  const arg = asObject(input)
  const path = stringField(arg, "path")
  return await readFile(path, { encoding: "utf8", signal })
}

// Promise 本身就代表成功或失败。
export async function writeFileTool(input: unknown, signal?: AbortSignal){
  const arg = asObject(input)
  const path = stringField(arg, "path")
  const content = stringField(arg, "content")

  await writeFile(path, content, { encoding: "utf8", signal })
  return `已写入 ${path}，${Buffer.byteLength(content, "utf8")} 字节`;
}

export async function editFileTool(input: unknown, signal?: AbortSignal) {
  const arg = asObject(input)
  const path = stringField(arg, "path")
  const oldString = stringField(arg, "oldString")
  const newString = stringField(arg, "newString")

  if (oldString === "") {
    throw new Error("old_string 不能为空")
  }
  if (oldString === newString) {
    throw new Error("old_string 和 new_string 不能相同");
  }

  const content = await readFile(path, { encoding: "utf8", signal });
  const count = content.split(oldString).length - 1;

  if (count === 0) {
    throw new Error(`没有在 ${path} 中找到 old_string，请重新读取文件后再试`);
  }
  if (count > 1) {
    throw new Error(`old_string 在 ${path} 中出现了 ${count} 次，请提供更精确的 old_string`);
  }

  // replace(oldString, () => newString) 是为了避免 $& 这类 JS 替换串特殊语法。
  const newContent = content.replace(oldString, () => newString);
  await writeFile(path, newContent, { encoding: "utf8", signal });
  return `已修改 ${path}`;
}

export async function bashTool(input: unknown, signal?: AbortSignal): Promise<string> {
  const arg = asObject(input)
  const command = stringField(arg, "command")
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      signal,
    });
    // 没 catch 错误就返回码为 0，因为 execAsync 会出现非零 exit 的业务结果
    return formatCommandResult(0, stdout, stderr);
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    const err = error as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    return formatCommandResult(
      err.code ?? "unknown",
      err.stdout ?? "",
      err.stderr ?? err.message ?? ""
    );
  }
}

function formatCommandResult(
  code: number | string,
  stdout: string,
  stderr: string
) {
  return [
    `exit code: ${code}`,
    "",
    "stdout:",
    stdout || "(无输出)",
    "",
    "stderr:",
    stderr || "(无输出)",
  ].join("\n");
}

export const tools: ToolDefinition[] = [
  // sdk 版本
  // export const tools: Tool[] = [
  {
    name: "read_file",
    description: "Read a file from disk",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to read",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to write",
        },
        content: {
          type: "string",
          description: "The full file content",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Replace text in a file",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path to edit",
        },
        oldString: {
          type: "string",
          description: "old_string must be unique within the file and match exactly, character for character (including whitespace).",
        },
        newString: {
          type: "string",
          description: "The replacement text",
        },
      },
      required: ["path", "oldString", "newString"],
    },
  },
  {
    name: "bash",
    description: "Run a shell command",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "There is no persistent session; the `cd` command does not persist across subsequent calls.",
        },
      },
      required: ["command"],
    },
  },
];


export async function runTool(name: string, input: unknown, signal?: AbortSignal) {
  if (name === "read_file") {
    return await readFileTool(input, signal);
  }

  if (name === "write_file") {
    return await writeFileTool(input, signal);
  }

  if (name === "edit_file") {
    return await editFileTool(input, signal);
  }

  if (name === "bash") {
    return await bashTool(input, signal);
  }

  throw new Error(`未知工具: ${name}`);
}
