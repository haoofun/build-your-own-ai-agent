import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'

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

export default defineConfig({
  site: 'https://build-your-own-ai-agent.com',
  integrations: [
    mdx(),
    react(),
  ],
})
