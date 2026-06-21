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

### Review 补记（06-13，二次 review 揪出）

1. **反面案例：edit_file 参数名是驼峰，选它的理由却引的是蛇形，还和自己 description 打架。** schema 参数 `oldString`/`newString`（驼峰），实现读的也是 `stringField(arg, "oldString")`；但同一工具的 description 写的是 "old_string must be unique…"（蛇形）。D2 当日给 edit 选 old/new 精确替换的理由是"Claude Code 同款、模型训练里最熟这个形态"——可 Claude Code 真实参数就是蛇形 `old_string`/`new_string`。即"为对齐模型最熟的形态而选它"，落地却用了模型没那么熟的驼峰，且 description 与 schema 不同口径。**正文反面案例价值高**：工具形态要精确到命名风格，description 必须与 schema 同口径，模型差一个 `_` 就可能少配一分。修法二选一——参数对齐蛇形 `old_string`/`new_string`，或删掉"Claude Code 同款"那条理由、明说这是自定义形态。
2. **策略提醒（非 bug，喂 D7 账）：两个 loop 近乎逐行重复且每天在长。** agent-sdk.ts 与 agent-fetch.ts 的 loop 主体近乎重复，D3 权限分支两版各手抄一遍。双版并行是 D2 有意决策，但维护税是复利的——D4 compaction / D5 子 agent / D6 MCP 每加一个能力都要两处同步改、同步测。D7 拍 fetch vs SDK 时，"把两份 loop 一路扛到 D6"应作为一项成本计入账，与"教学透明度""差异分水岭"并列。

## D3（06-13）环境注入 + 权限确认

**目标**：system prompt 注入环境信息 + 工具执行前权限确认（read 免审、write/edit/bash 拦截）。

### 坑清单

1. **权限机制工作 ≠ 模型理解拒绝**。连续拒绝所有 bash 调用后，Haiku 不会说"我没有 bash 权限，无法完成"然后 end_turn，而是不断换命令重试（`ls -la` → `find` → `pwd` → `cd && npm test` → `node --test` → `find -name "*.js"`），直到 maxTurns 耗尽以 `max_turns` 退出。权限确认不只是代码问题——**还需要 system prompt 告知模型拒绝的含义**（如"若用户拒绝，解释为何需要该操作并请求重新考虑，或改变方案"）。真实产品 Claude Code 的 system prompt 里有专门的权限引导段。教学点：工具层做对了拦截，但 agent 行为质量还取决于 prompt 层。
2. **read_file 免审暴露目录列表盲区**。bash 全被拒后模型转向 read_file（免审），但 read_file 读目录返回 `EISDIR`、猜文件名（`victim/cart.js`、`victim/index.js`）返回 ENOENT。模型只能靠猜测文件路径。这说明：没有 bash 的场景下，需要一个列目录的只读工具（如 `list_files`），否则模型连"看到有什么文件"都做不到。Claude Code 有专门的 `ListFilesTool`。
3. **环境注入的投资回报率极高**。加了 `Working directory: ${process.cwd()}` 后，模型不再猜 `/package.json`（D1 坑 5 重现概率显著降低）。四行 system prompt（cwd/platform/shell/date）+ 两行行为指引（"用工具而非猜测"），零成本但效果立竿见影。
4. **readline 不关进程不退**。`createInterface` 会持有 stdin 引用，正常路径忘了 `rl.close()` 导致 Node 进程挂起不退出——catch 里关了但 try 正常结束时没关。`finally` 是唯一正确位置。

### 当日决策

- 权限模型：回调式 `onToolCall?: (name, input) => Promise<boolean>`，loop 层在 runTool 前调用；read_file 硬编码免审（与 Claude Code 一致：只读工具不拦）；默认无回调 = 全部放行（向后兼容 D2 行为）
- 环境注入：`system?: string` 加到 opts，cli.ts 拼装（cwd/platform/shell/date + 最小行为指引），不在 loop 内部硬编码（保持 runAgent 通用）
- 验收标准：(1) victim 修 bug 全绿（全部批准）✓ (2) 拒绝测试：全拒 bash 观察模型反应 → 确认 is_error 正确回传、max_turns 兜底生效 ✓

### D3 未完成项（记录，不在 spike 内实现）

1. **system prompt 加权限引导**：告诉模型"如果工具被拒绝，解释为何需要该操作或改变方案，不要反复重试同类操作"。加完后重跑拒绝测试验证模型行为改善——ch07 正文素材。
2. **list_files 只读工具**：bash 被拒后模型无法列目录，只能猜文件名。加一个免审的 `list_files` 工具可解决——ch03 或 ch06 正文设计决策。
3. **更完整的 system prompt**：当前只有 4 行环境 + 2 行行为指引。Claude Code 实际有 20+ 条件组件（git status、目录结构、CLAUDE.md 加载、tone/style 等）——ch06 正文素材，不属于 spike 范围。

### D3 收口

SDK 版 + fetch 版均完成，权限逻辑一致。tsc 绿灯。核心机制验证完毕（环境注入生效、权限拦截+回传+兜底均正常），上述未完成项留给正文章节。

### Review 补记（06-13，二次 review 揪出）

1. **架构债：`"read_file"` 字符串焊进了"通用" loop。** `needsApproval = toolUse.name !== "read_file"`（agent-sdk.ts / agent-fetch.ts 各一处）把一个具体工具名钉进了 `runAgent`，与 D2 拍板"保持 runAgent 通用"及"loop 可被子 agent 复用"相抵——免审策略应跟工具走（"只读/安全"标志挂在工具定义上，或经 opts 传免审集合），不该焊在 loop 里。spike 阶段硬编码可接受，但这是债，且**恰好是 ch07 权限设计的核心利弊**；D5 子 agent 复用 loop、若免审集合不同会立刻暴露。
2. **验收 `✓` 是"机制通"非"行为对"。** "全拒 bash → is_error 回传 + max_turns 兜底 ✓" 两件机械事实确实发生，但坑 1 已证模型行为是坏的（thrash 到耗尽）。验收标准低到 thrash 也能过——写正文时别把这个 `✓` 当行为正确的背书。
3. **fetch 版 types.ts 给 `stop_reason` 取了巧。** 手写成 `StopReason`（非空）→ fetch loop 不用 `!`；SDK 版是 `StopReason | null`（流式时为 null）→ agent-sdk.ts 两处用了 `message.stop_reason!`。两版都编译、对非流式都对，但这是手写类型偷的懒，与 D2 坑 9"类型纪律一半靠 review"同源：要么 fetch 版也写可空并在 loop 处理，要么显式记下"非流式必非空"这个假设。
4. **小**：systemPrompt 的 `Date` 用 `toISOString()`（UTC），而 Platform/Shell 为本地——给模型的时间和环境时区不一致；ch06 写完整 system prompt 时回收。
5. **housekeeping（已处理）**：cli.ts 尾部约 850 行运行日志（victim 修复 + 拒绝测试）外迁到 `spike/logs/d3-runs.log`，入口文件回到 ~60 行；日志作为标本保留（章节叙事素材），延续 D2 d1-* 冻结标本的规矩。入口文件保持"活"、标本另置 `spike/logs/`（D4 起 `d4-runs.log` 等同处归档）。

