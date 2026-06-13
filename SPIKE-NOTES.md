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
5. **修过的坑不自动免疫**：上午刚在 d1 文件里修过的坑 3（并行结果分多条 user 消息）下午重写 loop 时原地复发，且更隐蔽——push 进多条 user 消息的是**同一个 content 数组的引用**，两条消息共享全部 tool_result → 同一 tool_use_id 出现两次 → 400；单工具调用完全正常，仅并行触发。肌肉记忆比认知慢，ch02 须把「合并进单条 user 消息」写成黑体警告（顺带：这处结构混乱的直接症状是少一个右括号，被 tsc TS1005 揪出）
6. 工具层把错误吞进 console.log：write/edit 失败 catch 后打到终端（人的频道），模型频道收到 undefined——D1 坑 6「静默垃圾」在工具层重演。定式：**工具内部自由 throw，try/catch 只住在 loop 派发处一个地方**，catch 转 `is_error: true` 回传；成功路径也必须返回有内容的确认字符串（如「已写入 X，N 字节」），空 tool_result 是另一种静默垃圾
7. edit 一行三坑：`content.replace(old, new)` ①字符串版只替换首个匹配且不吭声 ②0 匹配时原样返回 → 把没变的文件写回并报告成功，模型以为改完了 ③替换串里 `$&` `$'` 是 JS 特殊模式，new_string 含 `$` 会写入意料外内容。修法：`split(old).length - 1` 计数 + 唯一性强制（0 报错 / >1 报错）+ replacer 函数形式 `replace(old, () => new)`。**「没找到 old_string」的报错是模型自愈的唯一线索**——Haiku 必然产出差一个空格的 old_string，这条报错就是 edit 工具的灵魂
8. `promisify(exec)` 非零 exit 直接 reject：grep 无匹配（exit 1）会被当成工具失败，与「非零 exit 是业务结果」的拍板相反。bash 因此是唯一需要自己 catch 的工具——从 reject 的 err 上捞 stdout/stderr/code 编排成正常结果文本，属于语义转换，与「工具不 catch」定式并存不矛盾
9. **显式 any 能过 strict**：tsc 拦的是隐式 any，`(c: any)` 和 `as` 滥用畅通无阻——类型纪律一半靠编译器一半靠 review。顺带学费：`Param` 后缀类型是 request 侧（你发出去的），response 侧是无 Param 的 `ToolUseBlock`，结构上凑巧兼容所以「能跑」；正解类型谓词 `filter((c): c is ToolUseBlock => ...)`，零 as 零 any
10. 字面量拓宽（上午预警、晚间兑现）：无标注的 tools 数组里 `type: "object"` 拓宽为 string，传 `Tool[]` 报 `string is not assignable to "object"`。解法三选一：声明处标注 / `as const` / types.ts 手写 Tool 类型（推荐，反正是 fetch 版入场费）
11. 入口块长在模块尾部 = **import 即副作用**：agent-sdk.ts 底部直接 await runAgent(...)，任何 import 它的文件（D5 子 agent、agent-fetch、测试）都会误触发真 API 调用。「可复用 loop」不只是函数签名问题，还是模块边界问题——入口必须单独文件
12. **认知坑（今日最值钱）：难度倒挂。**预期 loop 是主角、工具是配角；实际 loop 形状被协议五条回传规则钉死（没有自由度 = 没有难度，「文档」就是 D1 自己整理的速查），而工具层被 review 出十种失败模式。**agent 质量的大头住在工具层和它们的报错文本里**——ch02 中心论点候选

### 上午进度（D1 遗留清账，本 session）

- fetch / SDK 双版：处理全部 tool_use ✓、结果合并进单条 user 消息 ✓、tool_result 直接放文本 ✓
- d1-fetch.ts / d1-sdk.ts **冻结为标本**（含完整实验记录与原始输出，章节叙事素材），此后新开文件 + git commit 当时间机
- 待确认：修复后的 fetch 版需重跑一次（文件里贴的"验证成功"输出 msg id 与修改前完全相同，是旧日志）

### 当日决策（下午对谈拍板）

- **四项拍板**：fetch/SDK 双版同推（差异记 D7 账，SDK 先过验收、fetch 后移植）；loop = 纯函数 + opts（opts 留 callbacks 位给 D3 权限回调；判据 = D5 子 agent 能否一行不改地复用）；edit = old/new 精确替换 + 唯一性强制（Claude Code 同款，模型训练里最熟这个形态）；bash 非零 exit ≠ is_error（exit code 进结果文本，仅 spawn 失败/超时才 is_error）
- 实现顺序：tools 修缮 → agent-sdk.ts 过验收 → types.ts（只 type 实际消费的字段，对照 d1-fetch.ts 留的原始 JSON 写，不抄 SDK）→ agent-fetch.ts 移植 → 同一 victim 二次验收
- DoD 增设：`npx tsc --noEmit` 绿灯（tsconfig 已落，冻结标本以 exclude 跳过；动机 = 坑 4/坑 9，tsx 不查类型）
- 验收夹具：`spike/victim/` 迷你购物车（AI 搭，零依赖，`npm test`），5 测 2 过 3 挂——一个崩溃（`!items` 防不住 `[]`，与坑 2 同款真值病，章节可首尾呼应）+ 一个算错（折扣乘反）。**验收前先 commit victim**，否则 fetch 轮没有 bug 可修（重置用 `git checkout -- spike/victim`）

