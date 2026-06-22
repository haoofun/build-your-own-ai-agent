<script setup>
// AgentTrace 的递归行渲染器：每个事件一行（轨道圆点 + label + loop 徽标 + 正文）。
// subagent 事件嵌套渲染一个子 TraceList（Vue 单文件组件可按文件名自递归）。
import { reactive } from 'vue'

const props = defineProps({
  events: { type: Array, required: true },
  revealed: { type: Number, default: null }, // null = 全显（用于子 agent / 静态）
  animate: { type: Boolean, default: true },
  interactive: { type: Boolean, default: false },
  decisions: { type: Object, default: () => ({}) },
  depth: { type: Number, default: 0 },
})
const emit = defineEmits(['resolve'])

// 每个 tool_use 行的 raw-json 折叠状态，按行下标存
const rawOpen = reactive({})

const mono = { fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.65 }

const LABELS = {
  user: 'user', assistant: 'assistant', tool_use: 'tool_use',
  tool_result: 'tool_result', permission: 'permission', error: 'error',
  retry: 'retry', compaction: 'compaction', subagent: 'task',
}

// loop 迭代徽标：模型被重新调用（即 tool_result 之后的 assistant 轮）即新一轮
function withIterations(events) {
  let iter = 0, sawResult = false, first = true
  return events.map((ev) => {
    let badge = null
    if (ev.role === 'assistant') {
      if (first || sawResult) { iter += 1; badge = iter; sawResult = false; first = false }
    }
    if (ev.role === 'tool_result') sawResult = true
    return { ...ev, _iter: badge }
  })
}

function dotFor(ev) {
  switch (ev.role) {
    case 'user': return { fill: 'var(--text-1)' }
    case 'assistant': return ev.final
      ? { fill: 'var(--text-1)', ring: true }
      : { fill: 'var(--bg)', border: '1.5px solid var(--text-3)' }
    case 'tool_use': return { fill: 'var(--text-3)' }
    case 'tool_result': return { fill: 'var(--text-3)' }
    case 'permission': return { fill: 'var(--warning)' }
    case 'error': return { fill: 'var(--danger)' }
    case 'retry': return { fill: 'var(--warning)' }
    case 'compaction': return { dashed: true }
    case 'subagent': return { fill: 'var(--text-1)' }
    default: return { fill: 'var(--text-3)' }
  }
}

function dotStyle(dot) {
  if (dot.dashed) {
    return { width: '9px', height: '9px', borderRadius: '50%', boxSizing: 'border-box',
      background: 'var(--bg)', border: '1px dashed var(--text-3)', marginTop: '5px', position: 'relative' }
  }
  return {
    width: dot.ring ? '11px' : '9px', height: dot.ring ? '11px' : '9px',
    borderRadius: '50%', boxSizing: 'border-box', marginTop: '5px', position: 'relative',
    background: dot.fill, border: dot.border || 'none',
  }
}

function jsonText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function rowCount() {
  const list = withIterations(props.events)
  return props.revealed == null ? list.length : Math.min(props.revealed, list.length)
}
function visibleRows() {
  return withIterations(props.events).slice(0, rowCount())
}

function decisionFor(ev, i) {
  return ev.decision || props.decisions[i]
}
function isInteractiveRow(i) {
  // 仅最新揭示的一行可交互（静态 / 子 agent 不可）
  return props.interactive && (props.revealed == null || i === rowCount() - 1)
}
function resolve(i, d) {
  emit('resolve', i, d)
}
</script>