## D4（06-14）compaction（全书最重，单独一天）

> 今日节奏：上午先做 ch08 章前对谈 + AI 查证（compaction 现状/API 事实），手写 spike 与坑清单随后补。下面「速查」「对谈记要」「结构决策」为 AI 产出（仿 D1 协议速查体例）；「坑清单」留作者动手后填。

### 查证：compaction 速查（AI 查证 @2026-06-14，来源见文末）

**窗口与计价（教学模型 Haiku 4.5）**

- 上下文窗口 **200k** token（1M 窗那批是 Opus 4.6+/Sonnet 4.6/Fable·Mythos 5；Haiku 是 200k）
- prompt caching：缓存写 $1.25/MTok（5min）或 2x（1h），缓存读 $0.10/MTok（0.1x），最低可缓存 1024 token；usage 多出 `cache_creation_input_tokens` / `cache_read_input_tokens` 两字段
- count_tokens 端点（`messages.count_tokens`）：免费、独立限流、返回 `{input_tokens}`，是估算；可在发送前预判
- 溢出行为（4.5+）：input + max_tokens 超窗**不再 400**，而是放进、生成撞顶后 `stop_reason: "model_context_window_exceeded"`（旧模型才是校验报错，需 beta header 切换）
- Haiku 4.5 自带 context awareness：API 注入 `<budget:token_budget>200000</budget>`，每次 tool call 后追 `<system_warning>Token usage: X/200000</system_warning>`——模型知道预算，但裁剪历史仍是客户端的活

**官方服务端 compaction（参照物，beta header `compact-2026-01-12`）**

- 形态：`context_management={"edits":[{"type":"compact_20260112"}]}`；服务器自己判阈值 → 内部采样总结 → 回一个 `compaction` block → 自动丢弃该 block 之前的内容；客户端只需把响应 append 回去
- **支持模型：Fable 5 / Mythos 5 / Mythos Preview / Opus 4.8·4.7·4.6 / Sonnet 4.6——不含 Haiku 4.5、不含更老型号。** ⇒ 教学模型上无官方开关，只能手写（与 SDK Tool Runner 同母题：官方已内置、我们偏要手写以看懂它替你做了什么）
- 参数：`trigger`（默认 150k token，下限 50k）/ `pause_after_compaction`（默认 false；触发后以 `stop_reason:"compaction"` 暂停，让你在续跑前插入"保留最近 N 条逐字"等内容，官方示例保留最近 3 条）/ `instructions`（自定义总结 prompt，**整体替换**默认而非追加）
- 默认总结 prompt（可作手写版骨架）：“…write a summary of the transcript… Write down anything that would be helpful, including the state, next steps, learnings etc. You must wrap your summary in a `<summary></summary>` block.”
- 记账坑：压缩那次采样**不计入**顶层 `usage.input/output_tokens`，另放 `usage.iterations[]`（一条 `type:"compaction"` + 一条 `type:"message"`）；算总消耗得自己 sum iterations ⇒ **手写版的 usage 累计也必须把总结调用算进去，否则少账**
- 两个官方限制（手写也会撞）：① 总结只能用同模型（无法换更便宜的）；② **带 tools 时总结步可能误去调工具、回 `content:null` 空总结**——必须在 prompt 里硬说"只出文本、别调工具"。我们的 agent 永远带 tools，此坑必中
- 与 caching：`cache_control` 断点放 **system 末尾**，compaction 改对话前缀时 system 缓存仍命中，只有新 summary 需重写
- count_tokens 会"应用"已有 compaction block 但**不触发**新压缩，返回 `input_tokens`（生效后）+ `context_management.original_input_tokens`

**上下文管理全景（compaction 只是一格，ch08 取舍用）**

- 减量：大输出截断（进历史前 head/tail + `[truncated N]`，最便宜第一道防线）/ context editing 的 tool-result clearing（直接删老 tool_result，编码 agent ROI 常高于总结）/ compaction（总结老对话）
- 减成本：prompt caching（不减量、减重发的钱）
- 挪走：memory/落盘 + 多会话（CLAUDE.md 式，ch06）/ 子 agent 隔离（ch10）
- 认知层：count_tokens·usage·context awareness；context rot（窗口越满越蠢，"放什么"比"放多少"更重要；tool 定义本身也吃 token，见 D1 坑 8）

### 章前对谈记要（ch08 设计决策 + 理由 = 正文「为什么」素材）

用"为什么"能收敛的（原理即正文）：

1. **触发信号** = 默认用上一轮 `usage.input_tokens`（免费、已在手；滞后一轮无妨，因为本就留头寸触发、不去贴 200k）；要"发送前预判"才上 count_tokens
2. **阈值** = demo 调很低（同一条代码路径、3 轮就触发、几分钱，且能让"summary 再被 summary"的保真损失现形）；但设计按"窗口比例 / 窗口−头寸"，因为同一 agent 在 Haiku(200k) 与 Sonnet(1M) 该压的点不同。低阈值唯一遮住的是 **headroom**——正文单独补：压缩动作本身要吃窗口，触发太晚连压缩那一轮都装不下（Haiku 上表现为 `model_context_window_exceeded`，不报 400）
3. **总结调用不带 tools**（或硬说只出文本）= 文档记录的失败模式，必须项非口味
4. **不焊进 runAgent，走 opts hook**（仿 onToolCall）= 回收 D3 那笔"read_file 焊死在通用 loop"的债，且 D5 子 agent 复用 loop 时各用各的策略
5. **保留最近 N 逐字 + 压中间，边界落在干净配对处** = why 是 D1/D2 的配对协议（tool_use 后必紧跟配对 tool_result）+ 近因最相关；N 是旋钮。压完 messages 仍须 user 起头、配对完整，否则下一请求 400 ——**头号坑**
6. **usage 记账纳入总结调用 + cache 字段** = 否则"账单下降"里程碑测不准

