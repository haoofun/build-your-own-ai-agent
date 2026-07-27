# 写作规范（单源三端的兼容约定）

`src/content/docs/*.md` 是唯一内容源，同时供给：Astro 网站（自定义布局）、pandoc 电子书（epub/PDF）、llms.txt（agent 可读端，生成脚本待建）。
本规范的每条都为了"写一份、三端不坏"。评审章节时按此检查。

## 文件与结构

- 文件名：`NN-slug.md`（如 `03-agent-loop.md`），**不含空格**；章节顺序 = 文件名排序（电子书脚本依赖此约定）
- 附录：`appendix-a-*.md` 等（字母排在数字后，自然落在书尾）
- 每章**有且仅有一个 H1**（章标题），正文从 H2 开始
- 新章上线：把 `.md` 文件放进 `src/content/docs/` 即可，侧边栏按 `astro.config.ts` 导出的 `CHAPTER_PLAN` 自动显示，无需改配置
- 五段式结构（H2）：为什么需要它 → 原理拆解 → 动手实现 → 跑起来看效果 → 练习与延伸

## 图片

- 一律相对路径：`![描述](./images/xxx.png)`；不用 HTML `<img>`（pandoc 端语义丢失）
- 图片文件名不含空格；放 `src/content/docs/images/`

## 交互孤岛（唯一合法写法）

章节文件有两种格式：

**普通章节（pandoc 可读）：`.md` 文件**
正文保持纯 markdown，不含 JSX/MDX 语法。交互孤岛通过 MDX 包装文件引入（见下）。

**含交互孤岛的章节：`.mdx` 文件**
把对应章节从 `.md` 改为 `.mdx`，在文件顶部 import 孤岛组件，然后在正文中用 JSX 插入。静态降级由组件架构负责，作者无需手配 PNG：

```mdx
---
title: "03 · Agent Loop：循环直到完成"
---

import AgentTrace from '../../components/AgentTrace'

...正文...

<AgentTrace
  client:visible
  title="agent loop"
  events={[
    { role: 'user', text: '...' },
    { role: 'assistant', text: '...' },
    { role: 'tool_use', name: 'read_file', input: { path: 'src/...' } },
    { role: 'tool_result', exit: 0, text: '...' },
    { role: 'assistant', final: true, text: '...' },
  ]}
/>
```

- 网站端：Astro 的 `client:visible` 指令让组件在视口内时水合，渲染交互体验
- React 组件放 `src/components/`，可使用完整 React 生态，不受 pandoc 约束
- **`.mdx` 文件 pandoc 不处理**（至 M4 再加预处理管线；现阶段电子书跳过 `.mdx` 章节）
- **孤岛配额：每章一个 loop 岛**——用 `AgentTrace` 展示本章新增的那一圈 loop（每章比上一章多一种事件：tool_use → permission → subagent → compaction…），这是本书区别于普通 TS 教程的招牌。额外的特殊孤岛从严，须过「动起来比静态图更会教」门槛
- **静态降级自动化**：`AgentTrace` 的无 JS / 电子书形态是 `StaticIsland`（同一条链、全展开、纯静态渲染），作者无需手配静态图；M4 预处理统一把 `AgentTrace` 换成 `StaticIsland`
- **pandoc 兼容底线**：能用 `.md` 就不升 `.mdx`；只有确实需要交互组件的章节才改后缀

## 步骤序列（Steps）

「照着敲的一串动作」用 `Steps` 排版：环境准备（装 Node、拿 API key、发布流程）与「动手实现」里的分步改代码。**它不占孤岛配额**——纯排版件、零 JS、零交互。

````mdx
import Steps from '../../components/Steps.astro'

<Steps>
1. **拿到 API key** —— 去 console 建一个，写进当前 shell。

   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```
2. **跑一次**，确认终端里出现一次 `tool_use`。
</Steps>
````

- **内容必须是一个标准 Markdown 有序列表**：`<Steps>` 只负责画序号与轨道，不定义自己的 `<Step>` 标签。剥掉这层标签即为电子书 / llms.txt 形态，**pandoc 端零预处理成本**
- 步内的代码块 / 段落缩进到列表项对齐（`1. ` 后缩进 3 空格），否则 markdown 会把它们踢出该步
- 每步以 `**加粗动作**` 开头：加粗自动抬到标题墨色，形成「动作 → 解释 → 命令」的读法
- 概念性流程（讲原理的 N 步循环）**不用** `Steps`——那是 `AgentTrace` 的活；`Steps` 只服务「读者要执行的动作」

## 语法红线

- **`.md` 文件**（普通章节）：禁 MDX / JSX 语法——这些文件要过 pandoc，混入 JSX 会破坏电子书构建
- **`.mdx` 文件**（孤岛章节）：JSX 合法；交互孤岛优先用 `AgentTrace`——它的 `StaticIsland` 形态即电子书 / 无 JS 降级，无需手配静态图。若自定义其他交互组件，须自带静态降级形态
- `::: tip` 等 Markdown directives 已随 Starlight 移除，**不再可用**；提示框仅在 `.mdx` 章节用 `Callout` 组件（`src/components/Callout`）
- 章间互链用相对路径：`[上一章](./02-tool-use.md)`（构建时转 html 链接；电子书跨章锚点 M4 校对时统一核验）
- 代码块标注语言（` ```ts `、` ```bash `），三端高亮/语义都依赖它

## 章节模板

```markdown
# NN · 章标题

一段引子：上一章结束时项目能做什么、还不能做什么。

## 为什么需要它

## 原理拆解

## 动手实现

## 跑起来看效果

## 练习与延伸
```
