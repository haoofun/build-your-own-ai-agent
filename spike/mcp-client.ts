import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";

type MCPClientOptions = {
    command: string;
    args: string[];
    signal?: AbortSignal;
};

type PendingRequest = {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
};

export type McpTool = {
    name: string;
    description?: string;
    inputSchema: {
        type: "object";
        properties?: Record<string, unknown>;
        required?: string[];
        [key: string]: unknown;
    };
};

export type McpToolResult = {
    content: unknown[];
    isError: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function isMcpTool(value: unknown): value is McpTool {
    if (!isRecord(value)) {
        return false;
    }

    if (typeof value.name !== "string") {
        return false;
    }

    if (
        value.description !== undefined &&
        typeof value.description !== "string"
    ) {
        return false;
    }

    return (
        isRecord(value.inputSchema) &&
        value.inputSchema.type === "object"
    );
}


function waitForExit(
    child: ChildProcessWithoutNullStreams,
    timeoutMs: number,
): Promise<boolean> {
    if (
        child.exitCode !== null ||
        child.signalCode !== null
    ) {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        const finish = (exited: boolean) => {
            clearTimeout(timer);
            child.off("exit", onExit);
            resolve(exited);
        };

        const onExit = () => {
            finish(true);
        };

        const timer = setTimeout(() => {
            finish(false);
        }, timeoutMs);

        child.once("exit", onExit);
    });
}

function getAbortError(signal: AbortSignal): Error {
    if (signal.reason instanceof Error) {
        return signal.reason;
    }

    const error = new Error(
        signal.reason === undefined
            ? "操作已取消"
            : String(signal.reason),
    );

    error.name = "AbortError";
    return error;
}

export class MCPClient {
    private child?: ChildProcessWithoutNullStreams;
    private lines?: Interface;

    private nextId = 1;
    private pending = new Map<number, PendingRequest>();

    private stopPromise?: Promise<void>;

    private readonly handleAbort = (): void => {
        void this.stop().catch((error) => {
            console.error("[mcp] abort 后关闭失败", error);
        });
    };

    constructor(private readonly opts: MCPClientOptions) { }

    async start(): Promise<void> {
        this.opts.signal?.throwIfAborted();

        this.opts.signal?.addEventListener(
            "abort",
            this.handleAbort,
            { once: true },
        );

        if (this.child) {
            throw new Error("MCP client 已启动");
        }

        const child = spawn(this.opts.command, this.opts.args, {
            stdio: ["pipe", "pipe", "pipe"],
        });

        this.child = child;

        child.stderr.on("data", (chunk: Buffer) => {
            process.stderr.write(`[mcp] ${chunk.toString("utf8")}`);
        });

        child.on("error", (error) => {
            this.rejectAll(error);
        });

        child.on("exit", (code, signal) => {
            this.child = undefined;

            this.rejectAll(
                new Error(
                    `MCP server 已退出: code=${String(code)}, signal=${String(signal)}`,
                ),
            );
        });

        this.lines = createInterface({
            input: child.stdout,
            crlfDelay: Infinity,
        });

        this.lines.on("line", (line) => {
            if (line.trim() === "") {
                return;
            }

            try {
                const message: unknown = JSON.parse(line);
                this.handleMessage(message);
            } catch (error) {
                console.error("[mcp] 无法解析 server 输出", line, error);
            }
        });

        const initializeResult = await this.request("initialize", {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: {
                name: "build-your-own-ai-agent",
                version: "0.0.1",
            },
        });

        if (!isRecord(initializeResult)) {
            throw new Error("MCP initialize 结果不是 object");
        }

        if (typeof initializeResult.protocolVersion !== "string") {
            throw new Error("MCP initialize 结果缺少 protocolVersion");
        }

        const serverInfo = initializeResult.serverInfo;

        if (
            !isRecord(serverInfo) ||
            typeof serverInfo.name !== "string"
        ) {
            throw new Error("MCP initialize 结果缺少 serverInfo.name");
        }

        this.notify("notifications/initialized");

        console.log(
            `[mcp] 已连接 ${serverInfo.name}，协议版本 ${initializeResult.protocolVersion}`,
        );
    }