属作者口味（导师铁律，AI 只摆利弊不代笔）：summary 以什么角色注入、N 取几、summary prompt 措辞、caching 的 TTL 选择。

### 跨章结构决策（本日对谈拍板，已落 OUTLINE.md）

1. **交互式 CLI 尽早引入 → ch01**。理由：与 AI 对话是 chat/agent 两个时代的主流交互，越早端上这熟悉形象、读者心智负担越小；且它是**外层人机壳**、非 agent 内核（两个 loop：外层 REPL / 内层 runAgent，全书讲内层），单独隔离一次后面 agent 章节就不被它弄脏。
2. **ch01 用无状态版**：先一次干净调用，再套对话循环，但不带跨轮状态——模型只答当前这句，当场演示"大模型无状态"，把"为什么要重发全部历史"的引子留给 ch03。ch03 用"append 数组 + 重发"同一原语，一招同解对话记忆与 agent loop（客户端从此有状态，模型仍无状态）。
3. **流式挪到 ch14**（默认；如需可提前到 ch05 长输出难受之前）：ch01 起一律非流式，流式传输 + 流式 markdown 在 ch14 一起做（显式安排，不让它成为下一个被隐式跳过的孤儿）。精确措辞提醒：prompt caching ≠ 模型记住了，只是重发更便宜，模型仍只看见你这次发的——守住 ch01 无状态结论 + 给 ch08 caching 埋准确伏笔。
4. **prompt caching 进 ch08 正文**（非练习）：因它与 compaction 咬合，拆开讲不清。

### 坑清单（hands-on，06-16）

1. **阈值 thrash——压缩后"地板"顶穿阈值、每轮重压（今日最值钱）。** 补上真 summary 后，压完的上下文（summary + 保留 4 条 + system + tools ≈ 2200）**始终高于** 2000 阈值，turn 4 起每轮都触发。对比占位 summary 时能掉到 1944（<2000）就停手——真 summary 更长，把"地板"顶到了阈值之上。**后果是反的**：每次压 = 一次额外 summary 调用（上千 token + 延迟），compaction 从省钱变每轮烧钱，把"账单下降"做反。根因：**单一阈值不够，触发点与压缩后地板之间必须留 gap**。spike 解法：阈值 → 3072（> 地板 ~2200，留 margin）。根治（留 ch08 正文）：高低水位（超 T_high 压、压到 T_low 以下）/ 冷却（压后 K 轮不再查）/ 压低地板（keepLast 减、summary max_tokens 砍）。
2. **压缩丢"进度/待办"致模型重枚举。** 一次 run 里压掉了"还剩哪些文件没读"，模型转去 `bash ls` 重列目录（又撞 D3 没有 list_files 的坑）。"压掉什么"的反面课：summary prompt 必须保住当前进度/待办，否则 agent 原地打转。
3. **（印证解法）边界配对扛住。** findCompactCutIndex 把切点吸到合法边界 + assertValidMessages 双向校验 + placeholder summary 预验证；多次压缩**零 400**。头号坑解法成立。
4. **（印证）总结调用不传 tools = 彻底绕开 `content:null`。** 无 tools 可调、只能出文本，比官方服务端版（被迫带 tools、需 instructions 防）更干净。
5. **（印证）abort 穿透进总结调用。** turn 8 的 Ctrl-C 正落在 `summarizeMessages`，signal 一路到位、无孤儿。
6. **（清掉一个顾虑）summarize 请求"连续两条 user + 带 tool 块却不传 tools"，API 收。** prefix 末尾 user(tool_result) 又接一条 user("Summarize…")——理论可疑，实测无报错。

### D4 收口（06-16）

- **阈值 spike 取 3072**（给地板留 margin、消 thrash）；根治方案（高低水位等）留 ch08「阈值是一门学问」那一节。
- **fetch 版 compaction 不写**（D4 收尾决定）。双版并行纪律在 D4 让步——记入 D7 fetch-vs-SDK 账：fetch 侧从 D4 起落后于 SDK，"是否值得把两份 loop 扛到 D6/正文"本身成了 D7 的决策数据（呼应 D3 review 补记 #2 的维护税）。
- **「实际应用阈值大就不会 thrash」答疑（= ch08 素材）：大体对，但机制不消失。** thrash 本质是"压缩后地板 ≥ 触发阈值"；大窗口+大阈值时地板通常只是阈值的零头、gap 宽、不触发，所以日常看不到。但它**会回来**：只要保留的"最近 N 条"里混进单个大块（读了个 100k 大文件、或巨型 tool 输出），地板就能再顶过阈值，哪怕阈值 150k。所以真实系统不靠"阈值大就没事"，而是另用**大输出截断**（封顶单条 tool 结果）+ **高低水位**（压到保证 margin 的低水位）兜。**spike 的小数字是显微镜**：把真实现象放大到三轮就可见；生产只是常驻在 gap 宽的区间，直到一个胖 tool 结果压垮它。
- **ch08 倾向拆分**（回应待拍板「ch08 是否拆分」）：光 compaction（触发 + 边界算法 + 三做法 + 阈值学问 + caching 咬合）就够一整章。缝 = 【上下文基础：token 计数/预算/截断/context rot】+【compaction：算法那坨】。倾向拆，M1 期间最终定（拆会顺移后续章号）。

### Review 补记（06-16，收尾扫一遍揪出；作者定：不改，只暴露问题、留 ch08/D5 素材）

