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

**待拍板**：裸 fetch vs 官方 SDK——spike 全程双版并行推进（2026-06-13 定），D7 复盘时拍板正文策略；ch08 是否拆分、ch11 与 ch13 是否合并（大纲评审中提出，M1 期间定）。

## 当前状态（2026-06）

- [x] 定位、差异化调研、大纲 v0.1（见 OUTLINE.md，16 章 + 3 附录）
- [x] 大纲评审（2026-06-10：差异化表新增 Windy 行、7 章补齐里程碑、定位改为深度优势）
- [ ] spike 周（实际 D1 = 2026-06-11，较原计划顺延一天；坑清单见 SPIKE-NOTES.md）。D1 ✓；D2 ✓（06-13 收口：SDK 版 + fetch 版双版验收通过，victim bug 全绿，abort 实证无孤儿进程，tsc 全绿；types.ts 手写类型、agent-fetch.ts 移植、cli.ts 入口拆分、AgentStopReason 出口语义均完成）
- [x] 发布管线（2026-06-11 搭好并沙盒验证：VitePress（srcDir=book、规划目录自动隐藏未写章节）+ interactive 容器 + llms.txt/llms-full.txt + pandoc epub 冒烟 + CI；写作约定见 WRITING.md；2026-06-11 全线上线：Cloudflare Pages 部署生效，build-your-own-ai-agent.com 主域 + www 均可访问，llms.txt 线上验证通过）
- [x] 域名购买 + 文件夹更名 + GitHub 仓库（public）：github.com/haoofun/build-your-own-ai-agent，LICENSE = MIT + 正文 CC BY-NC-SA（2026-06-11 完成）
- [ ] M1：第 0–5 章（发布管线已在 spike 周并行搭好）
- [ ] M2–M5：见 OUTLINE.md 第八节

## 分工原则

代码与核心讲解由作者本人完成（求职需要经得起面试追问）；AI 助手负责：架构讨论对手盘、代码 review、资料查证、构建管线、翻译与润色。AI 不应代写整章成品内容。

**导师铁律**：AI 替作者写了核心代码 = 作者失去该处的面试防御权。作者求助时，AI 讲原理、找毛病、摆利弊，不代写。

## 协作工作流（2026-06-10 定）

**工程操作约定**：AI 沙盒对项目文件夹只能创建/覆盖文件，**不能删除或重命名**（git 锁文件曾因此卡死）。因此 git 提交、打 tag、推送一律由作者在本机执行，AI 负责改文件并给出待执行命令；node_modules 由作者本机 `npm install` 生成，AI 不在项目文件夹内装依赖。

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