### D2 收工快照（晚间，验收顺延 D3 晨）

已完成：tools.ts 四件套成形（unknown 收窄 asObject/stringField、edit 四卫兵、bash 业务语义、signal 全穿透、description 写入唯一性与无持久会话提示）；agent-sdk.ts loop 成形（纯函数 + opts、maxTurns 保险丝、is_error 管道含 abort 重抛卫兵、类型谓词收窄、signal 三处穿透、usage 累计）；victim 夹具 + tsconfig + DoD 闸门。

**未完（明早接手清单，≈1h 到验收）**：

1. tools 数组类型标注，消掉 tsc 唯一红灯（坑 10，三选一）
2. 出口语义两处：maxTurns 耗尽误报 end_turn——SDK 的 StopReason 联合里没有 "max_turns"，需自定义 `AgentStopReason = StopReason | "max_turns"`（agent 的退出词汇表 ⊋ API 的）；无工具调用的早退应回传真实 `message.stop_reason`，且 `=== "max_tokens"` 时大声 log（4096 只是更难截断，不是不会）
3. 入口拆独立 cli 文件（坑 11）+ env 加载（`tsx --env-file=.env` 或入口 dotenv）+ 顶层 try/catch（SIGINT abort 后别留丑栈）
4. 跑验收：commit victim → agent 修 bug 至全绿（验收纪律 = 读对话本身，坑 6）→ abort 实证（跑 `sleep 30` 时 Ctrl-C，`ps` 查无孤儿进程）

fetch 半边（types.ts + agent-fetch.ts 移植 + 二次验收）≈ 再半个上午，贴 D3 正题前完成；P1 尾巴（read 截断上限、bash 超时结果文案、TooolInput typo）不挡验收，绿后顺手。

### D2 收口（06-13 下午，Opus 接手）

接手清单四项 + fetch 半边，全部完成：

1. ✅ tools 数组加 `Tool[]` 类型标注（从 SDK import `Tool`），tsc 绿灯
2. ✅ 出口语义：定义 `AgentStopReason = StopReason | "max_turns"`；maxTurns 耗尽返回 `"max_turns"`；无工具调用早退回传 `message.stop_reason`，`max_tokens` 时 `console.warn`
3. ✅ 入口拆 cli.ts：agent-sdk.ts 只导出 `runAgent`；cli.ts 负责 env 加载（`tsx --env-file=.env`）、AbortController、SIGINT、顶层 try/catch（abort 走 `process.exit(130)`）、提示词从 `process.argv[2]` 读
4. ✅ 验收：SDK 版修 victim 全绿 + abort 实证（`sleep 30` + Ctrl-C，`ps aux | grep [s]leep` 无孤儿）
5. ✅ fetch 半边：types.ts 手写类型（只 type 消费字段，input: unknown）；agent-fetch.ts 移植（抽 `createMessage` 函数封装 fetch 细节）；victim 重置后二次验收全绿

**当日决策**：spike 全程双版并行推进（不等 D7 定）。D7 仅拍板正文教学策略（ch01-02 fetch 讲协议，ch03 起切 SDK 还是全程双版）。

**D7 账本增量**：SDK 除流式外还提供自动重试（429/5xx 默认 2 次）、智能超时（大 max_tokens 动态延长）、结构化输出（messages.parse + zod）、Tool Runner（内置 agent loop）、MCP helpers（mcpTools/mcpMessages 类型转换）、错误类型体系（子类 + _request_id）——fetch 版均无，D6 MCP 是差异分水岭。

**P1 尾巴**（不挡 D3，顺手修）：read 截断上限、bash 超时结果文案、TooolInput typo。

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
- D2 增量：abort 穿透姿势不同——fetch 是 `fetch(url, { signal })`，SDK 是 `create(params, { signal })` 第二参（0.104.1 实测 request-options 支持）；SDK 默认自动重试 429/5xx 两次、fetch 裸奔（撞 rate limit 时两版行为肉眼可见地不同）；手写收窄的真实成本 = asObject/stringField 两个十行函数（不引 zod 的全部代价）；SDK 类型的学费 = Param/非 Param 方向感 + 字面量拓宽（坑 9/10），fetch 版对应成本 = types.ts 手写劳动（实测后补记）
- D2 收口增量（06-13 查证）：SDK 除流式外还有——自动重试（429/5xx/408/409 默认 2 次指数退避）、智能超时（默认 10min，大 max_tokens 动态延长到 60min）、结构化输出（`messages.parse()` + zod/JSON Schema）、Tool Runner（`messages.toolRunner()` = 内置 agent loop，正文须正面回应）、MCP helpers（`mcpTools()` / `mcpMessages()` 类型转换，D6 差异分水岭）、错误类型体系（BadRequestError/RateLimitError 子类 + `_request_id`）、日志系统（`logLevel` + 自定义 logger）、Batch API、文件上传、自动分页。fetch 版在 D3-D5 期间差异仍小（主要是重试和超时），D6 MCP 起差异急剧拉大

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