1. **原始任务没锚定（最该记的一条）。** `compactedMessages = [summary, ...最近 4 条]`——原始用户任务 `messages[0]` 落进被总结的 prefix，第一次压缩后只以"摘要里一句"存在，之后"摘要的摘要"逐步稀释，长任务里 agent 会忘掉最初目标（run1 turn8 `bash ls` 重新找方向即前兆）。分段保留标准解：`messages[0]`（原始任务）当锚点**逐字保留**、只压中间。→ ch08「分段保留」正文。**（06-16 实证：run F 压完丢了原始问题、结尾反问"请问主要问题是什么？"——此坑当场现形，详见本节 #2。）**
2. **needle 端到端已验（06-16，7 次 run）：结果不稳定 / 非确定，且失败模式出人意料。** 早期 A/B 跑完但没触发压缩（无压缩基线、答对）；C/D/E 触发了压缩但都被 Ctrl-C；**最后两次 F、G 才是 3072 代码 + 跑完（`end_turn`）+ 真压缩**（turn 5、8，config.ts 被压入 summary）：
   - **G 完整答对**：`MAX_RETRIES=7` + broker 第 8 次关 socket + 2025-02-14 事故，全在。
   - **F 却"错"了——但不是丢了 needle 事实，是丢了原始问题。** 文件职责表里 `MAX_RETRIES=7` 其实还在，可模型忘了自己被问的是什么，结尾反问"请问主要问题是什么？"。
   - **同代码、同 prompt、一错一对**：压缩保留什么是随机的；而 F 丢的恰是**任务/问题本身（= 本节 #1 锚点缺失的活体实证）**，不是事实细节。结论：靠 summary 偶然保住关键信息**不可靠**——必须 ①锚定原始任务，②别让 must-keep 事实只活在 summary 里。这条非确定性本身就是 ch08「compaction 是有损 + 随机」的头牌素材。附：thrash 不止烧钱，run E 五连压把含 needle 的历史"摘要再摘要"5 次、保真加速衰减。
3. **summary 可能被 `max_tokens`(1024) 截断且没察觉。** 只 guard 了空 summary，没查 `stop_reason=max_tokens`；prefix 大时摘要可能是半句话照样塞回。→ ch08 提：查截断或给摘要更大预算。
4. **`let messages = opts.messages` 半可变（D5 会咬）。** 压缩前 `push` 改的是调用方数组、压缩后 reassign 改指向新数组——"有时改入参、有时不改"。cli 用返回值没事，子 agent 复用 loop 时易埋雷。解：进来先 copy、全程不碰 `opts.messages`，或注释钉死"调用方用返回的 messages"。（作者 line 38 自标"不确定对不对奥"——`let` 本身对，隐患在这。）
5. **小瑕疵：** line 68 注释 stale（写"2000"、实际 3072）；3072 是夹具专用 margin、非通用解（大 tool_result 仍会再 thrash）。summary 用 `user` 角色是**被动正确**（suffix[0] 被吸成 assistant，故 summary 必 user 才 alternate）；官方服务端用 assistant 的 compaction block，ch08 可对比。
6. **扫过、确实没事（存档）：** abort 落压缩中途——`compact` 抛出前未 reassign，cli catch 后干净退、无残骸（run 实证）；usage 记账不重不漏、省下的如实反映；边界兜底 `return 1` 合法但依赖"`messages[1]` 恒为 assistant"的隐含前提（改结构留神）；主数组无连续 user、空摘要已 guard、`disable_parallel_tool_use` 与 for-loop 不冲突。

## D5（06-15；hands-on 实落 06-19）子 agent + todo（重点验证 loop 可被复用）

### 查证：子 agent / todo 速查（AI 查证 @2026-06-19，来源见文末）

**子 agent**（Agent SDK `agents` 参数 + Agent 工具 = 我们要手写的内置版，延续「官方已内置、偏要手写」母题；punchline：它压根不是新机制，就是 `runAgent` 再调一次）

- 子上下文**全新**，唯一父→子通道 = Agent 工具的 **prompt 字符串**（路径/线索/报错都得塞进去）；子拿不到父的历史/工具结果/system prompt。父收**子的最后一条消息逐字**当 tool_result。
- 工具限制：省略 `tools`=继承全部；指定=仅这些。只读搭配 = Read/Grep/Glob。
- **子 agent 不能再生子 agent，别把 Agent 放进子的 tools**——官方防 fork-bomb 做法，深度锁 1。
- 命名：工具在 **Claude Code v2.1.63 从 `Task` 改名 `Agent`**；SDK 的 tool_use 发 `Agent`，但 `system:init` 列表 + `permission_denials` 仍 `Task`。spike 用 `task`（最广为人知、仍在 init 列表），正文可对照。
- 内置常用三型：**Explore**（只读搜索、默认 Haiku、快省）/ **General-purpose**（读+改、默认）/ **Plan**（plan 模式只读研究、继承主模型）。对照 **Codex CLI** 的 `default`/`worker`/`explorer`。两边收敛同一轴：**只读 explorer vs 读写 worker**——ch10 canonical 第一个子 agent 就是 explorer。

**todo（TodoWrite）**：入参 `{ todos:[{content,status,activeForm}] }`，status=`pending/in_progress/completed`；生命周期 created→in_progress→completed→组完移除；SDK 自动用于 3+ 步任务。代码 trivial，价值在「逼模型外化计划」+ **todo×compaction**（能扛压缩的 todo = D4 坑1/坑2「压缩丢原始任务/进度」的结构性解）。

**权限**（ch07 素材，**非 D5 范围**）：四套机制，处理顺序 `PreToolUse Hook → Deny → Allow → Ask → 权限模式 → canUseTool → PostToolUse Hook`。新 **auto mode 叠一个 LLM 分类器**（动机：用户对 93% 弹窗都点同意）：静默 approve / deny（回 tool error 不弹人）/ 分类器出错 fail-closed 退 ask；覆盖 bash/webfetch/外部目录/MCP/子 agent spawn/项目外编辑，**不**覆盖安全白名单 + 项目内编辑。结构上是分类器/常挂 hook，**不是**有自己 loop 的 Task 子 agent。

### 章前对谈记要（ch10 子 agent + ch11 todo）

