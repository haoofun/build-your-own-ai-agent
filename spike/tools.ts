import { exec } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { promisify } from "util";

// promisify(exec) 在非零 exit 时直接 reject
const execAsync = promisify(exec);

export async function readFileTool(path: string): Promise<string>{
  return await readFile(path, "utf8")
}

// Promise 本身就代表成功或失败。
export async function writeFileTool(path: string, content: string){
  try{
    await writeFile(path, content, "utf8")
  }catch(err) {
    console.log(err)
  }
}

/**
 * writeFileTool / editFileTool 里 catch + console.log，错误去了终端（人的频道），模型频道里什么都没有，
 * 函数返回 undefined。后果链：写失败 → 模型收到空 tool_result → 模型宣布"已写入"→ 流畅地错下去。
 * 
 * @param path 
 * @param oldString 
 * @param newString 
 */
export async function editFileTool(path: string, oldString: string, newString:string) {
  const content = await readFile(path, "utf8")
  /**
   * 问题/坑
   * 字符串版 replace 只替换第一个匹配
   * 0 匹配时 replace 原样返回，然后你把没变的内容写回去、报告成功。模型以为改完了，文件一字未动。
   * JS 冷知识坑：replace 的替换串里 $& $' 等是特殊模式——new_string 若含 $，写进去的不是你给的字面量。修法是用 replacer 函数形式（replace(old, () => newString)）或干脆 indexOf + slice 手拼。这条值得进章节当 callout。
   */
  const newContent = content.replace(oldString, newString)
  try{
    await writeFile(path, newContent, "utf8")
  }catch(err) {
    console.log(err)
  }
}

export async function bashTool(command:string): Promise<string> {
  const { stdout, stderr } = await execAsync(command)
  return stdout + stderr 
}

export const tools = [
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
        old_string: {
          type: "string",
          description: "The text to replace",
        },
        new_string: {
          type: "string",
          description: "The replacement text",
        },
      },
      required: ["path", "old_string", "new_string"],
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
          description: "The command to run",
        },
      },
      required: ["command"],
    },
  },
];


export async function runTool(name: string, input: unknown) {
  if (name === "read_file") {
    return await readFileTool(input.path);
  }

  if (name === "write_file") {
    return await writeFileTool(input.path, input.content);
  }

  if (name === "edit_file") {
    return await editFileTool(input.path, input.old_string, input.new_string);
  }

  if (name === "bash") {
    return await bashTool(input.command);
  }

  throw new Error(`Unknown tool: ${name}`);
}
