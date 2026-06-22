<script>
// 默认 demo：ch05 里程碑 —— 修一个挂掉的测试。
// 放在普通 <script>（模块作用域），以便 <script setup> 的 defineProps 默认值引用。
export const DEFAULT_EVENTS = [
  { role: 'user', text: 'tests/sum.test.ts 挂了，帮我修一下。' },
  { role: 'assistant', text: '我先把测试跑一遍，看失败在哪。' },
  { role: 'tool_use', name: 'bash', input: { command: 'npx vitest run sum.test.ts' } },
  { role: 'permission', text: '执行 bash', decision: 'allowed' },
  { role: 'tool_result', exit: 1, isError: true, text: 'FAIL  sum.test.ts > adds two numbers\n  expected 5, received 6' },
  { role: 'assistant', text: '差 1，典型 off-by-one。读一下实现。' },
  { role: 'tool_use', name: 'read_file', input: { path: 'src/sum.ts' } },
  { role: 'tool_result', exit: 0, text: 'export const sum = (a, b) => a + b + 1;' },
  { role: 'assistant', text: '末尾多加了 1，去掉它。' },
  { role: 'tool_use', name: 'edit', input: { path: 'src/sum.ts', old_string: 'a + b + 1', new_string: 'a + b' } },
  { role: 'permission', text: '写入 src/sum.ts', decision: 'allowed' },
  { role: 'tool_result', exit: 0, text: 'edited src/sum.ts · 1 change' },
  { role: 'tool_use', name: 'bash', input: { command: 'npx vitest run sum.test.ts' } },
  { role: 'tool_result', exit: 0, text: 'PASS  sum.test.ts (1 test)' },
  { role: 'assistant', final: true, text: '修好了：sum 多加了 1，已删除，测试全部通过。' },
]
</script>

<script setup>
// AgentTrace —— 本书的招牌可视化：把一条真实 agent 执行链逐步回放。
// 这是首页满血版（首页是纯网站地盘：不进 book/、不过 pandoc、不占孤岛名额）。
// 章节内出现同样形态时，用交互孤岛 + 静态降级图，而非本组件。
//
// 视觉：浅灰面板（非深色终端）、zinc 单色、靠边框 + 留白分层、唯一墨黑强调。
// 事件类型：user | assistant | tool_use | permission | tool_result |
//           error | retry | subagent | compaction
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TraceList from './TraceList.vue'

const props = defineProps({
  events: { type: Array, default: () => DEFAULT_EVENTS },
  title: { type: String, default: 'agent loop' },
  subtitle: { type: String, default: 'npx tsx cli.ts' },
  autoPlay: { type: Boolean, default: true },
  speed: { type: Number, default: 1100 },
  interactive: { type: Boolean, default: false },
  height: { type: Number, default: 440 },
})

const total = computed(() => props.events.length)
const reduced = ref(false) // SSR 默认 false，挂载后探测

const revealed = ref(1)
const playing = ref(false)
const decisions = ref({})
const scrollRef = ref(null)
let timer = null

const done = computed(() => revealed.value >= total.value)

function clearTimer() {
  if (timer) { clearTimeout(timer); timer = null }
}

function scheduleNext() {
  clearTimer()
  if (!playing.value || done.value) return
  timer = setTimeout(() => {
    revealed.value = Math.min(total.value, revealed.value + 1)
  }, props.speed)
}

watch([playing, revealed], () => {
  if (done.value) playing.value = false
  scheduleNext()
})

// 保持最新一行在视口内，绝不让页面高度跳动
watch([revealed, decisions], async () => {
  if (reduced.value) return
  await nextTick()
  const el = scrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}, { deep: true })

function reset() {
  clearTimer()
  revealed.value = reduced.value ? total.value : 1
  decisions.value = {}
  playing.value = props.autoPlay && !reduced.value
}
function step(d) {
  playing.value = false
  revealed.value = Math.max(1, Math.min(total.value, revealed.value + d))
}
function toggle() {
  if (done.value) reset()
  else playing.value = !playing.value
}
function onResolve(i, d) {
  decisions.value = { ...decisions.value, [i]: d }
  if (revealed.value < total.value) playing.value = props.autoPlay && !reduced.value
}

function onKey(e) {
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
  else if (e.key === ' ') { e.preventDefault(); toggle() }
  else if (e.key.toLowerCase() === 'r') { e.preventDefault(); reset() }
}

onMounted(() => {
  reduced.value = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced.value) {
    revealed.value = total.value
    playing.value = false
  } else {
    playing.value = props.autoPlay
    scheduleNext()
  }
})
onBeforeUnmount(clearTimer)

const shown = computed(() => Math.min(revealed.value, total.value))
const progressPct = computed(() => (shown.value / total.value) * 100)
</script>

<template>
  <div class="agent-trace" tabindex="0" @keydown="onKey">
    <!-- 头部 -->
    <div class="agent-trace__bar">
      <div class="agent-trace__dots">
        <span v-for="i in 3" :key="i" />
      </div>
      <span class="agent-trace__title">{{ title }}</span>
      <span class="agent-trace__subtitle">{{ subtitle }}</span>
    </div>

    <!-- 主体：固定高度，内部滚动，hero 不重排 -->
    <div ref="scrollRef" class="agent-trace__body" :style="{ height: height + 'px' }">
      <TraceList
        :events="events"
        :revealed="revealed"
        :animate="!reduced"
        :interactive="interactive"
        :decisions="decisions"
        :depth="0"
        @resolve="onResolve"
      />
    </div>

    <!-- 控制条 -->
    <div class="agent-trace__controls">
      <button class="atc-btn atc-btn--primary" @click="toggle">
        {{ done ? '↻ 重放' : playing ? '❙❙ 暂停' : '▶ 播放' }}
      </button>
      <button class="atc-btn" :disabled="revealed <= 1" @click="step(-1)">← 上一步</button>
      <button class="atc-btn" :disabled="done" @click="step(1)">下一步 →</button>
      <button class="atc-btn" @click="reset">重置</button>
      <span style="flex: 1" />
      <span class="agent-trace__count">{{ shown }} / {{ total }}</span>
      <div class="agent-trace__progress">
        <div :style="{ width: progressPct + '%' }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-trace {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  font-family: var(--font-sans);
  outline: none;
}
.agent-trace:focus-visible {
  border-color: var(--text-1);
}
.agent-trace__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-alt);
}
.agent-trace__dots {
  display: flex;
  gap: 6px;
}
.agent-trace__dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-strong);
}
.agent-trace__title {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-1);
  font-weight: 600;
  margin-left: 4px;
}
.agent-trace__subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
}
.agent-trace__body {
  overflow-y: auto;
  padding: 18px 18px 4px;
}
.agent-trace__controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--bg-alt);
}
.atc-btn {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
  padding: 5px 11px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-2);
}
.atc-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.atc-btn--primary {
  border-color: var(--text-1);
  background: var(--text-1);
  color: var(--bg);
}
.agent-trace__count {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
}
.agent-trace__progress {
  width: 84px;
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}
.agent-trace__progress > div {
  height: 100%;
  background: var(--text-1);
  transition: width 0.3s var(--ease);
}
</style>
