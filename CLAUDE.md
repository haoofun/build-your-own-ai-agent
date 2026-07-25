# CLAUDE.md

本文件为 AI 助手提供项目上下文。修改项目内容前请先完整阅读本文件和 OUTLINE.md。

## 项目是什么

《Build Your Own AI Agent —— 从零复刻一个 Claude Code》：一个 build-your-own-x 风格的开源课程，教读者用 TypeScript 从零手写一个编码 agent（不用任何 agent 框架）。最终成品是不到一万行的 CLI agent，具备 agent loop、文件读写编辑、shell 执行、权限确认、上下文压缩、子 agent、MCP 接入能力等 agent 核心能力。

- **作者目标**：求职作品集项目，以曝光率衡量成绩（GitHub star、网站 UV、电子书销量/赞助）
- **语言策略**：中文首发，英文翻译版后续跟进（用于向 build-your-own-x 官方列表提 PR）
- **发布形态**：章节内容 → GitHub 仓库 + Astro 网站（自定义布局，不依赖 Starlight；Cloudflare Pages 部署）+ pandoc 电子书（epub/PDF）。约定：章节统一使用受约束的 .mdx。正文仍以标准 Markdown 语法编写，只有交互教学模块使用 React 组件，并通过 Astro client:* 指令按需作为交互孤岛运行。电子书计划目前到正文完结再实际生产，届时增加 MDX 降级预处理，将交互组件转换为静态图片或静态内容后再交给 Pandoc。

## 核心定位与差异化

- 对标 CodeCrafters《Build your own Claude Code》（付费课，止步于 Read/Write/Bash + 基础 loop）：我们免费且更深
- 区别于源码逆向分析（learn-claude-code）和使用教程（AI-Coding-Guide-Zh）：我们是**教学型 from-scratch**，渐进式构建
- 中文圈已有先行者（Windy/claude-code-from-scratch，2026-03 发布，成品导读式）；渐进式构建，差异化在深度与教学形态，不在先发。而且 Windy/claude-code-from-scratch 内容疑似 AI 生成，大片大片的代码不利于理解，阅读心智负担很重。

## 关键约定（评审/写作时必须遵守）

1. **每章结构固定**：为什么需要它 → 原理拆解 → 动手实现 → 跑起来看效果 → 练习与延伸
2. **每章结束项目必须可运行**，且比上一章明显更强（BYOX 风格的灵魂）
3. **零 agent 框架**：禁止 LangChain 等；仅允许官方 SDK 或裸 fetch、必要的终端渲染库
4. 代码按章打 git tag（chapter-01 … chapter-16）
5. 中文行文，技术名词保留英文（如 tool use、compaction，不强行翻译）
6. 默认 Anthropic Messages API；附录 A 提供 OpenAI 兼容端点方案
7. **单源边界**：`src/content/docs/` 是内容单源，喂三端（Astro 站 / pandoc 电子书 / llms.txt）。网站和 github 仓库是一等公民，电子书最后做。

## 仓库规划结构

```
OUTLINE.md           # 课程大纲
CLAUDE.md            # 本文件
WRITING.md           # 写作规范（pandoc 兼容约定，评审章节时对照）
README.md            # 临时版（含 Cloudflare Pages 部署参数），ch16 重写
astro.config.ts      # 站点配置（Astro + React，导出 CHAPTER_PLAN，写一章上线一章）
src/
  content/docs/      # 章节 .md / .mdx（唯一内容源 → 网站 / 电子书 / llms.txt）
  pages/             # 首页、404 等（纯网站地盘，React 组件放开用）
  styles/            # custom.css（设计系统 token，zinc 单色系 + IBM Plex，待自定义布局引入）
  components/        # React 组件（AgentTrace、CliCodingAgent 等，待重建）
public/
  fonts/             # IBM Plex Sans SC 自托管字体（woff2 分块 + CSS）
  images/            # 静态图片
scripts/             # build-ebook.sh：pandoc epub 冒烟构建（读 src/content/docs/*.md）
.github/             # CI：站点构建 + epub 冒烟
code/                # 按章 tag 的参考实现（M1 起）
```

