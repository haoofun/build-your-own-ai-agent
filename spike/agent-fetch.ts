import type {
    ContentBlockParam,
    Message,
    MessageParam,
    StopReason,
    ToolDefinition,
    ToolResultBlock,
    ToolUseBlock,
} from "./types.ts";
import { isAbortError, runTool } from "./tools.ts";

type RunAgentOptions = {
    model?: string,
    maxTurns?: number,
    maxTokens?: number,
    messages: MessageParam[],
    tools: ToolDefinition[],
    signal?: AbortSignal
}

type AgentStopReason = StopReason | "max_turns"

type RunAgentResult = {
    messages: MessageParam[]
    agentStopReason: AgentStopReason
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}

export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
    const model = opts.model ?? "claude-haiku-4-5"
    const messages = opts.messages
    const maxTurns = opts.maxTurns ?? 10
    const maxTokens = opts.maxTokens ?? 4096
    const usage = { inputTokens: 0, outputTokens: 0 }
    const signal = opts.signal;

    for (let turn = 1; turn <= maxTurns; turn++) {
        signal?.throwIfAborted();

        const message = await createMessage({
            model,
            maxTokens,
            messages,
            tools: opts.tools,
            signal,
        });

        usage.inputTokens += message.usage.input_tokens;
        usage.outputTokens += message.usage.output_tokens;

        messages.push({
            role: "assistant",
            content: message.content,
        });

        const toolUses = message.content.filter((c): c is ToolUseBlock => c.type === "tool_use");
        if (!toolUses.length) {
            if (message.stop_reason === "max_tokens") {
                console.warn("max_tokens")
            }
            return { messages, usage, agentStopReason: message.stop_reason }
        }

        const content: ContentBlockParam[] = []
        for (const toolUse of toolUses) {
            const toolResult: ToolResultBlock = { tool_use_id: toolUse.id, type: "tool_result" }
            try {
                const result = await runTool(toolUse.name, toolUse.input, signal)
                toolResult.content = result
            } catch (error) {
                if (signal?.aborted || isAbortError(error)) {
                    throw error;
                }
                toolResult.content = error instanceof Error ? error.message : String(error);
                toolResult.is_error = true
            }
            content.push(toolResult)
        }

        messages.push({
            role: "user",
            content,
        });
    }

    return { messages, usage, agentStopReason: "max_turns" }
}

type CreateMessageOptions = {
    model: string;
    maxTokens: number;
    messages: MessageParam[];
    tools: ToolDefinition[];
    signal?: AbortSignal;
};

async function createMessage(opts: CreateMessageOptions): Promise<Message> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error("缺少环境变量 ANTHROPIC_API_KEY");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: opts.model,
            max_tokens: opts.maxTokens,
            messages: opts.messages,
            tools: opts.tools,
        }),
        signal: opts.signal,
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return await response.json() as Message;
}
