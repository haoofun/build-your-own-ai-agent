import Anthropic from "@anthropic-ai/sdk";
import { MessageParam, Tool, ContentBlockParam, ToolResultBlockParam, ToolUseBlock, StopReason } from "@anthropic-ai/sdk/resources";

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

type RunAgentOptions = {
    model?: string,
    maxTurns?: number,
    maxTokens?: number,
    messages: MessageParam[],
    tools: Tool[],
    /**
     * const controller = new AbortController(); // 入口创建控制器
     * controller.signal;                       // 传给所有可能很慢的异步操作
     * controller.abort();                      // 用户 Ctrl-C 时广播取消     
     * 
     */
    signal?: AbortSignal
    // d3, 加入系统提示词，由 Environment Info 和 Doing task组成
    system?: string
    onToolCall?: (toolName: string, input: unknown) => Promise<boolean>;
    // 解耦工具，工具集隔离
    runTool: (name: string, input: unknown, signal?: AbortSignal) => Promise<string>
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

const client = new Anthropic();

export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
    const model = opts.model ?? "claude-haiku-4-5"
    // messages 数组，压缩需要改变，const 常量无法改变，所以这里用 let 声明，不确定对不对奥
    let messages = opts.messages
    const maxTurns = opts.maxTurns ?? 10
    const maxTokens = opts.maxTokens ?? 4096
    const usage = { inputTokens: 0, outputTokens: 0 }
    const signal = opts.signal;

    for (let turn = 1; turn <= maxTurns; turn++) {
        // 取出 AbortSignal
        signal?.throwIfAborted();
        // 传递给 client 的参数，tools 的类型需要满足 Tool[]，messages 需要满足 MessageParam[],(接口数组？)
        const message = await client.messages.create({
            model: model,
            max_tokens: maxTokens,
            messages: messages,
            tools: opts.tools,
            // 不让大模型跑并行工具调用
            tool_choice: {
                type: "auto",
                disable_parallel_tool_use: true,
            },
            system: opts.system
        },
            { signal }
        );
        console.log(`[turn ${turn}] input_tokens=${message.usage.input_tokens}, output_tokens=${message.usage.output_tokens}, messages=${messages.length}`);
        usage.inputTokens += message.usage.input_tokens;
        usage.outputTokens += message.usage.output_tokens;

        // 设定压缩阈值为 2000 
        const shouldCompact: boolean = message.usage.input_tokens > 3072

        messages.push({
            role: "assistant",
            content: message.content,
        });

        // 不要 any 也不要 as
        const toolUses = message.content.filter((c): c is ToolUseBlock => c.type === "tool_use");
        if (!toolUses.length) {
            if (message.stop_reason! === "max_tokens") {
                console.warn("max_tokens")
            }
            return { messages, usage, agentStopReason: message.stop_reason! }
        }

        const content: Array<ContentBlockParam> = []
        for (const toolUse of toolUses) {
            // 使用 ToolUseBlock 而非 ToolUseBlockParam
            // Param 后缀的类型是"你发出去的"（request 侧），message.content 里的块是 response 侧的 ToolUseBlock（无 Param）
            const tool_result: ToolResultBlockParam = { tool_use_id: toolUse.id, type: "tool_result" }

            // 权限判断
            const needsApproval = toolUse.name !== "read_file";

            if (needsApproval && opts.onToolCall) {
                const allowed = await opts.onToolCall(toolUse.name, toolUse.input);

                if (!allowed) {
                    tool_result.content = "用户拒绝了此操作";
                    tool_result.is_error = true;
                    content.push(tool_result);
                    continue;
                }
            }
            try {
                // 加上取消信号量
                const result = await opts.runTool(toolUse.name, toolUse.input, signal)
                tool_result.content = result
            } catch (error) {
                if (signal?.aborted || isAbortError(error)) {
                    throw error;
                }
                tool_result.content = error instanceof Error ? error.message : String(error);
                tool_result.is_error = true
            }
            content.push(tool_result)

        }
        messages.push({
            role: "user",
            content: content
        });

        // 最后再 compact 
        if (shouldCompact) {
            console.log(`[compact turn ${turn}] before messages=${messages.length}`);
            const compacted = await compact(messages, model, maxTokens, signal);
            messages = compacted.messages;
            usage.inputTokens += compacted.usage.inputTokens;
            usage.outputTokens += compacted.usage.outputTokens;
            console.log(`[compact turn ${turn}] after messages=${messages.length}`);
        }
    }

    return { messages, usage, agentStopReason: "max_turns" }
}

