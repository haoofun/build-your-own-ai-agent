import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationFocus,
} from '@shikijs/transformers'
import {
  transformerFileTitle,
  transformerTerminalPrompt,
} from './src/data/shiki-transformers'

// 章节计划——单一来源，供自定义布局、侧栏、llms.txt 生成使用
// 文件不存在的章节由路由层跳过（写一章、上线一章，无需改配置）
export const CHAPTER_PLAN: Record<string, [file: string, label: string][]> = {
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
    ['08-token-awareness', '08 · token 感知：计数、截断与缓存'],
    ['09-compaction', '09 · 上下文压缩：compaction'],
    ['10-robustness', '10 · 健壮性与会话生命周期'],
  ],
  '第三部分 · 进阶能力': [
    ['11-subagents', '11 · 子 agent：分而治之'],
    ['12-plan-commands-skills', '12 · 计划、命令与 Skills'],
    ['13-mcp', '13 · MCP：接入外部世界'],
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

export default defineConfig({
  site: 'https://build-your-own-ai-agent.com',
  markdown: {
    // 双主题：token 颜色由 Shiki 出（明 light-plus / 暗 dark-plus，即 VS Code
    // 默认的 Light+/Dark+）——读者在编辑器里看到的就是这套配色，关键字、字符串、
    // 函数名、类型分属不同色相，比 github-* 的低饱和更容易逐行扫读。
    // 代码面背景仍用设计 token（bg-soft），不用主题自带的底色。
    shikiConfig: {
      themes: { light: 'light-plus', dark: 'dark-plus' },
      defaultColor: false,
      // 用 // [!code --/++]、// [!code highlight]、// [!code focus] 注记
      // 在语法高亮之上叠 diff / 行高亮 / 聚焦——ch04 讲 Write/Edit/diff 的刚需。
      transformers: [
        transformerNotationDiff({ matchAlgorithm: 'v3' }),
        transformerNotationHighlight({ matchAlgorithm: 'v3' }),
        transformerNotationFocus({ matchAlgorithm: 'v3' }),
        transformerFileTitle(),
        transformerTerminalPrompt(),
      ],
    },
  },
  integrations: [
    mdx(),
    react(),
  ],
})
