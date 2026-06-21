# CLAUDE.md

本文件为 AI 助手提供项目上下文。修改项目内容前请先完整阅读本文件和 OUTLINE.md。

## 项目是什么

《Build Your Own AI Agent —— 从零复刻一个 Claude Code》：一个 build-your-own-x 风格的开源课程，教读者用 TypeScript 从零手写一个编码 agent（不用任何 agent 框架）。最终成品是 ~2500 行的 CLI agent，具备 agent loop、文件读写编辑、shell 执行、权限确认、上下文压缩、子 agent、MCP 接入能力。

- **作者目标**：求职作品集项目，以曝光率衡量成绩（GitHub star、网站 UV、电子书销量/赞助）
- **语言策略**：中文首发，英文翻译版后续跟进（用于向 build-your-own-x 官方列表提 PR）
- **发布形态**：单一 markdown 源 → GitHub 仓库 + VitePress 网站（Cloudflare Pages 部署）+ pandoc 电子书（epub/PDF）。约定（2026-06-10 定）：markdown 为主、交互组件为孤岛（容器块 + 静态降级图）；写作期仅保持 pandoc 兼容，电子书到 M4 才实际生产

## 核心定位与差异化

- 对标 CodeCrafters《Build your own Claude Code》（付费课，止步于 Read/Write/Bash + 基础 loop）：我们免费且更深
- 区别于源码逆向分析（learn-claude-code）和使用教程（AI-Coding-Guide-Zh）：我们是**教学型 from-scratch**，渐进式构建
- 中文圈已有先行者（Windy/claude-code-from-scratch，2026-03 发布，成品导读式、止步于 compaction）；渐进式构建 + 进阶能力（子 agent / MCP / skills）+ 评测仍无人覆盖，差异化在深度与教学形态，不在先发

## 关键约定（评审/写作时必须遵守）

1. **每章结构固定**：为什么需要它 → 原理拆解 → 动手实现 → 跑起来看效果 → 练习与延伸
2. **每章结束项目必须可运行**，且比上一章明显更强（BYOX 风格的灵魂）
3. **零 agent 框架**：禁止 LangChain 等；仅允许官方 SDK 或裸 fetch、必要的终端渲染库
4. 代码按章打 git tag（chapter-01 … chapter-16）
5. 中文行文，技术名词保留英文（如 tool use、compaction，不强行翻译）
6. 默认 Anthropic Messages API；附录 A 提供 OpenRouter/OpenAI 兼容端点方案（解决中国大陆读者 API 访问问题，不可省略）
7. **单源边界**：只有 `book/*.md` 是单源、要喂三端（VitePress 站 / pandoc 电子书 / llms.txt），故受 WRITING.md 全部红线约束（禁 MDX/JSX/Vue、禁 HTML `<img>`、交互仅限 `::: {.interactive name=...}` 孤岛、全书三五个且每个配静态降级图）。**凡是不进 `book/` 的——首页、落地页、404、营销页——不过 pandoc、不进电子书，是纯网站地盘，可随便上 React/Vue 全功能组件**，不占孤岛名额。一句话尺子：在 `book/` 里 = markdown + 三五个孤岛；出了 `book/` = 放开做。

## 仓库规划结构

```
OUTLINE.md      # 课程大纲
CLAUDE.md       # 本文件
WRITING.md      # 写作规范（pandoc 兼容约定，评审章节时对照）
README.md       # 临时版（含 Cloudflare Pages 部署参数），ch16 重写
book/           # 章节 markdown（唯一内容源 → 网站/电子书/llms.txt）
.vitepress/     # 网站配置（srcDir=book；新章放入 book/ 即自动上侧边栏）
scripts/        # build-ebook.sh：pandoc epub 冒烟构建
.github/        # CI：站点构建 + epub 冒烟
code/           # 按章 tag 的参考实现（M1 起）
```

## 技术栈

TypeScript、Node 22+、ESM。教学优先于工程优雅：能手写就不引依赖，代码以"读者能逐行看懂"为第一标准。

## 决策记录（2026-06-10）

**已定**：VitePress + Cloudflare Pages（对比过 Docusaurus/Starlight：MDX 与 pandoc 冲突、为三五个交互点引入整层框架杠杆过低；book/ 保持纯 markdown 使 SSG 成为可替换件）；markdown 为主、交互为孤岛；电子书 M4 生产；**agent 可读分层落地**（2026-06-10 定）：llms.txt / llms-full.txt 生成内置于发布管线，skill 页（SKILL.md + AGENTS.md 引导）随 M4 发布，skill 的导师 prompt 须苏格拉底式（讲原理、查作业、不代写——导师铁律的产品化），ch13 练习加"把本书装进你的 Claude Code"；默认教学模型 Haiku（spike 周实测验证 ch00 的 ~$5 预算承诺）；License = 代码 MIT + 书稿文字 CC BY-NC-SA；逐章照常发布上线，但**主动投放推广统一延后**至 M1 完成后（是否再等 1.0 届时定）；项目/仓库/文件夹统一定名 **build-your-own-ai-agent**，域名 **build-your-own-ai-agent.com**（2026-06-10 定，购自 Cloudflare Registrar 为宜，与 Pages 部署同处管理）。

