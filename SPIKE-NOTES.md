# SPIKE-NOTES —— spike 周坑清单

> 约定（2026-06-10 session 定）：按天分节；每天收工作者口述坑，AI 整理成文。D7 复盘时本文件即汇总，亦为各章「为什么需要它」的素材库。
> 实际日历：D1 = 2026-06-11（较原计划顺延一天），D7 = 2026-06-17。本文件随 spike 代码提交到 `spike` 分支。

---

## D1（2026-06-11）API 调用 + tool use 协议

**目标**：裸 loop + 1 个工具跑通；裸 fetch 与 SDK 各摸一遍。

### 坑清单

- 第一坑在写代码之前：Anthropic Console 充值流程折腾了数小时（卡点细节收工时补——附录 A「API 访问」的第一手素材）
- （其余收工时口述，AI 整理）

### 当日决策

- （如有）

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

**SDK（@anthropic-ai/sdk 0.90.0）**

- `client.messages.create()` 对应上面全部；类型齐全；zod 为可选 peer dependency
- 注意：SDK 现在内置 **Tool Runner**，自动跑完 tool use loop——这正是我们要手写的东西。D1 摸 SDK 时只用 `messages.create`，别碰 toolRunner；但 D7 拍板 fetch vs SDK、以及 ch01 写「为什么手写 loop」时，它是必须正面回应的对照物

---

## D2（06-12）完整 loop + read / write / edit / bash

**目标**：能修真实 bug。

### 坑清单

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

- 裸 fetch 观察：
- SDK 观察：

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
