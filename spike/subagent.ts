import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources";
import { runAgent } from "./agent-sdk.ts";
import { grepTool, readFileTool, tools } from "./tools.ts";

export const taskToolDefinition: Tool = {
  name: "task",
  description: "Launch a read-only explorer agent to investigate files and return a concise answer.",
  input_schema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The investigation request for the explorer agent",
      },
    },
    required: ["prompt"],
  },
};

const explorerTools: Tool[] = tools.filter(
  (tool) => tool.name === "read_file" || tool.name === "grep"
);

export async function runTaskTool(input: unknown, signal?: AbortSignal): Promise<string> {
  const prompt = promptFromInput(input);

  const result = await runAgent({
    messages: [{ role: "user", content: prompt }],
    maxTurns: 6,
    tools: explorerTools,
    runTool: runExplorerTool,
    signal,
    system: [
      "You are a read-only explorer sub-agent.",
      "Use read_file and grep to inspect the repository.",
      "Do not attempt to edit files or run shell commands.",
      "Return a concise answer with relevant file paths.",
    ].join("\n"),
  });

  const text = lastAssistantText(result.messages);

  return [
    `[explorer stop_reason=${result.agentStopReason}, input_tokens=${result.usage.inputTokens}, output_tokens=${result.usage.outputTokens}]`,
    text,
  ].join("\n");
}

async function runExplorerTool(name: string, input: unknown, signal?: AbortSignal): Promise<string> {
  if (name === "read_file") {
    return await readFileTool(input, signal);
  }

  if (name === "grep") {
    return await grepTool(input, signal);
  }

  throw new Error(`explorer 不允许使用工具: ${name}`);
}

function promptFromInput(input: unknown): string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("task 参数必须是 object");
  }

  const prompt = (input as Record<string, unknown>).prompt;
  if (typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("prompt 必须是非空字符串");
  }

  return prompt;
}

function lastAssistantText(messages: MessageParam[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];

    if (message.role !== "assistant") {
      continue;
    }

    if (typeof message.content === "string") {
      return message.content;
    }

    const text = message.content
      .filter(isTextBlock)
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  return "explorer stopped without a final assistant message.";
}

function isTextBlock(block: unknown): block is { type: "text"; text: string } {
  return (
    block !== null &&
    typeof block === "object" &&
    "type" in block &&
    "text" in block &&
    block.type === "text" &&
    typeof block.text === "string"
  );
}