**待拍板**：ch08 是否拆分、ch11 与 ch13 是否合并（大纲评审中提出，M1 期间定）。

**决策记录（2026-06-21，D6 当日提前定 fetch-vs-SDK，原计划 D7）**：**正文 fetch/SDK 策略 = 双轨到第一部分末、之后 SDK 单轨。** fetch 是 ch01–03 教学脊柱（API 就是 HTTP POST / tool_use 就是一段 JSON / loop 就是重发数组），ch04–05 滑行；第一部分末「fetch 毕业」用 SDK 跑同一 agent 证等价，第二部分起 SDK 单轨（两份 loop 维护税在此了结）；附录 A/B 吃前段 fetch 红利。**流式**：fetch 章不做流式；流式在 fetch 毕业后首个 SDK 版本引入（正文用 SDK helper + 旁注讲背后累加），裸 SSE 手解析作该章「练习与延伸」；保留瘦身版「终端体验打磨」章（spinner/折叠/流式 markdown 渲染，为 demo GIF / 曝光，不再教流式传输）；ch05 不前移 SSE demo、仅留一句前向指引；流式 spike 零接触，写前先半天 mini-spike。详见 SPIKE-NOTES D7。

**决策记录（2026-06-21，三端优先级排序）**：**网站 + llms.txt（agent 可读层）= 质量主战场，电子书 = 象征性副产物。** 三个消费端共享 `book/*.md` 单源，但权重不同：网站主打**沉浸式阅读体验**（求职作品集 + 曝光主力），llms.txt 是差异化命门（"把本书装进你的 Claude Code"、skill 页），二者都不象征；电子书（epub/PDF）只为证明"能交付可下载实体"（包装能力信号 + 赞助理由），M4 才认真生产。**由此定的取舍**：(1) 留下「markdown 单源 + 正文自带教学」——它服务网站 + llms.txt，不为电子书活着，不松；(2) 松掉「每个孤岛降级图必须等效教学」——该约束主要受益人是电子书，故**网站端可放开交互，降级图做到"说得过去"即可**；(3) **电子书不准拖累网站的沉浸式设计**——M1 写章节只按"网站 + llms.txt 好不好"为准，电子书降级 M4 统一收拾，不行再补救。**强交互不是目的**：网站目标是沉浸式阅读，交互只是服务它的手段，**不为强交互而强交互**；孤岛名额（WRITING.md 三五个）的真正门槛是"动起来是否比一张好静态图更会教"，不是预算焦虑。**网站门面（首页/落地页/demo，不进 `book/`）放开做强交互**（曝光面、零三端税），AgentTrace 即装首页、不占孤岛名额。

## 当前状态（2026-06）

