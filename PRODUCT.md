# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

全栈 / 后端 / 前端工程师，许多人正想转向「Agent 工程」方向。**中文首发、面向中文读者为主**，但书会支持英文及更多语言 —— 设计与信息架构从一开始就按**多语言（i18n）**来考虑，不做成只服务单一语种。他们的使用场景：把这本书 / 课程当作一条从零到一的主线，跟着逐章用 TypeScript 手写一个编码 agent —— 不是查参考手册，而是连续地读、连续地写代码。要做的事（job to be done）：真正搞懂 Claude Code 这类 agent 的内部机制。

读者在站点上的核心动作只有一个：**长时间、连续地阅读技术长文并对照代码**。一切设计决策都为这个动作服务。

## Product Purpose

《Build Your Own AI Agent —— 从零复刻一个 Claude Code》：一个 build-your-own-x 风格的**免费开源**教学课程。用几千行 TypeScript，渐进式地构建出一个具备 agent loop、文件读写编辑、shell 执行、权限确认、上下文压缩、子 agent、MCP 能力的 CLI agent。

发布形态：单一 markdown 源 → GitHub 仓库 + 网站（Cloudflare Pages）+ pandoc 电子书。成功的衡量是**曝光率**：GitHub star、网站 UV、电子书销量 / 赞助。因此「读者愿不愿意读下去、读得顺不顺」直接等于产品成败 —— 设计本身就是产品。

变现动作**不在站点上发生**：赞助与电子书只存在于 GitHub 仓库 / 外部平台，站点保持零钱元素（见 Capabilities and Constraints）。

## Positioning

**渐进式可运行的骨架 + 诚实暴露踩坑的血肉，两条合起来才是邻居产品拿不走的。**

- 渐进式：先固定每个 Part 的出口，再把它切成一组可运行、逐步增强的 checkpoint；冻结后按章打 git tag —— 成品导读（Windy）与源码逆向分析（learn-claude-code）给不了这个。
- 诚实：spike 周实测过的失败原样写进正文（compaction 阈值 thrash 反而烧钱、子 agent 自信答错且父无从校验、MCP initialize 无超时会拖垮整个 agent）—— 这些是跑出来的，不是编出来的。
- 深度免费：对标 CodeCrafters《Build your own Claude Code》（付费，止步于 Read/Write/Bash + 基础 loop），本书免费且一路走到 compaction / 子 agent / MCP / skills。

## Operating Context

- **单源三端**：`src/content/docs/` 是内容唯一源，喂网站 / pandoc 电子书 / llms.txt。三端权重不同：网站与 llms.txt 是质量主战场，电子书是象征性副产物（M6 才认真生产）。
- **按 Part 规划、写一章上线一章**：未开发 Part 的章节只标为暂定；进入 Part 前先跑通出口再切章，章节完成即发布，站点状态如实反映进度。
- **章节格式**：受约束的 `.mdx`。正文是标准 Markdown，交互教学模块用 React 组件经 Astro `client:*` 按需水合；`Steps` 这类纯排版件零 JS、剥掉标签即合法 markdown。电子书降级预处理留到 M6。
- **读者的物理场景**：工程师在桌面浏览器、室内常光、专注模式下连读 30–60 分钟长文并对照代码块，另一半时间在自己的终端里跟着敲。
- **协作方式**：核心代码与讲解由作者本人写（求职需要经得起面试追问）；AI 负责架构对手盘、review、查证、构建管线、翻译润色，不代写整章成品。

## Capabilities and Constraints

- **零 agent 框架**：禁止 LangChain 等；仅允许官方 SDK 或裸 fetch、必要的终端渲染库。TypeScript + Node 22+ + ESM，教学优先于工程优雅，代码以「读者能逐行看懂」为第一标准。
- **站点零商业化**（作者 2026-07-27 确认）：站上不出现 GitHub Sponsors 入口、不出现电子书购买 / 下载入口、不出现付费墙会员登录解锁。赞助与电子书只活在 GitHub 仓库与外部平台。
- **默认 API**：Anthropic Messages API；附录 A 提供 OpenAI 兼容端点方案（解决国内读者访问）。默认教学模型 Haiku，ch00 承诺全书 ~$5 预算。
- **技术栈事实**：纯 Astro + React 岛 + 自建布局（2026-06-22 移除 Starlight）；搜索是 Fuse.js + 构建期自产索引（2026-07-25 弃用 Pagefind，其 CJK 分词有已知未解问题）；字体自托管，不碰 Google Fonts。
- **License**：代码 MIT，书稿文字 CC BY-NC-SA 4.0，© 2026 haoo。
- **未决**：电子书的 MDX 降级管线（M6）；陪读 tutor skill 的真实能力（M6）；英文版时间表。

