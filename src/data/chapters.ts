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
  goal?: string
  exit?: string
  acceptance?: string
  deferred?: string
  chapters: Chapter[]
}

// Part 目标是规划基线；chapters 只是当前导航假设。
// 一个 Part 开始开发前，先粗跑通 exit，再按可运行 checkpoint 重切并冻结章节。
export const PARTS: Part[] = [
  {
    part: '序章',
    title: '看见模型边界',
    sub: '从一次调用开始',
    goal: '打通终端输入到一次 HTTP 响应的最短路径，并亲手看见“模型调用还不是 agent”。',
    exit: '一个使用裸 fetch 的无状态聊天 CLI；连续追问时会失忆，读者能解释原因。',
    acceptance: '连续问“我叫什么”，第二轮稳定暴露客户端没有保存历史。',
    deferred: '跨轮 messages、tool use、agent loop、流式与 SDK。',
    chapters: [
      { n: '00', t: '导言：把黑盒拆开', m: '环境就绪，看完最终成品演示', desc: '为什么 agent 没有魔法；最终成品演示；环境准备（Node 22+、API key、~$5 预算）。' },
      { n: '01', t: '从 API 调用到聊天 CLI', m: '一个会失忆的聊天 CLI——连问"我叫什么"都答不出', desc: 'messages 与角色；打通一次干净的调用，再套一个无状态对话循环。' },
    ],
  },
  {
    part: '第一部分',
    title: '核心闭环',
    sub: '从 fetch 到 SDK',
    goal: '完成模型调用工具、改变环境、读回结果并继续行动的最小 coding agent，再结束 fetch 的教学使命。',
    exit: 'SDK 版 agent 能 Read / Write / Edit / Bash，把失败测试修到通过；fetch 与 SDK 行为等价，runAgent 可复用。',
    acceptance: '对带失败测试的 fixture 完成“读、改、跑、再改、通过”，并用同一 transcript 验证 fetch / SDK 等价。',
    deferred: '环境注入、权限、长上下文、持久化和子 agent；不预留空回调。',
    chapters: [
      { n: '02', t: 'Tool Use：给模型一双手', m: '能查时间、算算术的助手', desc: '工具即 JSON Schema 声明；tool call 的请求-响应协议；为什么说"模型只是输出了一段 JSON"。' },
      { n: '03', t: 'Agent Loop：循环直到完成', m: '记得住你上一句的代码问答 agent', desc: 'loop 的终止条件；messages 数组的增长方式；实现 read_file 工具。' },
      { n: '04', t: '写与改：Write、Edit 与 diff', m: '能修真实 bug 的最小编码 agent', desc: '全量写 vs 精确替换；old_string/new_string 的设计权衡；终端里渲染 diff。' },
      { n: '05', t: 'Bash：让 agent 跑命令', m: '丢给它一个失败的测试，它自己修到通过', desc: '子进程、stdout/stderr 捕获、超时与输出截断；跑测试→看报错→改代码→再跑的自我迭代闭环。' },
    ],
  },
  {
    part: '第二部分',
    title: '可控运行',
    goal: '让最小 agent 在真实项目中安全、可观察地执行，并在拒绝、故障或取消后保持可用。',
    exit: '理解项目环境、过程可见、危险操作受控、工具错误可恢复、网络瞬时错误可重试、Ctrl+C 无孤儿进程。',
    acceptance: '综合 fixture 覆盖项目指令、权限拒绝、工具失败、429 与 Ctrl+C，失败后当前对话仍可继续。',
    deferred: 'token 预算、compaction、跨 prompt 保存，以及 Todo、子 agent、Skills 和 MCP。',
    chapters: [
      { n: '06', t: '系统提示词与环境感知', m: '注入环境后答对"当前分支有什么未提交改动"', desc: 'system prompt 的分层设计；注入 cwd、git 状态、目录结构；CLAUDE.md 式的项目记忆文件。' },
      { n: '07', t: '权限系统：信任但确认', m: 'agent 不再能悄悄 rm -rf', desc: '危险操作分级；写操作/命令执行的用户确认交互；白名单与会话内记忆。' },
    ],
  },
  {
    part: '第三部分',
    title: '长任务与 Session',
    goal: '管理持续膨胀的上下文和成本，让工作跨 prompt、跨进程延续。',
    exit: '能观测 token、截断大输出、验证 caching、安全 compaction，并用 JSONL 保存和恢复线性 Session。',
    acceptance: '压缩后保留原始任务和关键证据，cache usage 可见，关闭重开可恢复且损坏尾行不拖垮 Session。',
    deferred: 'Todo、Skills、子 agent、MCP，以及 Session tree、事务恢复和 run 中途崩溃续跑。',
    chapters: [
      { n: '08', t: 'token 感知：计数、截断与缓存', m: 'API 账单下降；大输出不再把窗口撑爆', desc: 'token 计数与预算（count_tokens / usage 锚定）；大输出截断策略；prompt caching 与账单观测。' },
      { n: '09', t: '上下文压缩：compaction', m: '长对话不再爆窗口，压缩前后 usage 眼见为实', desc: '手写客户端压缩：何时压（锚定真实 usage、双参数防 thrash）；怎么压；切点结构性排除 toolResult；硬事实结构化留存。' },
      { n: '10', t: '健壮性与会话生命周期', m: '429 退避、Ctrl+C 优雅取消、关终端重开对话还在', desc: '三层健壮性：网络重试与退避；工具错误三段式编码进 tool_result；session JSONL 持久化。' },
    ],
  },
  {
    part: '第四部分',
    title: '计划与分工',
    goal: '让 agent 显式规划多步任务，并把调查工作交给隔离的只读子 agent。',
    exit: 'Todo 跨 prompt 保存进度；Task Tool 复用 runAgent，以新 messages 和只读工具集返回可复查证据。',
    acceptance: 'Todo 对比不漏步骤；explorer 返回文件与行号证据，主上下文保持清晰，usage 与取消完整上卷。',
    deferred: 'Skills、MCP、写操作子 agent、worktree 合并、并行调度和后台任务。',
    chapters: [
      { n: '11', t: '子 agent：分而治之', m: '主 agent 派只读子 agent 全库搜索，自己保持清爽', desc: '为什么需要隔离上下文；Task 工具的实现；只读工具集作结构性权限；结果附可复查证据。' },
      { n: '12', t: '计划、命令与 Skills', m: '开 todo 不漏步骤；/commit skill 按需加载眼见为实', desc: '扩展 agent 行为不碰核心 loop：TodoWrite 式工具、斜杠命令、skill 文件的按需加载。' },
    ],
  },
  {
    part: '第五部分',
    title: '开放扩展',
    goal: '沿行为文本和外部工具两条轴增加能力，同时保持核心 loop 不变。',
    exit: 'Skills 按需进入 system prompt；MCP 工具经过命名、权限和错误适配后进入同一个 Tool Map。',
    acceptance: '未加载 Skill 不占 token；真实 MCP server 可握手、分页、调用、失败降级并在退出时干净关闭。',
    deferred: '通用插件框架、多 Provider、MCP 自动重连、热更新和动态下架。',
    chapters: [
      { n: '13', t: 'MCP：接入外部世界', m: '你的 agent 能用上整个 MCP 生态', desc: 'MCP 协议拆解（不是黑魔法，就是 JSON-RPC）；实现 MCP client，接入一个现成 server。' },
    ],
  },
  {
    part: '第六部分',
    title: '验证与交付',
    goal: '把开发者自用的 CLI 变成体验可展示、能力可量化、边界诚实、别人能复现的开源作品。',
    exit: '终端体验完整，eval 产出确定性报告，能力证据分级，干净环境可在三分钟内安装跑通。',
    acceptance: '产出体验对比 GIF、通过率与成本报告，并由发布 CI 完成干净环境安装和 demo。',
    deferred: '生产级 harness、IDE / Web、多用户和企业治理。',
    chapters: [
      { n: '14', t: '终端体验打磨', m: '流式 markdown、spinner、工具调用折叠', desc: '不依赖重型 TUI 框架的渲染：spinner、工具调用折叠、流式 markdown 渲染；裸 SSE 手解析作练习。' },
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
  '08-token-awareness': '08',
  '09-compaction': '09',
  '10-robustness': '10',
  '11-subagents': '11',
  '12-plan-commands-skills': '12',
  '13-mcp': '13',
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
  planned: { label: '暂定' },
  published: { label: '可读' },
}
