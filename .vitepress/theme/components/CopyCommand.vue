<script setup>
// CopyCommand —— 点击即复制的命令条。浅面板、等宽、靠边框，复制按钮是唯一交互，
// 成功后翻成对勾。可选多 tab（一个动作有多种安装写法时）。
// 品牌规则：无色相（「已复制」态保持墨黑而非绿色）、无阴影抬升、单色。
// 剪贴板用异步 API，非安全上下文回退到 execCommand。
import { ref, computed, watch } from 'vue'

const props = defineProps({
  command: { type: String, default: '' },
  tabs: { type: Array, default: null },
  prefix: { type: String, default: '$' },
  label: { type: String, default: '' },
  multiline: { type: Boolean, default: false },
})

const list = computed(() =>
  props.tabs && props.tabs.length ? props.tabs : [{ label: null, command: props.command }],
)
const active = ref(0)
const copied = ref(false)
const cur = computed(() => list.value[Math.min(active.value, list.value.length - 1)])
const text = computed(() => cur.value.command || '')

watch(active, () => { copied.value = false })

async function copy() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text.value)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text.value
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch (e) {
    /* 剪贴板被拦截 —— 静默 */
  }
}
</script>

<template>
  <div class="copy-cmd">
    <div v-if="label" class="copy-cmd__label">{{ label }}</div>

    <div v-if="list.length > 1" class="copy-cmd__tabs">
      <button
        v-for="(t, i) in list"
        :key="i"
        class="copy-cmd__tab"
        :class="{ 'is-active': i === active }"
        @click="active = i"
      >{{ t.label || `选项 ${i + 1}` }}</button>
    </div>

    <div
      class="copy-cmd__bar"
      :class="{ 'is-multiline': multiline, 'has-tabs': list.length > 1 }"
    >
      <code class="copy-cmd__code" :class="{ 'is-multiline': multiline }">
        <span v-if="prefix && !multiline" class="copy-cmd__prefix">{{ prefix }}</span>{{ text }}
      </code>
      <button
        class="copy-cmd__btn"
        :class="{ 'is-copied': copied }"
        :aria-label="copied ? '已复制' : '复制'"
        @click="copy"
      >
        <svg v-if="!copied" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 2.5H3a1.5 1.5 0 0 0-1.5 1.5v7.5" />
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M3 8.5l3.2 3.2L13 4.8" />
        </svg>
        {{ copied ? '已复制' : '复制' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.copy-cmd__label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.04em;
  color: var(--text-3);
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}
.copy-cmd__tabs {
  display: flex;
  gap: 2px;
  margin-bottom: -1px;
  position: relative;
  z-index: 1;
}
.copy-cmd__tab {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  border-top-left-radius: var(--radius-sm);
  border-top-right-radius: var(--radius-sm);
  background: var(--bg-soft);
  color: var(--text-3);
}
.copy-cmd__tab.is-active {
  cursor: default;
  border-bottom-color: var(--bg);
  background: var(--bg);
  color: var(--text-1);
}
.copy-cmd__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  padding: 10px 10px 10px 14px;
}
.copy-cmd__bar.has-tabs {
  border-radius: 0 var(--radius-md) var(--radius-md) var(--radius-md);
}
.copy-cmd__bar.is-multiline {
  align-items: flex-start;
  padding: 12px 12px 12px 14px;
}
.copy-cmd__code {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-1);
  white-space: nowrap;
  overflow-x: auto;
}
.copy-cmd__code.is-multiline {
  white-space: pre-wrap;
  overflow-x: visible;
  word-break: break-word;
}
.copy-cmd__prefix {
  color: var(--text-3);
  user-select: none;
  margin-right: 8px;
}
.copy-cmd__btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-2);
  transition: background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
}
.copy-cmd__btn.is-copied {
  border-color: var(--text-1);
  background: var(--text-1);
  color: var(--bg);
}
.copy-cmd__btn svg {
  display: block;
}
</style>