## 技术栈

TypeScript、Node 22+、ESM。教学优先于工程优雅：能手写就不引依赖，代码以"读者能逐行看懂"为第一标准。

## 决策记录（2026-06-10）

**已定（已被 2026-06-22 决策推翻）**：~~VitePress + Cloudflare Pages~~（改为 Astro + Starlight，见下）；markdown 为主、交互为孤岛；电子书 M4 生产；**agent 可读分层落地**（2026-06-10 定）：llms.txt / llms-full.txt 生成内置于发布管线，skill 页（SKILL.md + AGENTS.md 引导）随 M4 发布，skill 的导师 prompt 须苏格拉底式（讲原理、查作业、不代写——导师铁律的产品化），ch13 练习加"把本书装进你的 Claude Code"；默认教学模型 Haiku（spike 周实测验证 ch00 的 ~$5 预算承诺）；License = 代码 MIT + 书稿文字 CC BY-NC-SA；逐章照常发布上线，但**主动投放推广统一延后**至 M1 完成后（是否再等 1.0 届时定）；项目/仓库/文件夹统一定名 **build-your-own-ai-agent**，域名 **build-your-own-ai-agent.com**（2026-06-10 定，购自 Cloudflare Registrar 为宜，与 Pages 部署同处管理）。

**决策记录（2026-06-30，大纲结构调整，参照 pi 研究）**：(1) **ch08 拆分**为 ch08（token 感知：计数/截断/缓存）+ ch09（compaction），pi 的 compaction 模块 747 行、三个独立难点，spike D4 也是全书最痛一天，一章装不下；(2) **旧 ch11（todo）+ ch13（skills）合并**为新 ch12「计划、命令与 Skills」，主题统一为"扩展 agent 行为不碰核心 loop"，各自单独撑不满一章；(3) **ch05 尾增「fetch 毕业 + loop 重构」**——趁 fetch→SDK 切换做 functional core / imperative shell 重构（纯函数 loop + config 回调注入），为后续 ch07 权限、ch09 compaction 挂回调铺路，也是 ch11 子 agent 复用 loop 的前提；(4) **旧 ch09 扩为新 ch10**「健壮性与会话生命周期」，增加工具错误三段式（错误编码进结果不抛异常）+ session JSONL 持久化；(5) **ch04 引入 ExecutionEnv 接口**。净效果：拆一合一，总章数仍 16 + 00。新章序：Part 1（01–05 含 fetch 毕业）→ Part 2（06–10）→ Part 3（11–13）→ Part 4（14–16）。里程碑 M2 覆盖 ch06–10（多一章），M3 覆盖 ch11–13（少一章）。

**决策记录（2026-06-21，D6 当日提前定 fetch-vs-SDK，原计划 D7）**：**正文 fetch/SDK 策略 = 双轨到第一部分末、之后 SDK 单轨。** fetch 是 ch01–03 教学脊柱（API 就是 HTTP POST / tool_use 就是一段 JSON / loop 就是重发数组），ch04–05 滑行；第一部分末「fetch 毕业」用 SDK 跑同一 agent 证等价，第二部分起 SDK 单轨（两份 loop 维护税在此了结）；附录 A/B 吃前段 fetch 红利。**流式**：fetch 章不做流式；流式在 fetch 毕业后首个 SDK 版本引入（正文用 SDK helper + 旁注讲背后累加），裸 SSE 手解析作该章「练习与延伸」；保留瘦身版「终端体验打磨」章（spinner/折叠/流式 markdown 渲染，为 demo GIF / 曝光，不再教流式传输）；ch05 不前移 SSE demo、仅留一句前向指引；流式 spike 零接触，写前先半天 mini-spike。详见 SPIKE-NOTES D7。