## Brand Commitments

- **命名**：项目 / 仓库 / 域名统一为 build-your-own-ai-agent，站点 `build-your-own-ai-agent.com`，仓库 `github.com/haoofun/build-your-own-ai-agent`。无 logo，靠字体锁定（typographic wordmark）。
- **人格三词**：**硬核、诚实、克制**。语气教学优先，像一位耐心但不灌水的资深工程师。
- **技术名词保留英文**（tool use、compaction、agent loop），不强行翻译；中英混排是常态。
- **不营造顺利假象**：踩过的坑与不确定性照实写。
- **情绪目标**：让读者产生「我能逐行看懂、我能专注读下去」的信心。不追求惊艳，追求毫不费力的可读性。

## Evidence on Hand

**真实存在、可直接用的素材**：

- 六天 spike 的实测记录与失败案例（`SPIKE-NOTES.md`）—— 正文「为什么需要它」的素材来源，全部是跑出来的。
- Part 目标、当前章节假设与里程碑（`OUTLINE.md`、`src/data/chapters.ts`），章节状态单源。
- 00–05 章的写作中草稿（`src/content/docs/`）+ 设计样章 `sample-reading.mdx`（draft，排版压测用）。
- 站点本身：首页 CliDemo（预录回放，非真调 API）、AgentTrace / StaticIsland 教学孤岛、Steps 操作序列。

**不存在，未来做设计时不得编造**（作者 2026-07-27 确认）：

- **最终成品 demo GIF**：尚未录制，正文完结后才有。
- **最终代码行数**：「不到 ___ 行」的具体数字待代码定稿后回填，任何页面都不许先填一个数。

**同样不得当作已交付能力宣传**（事实状态，非作者点名）：star 数 / 读者数 / 推荐语一个都没有；电子书 epub/PDF 到 M6 才生产；陪读 skill `public/skill/tutor.md` 目前是防 404 的占位文件。

## Product Principles

1. **阅读体验即产品。** 排版、行长、对比、节奏优先于一切装饰。任何元素若不服务于「连续读长文 + 对照代码」，就该被砍掉。
2. **实践所讲（practice what you preach）。** 站点本身要体现书里推崇的工程审美：克制、可逐行看懂、不为炫技引依赖。站点是这本书的第一个 demo。
3. **诚实透明，不藏坑。** 信息层级如实反映内容结构与进度（哪章可读、哪章在写、哪个决策待定），不制造虚假光鲜。
4. **零商业化干扰。** 读者注意力 100% 留在内容上。
5. **渐进可运行的清晰感。** 每章比上一章更强且可运行 —— 导航与结构要让读者随时知道「我在第几步、下一步去哪」。

## Anti-references

明确**不要**做成：

- **付费墙 / 会员 / 解锁 chrome**（对标 CodeCrafters 这类付费课）。本项目免费开源，站点上不应出现任何商业化、付费、登录解锁、"Premium" 标识等元素。这是最硬的红线。
- **营销味的渐变 SaaS 落地页**：头部团队 logo 墙、"supercharge / 下一代" 文案、英雄区大字营销。
- 成品导读 / 逆向分析式的呈现（learn-claude-code、Windy 的成品导读）—— 这是定位差异，不只是视觉。

**重要例外（来自作者）**：少量、克制的渐变与插画是**允许甚至鼓励**的，只要它们用于*降低读者的阅读负担*（例如帮助理解的示意图、柔和的分区背景）。被禁止的是**营销与付费**，不是颜色或图像本身。不要把"克制"过度解读成"无菜单的纯黑白"。

## Accessibility & Inclusion

- 目标 **WCAG AA**：正文对比度 ≥ 4.5:1，大字 / 粗体 ≥ 3:1。zinc 单色系正文用中灰（浅色模式 `#52525b`，深色模式 `#a1a1aa`），二者对各自背景均满足 AA —— 后续若把正文进一步调浅须重新验证对比度。
- 尊重 `prefers-reduced-motion`：任何动效都要有降级（淡入或直接呈现）。
- 中英混排可读性：字体栈需带完整中文回退（PingFang / 微软雅黑 / Noto Sans SC），行高对 CJK 适当放宽。
- **多语言（i18n）**：站点需支持中 / 英及更多语种。设计上预留语言切换入口，字体栈与行高要同时照顾 CJK 与拉丁文，配图 / 示意图中的文字尽量可本地化（或与正文分离）。zinc 单色系本身与语种无关，天然可跨语言复用。
- 链接不靠单一色相区分（单色系），用下划线保证可辨识。