async function compact(
    messages: MessageParam[],
    model: string,
    maxTokens: number,
    signal?: AbortSignal
): Promise<{ messages: MessageParam[]; usage: { inputTokens: number; outputTokens: number } }> {
    const cutIndex = findCompactCutIndex(messages, 4, {
        role: "user",
        content: "Earlier conversation summary: placeholder",
    });

    const prefix = messages.slice(0, cutIndex);
    const suffix = messages.slice(cutIndex);

    const summarized = await summarizeMessages(prefix, model, maxTokens, signal);

    const summary: MessageParam = {
        role: "user",
        content: `Earlier conversation summary:\n${summarized.summary}`,
    };

    const compactedMessages = [summary, ...suffix];

    assertValidMessages(compactedMessages);

    return {
        messages: compactedMessages,
        usage: summarized.usage,
    };
}

function findCompactCutIndex(messages: MessageParam[], keepLast: number, summary: MessageParam): number {
    let cutIndex = Math.max(1, messages.length - keepLast);

    while (cutIndex > 0) {
        const candidate = [
            summary,
            ...messages.slice(cutIndex),
        ];

        try {
            assertValidMessages(candidate);
            return cutIndex;
        } catch {
            cutIndex--;
        }
    }

    return 1;
}

function assertValidMessages(messages: MessageParam[]) {
    if (messages.length === 0) {
        throw new Error("messages 不能为空");
    }

    if (messages[0].role !== "user") {
        throw new Error("messages 必须以 user 起头");
    }

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        if (!Array.isArray(msg.content)) {
            continue;
        }

        if (msg.role === "assistant") {
            const toolUseIds = msg.content
                .filter(c => c.type === "tool_use")
                .map(c => c.id);

            if (toolUseIds.length === 0) {
                continue;
            }

            const nextMsg = messages[i + 1];
            if (!nextMsg || nextMsg.role !== "user" || !Array.isArray(nextMsg.content)) {
                throw new Error("assistant tool_use 后必须紧跟 user tool_result");
            }

            const toolResultIds = nextMsg.content
                .filter(c => c.type === "tool_result")
                .map(c => c.tool_use_id);

            for (const id of toolUseIds) {
                if (!toolResultIds.includes(id)) {
                    throw new Error(`缺少 tool_result: ${id}`);
                }
            }
        }

        if (msg.role === "user") {
            const toolResultIds = msg.content
                .filter(c => c.type === "tool_result")
                .map(c => c.tool_use_id);

            if (toolResultIds.length === 0) {
                continue;
            }

            const prevMsg = messages[i - 1];
            if (!prevMsg || prevMsg.role !== "assistant" || !Array.isArray(prevMsg.content)) {
                throw new Error("user tool_result 前面必须是 assistant tool_use");
            }

            const toolUseIds = prevMsg.content
                .filter(c => c.type === "tool_use")
                .map(c => c.id);

            for (const id of toolResultIds) {
                if (!toolUseIds.includes(id)) {
                    throw new Error(`孤立的 tool_result: ${id}`);
                }
            }
        }
    }
}


async function summarizeMessages(
    messagesToSummarize: MessageParam[],
    model: string,
    maxTokens: number,
    signal?: AbortSignal
): Promise<{ summary: string; usage: { inputTokens: number; outputTokens: number } }> {
    const summaryPrompt: MessageParam[] = [
        ...messagesToSummarize,
        {
            role: "user",
            content:
                "Summarize the conversation above for continuing an agent task. " +
                "Preserve concrete facts, file paths, tool results, decisions, current progress, remaining steps, and any constraints. " +
                "Do not call tools. Return only the summary text.",
        },
    ];

    const message = await client.messages.create({
        model,
        max_tokens: Math.min(maxTokens, 1024),
        messages: summaryPrompt,
        system: "You summarize conversation history. Do not call tools. Return only text.",
    }, { signal });

    const summary = message.content
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("\n")
        .trim();

    if (!summary) {
        throw new Error("summary 为空");
    }

    return {
        summary,
        usage: {
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
        },
    };
}