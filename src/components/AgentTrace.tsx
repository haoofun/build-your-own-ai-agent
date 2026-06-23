/* ──────────────────────────────────────────────────────────────────────────
 * AgentTrace —— 全书的招牌可视化：一条真实的 agent 执行链，逐步回放。
 * 正文教学孤岛（每章一个，展示本章新增的那一圈 loop）。每个事件都标注角色
 * （user / assistant / tool_use / tool_result / permission …），让「谁发的、
 * 模型走到循环第几步」一眼可读。播放 / 上一步 / 下一步 / 重置 + 键盘 ←→/空格/R，
 * 尊重 prefers-reduced-motion。无 JS / 电子书路径降级为 StaticIsland（全展开）。
 * 对齐设计系统 components/trace/AgentTrace.jsx。
 * ────────────────────────────────────────────────────────────────────────── */
import { useState, useEffect, useMemo, useRef } from 'react'
import { TraceList, IslandHeader, type IslandEvent } from './islandShared'

interface Props {
  events?: IslandEvent[]
  title?: string
  subtitle?: string
  autoPlay?: boolean
  speed?: number
  interactive?: boolean
  height?: number
}

function ctrlBtn(primary: boolean, disabled?: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
    padding: '5px 11px', borderRadius: 'var(--radius-sm)',
    border: '1px solid ' + (primary ? 'var(--text-1)' : 'var(--border-strong)'),
    background: primary ? 'var(--text-1)' : 'transparent',
    color: primary ? 'var(--bg)' : 'var(--text-2)',
  }
}

export default function AgentTrace({
  events = DEFAULT_EVENTS,
  title = 'agent loop',
  subtitle = 'npx tsx cli.ts',
  autoPlay = true,
  speed = 1100,
  interactive = false,
  height = 420,
}: Props) {
  const reduced = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const total = events.length
  const [revealed, setRevealed] = useState(reduced ? total : 1)
  const [playing, setPlaying] = useState(autoPlay && !reduced)
  const [decisions, setDecisions] = useState<Record<number, string>>({})

  const done = revealed >= total
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [revealed, decisions, reduced])

  useEffect(() => {
    if (!playing || done) return
    const t = setTimeout(() => setRevealed((r) => Math.min(total, r + 1)), speed)
    return () => clearTimeout(t)
  }, [playing, revealed, done, speed, total])

  useEffect(() => { if (done) setPlaying(false) }, [done])

  const reset = () => { setRevealed(reduced ? total : 1); setDecisions({}); setPlaying(autoPlay && !reduced) }
  const step = (d: number) => { setPlaying(false); setRevealed((r) => Math.max(1, Math.min(total, r + d))) }
  const toggle = () => { if (done) reset(); else setPlaying((p) => !p) }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    else if (e.key === ' ') { e.preventDefault(); toggle() }
    else if (e.key.toLowerCase() === 'r') { e.preventDefault(); reset() }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={onKey}
      style={{
        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
        background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
        fontFamily: 'var(--font-sans)', outline: 'none',
      }}
    >
      <IslandHeader title={title} subtitle={subtitle} />

      <div ref={scrollRef} style={{ height: height + 'px', overflowY: 'auto', padding: '18px 18px 4px' }}>
        <TraceList
          events={events}
          revealed={revealed}
          animate={!reduced}
          interactive={interactive}
          decisions={decisions}
          onResolve={(i, d) => { setDecisions((s) => ({ ...s, [i]: d })); if (revealed < total) setPlaying(autoPlay && !reduced) }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
        <button onClick={toggle} style={ctrlBtn(true)}>{done ? '↻ 重放' : playing ? '❙❙ 暂停' : '▶ 播放'}</button>
        <button onClick={() => step(-1)} disabled={revealed <= 1} style={ctrlBtn(false, revealed <= 1)}>← 上一步</button>
        <button onClick={() => step(1)} disabled={done} style={ctrlBtn(false, done)}>下一步 →</button>
        <button onClick={reset} style={ctrlBtn(false)}>重置</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-3)' }}>{Math.min(revealed, total)} / {total}</span>
        <div style={{ width: '84px', height: 3, borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${(Math.min(revealed, total) / total) * 100}%`, height: '100%', background: 'var(--text-1)', transition: 'width .3s var(--ease, ease)' }} />
        </div>
      </div>
    </div>
  )
}

// 默认演示：ch05 里程碑——修一个失败的测试（跑→看→改→再跑）
const DEFAULT_EVENTS: IslandEvent[] = [
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

export { DEFAULT_EVENTS as AGENT_TRACE_DEMO }
