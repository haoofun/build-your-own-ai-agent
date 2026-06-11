import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'
import container from 'markdown-it-container'
import llmstxt from 'vitepress-plugin-llms'

const bookDir = resolve(dirname(fileURLToPath(import.meta.url)), '../book')

/** 规划中的完整目录；文件尚不存在的章节自动隐藏（写一章、上线一章，无需改配置） */
const plan: Record<string, [file: string, title: string][]> = {
  '第〇部分 · 起点': [
    ['00-intro', '00 · 导言：把黑盒拆开'],
    ['01-first-api-call', '01 · 一次 API 调用'],
  ],
  '第一部分 · 核心循环': [
    ['02-tool-use', '02 · Tool Use：给模型一双手'],
    ['03-agent-loop', '03 · Agent Loop：循环直到完成'],
    ['04-write-edit', '04 · 写与改：Write、Edit 与 diff'],
    ['05-bash', '05 · Bash：让 agent 跑命令'],
  ],
  '第二部分 · 从玩具到可用': [
    ['06-system-prompt', '06 · 系统提示词与环境感知'],
    ['07-permissions', '07 · 权限系统：信任但确认'],
    ['08-context', '08 · 上下文管理：对抗有限的窗口'],
    ['09-robustness', '09 · 健壮性：真实世界的网络与错误'],
  ],
  '第三部分 · 进阶能力': [
    ['10-subagents', '10 · 子 agent：分而治之'],
    ['11-plan-todo', '11 · 计划与待办：让 agent 有条理'],
    ['12-mcp', '12 · MCP：接入外部世界'],
    ['13-skills', '13 · 自定义命令与 Skills'],
  ],
  '第四部分 · 收尾': [
    ['14-terminal-ui', '14 · 终端体验打磨'],
    ['15-evals', '15 · 评测：怎么知道它变好了'],
    ['16-release', '16 · 发布'],
  ],
  '附录': [
    ['appendix-a-api-providers', 'A · API 提供商选择'],
    ['appendix-b-model-adapter', 'B · 多模型适配层'],
    ['appendix-c-glossary', 'C · 术语表（中英对照）'],
  ],
}

const sidebar: DefaultTheme.SidebarItem[] = Object.entries(plan)
  .map(([text, items]) => ({
    text,
    items: items
      .filter(([file]) => existsSync(resolve(bookDir, `${file}.md`)))
      .map(([file, title]) => ({ text: title, link: `/${file}` })),
  }))
  .filter((group) => group.items.length > 0)

export default defineConfig({
  lang: 'zh-CN',
  title: 'Build Your Own AI Agent',
  description:
    '从零复刻一个 Claude Code —— 用 TypeScript 手写一个编码 agent，不用任何 agent 框架',
  srcDir: 'book',
  cleanUrls: true,
  sitemap: { hostname: 'https://build-your-own-ai-agent.com' },

  themeConfig: {
    nav: [{ text: '开始阅读', link: '/00-intro' }],
    sidebar,
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一章', next: '下一章' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/haoofun/build-your-own-ai-agent' },
    ],
    editLink: {
      pattern:
        'https://github.com/haoofun/build-your-own-ai-agent/edit/main/book/:path',
      text: '在 GitHub 上编辑此页',
    },
    footer: {
      message: '书稿文字 CC BY-NC-SA 4.0 · 代码 MIT',
      copyright: '© 2026 haoo',
    },
  },

  markdown: {
    config(md) {
      // 交互孤岛：::: {.interactive name="组件名"} + 内部静态降级图
      // pandoc 的 fenced_divs 天然识别此写法，电子书端自动降级为图片（见 WRITING.md）
      md.use(container, 'interactive', {
        validate: (params: string) => /^\{\.interactive\b/.test(params.trim()),
        render(tokens: any[], idx: number) {
          const token = tokens[idx]
          if (token.nesting === 1) {
            // VitePress 内置 markdown-it-attrs 会把 {...} 从 info 剥离、存入 token.attrs
            const name =
              token.attrGet?.('name') ?? /name="([^"]+)"/.exec(token.info)?.[1] ?? ''
            return `<div class="interactive-island" data-island="${name}">\n`
          }
          return '</div>\n'
        },
      })
    },
  },

  vite: {
    // 生成 llms.txt / llms-full.txt：站点的"agent 可读端"
    plugins: [
      llmstxt({
        domain: 'https://build-your-own-ai-agent.com',
        ignoreFiles: ['index.md'],
      }),
    ],
  },
})