1. **核心洞见 = 子 agent 不是新机制，就是 `runAgent` 调 `runAgent`。** 隔离 = 全新 messages 数组 + 受限工具集 + 只回最后一段文本，ch03 已造完。这正是 D2 拿「能否一行不改复用」当判据的理由。
2. **判据真正测的是工具层解耦，不是 loop 形状。** loop 早是纯函数（D2 ✓），但 `import runTool` + 焊 `read_file` 是耦合点。一招解：**工具执行经 `opts.runTool` 注入、接线挪顶层** → 杀循环依赖 + 免审跟工具走 + todo 有 per-run 家 + 子 agent 拿受限工具集 + 防递归一行（registry 不放 task）。
3. **权限（属作者口味，D5 拍板）：子 agent 不传 `onToolCall`（自主），安全来自只读工具集（结构性）而非策略。** 复杂权限（规则/模式/LLM 分类器）整章留 ch07——D5 故意一行权限不写。
4. 子 agent 工具集：只读 explorer 先行（read_file+grep），worker 后面；补 grep 顺手还 D3 坑2。
5. todo 状态 per-run，不放模块全局。

### 坑清单（hands-on，06-19；完整 e2e 见 logs/d5-runs.log）

1. **隔离成功 ≠ 任务成功（今日最值钱）。** 主上下文隔离实证通过——explorer `26639` input/`1745` output 的全部调查塌成主数组里**一条 tool_result 字符串**，主 messages 只剩「问题 → task 结果 → 答复」，没有被读进来的文件。**但 explorer 信心满满答错了**：把「compaction 在哪个函数」答成「这是 Anthropic SDK 项目、compaction 是 API 上下文压缩、相关在 `bloat/README.md` 和 node_modules」——根本没找到真正实现它的 `agent-sdk.ts`。父 agent **无从知错**，只收到一段流畅字符串照单全收。→ ch10「**子 agent 结果不可信、需校验**」+ ch15 eval 的必要性；D4 needle 非确定性的 D5 续集。
2. **级联根因：compaction 在子 agent 内部触发、吃掉了它的搜索结果。** explorer turn 2 一个工具结果把 input 顶到 `7977`（>3072）→ **子 loop 复用了主 loop 的 compaction**、就地压缩 → explorer 之后「**根据之前的对话总结**」作答（log 原话），真实 grep/read 结果已被摘进 summary、关键发现（agent-sdk.ts）丢失 → 自信错答。**复用 loop = 连 compaction 一起复用**，D4 的「压缩有损 + 锚点缺失」在子 agent 里二次放大。几乎确定是宽 grep 撞 node_modules（坑5）喂出的大输出，但**子 agent 内部消息已被隔离吞掉、日志无法直接确认**——隔离让子 agent 的失败**更难 debug**，本身又是一笔账。
3. **usage 数值漏，量化坐实。** 父 `usage` 打印 `{2603, 409}`，但 explorer 实烧 `26639/1745`（结果头部可见、≈父的 10x）**全数从父账消失**。账单/eval 成本表会少算近 90%。同 D4「总结调用不计入 usage」科。
4. **可观测混流实锤。** 日志里 `[turn 1]`、`[turn 2]` 主与子**各出现两次**，仅靠 input_tokens 大小猜谁是谁。复用 loop 复用了它的 `console.log`，子轮次与父轮次同流。
5. **grep 无 node_modules 排除 + 1MB maxBuffer。** 模型宽搜（`grep -R . `）撞 node_modules → 大输出（喂坑2）或超 maxBuffer 返回 `exit code: unknown`。spike 能用（搜子目录），连 ch08 大输出截断。
6. **todo 是模块全局（被动安全）。** `const todoState` 在 cli.ts 模块级——**今天没串只因 explorer 工具集没给 todo_write**；给了或一进程跑两 agent 即共用同一份。正是上一轮预警的 per-run 陷阱、与 `let messages=opts.messages` 同科。
7. **（未测）abort 穿透进子 loop。** 本 run 干净 end_turn、没 Ctrl-C；signal 已穿到子 `runAgent`（代码核过），但实证留补。

### D5 收口（06-19）

- **判据 PASS。** 解耦后是**纯 DAG**（agent-sdk 不 import tools、tools 不 import agent-sdk，环根本不存在、非「靠入口拆分容忍」）；tsc 绿；主上下文隔离 e2e 实证（坑1 前半）。D2「loop 可一行不改复用」的赌注成立——子 agent 确实只是 runAgent 再调一次。
- **但 e2e 的大收获是反面：隔离是结构成功、任务失败。** sub-agent 内 compaction 摘没搜索结果、返回自信错答，父无从校验。这把 ch10 从「隔离很香」拉回「隔离不免费、子 agent 结果要验」，也实证了 ch15 eval 的必要。
- **fetch 版子 agent/todo 不写**（同 D4，计 D7 账：fetch 自 D4 起持续落后 SDK）。
- **待修（留正文/后续，非 spike）：** usage 数值上卷父账；todo 改 per-run；免审跟工具走（grep/todo_write 现被误问 = ch07 焊死债现形）；grep 加 node_modules 排除 + 输出截断。

### Review 补记（06-19）

1. **做对的（存档）：** 注入 `runTool` 彻底杀环（DAG）；explorer 双层只读（受限 `tools` + `runExplorerTool` 越界即 throw）；signal 穿到子 loop；子 agent 自有 `maxTurns=6` 预算；工具集不含 task（深度锁）；`lastAssistantText` 跳过末尾 user(tool_result) 兜住 max_turns；grep 用 `execFile`（实测路径注入被当文件名、不过 shell）。
2. **`tools.ts:5` `import { Tool }` 值式导入类型。** tsx 能消、tsc 过，但与 cli/subagent 的 `import type` 不一致，且正是它卡住 node 原生 strip-types 执行（沙盒只能靠 tsx，而 tsx 的 esbuild 是本机 darwin 二进制、沙盒 linux 跑不了 → **e2e 必须本机跑**）。改 `import type` 顺手。
3. **`isAbortError` 现两份**（agent-sdk + tools 各一），解耦的无害代价。
4. **`grep -RIn -I` 的 `-I` 重复**（`-RIn` 已含 I），无害。

## D6（计划 06-16；hands-on 实落 06-21）MCP client（第二重）

