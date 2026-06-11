# Build Your Own AI Agent —— 从零复刻一个 Claude Code

> 课程大纲 v0.1（初版草稿，待砍）

## 一、定位

**一句话**：用 TypeScript 从零手写一个能改代码、跑命令、自我迭代的编码 agent，不用任何 agent 框架，每章结束都有可运行的成果。

**读者画像**：会写代码（任意语言，能看懂 TS）、调用过或听说过 LLM API、但从没拆开过 agent 黑盒的工程师。不要求机器学习背景。

**最终成品**：一个 ~2500 行的 CLI 编码 agent，具备 Claude Code 的核心能力：agent loop、文件读写编辑、shell 执行、权限确认、上下文压缩、子 agent、MCP 接入。

## 二、差异化

| 对手 | 它是什么 | 我们的差异 |
|---|---|---|
| CodeCrafters《Build your own Claude Code》 | 付费闯关课，基础关卡止步于 Read/Write/Bash 三工具 + 基础 loop | 免费；继续做权限分级、上下文压缩、子 agent、MCP、评测 |
| Windy/claude-code-from-scratch | 中文 from-scratch，8 章 ~1300 行，**成品导读式**：先有完整代码，章节是对最终代码的讲解（全库仅 1 个 tag） | **渐进式构建**：读者跟写、每章一个可检出的 tag、每章可运行且更强；练习与延伸；覆盖其止步处之后的子 agent / MCP / skills / 评测；书籍形态三端发布 |
| shareAI-lab/learn-claude-code、harness 类书 | 对 Claude Code 源码的逆向分析 | 读源码 ≠ 会写；我们是教学型 from-scratch，渐进式构建 |
| AI-Coding-Guide-Zh 等中文教程 | 教你**用** Claude Code | 我们教你**造**一个 |
| 各类 agents-from-scratch 仓库 | 多为英文、demo 级、无书籍形态 | 书籍级深度、三端发布 |

## 三、风格约定（BYOX 风格）

- 每章结构固定：**为什么需要它 → 原理拆解 → 动手实现 → 跑起来看效果 → 练习与延伸**
- 每章结束时项目**必须可运行**，且比上一章明显更强
- 不引入 agent 框架（LangChain 等零依赖），第三方库仅限：官方 SDK 或 fetch 裸调 API、必要的终端渲染库
- 代码全量展示 + 仓库按章打 tag（`chapter-01` … `chapter-16`），读者可任意检出对照
- 中文行文，技术名词保留英文原文

## 四、章节大纲

### 第〇部分 · 起点

**00 导言：把黑盒拆开**
为什么 agent 没有魔法；最终成品演示（GIF）；环境准备（Node 22+、API key、~$5 预算说明）。

**01 一次 API 调用**
messages 与角色、system prompt、流式输出（SSE）。
→ 里程碑：一个流式输出的聊天 CLI。

### 第一部分 · 核心循环（agent 的本质）

**02 Tool Use：给模型一双手**
工具即 JSON Schema 声明；tool call 的请求-响应协议；为什么说"模型只是输出了一段 JSON"。
→ 里程碑：能查时间、算算术的助手。

**03 Agent Loop：循环直到完成**
loop 的终止条件；messages 数组的增长方式；实现 `read_file` 工具。
→ 里程碑：能回答"这个项目是干嘛的"的代码问答 agent。

**04 写与改：Write、Edit 与 diff**
全量写 vs 精确替换；old_string/new_string 的设计权衡；终端里渲染 diff。
→ 里程碑：能修真实 bug 的最小编码 agent。

**05 Bash：让 agent 跑命令**
子进程、stdout/stderr 捕获、超时与输出截断；agent 跑测试→看报错→改代码→再跑的自我迭代闭环。
→ 里程碑：丢给它一个失败的测试，它自己修到通过。

### 第二部分 · 从玩具到可用

**06 系统提示词与环境感知**
system prompt 的分层设计；注入 cwd、git 状态、目录结构；CLAUDE.md 式的项目记忆文件。
→ 里程碑：同一问题前后对比——注入环境前 agent 答不出"当前分支有什么未提交改动"，注入后答对，且遵守 CLAUDE.md 里的项目约定。

**07 权限系统：信任但确认**
危险操作分级；写操作/命令执行的用户确认交互；白名单与会话内记忆（"本次会话总是允许"）。
→ 里程碑：agent 不再能悄悄 `rm -rf`。

**08 上下文管理：对抗有限的窗口**
token 计数与预算；大输出截断策略；历史压缩（compaction）：什么时候压、怎么压、压掉什么；prompt caching 省钱。
→ 里程碑：长对话不再爆窗口、API 账单下降。

**09 健壮性：真实世界的网络与错误**
限速与指数退避重试；流中断恢复；Ctrl+C 取消正在执行的工具；工具报错如何回传给模型。
→ 里程碑：故障注入开关三连演示——模拟 429 自动退避续上；长命令中 Ctrl+C 优雅取消后还能继续对话；工具报错回传、模型自我修正。

### 第三部分 · 进阶能力

