# bloat —— compaction 触发夹具（D4）

和 D2 的 `victim/` 同性质：一个零依赖的小假代码库（一个虚构的 in-memory taskqueue），
专门用来在 spike 里**把上下文撑大、让 compaction 触发**。区别是它**只读**——
agent 只用 `read_file`（免审）逐个读它，不改任何东西，所以**跑多少遍都不用重置**。

## 怎么用

从 `spike/` 目录跑你的 cli（cwd=spike，`read_file` 按相对路径解析），喂下面任一 prompt：

**A. needle 召回测法（推荐）**

> 依次读取 `bloat/src/` 下这 8 个文件并各用一句话说明职责：config.ts、types.ts、queue.ts、worker.ts、scheduler.ts、retry.ts、logger.ts、metrics.ts。全部读完后回答：这个库的 `MAX_RETRIES` 上限是多少？为什么不能调更高？

**B. 只想看它触发**

> 逐个读 `bloat/src/` 下的 config/types/queue/worker/scheduler/retry/logger/metrics 八个 .ts 文件，最后总结这个项目的整体架构。

`read_file` 免审，所以整个过程不会被权限确认打断，跑起来顺。

## 埋的 needle

`config.ts` 顶部有一条 design invariant：**`MAX_RETRIES = 7`，因为上游 broker 在第 8 次投递时会强关 socket，调高会静默丢消息**。它在第一个被读的文件里，几乎必然落进被压缩的那段历史。用 prompt A 的最后一问去戳它：

- 模型**答对**（7，且说得出缘由）→ 你的 summary 把这条关键不变量保住了。
- 模型**答错/答不出** → 当场演示 compaction 的有损本质（"压掉什么"的代价）。

两种结果都是 ch08 正文素材，不是 bug。

## 触发后要盯的 5 件事

1. **压缩在第几个文件触发** —— 对照下面的阈值表 vs 你设的阈值。
2. **触发后对话继续、不报 400** —— 证明压缩边界没切断 `tool_use` / `tool_result` 配对（D4 头号坑）。一旦 400，去看边界是不是落在某个 pair 中间、或压完 messages 没以 user 起头。
3. **messages 明显变短** —— 把压缩前后的 messages 长度/内容打出来对比，眼见为实。
4. **usage 把总结那次调用也算进去** —— 别只累计主轮（官方服务端 compaction 专门用 `usage.iterations[]` 就是因为这个，见 SPIKE-NOTES D4 速查）。
5. **总结调用别带 tools** —— 带了的话模型可能在总结步里改去调 `read_file`、吐空总结。这条 prompt A/B 都会触发读工具，正好暴露这个坑。

## 阈值参考（粗估，字符数/4）

| 读完到 | 累计文件内容(~tok) | 该轮大致上下文(~tok)¹ |
|---|---|---|
| config.ts | 366 | 1366 |
| types.ts | 641 | 1641 |
| queue.ts | 997 | 1997 |
| worker.ts | 1385 | 2385 |
| scheduler.ts | 1729 | 2729 |
| retry.ts | 1950 | 2950 |
| logger.ts | 2222 | 3222 |
| metrics.ts | 2498 | 3498 |

¹ ≈ 固定底(~1k：system + tools 含 ~496 tool-use 注入 + task) + 累计文件内容（每轮重发）。
**这是地板值**：模型自己每轮还会吐 tool_use 块 + "这个文件负责…"那句话，实际会再高一点、增长更快。

读全 8 个文件总上下文也就 ~3.5k，所以阈值往**低**了设才看得见效果：

- 阈值 ~2000 → 约读到 queue/worker（第 3–4 个）触发，后面还剩 4–5 个文件验证"压完还能继续读"。
- 阈值 ~2500 → 约 scheduler（第 5 个）触发。
- needle 在 config.ts（第 1 个），上面这些阈值都会把它压进 summary，召回测试有效。

**想要更高阈值/更长 demo**：把 `src/` 再读一遍（prompt 里把文件列两遍），或复制 `src/` → `src2/` 一并读，每过一轮加 ~2.5k；不用为此改大单个文件。

## 注意

这些 .ts 是**夹具**，给 agent 读的素材，不打算编译/运行（互相 import 但不导出入口、`.ts` 扩展名 import 也只是装样子）。别往里加 `npm test` 之类。
