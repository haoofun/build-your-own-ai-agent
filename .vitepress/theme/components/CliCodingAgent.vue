<script setup>
// CliCodingAgent —— 首页 hero 的交互式 CLI 编码 agent（设计系统 DocsCliDemo 的 Vue 移植）。
// 不带「运行」按钮：进来就停在对话开头、暂停在 y/N 权限确认处，读者点「允许 / 拒绝」推进。
// 浅灰面板（非深色终端），4 个经典教学案例可切换，每个对应一章。
// 纯网站地盘（不进 book/、不过 pandoc、不进 llms.txt）。
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  height: { type: Number, default: 360 },
})

// 4 个经典案例（取自 spike：victim 修复、权限拦截、只读问答、环境注入）
const CASES = [
  {
    id: 'fix', label: '修复测试', chapter: 'ch05',
    prompt: "'修复 victim/ 下的 bug，跑 npm test 确认全绿'",
    note: '// 跑测试 → 看报错 → 改代码 → 再跑。每个写操作都要 y/N 确认',
    script: [
      { type: 'text', text: '我先跑测试，看哪里红了。' },
      { type: 'tool', name: 'bash', input: 'command: npm test', confirmText: 'npm test', needsConfirm: true,
        result: { exit: 1, text: 'FAIL  test/cart.test.js\n  ✕ applyDiscount 减免 25% → 期望 75，实际 25' } },
      { type: 'text', text: 'applyDiscount 把「减免比例」当成了「保留比例」。读源码确认。' },
      { type: 'tool', name: 'read_file', input: 'path: src/cart.js', needsConfirm: false,
        result: { exit: 0, text: 'export function applyDiscount(total, rate) {\n  return total * rate;   // ← bug' } },
      { type: 'text', text: '确认了，用 edit 精确替换那一行。' },
      { type: 'tool', name: 'edit_file', input: 'path: src/cart.js\n- return total * rate;\n+ return total * (1 - rate);', confirmText: 'edit src/cart.js（1 处替换）', needsConfirm: true,
        result: { exit: 0, text: '已写入 src/cart.js（1 处替换）' } },
      { type: 'tool', name: 'bash', input: 'command: npm test', confirmText: 'npm test', needsConfirm: true,
        result: { exit: 0, text: 'PASS  test/cart.test.js\n  ✓ 2 passed, 2 total' } },
      { type: 'answer', text: '修好了：total * rate → total * (1 - rate)，npm test 全绿。\n→ 里程碑：能修真实 bug 的最小编码 agent。' },
    ],
  },
  {
    id: 'deny', label: '权限拦截', chapter: 'ch07',
    prompt: "'清理掉 dist/ 和所有 node_modules，重新装依赖'",
    note: '// rm -rf 这类不可逆命令，没有你的批准 agent 不会执行——试试点「拒绝」',
    script: [
      { type: 'text', text: '我先删掉构建产物和依赖目录。' },
      { type: 'tool', name: 'bash', input: 'command: rm -rf dist node_modules', confirmText: 'rm -rf dist node_modules', needsConfirm: true, danger: true,
        result: { exit: 0, text: "removed 'dist', 'node_modules'" } },
      { type: 'text', text: '已清理，重新安装依赖。' },
      { type: 'tool', name: 'bash', input: 'command: npm install', confirmText: 'npm install', needsConfirm: true,
        result: { exit: 0, text: 'added 214 packages in 6s' } },
      { type: 'answer', text: '完成：已删除并重装 214 个依赖。' },
    ],
    denyAnswer: '已取消。rm -rf 是不可逆操作——没有你的明确批准，我不会执行任何写操作或 shell 命令。\n想预览会删什么？改用更安全的 git clean -nd。',
  },
  {
    id: 'ask', label: '代码问答', chapter: 'ch03',
    prompt: "'读 bloat/src，回答 MAX_RETRIES 上限是多少，为什么不能调更高？'",
    note: '// 读操作不需要确认——agent loop 自己读完所需文件，直接作答',
    script: [
      { type: 'text', text: '只读问答，我读 config.ts 即可。' },
      { type: 'tool', name: 'read_file', input: 'path: bloat/src/config.ts', needsConfirm: false,
        result: { exit: 0, text: '// MAX_RETRIES is hard-capped at 7. The broker force-closes\n// the socket on the 8th attempt → messages silently DROP.\nexport const MAX_RETRIES = 7;' } },
      { type: 'answer', text: '上限是 7。再高会触发 broker 在第 8 次投递时关 socket，消息被静默丢弃——config.ts 的 DESIGN INVARIANT 注释有据可查。\n→ 里程碑：记得住上下文的代码问答 agent。' },
    ],
  },
  {
    id: 'env', label: '环境感知', chapter: 'ch06',
    prompt: "'当前分支有哪些未提交的改动？'",
    note: '// 注入 cwd / git 状态后，agent 才答得出「此刻这个仓库」的问题',
    script: [
      { type: 'text', text: '我跑一下 git status。' },
      { type: 'tool', name: 'bash', input: 'command: git status --porcelain --branch', confirmText: 'git status --porcelain --branch', needsConfirm: true,
        result: { exit: 0, text: '## spike...origin/spike\n M src/cart.js\n?? notes.md' } },
      { type: 'answer', text: '在 spike 分支，2 处未提交：src/cart.js 已改、notes.md 未跟踪。\n→ 里程碑：注入环境后答得出未提交改动。' },
    ],
  },
]
const STEP_MS = 540