> 体例同 D4/D5：「查证速查」「章前对谈记要」为 AI 产出；「坑清单」此次多为**代码 review + 查证 derived**（作者报「代码写完了」，hands-on 口述坑与 e2e 对抗实证待补）。

### 查证：MCP 协议速查（AI 查证 @2026-06-21，spec 版本 2025-06-18，来源见文末）

**stdio 传输（比想象简单——不是 LSP 那套 Content-Length）**

- client 把 server 当子进程 spawn，写其 stdin、读其 stdout
- 每条消息 = **一行 JSON，`\n` 分隔，消息体内不得含换行**。读取端按行切 + 逐行 `JSON.parse`（`readline.createInterface` 直接按行切，省得手拼残块）
- server 的 stderr 是日志频道，**不是协议流**，别 parse

**生命周期三段**

1. client 发 `initialize` 请求（`params`：`protocolVersion`、`capabilities`、`clientInfo{name,version}`）
2. server 回 `result`（`protocolVersion`、`capabilities`、`serverInfo`，可选 `instructions`）
3. client 再发**通知** `notifications/initialized`（无 id、不等响应）。发完才能调 `tools/*`——有 server 在此之前会拒
4. 版本协商：server 不支持你给的版本会回它支持的版本；你不支持就该断开
5. 关闭顺序（spec 明定，直接对上「abort 别留孤儿」）：**关 server stdin → 等退出 → 不退 SIGTERM → 仍不退 SIGKILL**

**两个核心调用**

- `tools/list` → `result.tools[]`（`{name, description, inputSchema}`，inputSchema 即 JSON Schema）。**支持分页**：响应可能带 `nextCursor`，须带 `cursor` 续请求直到取完
- `tools/call`（`params{name, arguments}`）→ `result{content[], isError}`，content 项 `{type:"text",text}` 等

**两类错误（spec 写得很清楚，是 D6 核心设计点）**

- **协议错误**走 JSON-RPC `error`（未知工具、参数非法、server 崩）= transport 层失败
- **工具执行错误**走 `result.isError:true`，错误文本在 content 里，要回灌给 LLM 自行处理
- spec Security 段：client **SHOULD** 调用前展示工具输入、对敏感操作征求确认（"human in the loop with the ability to deny"）⇒ **「远程工具默认走审批」不是口味、是 spec 的 SHOULD**，与 D3「read 免审」形成对照

**探针实测（沙盒 `@modelcontextprotocol/server-everything`，2026-06-21）**

- 握手回 `protocolVersion: 2025-06-18`、`serverInfo.name: mcp-servers/everything`、13 个工具一页返完（`nextCursor` 空——此 server 不分页，翻页循环能跑通但只转一圈，想压测翻页得另找 server）
- `echo` 调用回 `{content:[{type:"text",text:"Echo: hello mcp"}]}`
- **现场逮到的前缀坑**：`serverInfo.name` = `mcp-servers/everything` **带斜杠**，不在工具名允许的 `[a-zA-Z0-9_-]` 里 ⇒ 直接用 serverInfo.name 拼前缀会被 API 拒。所以前缀该用**配置里的 server 别名**（如 `playwright`），不是 serverInfo.name；且必须 sanitize + 查 ≤64

### 章前对谈记要（MCP 章 / OUTLINE ch12）

1. **MCP 章定为「先手写 MCP client、再展示 SDK 简化版」**（BYOX 标准打法）：手写吃透原理（= 面试防御），收尾展示 `@modelcontextprotocol/sdk` 简化版当「现实里你会怎么写」。澄清了一处定位误读——CLAUDE.md「零 agent 框架」禁的是 LangChain 类编排框架，**官方 SDK（含 MCP SDK）明确放行**；手写 MCP client 是出于「能手写就不引依赖、逐行看懂」的教学第一标准，不是「不许用 SDK」。
2. **协议层照抄 spec**（无设计空间）；**集成层不能照抄 Codex/Claude Code**（它们是生产级、框架重、几千行，且架构不是本书的；映射到自己既有 `runTool` 才是 ch11 的肉，也是面试防御点）。
3. **三个集成决策（作者拍板）**：① 工具名加 `mcp__<server>__<tool>` 前缀、对齐 Claude Code（可观测、杜绝撞名）；② 工具来源异构由 **handler 内部决定**（注册时包成闭包塞进派发，`runTool` 退化成查表/路由，对来源无感知——D5 解耦的延续回报）；③ MCP 调用失败**回 isError 给 LLM**（Codex 行为：模型自己向用户解释失败）。

### 坑清单（代码 review + 查证 derived，06-21；hands-on 口述坑 + e2e 实证待补）