**10 子 agent：分而治之**
为什么需要隔离上下文（搜索类任务污染主对话）；Task 工具的实现：子 agent 的生命周期、结果回传。
→ 里程碑：主 agent 派出子 agent 全库搜索，自己保持清爽。

**11 计划与待办：让 agent 有条理**
TodoWrite 式工具：为什么"让模型自己列任务清单"能显著提升长任务表现；plan 模式的实现。
→ 里程碑：同一个多步任务（重命名函数 + 更新所有引用 + 跑测试）开/关 todo 各跑一次，开 todo 不漏步骤。

**12 MCP：接入外部世界**
MCP 协议拆解（不是黑魔法，就是 JSON-RPC）；实现 MCP client，接入一个现成 server（如文件系统/GitHub）。
→ 里程碑：你的 agent 能用上整个 MCP 生态。

**13 自定义命令与 Skills**
斜杠命令；skill 文件的按需加载——本质是"把 prompt 工程产品化"。
→ 里程碑：实现一个 `/commit` skill；用 token 计数证明不触发时它不在 prompt 里——按需加载眼见为实。
→ 练习与延伸：把本书的导师 skill 装进你的 Claude Code（指向 skill 页）——书教 skills，书本身就是 skill。

### 第四部分 · 收尾

**14 终端体验打磨**
不依赖重型 TUI 框架的渲染：spinner、流式 markdown、工具调用的折叠展示。
→ 里程碑：前后对比 GIF——流式 markdown、spinner、工具调用折叠；验收标准：长输出不闪烁、不错位。

**15 评测：怎么知道它变好了**
为 agent 写 mini eval：固定任务集 + 自动判分；用 eval 验证前面每个特性（compaction、todo）确实有效。
→ 里程碑：10 个固定小任务 × 三个配置（关 compaction / 开 compaction / 再开 todo）的通过率与 token 成本对比表；判分只用确定性标准（测试通过、文件内容匹配），不用 LLM judge。

**16 发布**
打包成 npm 全局命令；README 写法；如何让别人三分钟跑起来。
→ 里程碑：干净容器里 `npm i -g` 后三分钟跑通 demo 任务，固化为 CI 冒烟测试。

### 附录

- A. API 提供商选择：Anthropic 直连 / OpenRouter / 任意 OpenAI 兼容端点（解决国内读者访问问题，**对中文读者很关键**）
- B. 多模型适配层
- C. 术语表（中英对照）

## 五、技术栈

- TypeScript + Node 22+，ESM
- API：默认 Anthropic Messages API，附录给 OpenRouter/兼容端点方案
- 零 agent 框架；终端渲染尽量手写（教学价值）
- 仓库结构：`book/`（章节 markdown）+ `code/`（按章 tag 的实现）

## 六、发布管线（单源三端）

```
book/*.md ──→ VitePress ──→ 网站（含评论、章节导航）
          └─→ pandoc ────→ epub / PDF（电子书，定价/赞助制）
仓库本体 = GitHub（README 即课程入口）
```

约定（2026-06-10 定）：markdown 为主，交互动画为孤岛（容器块 + 静态降级图，全书控制在关键处）；网站部署 Cloudflare Pages；电子书延后到 M4 生产，写作期仅保持 pandoc 兼容。

**agent 可读（第四端）**：站点内置生成 llms.txt / llms-full.txt，读者可直接把链接丢给自己的 AI agent；M4 随 1.0 上线 **skill 页**——提供 SKILL.md（Claude Code）与 AGENTS.md 引导（Codex 等），让读者用自己的 agent 当导师学完本书。导师 prompt 苏格拉底式：讲原理、查作业、不代写（导师铁律的产品化，呼应 ch13「书教 skills，书即 skill」）。

## 七、指标（双层）

**可控指标（过程）**：每周发布 1–2 章（上线即发布，不逐章推广）；投放统一延后至 M1 完成后（是否等到 1.0 届时定）：HelloGitHub、阮一峰周刊、掘金、知乎、V2EX；全书完成后向 build-your-own-x 提 PR（需英文版）。

**结果指标**：GitHub star、网站 UV、电子书销量/赞助。

## 八、里程碑计划（建议）

| 阶段 | 内容 | 备注 |
|---|---|---|
| M0 | spike 周（2026-06-10 起，一周） | 作者粗跑核心能力链，AI 并行搭发布管线；产出坑清单，代码留 `spike` 分支（见 CLAUDE.md"协作工作流"） |
| M1 | 第 0–5 章 | 进入逐章循环；管线已就绪，写完即发，最小可发布单元试水 |
| M2 | 第 6–9 章 | 此时已超过 CodeCrafters 深度 |
| M3 | 第 10–13 章 | 差异化核心；若 spike 周未跑通 MCP，进 M3 前补 spike |
| M4 | 第 14–16 章 + 全书校对 | 发布 1.0；电子书实际生产；上线 skill 页（SKILL.md / AGENTS.md，苏格拉底式导师 prompt） |
| M5 | 英文翻译版 | 提 build-your-own-x PR |
