export interface Chapter {
  n: string
  t: string
  m: string
  desc: string
}

export interface ChapterWithPart extends Chapter {
  part: string
  partTitle: string
}

export interface Part {
  part: string
  title: string
  sub?: string
  chapters: Chapter[]
}

export const PARTS: Part[] = [
  {
    part: '第〇部分',
    title: '起点',
    chapters: [
      { n: '00', t: '导言：把黑盒拆开', m: '环境就绪，看完最终成品演示', desc: '为什么 agent 没有魔法；最终成品演示；环境准备（Node 22+、API key、~$5 预算）。' },
      { n: '01', t: '一次 API 调用', m: '一个会失忆的聊天 CLI——连问"我叫什么"都答不出', desc: 'messages 与角色、system prompt；打通一次干净的调用，再套一个无状态对话循环。' },
    ],
  },
  {
    part: '第一部分',
    title: '核心循环',
    sub: 'agent 的本质',
    chapters: [
      { n: '02', t: 'Tool Use：给模型一双手', m: '能查时间、算算术的助手', desc: '工具即 JSON Schema 声明；tool call 的请求-响应协议；为什么说"模型只是输出了一段 JSON"。' },
      { n: '03', t: 'Agent Loop：循环直到完成', m: '记得住你上一句的代码问答 agent', desc: 'loop 的终止条件；messages 数组的增长方式；实现 read_file 工具。' },
      { n: '04', t: '写与改：Write、Edit 与 diff', m: '能修真实 bug 的最小编码 agent', desc: '全量写 vs 精确替换；old_string/new_string 的设计权衡；终端里渲染 diff。' },
      { n: '05', t: 'Bash：让 agent 跑命令', m: '丢给它一个失败的测试，它自己修到通过', desc: '子进程、stdout/stderr 捕获、超时与输出截断；跑测试→看报错→改代码→再跑的自我迭代闭环。' },
    ],
  },
  {
    part: '第二部分',
    title: '从玩具到可用',
    chapters: [
      { n: '06', t: '系统提示词与环境感知', m: '注入环境后答对"当前分支有什么未提交改动"', desc: 'system prompt 的分层设计；注入 cwd、git 状态、目录结构；CLAUDE.md 式的项目记忆文件。' },
      { n: '07', t: '权限系统：信任但确认', m: 'agent 不再能悄悄 rm -rf', desc: '危险操作分级；写操作/命令执行的用户确认交互；白名单与会话内记忆。' },
      { n: '08', t: '上下文管理：对抗有限的窗口', m: '长对话不再爆窗口、API 账单下降', desc: 'token 计数与预算；大输出截断；手写客户端 compaction；prompt caching 与之咬合。' },
      { n: '09', t: '健壮性：真实世界的网络与错误', m: '429 自动退避、Ctrl+C 取消、报错自我修正', desc: '限速与指数退避重试；流中断恢复；Ctrl+C 取消正在执行的工具；工具报错回传。' },
    ],
  },
  {
    part: '第三部分',
    title: '进阶能力',
    chapters: [
      { n: '10', t: '子 agent：分而治之', m: '主 agent 派子 agent 全库搜索，自己保持清爽', desc: '为什么需要隔离上下文；Task 工具的实现：子 agent 的生命周期、结果回传。' },
      { n: '11', t: '计划与待办：让 agent 有条理', m: '开 todo 的多步任务不漏步骤', desc: 'TodoWrite 式工具；为什么自列任务清单能提升长任务表现；plan 模式的实现。' },
      { n: '12', t: 'MCP：接入外部世界', m: '你的 agent 能用上整个 MCP 生态', desc: 'MCP 协议拆解（不是黑魔法，就是 JSON-RPC）；实现 MCP client，接入一个现成 server。' },
      { n: '13', t: '自定义命令与 Skills', m: '实现一个 /commit skill，按需加载眼见为实', desc: '斜杠命令；skill 文件的按需加载——本质是"把 prompt 工程产品化"。' },
    ],
  },
  {
    part: '第四部分',
    title: '收尾',
    chapters: [
      { n: '14', t: '终端体验打磨', m: '流式 markdown、spinner、工具调用折叠', desc: '不依赖重型 TUI 框架的渲染：spinner、工具调用折叠；流式输出（SSE）在此落地。' },
      { n: '15', t: '评测：怎么知道它变好了', m: '三配置的通过率与 token 成本对比表', desc: '为 agent 写 mini eval：固定任务集 + 自动判分；用 eval 验证前面每个特性确实有效。' },
      { n: '16', t: '发布', m: '干净容器里 npm i -g 后三分钟跑通 demo', desc: '打包成 npm 全局命令；README 写法；如何让别人三分钟跑起来。' },
    ],
  },
  {
    part: '附录',
    title: 'Appendix',
    chapters: [
      { n: 'A', t: 'API 提供商选择', m: 'Anthropic 直连 / OpenRouter / 兼容端点', desc: 'Anthropic 直连 / OpenRouter / 任意 OpenAI 兼容端点（解决国内读者访问问题）。' },
      { n: 'B', t: '多模型适配层', m: '', desc: '在不同模型供应商之间切换的适配层设计。' },
      { n: 'C', t: '术语表（中英对照）', m: '', desc: '全书技术名词的中英文对照表。' },
    ],
  },
]

export const CHAPTERS: ChapterWithPart[] = PARTS.flatMap((p) =>
  p.chapters.map((c) => ({ ...c, part: p.part, partTitle: p.title }))
)

// Map from URL slug (filename without ext) to chapter number
export const SLUG_TO_N: Record<string, string> = {
  '00-intro': '00',
  '01-first-api-call': '01',
  '02-tool-use': '02',
  '03-agent-loop': '03',
  '04-write-edit': '04',
  '05-bash': '05',
  '06-system-prompt': '06',
  '07-permissions': '07',
  '08-context': '08',
  '09-robustness': '09',
  '10-subagents': '10',
  '11-plan-todo': '11',
  '12-mcp': '12',
  '13-skills': '13',
  '14-terminal-ui': '14',
  '15-evals': '15',
  '16-release': '16',
  'appendix-a-api-providers': 'A',
  'appendix-b-model-adapter': 'B',
  'appendix-c-glossary': 'C',
}

export const N_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_N).map(([slug, n]) => [n, slug])
)

// 章节写作状态（单源）。章节上线后把对应章号从 WRITING 移到 PUBLISHED 即可，
// 大纲页的进度表与首页路线图的状态点都读这里。
export type ChapterStatus = 'writing' | 'planned' | 'published'

const PUBLISHED = new Set<string>([])
const WRITING = new Set<string>(['00', '01', '02', '03', '04', '05'])

export function chapterStatus(n: string): ChapterStatus {
  if (PUBLISHED.has(n)) return 'published'
  if (WRITING.has(n)) return 'writing'
  return 'planned'
}

export const STATUS_META: Record<ChapterStatus, { label: string }> = {
  writing: { label: '写作中' },
  planned: { label: '规划中' },
  published: { label: '可读' },
}