    async listTools(): Promise<McpTool[]> {
        const tools: McpTool[] = [];
        const seenCursors = new Set<string>();

        let cursor: string | undefined;

        do {
            const result = await this.request(
                "tools/list",
                cursor === undefined ? undefined : { cursor },
            );

            if (!isRecord(result)) {
                throw new Error("tools/list 结果不是 object");
            }

            if (!Array.isArray(result.tools)) {
                throw new Error("tools/list 结果缺少 tools 数组");
            }

            for (const tool of result.tools) {
                if (!isMcpTool(tool)) {
                    throw new Error(
                        `tools/list 返回了无效工具: ${JSON.stringify(tool)}`,
                    );
                }

                tools.push(tool);
            }

            const nextCursor = result.nextCursor;

            if (
                nextCursor !== undefined &&
                typeof nextCursor !== "string"
            ) {
                throw new Error("tools/list 的 nextCursor 必须是 string");
            }

            if (nextCursor !== undefined) {
                if (seenCursors.has(nextCursor)) {
                    throw new Error(
                        `tools/list 重复返回 cursor: ${nextCursor}`,
                    );
                }

                seenCursors.add(nextCursor);
            }

            cursor = nextCursor;
        } while (cursor !== undefined);

        return tools;
    }

    async callTool(
        name: string,
        args: unknown,
    ): Promise<McpToolResult> {
        if (name.trim() === "") {
            throw new Error("MCP 工具名不能为空");
        }

        if (!isRecord(args)) {
            throw new Error("MCP 工具参数必须是 object");
        }

        const result = await this.request("tools/call", {
            name,
            arguments: args,
        });

        if (!isRecord(result)) {
            throw new Error("tools/call 结果不是 object");
        }

        if (!Array.isArray(result.content)) {
            throw new Error("tools/call 结果缺少 content 数组");
        }

        if (
            result.isError !== undefined &&
            typeof result.isError !== "boolean"
        ) {
            throw new Error("tools/call 的 isError 必须是 boolean");
        }

        return {
            content: result.content,
            isError: result.isError === true,
        };
    }

    stop(): Promise<void> {
        if (!this.stopPromise) {
            this.stopPromise = this.stopProcess().finally(() => {
                this.opts.signal?.removeEventListener(
                    "abort",
                    this.handleAbort,
                );
            });
        }

        return this.stopPromise;
    }

    private async stopProcess(): Promise<void> {
        const child = this.child;

        if (!child) {
            return;
        }

        const closeError =
            this.opts.signal?.aborted === true
                ? getAbortError(this.opts.signal)
                : new Error("MCP client 已关闭");

        this.rejectAll(closeError);

        this.lines?.close();
        this.lines = undefined;

        if (
            !child.stdin.destroyed &&
            !child.stdin.writableEnded
        ) {
            child.stdin.end();
        }

        if (await waitForExit(child, 2_000)) {
            return;
        }

        child.kill("SIGTERM");

        if (await waitForExit(child, 2_000)) {
            return;
        }

        child.kill("SIGKILL");

        if (!(await waitForExit(child, 2_000))) {
            throw new Error("无法终止 MCP server 进程");
        }
    }

    private request(method: string, params?: unknown): Promise<unknown> {
        const id = this.nextId++

        return new Promise((resolve, reject) => {
            // pending Map
            this.pending.set(id, { resolve, reject });

            try {
                this.send({
                    jsonrpc: "2.0",
                    id,
                    method,
                    ...(params === undefined ? {} : { params }),
                })
            } catch (error) {
                this.pending.delete(id);

                reject(
                    error instanceof Error ? error : new Error(String(error)),
                );
            }

        });
    }

    private notify(method: string, params?: unknown): void {
        this.send({
            jsonrpc: "2.0",
            method,
            ...(params === undefined ? {} : { params }),
        });
    }

    private send(message: unknown): void {
        const child = this.child;

        if (!child || child.stdin.destroyed) {
            throw new Error("MCP server 未运行");
        }

        child.stdin.write(`${JSON.stringify(message)}\n`);
    }

    private handleMessage(message: unknown): void {
        if (!isRecord(message)) {
            console.warn("[mcp] 收到的消息不是 object", message);
            return;
        }

        const id = message.id;

        if (typeof id !== "number") {
            if (typeof message.method === "string") {
                console.log(`[mcp] 忽略 notification: ${message.method}`);
                return;
            }

            console.warn("[mcp] 收到无法识别的消息", message);
            return;
        }

        const pending = this.pending.get(id);

        if (!pending) {
            console.warn(`[mcp] 收到未知请求 id=${id} 的响应`);
            return;
        }

        if ("error" in message) {
            this.pending.delete(id);

            const errorMessage =
                isRecord(message.error) &&
                    typeof message.error.message === "string"
                    ? message.error.message
                    : JSON.stringify(message.error);

            pending.reject(new Error(`MCP 请求失败: ${errorMessage}`));
            return;
        }

        if ("result" in message) {
            this.pending.delete(id);
            pending.resolve(message.result);
            return;
        }

        this.pending.delete(id);
        pending.reject(
            new Error(`MCP 响应缺少 result/error: id=${id}`),
        );
    }

    private rejectAll(error: Error): void {
        for (const pending of this.pending.values()) {
            pending.reject(error);
        }

        this.pending.clear();
    }
}