- [x] 定位、差异化调研、大纲 v0.1（见 OUTLINE.md，16 章 + 3 附录）
- [x] 大纲评审（2026-06-10：差异化表新增 Windy 行、7 章补齐里程碑、定位改为深度优势）
- [x] spike 周（实际 D1 = 2026-06-11，较原计划顺延一天；坑清单见 SPIKE-NOTES.md）。D1 ✓；D2 ✓（06-13 收口：SDK 版 + fetch 版双版验收通过，victim bug 全绿，abort 实证无孤儿进程，tsc 全绿；types.ts 手写类型、agent-fetch.ts 移植、cli.ts 入口拆分、AgentStopReason 出口语义均完成）；D3 ✓（06-13：环境注入 4 行 + 行为指引、权限 onToolCall 回调 + read 免审、拒绝测试验证 is_error 回传与 max_turns 兜底；模型不理解拒绝语义的坑留给 ch07 正文）；D4 ✓（06-16：compaction SDK 版跑通，findCompactCutIndex + assertValidMessages 守住边界配对、多次压缩零 400，总结调用不传 tools 绕开 content:null；暴露阈值 thrash——真 summary 把压缩后地板顶过阈值致每轮重压、反而烧钱，spike 调阈值 3072 解；needle 端到端实测非确定（F/G 同代码一错一对，run F 把原始问题压丢、反问用户"主要问题是什么"）、实证锚点缺失；fetch 版 compaction 不写、计入 D7 账；ch08 倾向拆分。详见 SPIKE-NOTES D4 收口）；D5 ✓（06-19：子 agent + todo；解耦 `runTool` 经 `opts` 注入 → 纯 DAG 杀循环依赖，`runAgent` 一行不改被 explorer 复用，D2 判据成立；explorer = 只读子 agent（read_file+grep，补 grep 还 D3 坑2）、不传 onToolCall 靠只读工具集结构性免审、深度锁 1、signal 穿透、maxTurns=6 自有预算；补 TodoWrite；e2e 实证主上下文隔离（子 26639 token 塌成一条 tool_result），但隔离结构成功、任务失败——子 loop 复用 compaction 把搜索结果摘没、explorer 自信答错且父无从校验（→ ch10 子 agent 结果需验 + ch15 eval）；坑：usage 数值漏（父报 2603、子烧 26639）、todo 模块全局被动安全、可观测混流、grep 无 node_modules 排除；fetch 版不写计 D7 账。详见 SPIKE-NOTES D5）；D6 ✓（06-21：手写 stdio MCP client 跑通——逐行 JSON-RPC、initialize/initialized 握手、tools/list 翻页（seenCursors 防循环）、tools/call、stop 三段 kill（close stdin→SIGTERM→SIGKILL）+ 幂等 + abort 穿透；cli 并表用 `mcp__<别名>__<tool>` 前缀 + sanitize 非法字符 + >64 throw + 冲突 throw；真实对接 `@playwright/mcp`；远程工具走 onToolCall 审批是结构性免费拿到的；坑：MCP 启动 `await` 在 main 最前、连不上会拖垮整个 agent 无降级、initialize 无超时（npx 首拉慢易挂）、isError 在 cli handler 被 throw → 经 loop catch 转 is_error（精心写的两层错误区分被压平一层）、失联 server 工具不下架（spike 跳过）；MCP 章（OUTLINE ch12）定为「先手写 client、再展示 SDK 简化版」；hands-on 口述坑 + e2e 对抗实证待补；fetch 版不写计 D7 账。详见 SPIKE-NOTES D6）；D7 ✓（06-21：全周坑清单复盘成 8 条横切主题（各章「为什么需要它」脊柱）；fetch-vs-SDK + 流式正文策略提前拍板，见上「决策记录（2026-06-21）」；**spike 收官**——核心能力链六天全通，SDK 全绿、fetch 至 D3 跟齐。详见 SPIKE-NOTES D7）
- [x] 发布管线（2026-06-11 搭好并沙盒验证：VitePress（srcDir=book、规划目录自动隐藏未写章节）+ interactive 容器 + llms.txt/llms-full.txt + pandoc epub 冒烟 + CI；写作约定见 WRITING.md；2026-06-11 全线上线：Cloudflare Pages 部署生效，build-your-own-ai-agent.com 主域 + www 均可访问，llms.txt 线上验证通过）
- [x] 域名购买 + 文件夹更名 + GitHub 仓库（public）：github.com/haoofun/build-your-own-ai-agent，LICENSE = MIT + 正文 CC BY-NC-SA（2026-06-11 完成）
- [ ] M1：第 0–5 章（发布管线已在 spike 周并行搭好）
- [ ] M2–M5：见 OUTLINE.md 第八节

## 分工原则

代码与核心讲解由作者本人完成（求职需要经得起面试追问）；AI 助手负责：架构讨论对手盘、代码 review、资料查证、构建管线、翻译与润色。AI 不应代写整章成品内容。

**导师铁律**：AI 替作者写了核心代码 = 作者失去该处的面试防御权。作者求助时，AI 讲原理、找毛病、摆利弊，不代写。

## 协作工作流（2026-06-10 定）

**工程操作约定**：AI 沙盒对项目文件夹只能创建/覆盖文件，**不能删除或重命名**（git 锁文件曾因此卡死）。因此 git 提交、打 tag、推送一律由作者在本机执行，AI 负责改文件并给出待执行命令；node_modules 由作者本机 `npm install` 生成，AI 不在项目文件夹内装依赖。**commit message 一律用英文**（2026-06-21 定）——AI 给出待执行 git 命令时，commit message 写英文。

**阶段一：spike 周（实际 2026-06-11 = D1 起，一周；每日坑清单落 SPIKE-NOTES.md）**
作者粗糙跑通核心能力链：loop → 工具 → 权限 → compaction → 子 agent → MCP。目标是暴露全局设计约束（如 loop 须可被子 agent 复用、AbortController 一开始就穿进 loop），不是产出好代码。纪律：不打磨、不发布；代码放 `spike` 分支，不作为参考实现；每日记"坑清单"（即各章"为什么需要它"的素材）。AI 并行搭发布管线。Day 7 未跑通的能力（如 MCP）顺延到对应里程碑前补 spike，不延长 spike 周。

日程参考：D1 API 调用 + tool use 协议（裸 loop + 1 工具，裸 fetch 与 SDK 都摸一下）；D2 完整 loop + read/write/edit/bash（能修真实 bug）；D3 环境注入 + 权限确认；D4 compaction（全书最重，单独一天）；D5 子 agent + todo（重点验证 loop 可被复用）；D6 MCP client（第二重）；D7 缓冲 + 复盘（整理坑清单、拍板 fetch vs SDK）。

**阶段二：逐章循环（spike 后）**

1. 章前对谈：AI 摆方案利弊与真实实现做法，作者拍板设计（副产品 = 面试答案）
2. 作者写代码（卡住问原理，不让 AI 代写）
3. AI review + 对抗测试（沙盒实跑该章里程碑）
4. 作者写讲解初稿
5. AI 查证（对照官方文档核 API 细节）+ 润色（不改作者声音）+ 检查五段式结构
6. 发布；章末 AI 扮面试官就该章设计决策拷问 15 分钟