const caseId = ref(CASES[0].id)
const cur = computed(() => CASES.find((c) => c.id === caseId.value))
// SSR 初始即渲染开头那行 prompt（避免空白 hero，读者一眼知道这是什么）
const lines = ref([{ type: 'prompt', text: CASES[0].prompt }])
const step = ref(0)
const pending = ref(null)
const done = ref(false)
const denied = ref(false)
const reduced = ref(false)
const scrollRef = ref(null)
let timer = null

function clearTimer() {
  if (timer) { clearTimeout(timer); timer = null }
}

function schedule() {
  clearTimer()
  if (pending.value || done.value || step.value >= cur.value.script.length) return
  const item = cur.value.script[step.value]
  const delay = reduced.value ? 0 : step.value === 0 ? 240 : STEP_MS
  timer = setTimeout(() => {
    if (item.type === 'tool') {
      lines.value = [...lines.value, { type: 'tool', name: item.name, input: item.input, danger: item.danger }]
      if (item.needsConfirm) {
        pending.value = item
      } else {
        lines.value = [...lines.value, { type: 'result', ...item.result }]
        step.value += 1
      }
    } else {
      lines.value = [...lines.value, item]
      if (item.type === 'answer') done.value = true
      step.value += 1
    }
  }, delay)
}

function reset(c) {
  clearTimer()
  lines.value = [{ type: 'prompt', text: c.prompt }]
  step.value = 0
  pending.value = null
  done.value = false
  denied.value = false
  schedule()
}

function approve() {
  const item = cur.value.script[step.value]
  lines.value = [...lines.value, { type: 'result', ...item.result }]
  pending.value = null
  step.value += 1
}

function deny() {
  lines.value = [
    ...lines.value,
    { type: 'denied' },
    { type: 'answer', text: cur.value.denyAnswer || '已取消。没有你的批准，我不会执行写操作或 shell 命令。' },
  ]
  pending.value = null
  step.value = cur.value.script.length
  done.value = true
  denied.value = true
}

// step / pending / done 变化后推进下一步
watch([step, pending, done], schedule)
// 切案例：重置并重播
watch(caseId, () => reset(cur.value))

// 保持最新内容在视口内
watch([lines, pending], async () => {
  await nextTick()
  const el = scrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}, { deep: true })

onMounted(() => {
  reduced.value = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches
  schedule()
})
onBeforeUnmount(clearTimer)

const isDanger = computed(() => pending.value && pending.value.danger)
</script>

<template>
  <div class="cli-agent">
    <!-- 案例切换 -->
    <div class="cli-agent__tabs">
      <button
        v-for="c in CASES"
        :key="c.id"
        class="cli-agent__tab"
        :class="{ 'is-active': c.id === caseId, 'is-danger': c.id === 'deny' }"
        @click="caseId = c.id"
      >
        <svg v-if="c.id === 'deny'" class="cli-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12" y2="16.01" /></svg>
        {{ c.label }}<span class="cli-agent__chapter">{{ c.chapter }}</span>
      </button>
    </div>

    <!-- 终端面板 -->
    <div class="cli-agent__panel">
      <div class="cli-agent__bar">
        <div class="cli-agent__dots"><span /><span /><span /></div>
        <span class="cli-agent__titlebar">npx tsx cli.ts — your-own-agent</span>
      </div>

      <div ref="scrollRef" class="cli-agent__body" :style="{ height: height + 'px' }">
        <template v-for="(l, i) in lines" :key="i">
          <!-- prompt -->
          <div v-if="l.type === 'prompt'" class="cli-line cli-prompt" :style="{ marginTop: i ? '14px' : 0 }">
            <span class="cli-muted">➜</span><span class="cli-muted">spike</span><span class="cli-prompt__text">{{ l.text }}</span>
          </div>

          <!-- assistant text -->
          <div v-else-if="l.type === 'text'" class="cli-line cli-text">{{ l.text }}</div>

          <!-- tool request -->
          <div v-else-if="l.type === 'tool'" class="cli-tool" :class="{ 'is-danger': l.danger }">
            <div class="cli-tool__head">
              <svg class="cli-icon" viewBox="0 0 24 24" aria-hidden="true">
                <template v-if="l.danger"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12" y2="16.01" /></template>
                <template v-else><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></template>
              </svg>
              <span class="cli-tool__label">工具请求</span><span class="cli-muted">{{ l.name }}</span>
              <span v-if="l.danger" class="cli-tool__irreversible">不可逆</span>
            </div>
            <pre class="cli-tool__input">{{ l.input }}</pre>
          </div>

          <!-- result -->
          <pre v-else-if="l.type === 'result'" class="cli-result"><span :class="l.exit === 0 ? 'cli-muted' : 'cli-danger'">exit code: {{ l.exit }}</span>
{{ l.text }}</pre>

          <!-- denied -->
          <div v-else-if="l.type === 'denied'" class="cli-line cli-danger">✗ 已拒绝执行</div>

          <!-- answer -->
          <div v-else-if="l.type === 'answer'" class="cli-answer">{{ l.text }}</div>
        </template>

        <!-- 权限确认 -->
        <div v-if="pending" class="cli-gate" :class="{ 'is-danger': isDanger }">
          <div class="cli-gate__head">
            <svg class="cli-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></svg>
            {{ isDanger ? '危险操作 — 需要你的明确批准' : '需要批准才能继续' }}
          </div>
          <div class="cli-gate__cmd"><span class="cli-muted">{{ pending.name }} ›</span> {{ pending.confirmText || pending.input }}</div>
          <div class="cli-gate__actions">
            <span class="cli-gate__ask">允许执行吗？(y/N)</span>
            <button class="cli-btn cli-btn--primary" :class="{ 'is-danger': isDanger }" @click="approve">y · 允许</button>
            <button class="cli-btn" @click="deny">N · 拒绝</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 脚注 + 重新运行 -->
    <div class="cli-agent__foot">
      <p class="cli-agent__note">{{ cur.note }}</p>
      <button v-if="done || denied" class="cli-btn cli-btn--replay" @click="reset(cur)">
        <svg class="cli-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2v6h6" /><path d="M3 8a9 9 0 1 0 2.5-3.9L3 8" /></svg>
        重新运行
      </button>
    </div>
  </div>