**决策记录（2026-06-21，三端优先级排序）**：**网站 + llms.txt（agent 可读层）= 质量主战场，电子书 = 象征性副产物。** 三个消费端共享 `book/*.md` 单源，但权重不同：网站主打**沉浸式阅读体验**（求职作品集 + 曝光主力），llms.txt 是差异化命门（"把本书装进你的 Claude Code"、skill 页），二者都不象征；电子书（epub/PDF）只为证明"能交付可下载实体"（包装能力信号 + 赞助理由），M4 才认真生产。**由此定的取舍**：(1) 留下「markdown 单源 + 正文自带教学」——它服务网站 + llms.txt，不为电子书活着，不松；(2) 松掉「每个孤岛降级图必须等效教学」——该约束主要受益人是电子书，故**网站端可放开交互，降级图做到"说得过去"即可**；(3) **电子书不准拖累网站的沉浸式设计**——M1 写章节只按"网站 + llms.txt 好不好"为准，电子书降级 M4 统一收拾，不行再补救。**强交互不是目的**：网站目标是沉浸式阅读，交互只是服务它的手段，**不为强交互而强交互**；孤岛名额（WRITING.md 三五个）的真正门槛是"动起来是否比一张好静态图更会教"，不是预算焦虑。**网站门面（首页/落地页/demo，不进 `book/`）放开做强交互**（曝光面、零三端税）。

**决策记录（2026-06-22，技术栈迁移：VitePress → Astro + Starlight，随后再次移除 Starlight）**：**站点框架从 VitePress（Vue）切换为 Astro + Starlight（React）**，原因：Claude Code 在 React/TSX 上的交付质量明显优于 Vue。三个拍板决定：(A) **内容格式 = MDX**：章节文件可为 `.md` 或 `.mdx`，有交互孤岛的章节用 `.mdx` + `import` React 组件，不再用 VitePress 的 `::: {.interactive}` 容器语法；pandoc 电子书降级 M4 补预处理步骤，不阻塞写作。(B) **llms.txt = `starlight-llms-txt` 插件**（by delucis，Starlight 官方维护者，https://github.com/delucis/starlight-llms-txt）：生成 `llms.txt`、`llms-full.txt`、`llms-small.txt`（比 `vitepress-plugin-llms` 多一个 small 变体，功能对等）；Astro 官方自身在 2026-05 撤掉了自己站点上的 llms.txt，但第三方插件持续维护。(C) **内容目录 = `src/content/docs/`**（Starlight 约定）：内容从 `book/` 迁移，pandoc 脚本同步更新路径。旧 `.vitepress/theme/components/*.vue` 全部废弃不转换（避免幻觉污染），React 组件随设计系统重新实现；SC 字体文件从 `.vitepress/theme/fonts/` 同步复制至 `public/fonts/`，路径兼容，无需改字体 CSS 内容。Cloudflare Pages build command 从 `npm run docs:build` 改为 `npm run build`，output dir 仍为 `dist/`。

**决策记录（2026-06-22，移除 Starlight，改为纯 Astro + 自定义布局）**：**站点从 Astro + Starlight 切换为纯 Astro + Claude Design System 自定义布局。** 原因：Starlight 的 Header/Sidebar DOM 结构无法通过 CSS 完全控制，成品与 Claude Design System UI kit 差异显著，component override 代价不低于自建。决定：(A) 移除 `@astrojs/starlight` 和 `starlight-llms-txt`；(B) `astro.config.ts` 改为只含 Astro + React，章节计划数据以 `CHAPTER_PLAN` 具名导出供自定义组件使用；(C) `src/styles/custom.css` 改为纯设计系统 token（zinc 单色系 + IBM Plex），不含 `--sl-*`；(D) `src/content/docs/` 保持不变，内容 schema 改为自定义 Zod；待建项：自定义 Layout（Header + Sidebar + Content + TOC + Footer）、内容路由（`/[...slug].astro`）、llms.txt 生成、Pagefind 搜索。

