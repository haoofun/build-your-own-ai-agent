# SPIKE-NOTES —— spike 周坑清单

> 约定（2026-06-10 session 定）：按天分节；每天收工作者口述坑，AI 整理成文。D7 复盘时本文件即汇总，亦为各章「为什么需要它」的素材库。
> 实际日历：D1 = 2026-06-11（较原计划顺延一天），D7 = 2026-06-17。本文件随 spike 代码提交到 `spike` 分支。

---

## D1（2026-06-11）API 调用 + tool use 协议

**目标**：裸 loop + 1 个工具跑通；裸 fetch 与 SDK 各摸一遍。

### 坑清单（按踩坑顺序）

1. 第一坑在写代码之前：Anthropic Console 充值流程折腾了数小时（卡点细节待补——附录 A「API 访问」的第一手素材）
2. TS 里 `process.env` 爆红：缺 Node 类型定义，`npm i -D @types/node` 解决——ch01 环境准备素材
3. dotenv v17 起会在 stdout 打印 banner 和轮换广告（`config({ quiet: true })` 可关）；node 22+ 原生 `--env-file` 可根除——「依赖会做你想不到的事」，正文用原生方案
4. 故意改错 key 看 401：错误体 `{"type":"error","error":{"type":"authentication_error","message":...},"request_id":...}`——错误格式也是协议的一部分，loop 要消费它
5. 模型把 `package.json` 猜成 `/package.json`（根目录绝对路径）→ ENOENT 直接炸掉进程。教训两条：工具入参是模型生成的、不可信，执行必须 try/catch 并以 `is_error` 回传（实验挂 D2）；「相对路径以谁为基准」是真实设计题，D3 环境注入回收
6. **今日最值钱：静默垃圾坑。**漏写 `await` + 调错函数 → `JSON.stringify(pendingPromise)` 恒为 `"{}"` → 模型收到 `"{}"`，如实回答「文件是空的」。全程无异常、正常退出、答案流畅，但答案是错的。教训：**agent loop 的失败往往是静默的，验收必须读对话内容本身**；tool_result 是 agent 的感官，喂垃圾就推理垃圾。→ 日志/可观测、tool_result 回显的「为什么需要它」
7. `console.log` 默认只展开两层（`input: [Object]` 看不见）→ `console.dir(data, { depth: null })`
8. token 账实测：同一问题不带 tools input=11，带 1 个工具 =678（≈496 的 tool use 系统注入 + 工具定义 + input_examples）——tools 不白带，预算要算它
9. 响应里出现没见过的字段（`caller: {type:"direct"}`、`stop_details`、`inference_geo`）：协议按日期合约做**可加演化**，解析响应要宽容，只取认识的字段
10. 查证也会过期：AI 上午查 npm latest 得 0.90.0，作者实际 `npm install` 解析到 0.104.1。版本类事实以本机 lockfile 为准，双源核对

### 当日决策

- **锁死 Anthropic 协议**，OpenAI/双协议策略后移：首选「中转换 baseURL」，备选「附录 A 写百行适配层」，M1 期间核实中转现状再拍板
- 工具形态：正文用**分立工具**（read/write/edit/bash，对齐 Claude Code、D3 权限粒度更细），合并 action 单工具形态留作 ch02 练习/讨论
- D1 完成度：裸 fetch hello ✓ / 401 实验 ✓ / 1 工具 while loop ✓ / SDK hello ✓；**顺延 D2 上午**：SDK 版 loop + 三个实验（并行 tool_use 撞 400 再修、is_error 回传、tool_result 去 JSON 套壳直接放文本）
- 全天 API 实际花费：美分级（usage 累计），ch00 的 ~$5 预算承诺第一天站得住

### 协议速查（AI 查证 @2026-06-11，来源见文末）

**模型与成本**

- 教学模型：`claude-haiku-4-5`（alias，指向 `claude-haiku-4-5-20251001`）。$1 / MTok 输入，$5 / MTok 输出；cache 命中 0.1x
- 带 tools 的请求会被 API 自动注入一段 tool use system prompt：Haiku 4.5 约 496 tokens（tool_choice auto/none）/ 588 tokens（any/tool）——算预算时别漏
- 每个响应带 `usage.input_tokens / output_tokens`：建议 D1 起就打印并累计，这是验证 ch00「~$5 预算」承诺的素材
- 当前一线型号（对照用）：`claude-opus-4-8`、`claude-sonnet-4-6`、`claude-fable-5`

**裸 fetch 请求**

- `POST https://api.anthropic.com/v1/messages`
- headers：`x-api-key: $ANTHROPIC_API_KEY`、`anthropic-version: 2023-06-01`（GA 版本号，2023 年起未变）、`content-type: application/json`
- body 必填：`model`、`max_tokens`、`messages`
- 工具定义：`tools: [{ name, description, input_schema }]`——name 须匹配 `^[a-zA-Z0-9_-]{1,64}$`，input_schema 是标准 JSON Schema；可选 `strict: true`（强制输入严格符合 schema）与 `input_examples`（均为较新字段，旧资料里没有）
- `tool_choice`：`auto`（带 tools 时默认）/ `any` / `tool` / `none`；附加 `disable_parallel_tool_use: true` 可关并行

**响应**

- `content` 是 block 数组：`text` 与 `tool_use { id, name, input }` 可混排（模型常先说一句话再调工具）
- 同一响应可含**多个** tool_use block（并行调用，无序；有依赖的调用模型会拆到下一轮）
- `stop_reason`：`end_turn` / `tool_use` / `max_tokens` / `stop_sequence` / `refusal` / `pause_turn`（仅 server tools）/ `model_context_window_exceeded`
- `max_tokens` 截断可能留下**不完整的 tool_use block**——需提高 max_tokens 重试（loop 里要处理）