1. **MCP 启动绑死整个 agent（最该记的一条）。** `cli.main()` 里 `await mcpClient.start()` 是**第一件事**，紧接 `registerMcpTools`。任一步抛（npx 拉不动、server 起不来、握手失败）→ 整个 agent 根本不运行，**无降级**。单 server 的 spike 可接受，但这正是「失败隔离」的反面：真实多 server 配置必须让某个 server 启动失败不拖垮其余能力（连本地工具都用不上就太亏）。→ MCP 章「为什么需要它」+ 失败隔离正文。
2. **initialize 无超时——`await start()` 可能永久挂起。** `child.on("exit")` 的 `rejectAll` 兜得住「server 死了」，兜不住「活着但不答」或「npx 首次下载卡住」。沙盒实测 `npx -y` 首拉就超过 45s。spec SHOULD 给每个请求设超时正是为此。spike 没做，记账。
3. **精心写的「两层错误区分」在 cli handler 被压平一层。** `mcp-client.ts` 严格区分了协议 `error`（reject/throw）与 `tools/call` 的 `isError`（正常 resolve 回 `McpToolResult`）——很干净。但 cli 的 `mcpHandlers` 闭包里，**`result.isError` 时直接 `throw new Error(content)`**。于是两类失败殊途同归：都变成抛异常 → 被 agent loop 的 try/catch（D2 定式）接住转 `is_error` tool_result 回 LLM。**净效果对**（执行错误确实到了 LLM），但 client 层费心拉开的「协议 vs 执行」距离在 cli 层又合上了。教学点：分层的语义保真要一路守到顶，否则下层的精确被上层一句 `throw` 抹平。
4. **失联 server 的工具不下架（spike 有意跳过）。** 查证实锤：Claude Code 在 server 断开时会**标记 disconnected + 工具变 unavailable**，且**不自动重连**（一堆 open issue 在催，#36308/#57207）；又：**一次 bad tool call 能崩掉整个 stdio server 进程**（未捕获异常）→ 它名下**所有**工具一起失效。本 spike 失败只回 isError、工具留在表里，LLM 可能对死掉的 server 反复重试空转。下架失联工具 + 重连留作正文边界（连官方都还没做好，诚实写进 MCP 章）。
5. **前缀 sanitize 是有损的、靠冲突 throw 兜底。** `makeMcpToolName` 用 `replace(/[^a-zA-Z0-9_-]/g,"_")`，两个不同名（`a.b` 与 `a_b`）可能塌成同一个 → 靠 `mcpHandlers.has(exposedName)` 冲突 throw 兜（不静默）。>64 也 throw。够 spike，但「lossy sanitize + 显式冲突」这对组合是 MCP 章命名一节的具体料。
6. **远程工具走审批是「结构性免费」拿到的——但仍坐在 D3 焊死债上。** MCP 工具经 `mainRunTool` 走通用派发，loop 在 `runTool` 前调 `onToolCall`，于是 MCP 工具自动被审批（命中「远程一律审」的 spec SHOULD），一行权限没写。但免审判据仍是 D3 那条焊死的 `name !== "read_file"`——名字驱动、脆弱（呼应 D3 review #1、D5 待修「免审跟工具走」）。
7. **`mainRunTool` 是 4 路 if 链，不是当初谈的「统一一张 `name→handler` 表」。** task / todo_write / mcpHandler / base 顺序 if。功能对，但「handler 内部决定」落地成了路由链而非单表——是作者自评「不够优雅」的一个具体落点（见本日反思）。
8. **（存档，做对的）** stop 幂等（`stopPromise` 缓存）+ abort 监听 once + `waitForExit` 三段 kill 严格按 spec；`request` 里 `send` 抛了先 `pending.delete` 再 reject（不留悬挂 promise）；`handleMessage` 先窄化、`typeof id!=="number"` 归为通知/未知、未知 id 响应只 warn；`listTools` 用 `seenCursors` 防 server 发重复 cursor 死循环——这些防御 review 未挑出问题。
9. **（非 MCP、延续债）** todo 仍模块全局（D5 坑6）；`@playwright/mcp` 这类浏览器 server 工具多，每次调用都弹 y/N 审批，交互噪声大（spike 不管）。

### D6 收口（06-21）

- **手写 stdio MCP client 主链路跑通**（代码 review 维度）：传输/握手/翻页/调用/关闭/abort 全有且防御到位；cli 完成 `mcp__别名__tool` 并表 + sanitize + 冲突/超长 throw，真实对接 `@playwright/mcp`。集成三决策（前缀对齐 CC / handler 内部决定 / isError 回 LLM）均落地。
- **最该补的两件**：① **e2e 对抗实证**——拿真 server 跑里程碑（握手→翻页→真实 tools/call→杀 server 进程看降级），目前只有沙盒探针验过协议、未验作者的 client 端到端；② **hands-on 口述坑**——作者报「D5/D6 抽象层次太高、问了 Codex 不少」，这本身是 ch10/ch11 的素材信号（见下），具体卡点待作者补述。
- **fetch 版 MCP 不写**（同 D4/D5，计 D7 账）。D2 收口已预判「D6 是差异分水岭」：SDK 有 `mcpTools()`/`mcpMessages()` helper，fetch 全裸手写——这条差异现在坐实，是 D7 拍板 fetch-vs-SDK 的关键数据点。
- **抽象层次反思（作者提，子 agent 章 / MCP 章 教学信号）**：D5（子 agent）、D6（MCP）是全周作者主观最难、最依赖 Codex 的两段。共性 = 抽象层次陡升（子 agent = loop 自指复用；MCP = 异构工具源 + 独立进程协议 + 生命周期）。**含义**：这两章在正文里需要最多的「原理拆解」铺垫与最缓的坡度，且作者须确保能独立防御这两处的设计（导师铁律：spike 阶段问 Codex 跑通无妨——spike 本就throwaway；但参考实现 code/ 与讲解必须作者自己吃透，否则丢面试防御权）。「不够优雅」属 spike 纪律内的预期（spike = 不打磨），参考实现重写时才追求优雅；坑7 的 if 链是优雅可改进的具体一例。

## D7（06-17）缓冲 + 复盘

- [x] 整理全周坑清单——06-21 完成，横切主题见「复盘」小节
- [x] 拍板 fetch vs SDK（全书最大教学设计决策）——06-21（D6 当日）提前定，见下

### 拍板（06-21 提前定，D7 复盘时并入）

**fetch vs SDK 正文策略：双轨到第一部分末，之后 SDK 单轨。**

- fetch 是**第一部分的教学脊柱**；fetch 原理价值集中在 ch01–03（API 就是一个 HTTP POST / tool_use 只是同一响应里的一段 JSON / loop 就是 append 数组再重发），ch04–05 已在"滑行"（工具层、无新协议）。
- 第一部分末设「**fetch 毕业**」动作：同一个 agent 用 SDK 再跑一遍证等价（"魔法只是 HTTP，现在知情地接受 SDK 便利"），就此甩掉第二份 loop。
- 第二部分起 **SDK 单轨**——**两份 loop 的维护税在此了结**（呼应 D3 review #2、D4 收口：fetch 自 D4 起持续落后，是否扛到正文本就是 D7 决策数据）。
- 附录 A（OpenAI 兼容端点）/ 附录 B（多模型适配）**吃前段 fetch 红利**：本质是薄薄一层 fetch/适配，前两部分建立的 fetch 直觉在此兑现，所以早期 fetch 不是沉没成本。

**流式（SSE）处置：**

