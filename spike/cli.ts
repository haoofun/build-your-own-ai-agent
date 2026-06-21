import "dotenv/config";
import { runAgent } from "./agent-sdk.ts";

// import { runAgent } from "./agent-fetch.ts";
import { isAbortError, runTool as runBaseTool, tools } from "./tools.ts";
import { taskToolDefinition, runTaskTool } from "./subagent.ts";
import type { Tool } from "@anthropic-ai/sdk/resources";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { MCPClient } from "./mcp-client.ts";

const rl = createInterface({ input, output });

async function confirmToolCall(toolName: string, toolInput: unknown) {
  console.log(`\n工具请求: ${toolName}`);
  console.dir(toolInput, { depth: null });

  const answer = await rl.question("允许执行吗？(y/N) ");
  return answer.trim().toLowerCase() === "y";
}


const controller = new AbortController();

const mcpClient = new MCPClient({
  command: "npx",
  args: ["-y", "@playwright/mcp@latest"],
  signal: controller.signal,
});

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

type McpHandler = (input: unknown) => Promise<string>;

const mcpHandlers = new Map<string, McpHandler>();

function makeMcpToolName(
  serverName: string,
  toolName: string,
): string {
  const sanitize = (value: string) =>
    value.replace(/[^a-zA-Z0-9_-]/g, "_");

  const name =
    `mcp__${sanitize(serverName)}__${sanitize(toolName)}`;

  if (name.length > 64) {
    throw new Error(`MCP 工具名超过 64 字符: ${name}`);
  }

  return name;
}

function formatMcpContent(content: unknown[]): string {
  return content
    .map((block) => {
      if (
        block !== null &&
        typeof block === "object" &&
        !Array.isArray(block)
      ) {
        const obj = block as Record<string, unknown>;

        if (
          obj.type === "text" &&
          typeof obj.text === "string"
        ) {
          return obj.text;
        }
      }

      return JSON.stringify(block) ?? String(block);
    })
    .join("\n");
}

async function registerMcpTools(
  client: MCPClient,
  serverName: string,
): Promise<Tool[]> {
  const definitions: Tool[] = [];
  const discovered = await client.listTools();

  for (const tool of discovered) {
    const exposedName = makeMcpToolName(
      serverName,
      tool.name,
    );

    if (mcpHandlers.has(exposedName)) {
      throw new Error(`MCP 工具名冲突: ${exposedName}`);
    }

    mcpHandlers.set(exposedName, async (input) => {
      const result = await client.callTool(
        tool.name,
        input,
      );

      const content = formatMcpContent(result.content);

      if (result.isError) {
        throw new Error(
          content || `MCP 工具执行失败: ${tool.name}`,
        );
      }

      return content;
    });

    definitions.push({
      name: exposedName,
      description: tool.description,
      input_schema: tool.inputSchema,
    });
  }

  return definitions;
}


async function mainRunTool(name: string, input: unknown, signal?: AbortSignal): Promise<string> {
  if (name === "task") {
    return await runTaskTool(input, signal);
  }

  if (name === "todo_write") {
    return todoWrite(input);
  }

  const mcpHandler = mcpHandlers.get(name);

if (mcpHandler) {
  return await mcpHandler(input);
}

  return await runBaseTool(name, input, signal);
}

const content: string = process.argv[2]

async function main() {
  try {
    await mcpClient.start();

    const mcpToolDefinitions = await registerMcpTools(
      mcpClient,
      "playwright",
    );

    const mainTools: Tool[] = [
      ...tools,
      taskToolDefinition,
      todoWriteToolDefinition,
      ...mcpToolDefinitions,
    ];

    const result = await runAgent({
      messages: [{ role: "user", content }],
      maxTurns: 20,
      tools: mainTools,
      runTool: mainRunTool,
      signal: controller.signal,
      system: systemPrompt,
      onToolCall: confirmToolCall,
    });

    console.dir(result.messages, { depth: null });
    console.log(result.agentStopReason);
    console.log(result.usage);
  } finally {
    await mcpClient.stop();
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);

  process.exitCode =
    controller.signal.aborted || isAbortError(error)
      ? 130
      : 1;
});

