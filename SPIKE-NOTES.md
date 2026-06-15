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

**查证来源（2026-06-14 抓取，D4 compaction）**

- https://platform.claude.com/docs/en/build-with-claude/compaction
- https://platform.claude.com/docs/en/build-with-claude/context-windows
- https://platform.claude.com/docs/en/build-with-claude/token-counting
- https://platform.claude.com/docs/en/about-claude/pricing