**决策记录（2026-06-22，AgentTrace 组件三分修订）**：三组件分工：(1) **AgentTrace = 正文教学孤岛**（进 `book/`，`::: {.interactive name=...}`，逐步展开 agent loop，占三五个名额之一、须过"动起来比静态图更会教"门槛）；(2) **StaticIsland = 静态降级形态**——CLI transcript 本质纯文本，电子书端降级为 ` ``` ` 围栏代码块（可选中、可重排，优于 PNG；transcript 数据须单源，网页版与电子书代码块同读一份，防漂移）；(3) **CLI Coding Agent = 首页 hero**（门面、零三端税）：去掉运行按钮、点进来即对话开头、停在等待允许/拒绝（权限确认是"真家伙感"最强的瞬间），允许后须跑完该步、显示工具结果以闭合 loop；预录/回放脚本，**非真调 API 的活 agent**；多个经典案例可切换。三者按继承链实现（StaticIsland 静态基座 ⊂ AgentTrace 加逐步动画 ⊂ hero 加允许/拒绝+案例切换），React 重写时一次搭好。

**决策记录（2026-07-25，全文搜索方案：弃用预定的 Pagefind，改用 Fuse.js 自建索引）**：2026-06-22 决策记录把 Pagefind 列为搜索待建项的默认候选；实际调研后发现其中文分词索引有已知未解问题（Pagefind issue #987：CJK 无词边界，跨字子串查询漏召回，官方长期 open 无修复），恰好撞上本书"中文为主"的核心场景。对比过 Meilisearch（需自建常驻服务，运维负担与"求曝光的作品集、零 agent 框架"气质不符）和 Algolia DocSearch（第三方托管 + 爬虫抓取有更新延迟 + 需申请审批，与"字体都自托管"的既有取舍矛盾）后改定：**Fuse.js + 构建期自产索引**——`src/pages/search-index.json.ts` 构建期从 `src/content/docs/` 抽取纯文本（去 import/JSX/标题符号，drafts 排除规则与阅读路由一致），`src/components/Search.tsx` 的 ⌘K 面板首次打开时懒加载该索引，用 Fuse 的 Bitap 子串/模糊匹配（`ignoreLocation:true`）而非分词倒排索引。选择依据：全书体量是书稿量级，非海量文档站，Fuse 直接对字符串做近似子串匹配、不依赖分词，天然绕开中文分词问题，且零服务器、零第三方运行时依赖；索引管道与正文完成度解耦，随"写一章、上线一章"节奏自动跟上，不必等正文写完再做。实测跨字中文子串查询（如"终端里聊天的"）精确命中，验证有效。

## 当前状态（2026-06）

- [x] 定位、差异化调研、大纲 v0.1（见 OUTLINE.md，16 章 + 3 附录）
- [x] 大纲评审（2026-06-10：差异化表新增 Windy 行、7 章补齐里程碑、定位改为深度优势）
- [x] spike 周（实际 D1 = 2026-06-11，较原计划顺延一天；坑清单见 SPIKE-NOTES.md）。D1 ✓；D2 ✓（06-13 收口：SDK 版 + fetch 版双版验收通过，victim bug 全绿，abort 实证无孤儿进程，tsc 全绿；types.ts 手写类型、agent-fetch.ts 移植、cli.ts 入口拆分、AgentStopReason 出口语义均完成）；D3 ✓（06-13：环境注入 4 行 + 行为指引、权限 onToolCall 回调 + read 免审、拒绝测试验证 is_error 回传与 max_turns 兜底；模型不理解拒绝语义的坑留给 ch07 正文）；D4 ✓（06-16：compaction SDK 版跑通，findCompactCutIndex + assertValidMessages 守住边界配对、多次压缩零 400，总结调用不传 tools 绕开 content:null；暴露阈值 thrash——真 summary 把压缩后地板顶过阈值致每轮重压、反而烧钱，spike 调阈值 3072 解；needle 端到端实测非确定（F/G 同代码一错一对，run F 把原始问题压丢、反问用户"主要问题是什么"）、实证锚点缺失；fetch 版 compaction 不写、计入 D7 账；ch08 倾向拆分。详见 SPIKE-NOTES D4 收口）；D5 ✓（06-19：子 agent + todo；解耦 `runTool` 经 `opts` 注入 → 纯 DAG 杀循环依赖，`runAgent` 一行不改被 explorer 复用，D2 判据成立；explorer = 只读子 agent（read_file+grep，补 grep 还 D3 坑2）、不传 onToolCall 靠只读工具集结构性免审、深度锁 1、signal 穿透、maxTurns=6 自有预算；补 TodoWrite；e2e 实证主上下文隔离（子 26639 token 塌成一条 tool_result），但隔离结构成功、任务失败——子 loop 复用 compaction 把搜索结果摘没、explorer 自信答错且父无从校验（→ ch10 子 agent 结果需验 + ch15 eval）；坑：usage 数值漏（父报 2603、子烧 26639）、todo 模块全局被动安全、可观测混流、grep 无 node_modules 排除；fetch 版不写计 D7 账。详见 SPIKE-NOTES D5）；D6 ✓（06-21：手写 stdio MCP client 跑通——逐行 JSON-RPC、initialize/initialized 握手、tools/list 翻页（seenCursors 防循环）、tools/call、stop 三段 kill（close stdin→SIGTERM→SIGKILL）+ 幂等 + abort 穿透；cli 并表用 `mcp__<别名>__<tool>` 前缀 + sanitize 非法字符 + >64 throw + 冲突 throw；真实对接 `@playwright/mcp`；远程工具走 onToolCall 审批是结构性免费拿到的；坑：MCP 启动 `await` 在 main 最前、连不上会拖垮整个 agent 无降级、initialize 无超时（npx 首拉慢易挂）、isError 在 cli handler 被 throw → 经 loop catch 转 is_error（精心写的两层错误区分被压平一层）、失联 server 工具不下架（spike 跳过）；MCP 章（OUTLINE ch12）定为「先手写 client、再展示 SDK 简化版」；hands-on 口述坑 + e2e 对抗实证待补；fetch 版不写计 D7 账。详见 SPIKE-NOTES D6）；D7 ✓（06-21：全周坑清单复盘成 8 条横切主题（各章「为什么需要它」脊柱）；fetch-vs-SDK + 流式正文策略提前拍板，见上「决策记录（2026-06-21）」；**spike 收官**——核心能力链六天全通，SDK 全绿、fetch 至 D3 跟齐。详见 SPIKE-NOTES D7）
- [x] 发布管线 v1（2026-06-11：VitePress + llms.txt + pandoc epub + CI + Cloudflare Pages 上线）
- [x] 发布管线 v2（2026-06-22：迁移至 Astro + Starlight + React，见「决策记录（2026-06-22，技术栈迁移）」）
- [x] 发布管线 v3（2026-06-22：移除 Starlight，改为纯 Astro + React + Claude Design System；待建：自定义布局 + 内容路由）
- [x] 域名购买 + 文件夹更名 + GitHub 仓库（public）：github.com/haoofun/build-your-own-ai-agent，LICENSE = MIT + 正文 CC BY-NC-SA（2026-06-11 完成）
- [ ] M1：第 0–5 章（发布管线已在 spike 周并行搭好）
- [ ] M2–M5：见 OUTLINE.md 第八节
- [ ] 网站门面待补（2026-06-28）：① **tutor 陪读 skill**——hero「I'm an Agent」复制的提示词指向 `/skill/tutor.md`，现为占位文件（`public/skill/tutor.md`，防 404），正文写完后随 M4 做实；② **llms.txt**（AI 访问站点的机器可读层）未确认完成。已完成：首页加「看一眼正文」阅读预览 +「开始之前」（门槛 / 成本 / API 格式）区，关于页加 star 区，附录 A 草拟「API 平台与格式」（初稿待作者核定，`appendix-a-api-providers.mdx`）。

## 分工原则

代码与核心讲解由作者本人完成（求职需要经得起面试追问）；AI 助手负责：架构讨论对手盘、代码 review、资料查证、构建管线、翻译与润色。AI 不应代写整章成品内容。

**导师铁律**：AI 替作者写了核心代码 = 作者失去该处的面试防御权。作者求助时，AI 讲原理、找毛病、摆利弊，不代写。

## 协作工作流（2026-06-10 定）

**工程操作约定**：AI（Claude Code）可直接使用 git——提交、`git rm`、打 tag 均可执行（spike 阶段的沙盒限制已解除，2026-06-22 更新）。**push 和 force-push 须先确认**，不自动执行。node_modules 由 `npm install` 生成，AI 可在项目内运行。**commit message 一律用英文**。

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