<template>
  <TransitionGroup
    :name="animate ? 'trace' : ''"
    tag="div"
    class="trace-list"
  >
    <div
      v-for="(ev, i) in visibleRows()"
      :key="i"
      class="trace-row"
    >
      <!-- 轨道 + 节点 -->
      <div class="trace-rail">
        <span v-if="i !== rowCount() - 1" class="trace-line" />
        <span :style="dotStyle(dotFor(ev))" />
      </div>

      <!-- 正文 -->
      <div class="trace-body">
        <div
          v-if="LABELS[ev.role] || ev._iter"
          class="trace-meta"
        >
          <span v-if="LABELS[ev.role]" class="trace-label">{{ LABELS[ev.role] }}</span>
          <span v-if="ev.role === 'assistant' && ev._iter" class="trace-iter">loop · {{ ev._iter }}</span>
        </div>

        <!-- user -->
        <div
          v-if="ev.role === 'user'"
          :style="{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)', color: 'var(--text-1)', fontWeight: 'var(--weight-medium)' }"
        >{{ ev.text }}</div>

        <!-- assistant -->
        <div
          v-else-if="ev.role === 'assistant'"
          :style="ev.final
            ? { fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)', color: 'var(--text-1)', borderLeft: 'var(--border-accent-width) solid var(--text-1)', paddingLeft: '10px' }
            : { fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)', color: 'var(--text-2)' }"
        >{{ ev.text }}</div>

        <!-- tool_use -->
        <div
          v-else-if="ev.role === 'tool_use'"
          :style="{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', overflow: 'hidden' }"
        >
          <div :style="{ ...mono, display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }">
            <span style="font-weight: 600">tool_use</span>
            <span style="color: var(--text-3)">{{ ev.name }}</span>
            <span style="flex: 1" />
            <button class="trace-ghost-btn" @click="rawOpen[i] = !rawOpen[i]">{{ rawOpen[i] ? 'hide json' : 'raw json' }}</button>
          </div>
          <div style="padding: 10px 12px">
            <pre :style="{ ...mono, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-2)' }">{{ rawOpen[i] ? jsonText({ name: ev.name, input: ev.input }) : jsonText(ev.input) }}</pre>
          </div>
        </div>

        <!-- permission -->
        <template v-else-if="ev.role === 'permission'">
          <div
            v-if="isInteractiveRow(i) && !decisionFor(ev, i)"
            :style="{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', ...mono, color: 'var(--text-2)' }"
          >
            <span>{{ ev.text || '允许执行吗？' }} (y/N)</span>
            <button class="trace-pill trace-pill--on" @click="resolve(i, 'allowed')">y · 允许</button>
            <button class="trace-pill" @click="resolve(i, 'denied')">N · 拒绝</button>
          </div>
          <div
            v-else
            :style="{ ...mono, color: decisionFor(ev, i) === 'allowed' ? 'var(--text-2)' : 'var(--danger)' }"
          >
            {{ decisionFor(ev, i) === 'allowed' ? '✓ 已允许' : '✗ 已拒绝' }}<span style="color: var(--text-3)"> · {{ ev.text || '权限确认' }}</span>
          </div>
        </template>

        <!-- tool_result -->
        <pre
          v-else-if="ev.role === 'tool_result'"
          :style="{ ...mono, margin: 0, padding: '10px 12px', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-2)' }"
        ><span v-if="typeof ev.exit === 'number'" :style="{ color: ev.exit === 0 && !ev.isError ? 'var(--text-3)' : 'var(--danger)' }">exit code: {{ ev.exit }}
</span>{{ ev.text }}</pre>

        <!-- error -->
        <div
          v-else-if="ev.role === 'error'"
          :style="{ ...mono, color: 'var(--danger)', border: '1px solid var(--border)', borderLeft: 'var(--border-accent-width) solid var(--danger)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-soft)', padding: '8px 12px' }"
        ><span v-if="ev.code" style="font-weight: 600">{{ ev.code }} </span>{{ ev.text }}</div>

        <!-- retry -->
        <div
          v-else-if="ev.role === 'retry'"
          :style="{ ...mono, color: 'var(--warning)' }"
        >↻ retry {{ ev.attempt }}/{{ ev.max }} · 指数退避 {{ ev.backoff }}</div>

        <!-- compaction -->
        <div
          v-else-if="ev.role === 'compaction'"
          :style="{ ...mono, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-3)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '7px 12px', background: 'var(--bg-soft)' }"
        >context compacted<span v-if="ev.from && ev.to"> · {{ ev.from }} → {{ ev.to }} tokens</span></div>

        <!-- subagent（递归） -->
        <div
          v-else-if="ev.role === 'subagent'"
          :style="{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-alt)', overflow: 'hidden' }"
        >
          <div :style="{ ...mono, display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }">
            <span style="font-weight: 600">sub-agent</span>
            <span style="color: var(--text-3)">{{ ev.task }}</span>
          </div>
          <div style="padding: 12px 12px 2px">
            <TraceList :events="ev.events || []" :animate="false" :interactive="false" :depth="depth + 1" />
          </div>
        </div>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.trace-row {
  display: grid;
  grid-template-columns: 22px 1fr;
  column-gap: 12px;
}
.trace-rail {
  position: relative;
  display: flex;
  justify-content: center;
}
.trace-line {
  position: absolute;
  top: 0;
  bottom: -18px;
  left: 50%;
  width: 1px;
  margin-left: -0.5px;
  background: var(--border);
}
.trace-body {
  padding-bottom: 18px;
  min-width: 0;
}
.trace-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.trace-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.04em;
  color: var(--text-3);
  text-transform: uppercase;
}
.trace-iter {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 1px 8px;
}
.trace-ghost-btn {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.trace-pill {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-2);
}
.trace-pill--on {
  border-color: var(--text-1);
  background: var(--text-1);
  color: var(--bg);
}

/* 入场动画：仅新揭示的行 */
.trace-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.trace-enter-active {
  transition: opacity 0.28s var(--ease), transform 0.28s var(--ease);
}
@media (prefers-reduced-motion: reduce) {
  .trace-enter-from {
    opacity: 1;
    transform: none;
  }
  .trace-enter-active {
    transition: none;
  }
}
</style>
