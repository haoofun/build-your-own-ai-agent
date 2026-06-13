import Anthropic from "@anthropic-ai/sdk";
import { MessageParam, Tool, ContentBlockParam, ToolResultBlockParam, ToolUseBlock, StopReason } from "@anthropic-ai/sdk/resources";
import { runTool, isAbortError } from "./tools.ts";

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
    const messages = opts.messages
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
            system: opts.system
        },
        { signal }
        );

        usage.inputTokens += message.usage.input_tokens;
        usage.outputTokens += message.usage.output_tokens;

        messages.push({
            role: "assistant",
            content: message.content,
        });

        // 不要 any 也不要 as
        const toolUses = message.content.filter((c): c is ToolUseBlock => c.type === "tool_use");
        if (!toolUses.length) {
            if (message.stop_reason! === "max_tokens"){
                console.warn("max_tokens")
            }
            return { messages, usage, agentStopReason: message.stop_reason!}
        }

        const content: Array<ContentBlockParam> = []
        for (const toolUse of toolUses){  
            // 使用 ToolUseBlock 而非 ToolUseBlockParam
            // Param 后缀的类型是"你发出去的"（request 侧），message.content 里的块是 response 侧的 ToolUseBlock（无 Param）
            const tool_result: ToolResultBlockParam = {tool_use_id: toolUse.id, type: "tool_result"}
            
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
                const result = await runTool(toolUse.name, toolUse.input, signal)
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
    }
    
    return { messages, usage, agentStopReason: "max_turns" }
}


