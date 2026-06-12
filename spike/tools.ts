import { exec } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { promisify } from "util";

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

export async function editFileTool(path: string, oldString: string, newString:string) {
  const content = await readFile(path, "utf8")
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

// 这个函数是“真正执行工具”的地方。
// 模型只会说：我要调用 read_file，参数是 { path: "xxx" }。
// 我们要把这个名字和参数，转成真正的函数调用。
export async function runTool(name: string, input: any) {
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