- **fetch 章节完全不做流式**（ch01 起一律非流式的延续）。
- 流式在 **fetch 毕业后第一个 SDK 独占版本（第二部分开头）引入**：正文几行 SDK helper（`text_stream` / `.finalMessage()`）+ 一段旁注讲"SDK 背后替你累加了什么（`input_json_delta` 碎片 → 块重建）"。事实依据：大 `max_tokens` 时 SDK 强制流式以避免 HTTP 超时——流式不纯是化妆。
- **裸 SSE 手解析 → 该章「练习与延伸」**（动手复刻：裸 fetch + `stream:true`，按帧切、parse `data:`、`text_delta` 打印，约 30 行文本版；带工具的 `input_json_delta` 重建点到为止）。BYOX 亲手感经练习保留，不在正文写状态机、也不退化成"挥手让读者研究"。
- **保留瘦身版「终端体验打磨」章**（spinner / 工具调用折叠 / 流式 markdown 渲染不闪烁不错位）——demo GIF 来源，服务曝光指标；它不再负责教流式传输。
- **ch05 不前移裸 SSE demo**（放弃），仅留一句前向指引（"长输出现在干等，第二部分用流式解决"）。
- **流式 spike 周零接触、无实测依据**：引入前建议半天 mini-spike（裸 fetch 把 `text_delta` 打出来）确认手感再写正文。
- 章号按能力名引用，最终以 OUTLINE 为准（"fetch 毕业 / SDK 单轨"的起点、"终端体验打磨"的位置受 ch08 拆分待拍板影响，M1 期间定号）。

### 复盘：全周横切主题（06-21，= 各章「为什么需要它」的脊柱）

把六天逐日坑清单去重、抽出反复出现的**元主题**——这些比单个坑更值钱，是贯穿全书的论点骨架：

1. **失败是静默的：「没报错 ≠ 写对了」。** D1 静默垃圾（`JSON.stringify` 未 await 的 promise 喂模型 `"{}"`、答"文件是空的"）、D2 并行结果分多条 user 消息（API 照样 200）、D3"机制通 ≠ 行为对"（拒绝后模型 thrash 到耗尽）、D5"隔离成功 ≠ 任务成功"（子 agent 自信答错）——agent 的失败几乎都不抛异常，流畅地给出错的结果。**验收必须读对话/行为本身，不能看"跑完没报错"。** → 全书验证哲学，ch15 eval 的根。
2. **tool_result 是 agent 的感官，喂垃圾就推理垃圾；agent 质量大头在工具层与其报错文本，不在 loop。** D2"难度倒挂"（loop 形状被协议五条钉死、无自由度=无难度；工具层被 review 出十种失败）、工具错误吞进 console.log 模型收 undefined、D3 edit"没找到 old_string"是模型自愈的唯一线索。→ ch02 / ch04 中心论点。
3. **复用 = 连同隐性行为一起复用。** D5 子 agent 复用 loop = 连 compaction 一起复用 → 把搜索结果摘没；"loop 可复用"是模块边界问题（D2 import 即副作用）非函数签名；todo 模块全局。→ 子 agent 章「结果需校验」。
4. **每加一层抽象都带隐性税：观测、成本核算、调试难度。** D5 隔离让子 agent 失败更难 debug、usage 漏算约 90%、可观测混流；D4 compaction 有损 + 非确定 + 锚点缺失。隔离 / 压缩 / 子 agent / MCP 都不免费。→ ch08 / 子 agent 章 / ch15。
5. **AbortController 必须从第一天就穿进 loop。** D2–D6 每天都验 signal 穿透 + 无孤儿进程（D6 还延伸到 MCP 子进程三段 kill）。事后加不进去——是全局设计约束。→ ch09。
6. **协议按日期可加演化，解析要宽容。** D1 响应冒出没见过的字段、D6 MCP 对未知 id / 通知只忽略不崩。只取认识的字段。→ ch01 / MCP 章。
7. **「官方已内置、偏要手写」是全书统一母题。** Tool Runner（D1）、服务端 compaction（D4，不支持教学模型 Haiku）、子 agent SDK（D5）、MCP SDK（D6）——每个能力官方都有现成，本书偏手写以看懂"SDK 替你做了什么"。把"为什么不直接用 SDK"的质疑一次性回答掉。
8. **两条方法论副线**：类型纪律一半靠编译器一半靠 review（D2 tsx 不查类型 / 显式 any / 字面量拓宽）；demo 用小数字当显微镜（D4 小阈值把 compaction thrash 放大到三轮可见）。

### D7 收口（06-21）

- spike 周核心能力链全跑通：loop → read/write/edit/bash → 环境注入 + 权限 → compaction → 子 agent + todo → MCP client。SDK 版全绿；fetch 版到 D3 跟齐、D4 起按拍板停（不再追）。
- 两件 D7 该决的事都已决：① **整理全周坑清单**（上方横切主题）；② **fetch vs SDK 拍板**（见「拍板」小节）。
- **遗留进 M1 的待办**（非 spike 范围）：各处"焊死 read_file 免审 → 跟工具走"、usage 上卷父账、todo 改 per-run、grep 排除 node_modules + 输出截断、summary 锚定原始任务 + 查截断、流式 mini-spike。均已在对应日的"待修/未完成"记录。
- spike 代码留 `spike` 分支，不作参考实现；正文 `code/` 各章重写（求职防御 + 优雅在此追求）。

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

**查证来源（2026-06-14 抓取，D4 compaction）**

- https://platform.claude.com/docs/en/build-with-claude/compaction
- https://platform.claude.com/docs/en/build-with-claude/context-windows
- https://platform.claude.com/docs/en/build-with-claude/token-counting
- https://platform.claude.com/docs/en/about-claude/pricing

**查证来源（2026-06-19 抓取，D5 子 agent / todo / 权限）**

- https://platform.claude.com/docs/en/agent-sdk/subagents
- https://platform.claude.com/docs/en/agent-sdk/todo-tracking
- https://code.claude.com/docs/en/agent-sdk/permissions
- https://developers.openai.com/codex/subagents
- https://anthropic.com/engineering/claude-code-auto-mode

**查证来源（2026-06-21 抓取，D6 MCP）**

- https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle
- https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- https://github.com/anthropics/claude-code/issues/36308 （MCP 断开应自动重连）
- https://github.com/anthropics/claude-code/issues/57207 （`claude mcp reconnect`）
