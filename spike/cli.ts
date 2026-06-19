import { runAgent } from "./agent-sdk.ts";

// import { runAgent } from "./agent-fetch.ts";
import { isAbortError, runTool as runBaseTool, tools } from "./tools.ts";
import { taskToolDefinition, runTaskTool } from "./subagent.ts";
import type { Tool } from "@anthropic-ai/sdk/resources";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = createInterface({ input, output });

async function confirmToolCall(toolName: string, toolInput: unknown) {
  console.log(`\n工具请求: ${toolName}`);
  console.dir(toolInput, { depth: null });

  const answer = await rl.question("允许执行吗？(y/N) ");
  return answer.trim().toLowerCase() === "y";
}


const controller = new AbortController();

process.on("SIGINT", () => {
  controller.abort();
});

const systemPrompt = `
Working directory: ${process.cwd()}
Platform: ${process.platform}
Shell: ${process.env.SHELL || "unknown"}
Date: ${new Date().toISOString()}
Do not guess when information can be obtained from tools.
Use available tools to inspect files, code, configuration, and environment before making assumptions.
`

const todoWriteToolDefinition: Tool = {
  name: "todo_write",
  description: "Replace the current todo list for this agent run.",
  input_schema: {
    type: "object",
    properties: {
      todos: {
        type: "array",
        description: "Todo items with content, status, and activeForm",
      },
    },
    required: ["todos"],
  },
};

type Todo = {
  content: string;
  status: string;
  activeForm: string;
};

const todoState: { todos: Todo[] } = { todos: [] };

function todoWrite(input: unknown): string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("todo_write 参数必须是 object");
  }

  const todos = (input as Record<string, unknown>).todos;
  if (!Array.isArray(todos)) {
    throw new Error("todos 必须是数组");
  }

  todoState.todos = todos.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("todo item 必须是 object");
    }

    const obj = item as Record<string, unknown>;

    if (
      typeof obj.content !== "string" ||
      typeof obj.status !== "string" ||
      typeof obj.activeForm !== "string"
    ) {
      throw new Error("todo item 需要 content/status/activeForm 字符串字段");
    }

    return {
      content: obj.content,
      status: obj.status,
      activeForm: obj.activeForm,
    };
  });

  return `Todo list updated:\n${JSON.stringify(todoState.todos, null, 2)}`;
}

const mainTools: Tool[] = [
  ...tools,
  taskToolDefinition,
  todoWriteToolDefinition,
];

async function mainRunTool(name: string, input: unknown, signal?: AbortSignal): Promise<string> {
  if (name === "task") {
    return await runTaskTool(input, signal);
  }

  if (name === "todo_write") {
    return todoWrite(input);
  }

  return await runBaseTool(name, input, signal);
}

const content: string = process.argv[2]

try {
    const result = await runAgent({
        messages: [
            {
                role: "user",
                content: content,
            },
        ],
        maxTurns: 20,
        tools: mainTools,
        runTool: mainRunTool,
        signal: controller.signal,
        system: systemPrompt,
        onToolCall: confirmToolCall,
    });
    console.dir(result.messages, { depth: null })
    console.log(result.agentStopReason);
    console.log(result.usage);
} catch (error) {
    // 记得打印错误。
    console.error(error);
    if (isAbortError(error)) {
        process.exit(130)
    }
    process.exit(1)
}finally {
    rl.close();
}

// D3 两次验证运行（victim 修复 + 拒绝测试）的完整日志见 logs/d3-runs.log
