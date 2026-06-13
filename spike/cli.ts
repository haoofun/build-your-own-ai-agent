import { runAgent } from "./agent-sdk.ts";

// import { runAgent } from "./agent-fetch.ts";
import { isAbortError, tools } from "./tools.ts";
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

const content: string = process.argv[2]

try {
    const result = await runAgent({
        messages: [
            {
                role: "user",
                content: content,
            },
        ],
        tools,
        signal: controller.signal,
        system: systemPrompt,
        onToolCall: confirmToolCall,
    });
    console.dir(result.messages, { depth: null })
    console.log(result.agentStopReason);
    console.log(result.usage);
} catch (error) {
    if (isAbortError(error)) {
        process.exit(130)
    }
    process.exit(1)
}finally {
    rl.close();
}

// D3 两次验证运行（victim 修复 + 拒绝测试）的完整日志见 logs/d3-runs.log