**回传 tool_result（D1 最容易踩的五条）**

1. assistant 消息**原样**追加回 messages（含 text + tool_use 全部 blocks）
2. 紧接着必须是一条 user 消息，内含 `{ type: "tool_result", tool_use_id, content, is_error? }`——中间不能插任何其他消息，id 必须配对，否则 400
3. 多个并行 tool_use 的结果必须**合并进同一条 user 消息**——分成多条会「教坏」模型，之后不再并行
4. user 消息里 tool_result 必须排在 content 数组**最前**，text 只能放其后（违者 400）；且尽量别在 tool_result 后面补 text——会诱发空的 end_turn 响应
5. 工具执行失败：`is_error: true` + 自然语言错误文本即可，模型会自行恢复重试

**SDK（@anthropic-ai/sdk，D1 实测装到 0.104.1；上午查 registry 的 0.90.0 已过期，见坑 10）**

- `client.messages.create()` 对应上面全部；类型齐全；zod 为可选 peer dependency
- 注意：SDK 现在内置 **Tool Runner**，自动跑完 tool use loop——这正是我们要手写的东西。D1 摸 SDK 时只用 `messages.create`，别碰 toolRunner；但 D7 拍板 fetch vs SDK、以及 ch01 写「为什么手写 loop」时，它是必须正面回应的对照物

---

## D2（06-12）完整 loop + read / write / edit / bash

**目标**：能修真实 bug。

### 坑清单

1. （上午，D1 遗留实验）并行 tool_use 只回一个 tool_result，API 400，错误原文值得收藏：`tool_use ids were found without tool_result blocks immediately after: ... Each tool_use block must have a corresponding tool_result block in the next message.`——协议规则的官方表述，ch02 直接引用
2. `if (!toolUses)` 永远为假：空数组在 JS 中是真值，导致 loop 不会终止、一直空转请求直到 rate limit——**死循环烧的是真钱**，轮数/成本保险丝（D2 待做）的直接动机；正确写法 `!toolUses.length`
3. （AI review 揪出）并行结果每个 tool_result 单独 push 一条 user 消息：API 容忍了（200），但官方 troubleshooting 明确列为反模式——会教模型以后少用并行。正确：所有 tool_result 收进**同一条** user 消息的 content 数组。「没报错 ≠ 写对了」第二例（第一例见 D1 坑 6）
4. SDK 联合类型红线：`message.content` 是 ContentBlock 联合类型，`.id/.input` 只在 ToolUseBlock 上，`(c: any)` 糊不掉；正解是判别式收窄或类型谓词，收窄后 `input` 仍是 `unknown`（模型生成的运行时数据，SDK 故意不担保）。注意 **tsx 只转译不做类型检查**，"能跑"与"红线"会并存——D7 账本重要一笔：裸 fetch 的 any 让同样的错误假设静默通过

### 上午进度（D1 遗留清账，本 session）

- fetch / SDK 双版：处理全部 tool_use ✓、结果合并进单条 user 消息 ✓、tool_result 直接放文本 ✓
- d1-fetch.ts / d1-sdk.ts **冻结为标本**（含完整实验记录与原始输出，章节叙事素材），此后新开文件 + git commit 当时间机
- 待确认：修复后的 fetch 版需重跑一次（文件里贴的"验证成功"输出 msg id 与修改前完全相同，是旧日志）

### 下午待办（D2 正题，新 session 接手）

1. 新文件（如 agent.ts / tools.ts / 入口），loop 提炼成可复用函数；SDK 版联合类型按坑 4 收窄，别带 `any` 进新文件
2. **AbortController 的 signal 今天穿进 loop**（CLAUDE.md 点名的全局约束，D5 子 agent 复用依赖它）
3. 轮数/成本保险丝（直接动机 = 坑 2 的 rate limit 死循环）
4. max_tokens 1000 → 4096（防截断产生不完整 tool_use，见 D1 速查）
5. 工具加到四件套 read / write / edit / bash；工具执行 try/catch，失败以 `is_error: true` 回传（D1 坑 5 的遗留实验）
6. 验收标准：修一个真实 bug

-

## D3（06-13）环境注入 + 权限确认

### 坑清单

-

## D4（06-14）compaction（全书最重，单独一天）

### 坑清单

-

## D5（06-15）子 agent + todo（重点验证 loop 可被复用）

### 坑清单

-

## D6（06-16）MCP client（第二重）

### 坑清单

-

## D7（06-17）缓冲 + 复盘

- [ ] 整理全周坑清单
- [ ] 拍板 fetch vs SDK（全书最大教学设计决策）

---

## D7 决策素材：裸 fetch vs SDK 对比维度（一周内随手记）

维度：流式 SSE 解析成本 / 类型提示 / 错误与重试 / AbortController 穿透（D5 子 agent 复用 loop 的前提）/ 依赖重量与教学透明度 / Tool Runner 的存在对「手写 loop」叙事的影响 / token 计数与成本观测

- 裸 fetch 观察（D1）：协议原貌全程可见——D1 的全部领悟（块数组、stop_reason、token 账、新字段）都来自直接读原始 JSON；教学透明度最高
- SDK 观察（D1，仅 hello 级）：`new Anthropic()` 自动读 ANTHROPIC_API_KEY；响应有完整类型；重试/超时未实测（挂 D2）
- 干扰项备忘：两版 hello 回答长短差异（60 vs 19 tokens）是采样随机性，**不是** fetch/SDK 的差别，对比时剔除

---

**查证来源（2026-06-11 抓取）**

- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
- https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
- https://platform.claude.com/docs/en/about-claude/pricing
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://registry.npmjs.org/@anthropic-ai/sdk/latest