</template>

<style scoped>
.cli-agent {
  font-family: var(--font-sans);
}
.cli-icon {
  width: 13px;
  height: 13px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 案例 tabs */
.cli-agent__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
}
.cli-agent__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
  padding: 5px 10px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-2);
}
.cli-agent__tab.is-active {
  border-color: var(--text-1);
  background: var(--text-1);
  color: var(--bg);
}
.cli-agent__chapter {
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
}
.cli-agent__tab.is-active .cli-agent__chapter {
  opacity: 0.7;
}

/* 终端面板 */
.cli-agent__panel {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.cli-agent__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-alt);
}
.cli-agent__dots {
  display: flex;
  gap: 6px;
}
.cli-agent__dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-strong);
}
.cli-agent__titlebar {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  margin-left: 6px;
}
.cli-agent__body {
  padding: 14px;
  overflow-y: auto;
}

/* 行 */
.cli-line {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
}
.cli-muted { color: var(--text-3); }
.cli-danger { color: var(--danger); }
.cli-prompt {
  display: flex;
  gap: 8px;
  color: var(--text-1);
}
.cli-prompt__text {
  color: var(--text-1);
  font-weight: 500;
}
.cli-text {
  color: var(--text-2);
  margin-top: 8px;
}

/* 工具请求 */
.cli-tool {
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  overflow: hidden;
}
.cli-tool.is-danger { border-color: var(--danger); }
.cli-tool__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px;
  border-bottom: 1px solid var(--border);
  color: var(--text-1);
  font-family: var(--font-mono);
  font-size: 13px;
}
.cli-tool.is-danger .cli-tool__head {
  border-bottom-color: var(--danger);
  color: var(--danger);
}
.cli-tool__label { font-weight: 600; }
.cli-tool__irreversible {
  margin-left: auto;
  font-size: var(--text-2xs);
  color: var(--danger);
  font-weight: 600;
}
.cli-tool__input {
  margin: 0;
  padding: 9px 11px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
  white-space: pre-wrap;
}

/* 结果 */
.cli-result {
  margin: 8px 0 0;
  padding: 9px 11px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
  white-space: pre-wrap;
}

/* 最终答复 */
.cli-answer {
  margin-top: 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-1);
  border-left: var(--border-accent-width) solid var(--text-1);
  padding-left: 10px;
  white-space: pre-wrap;
}

/* 权限确认 */
.cli-gate {
  margin-top: 13px;
  padding: 11px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--bg-alt);
}
.cli-gate.is-danger { border-color: var(--danger); }
.cli-gate__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  margin-bottom: 7px;
}
.cli-gate.is-danger .cli-gate__head { color: var(--danger); }
.cli-gate__cmd {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-1);
  margin-bottom: 10px;
}
.cli-gate__actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}
.cli-gate__ask {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-2);
}

/* 按钮 */
.cli-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
  padding: 4px 11px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-2);
}
.cli-btn--primary {
  border-color: var(--text-1);
  background: var(--text-1);
  color: var(--bg);
}
.cli-btn--primary.is-danger {
  border-color: var(--danger);
  background: var(--danger);
  color: var(--bg);
}

/* 脚注 */
.cli-agent__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}
.cli-agent__note {
  flex: 1;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
}
</style>
