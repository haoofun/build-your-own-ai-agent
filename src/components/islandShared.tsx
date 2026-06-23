/* ──────────────────────────────────────────────────────────────────────────
 * 教学孤岛共享引擎（继承链 StaticIsland ⊂ AgentTrace 的公共部分）。
 * 一条带节点的时间线：每个事件标注角色（user / assistant / tool_use /
 * tool_result / permission / error / retry / compaction / subagent），
 * 让「谁发出的消息、模型在循环的哪一步」一眼可读。
 *   StaticIsland = 全展开、静态（无 JS / 电子书降级形态）
 *   AgentTrace   = 同一条链 + 播放/单步/重置（正文教学）
 * 二者共用 TraceList，保证两种形态逐像素一致。
 * 视觉对齐设计系统 components/trace/AgentTrace.jsx。
 * ────────────────────────────────────────────────────────────────────────── */
import { useState, useEffect, type ReactNode } from 'react'

export interface IslandEvent {
  role: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'permission' | 'error' | 'retry' | 'compaction' | 'subagent'
  text?: string
  name?: string
  input?: unknown
  exit?: number
  isError?: boolean
  final?: boolean
  decision?: 'allowed' | 'denied'
  code?: string
  attempt?: number
  max?: number
  backoff?: string
  from?: string
  to?: string
  task?: string
  events?: IslandEvent[]
}

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.65 }

const LABELS: Record<string, string> = {
  user: 'user', assistant: 'assistant', tool_use: 'tool_use',
  tool_result: 'tool_result', permission: 'permission', error: 'error',
  retry: 'retry', compaction: 'compaction', subagent: 'task',
}

interface Dot { fill?: string; border?: string; ring?: boolean; dashed?: boolean }

function dotFor(ev: IslandEvent): Dot {
  switch (ev.role) {
    case 'user': return { fill: 'var(--text-1)' }
    case 'assistant': return ev.final ? { fill: 'var(--text-1)', ring: true } : { fill: 'var(--bg)', border: '1.5px solid var(--text-3)' }
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

// 循环计数：模型在一次 tool_result 之后被重新调用，就开始新的一轮
function withIterations(events: IslandEvent[]): (IslandEvent & { _iter: number | null })[] {
  let iter = 0, sawResult = false, first = true
  return events.map((ev) => {
    let badge: number | null = null
    if (ev.role === 'assistant') {
      if (first || sawResult) { iter += 1; badge = iter; sawResult = false; first = false }
    }
    if (ev.role === 'tool_result') sawResult = true
    return { ...ev, _iter: badge }
  })
}

function TraceRow({ children, animate, dot, label, iteration, isLast }: {
  children: ReactNode; animate: boolean; dot: Dot; label?: string; iteration?: number | null; isLast: boolean
}) {
  const [shown, setShown] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [animate])

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '22px 1fr', columnGap: '12px',
      opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(5px)',
      transition: 'opacity .28s var(--ease, ease), transform .28s var(--ease, ease)',
    }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {!isLast && (
          <span style={{ position: 'absolute', top: 0, bottom: '-18px', left: '50%', width: 1, marginLeft: '-0.5px', background: 'var(--border)' }} />
        )}
        <span style={{
          position: 'relative', marginTop: '5px',
          width: dot.ring ? 11 : 9, height: dot.ring ? 11 : 9, borderRadius: '50%', boxSizing: 'border-box',
          background: dot.fill, border: dot.border || 'none',
          ...(dot.dashed ? { background: 'var(--bg)', border: '1px dashed var(--text-3)' } : {}),
        }} />
      </div>

      <div style={{ paddingBottom: '18px', minWidth: 0 }}>
        {(label || iteration) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            {label && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: 'var(--text-3)', textTransform: 'uppercase' }}>{label}</span>
            )}
            {iteration && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '1px 8px' }}>loop · {iteration}</span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function Json({ value }: { value: unknown }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return <pre style={{ ...mono, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-2)' }}>{text}</pre>
}

const ghostBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-3)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
}
function pillBtn(primary: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', cursor: 'pointer',
    padding: '4px 10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid ' + (primary ? 'var(--text-1)' : 'var(--border-strong)'),
    background: primary ? 'var(--text-1)' : 'transparent', color: primary ? 'var(--bg)' : 'var(--text-2)',
  }
}

function EventBody({ ev, interactive, onResolve, decision }: {
  ev: IslandEvent; interactive: boolean; onResolve: (d: string) => void; decision?: string; depth: number
}) {
  const [rawOpen, setRawOpen] = useState(false)

  switch (ev.role) {
    case 'user':
      return <div style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)', color: 'var(--text-1)', fontWeight: 500 }}>{ev.text}</div>

    case 'assistant':
      return (
        <div style={{
          fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)', color: 'var(--text-2)',
          ...(ev.final ? { color: 'var(--text-1)', borderLeft: 'var(--border-accent-width) solid var(--text-1)', paddingLeft: '10px' } : {}),
        }}>{ev.text}</div>
      )

    case 'tool_use':
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', overflow: 'hidden' }}>
          <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
            <span style={{ fontWeight: 600 }}>tool_use</span>
            <span style={{ color: 'var(--text-3)' }}>{ev.name}</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => setRawOpen(o => !o)} style={ghostBtn}>{rawOpen ? 'hide json' : 'raw json'}</button>
          </div>
          <div style={{ padding: '10px 12px' }}>
            <Json value={rawOpen ? { name: ev.name, input: ev.input } : ev.input} />
          </div>
        </div>
      )

    case 'permission': {
      const resolved = ev.decision || decision
      if (interactive && !resolved) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', ...mono, color: 'var(--text-2)' }}>
            <span>{ev.text || '允许执行吗？'} (y/N)</span>
            <button onClick={() => onResolve('allowed')} style={pillBtn(true)}>y · 允许</button>
            <button onClick={() => onResolve('denied')} style={pillBtn(false)}>N · 拒绝</button>
          </div>
        )
      }
      const allowed = resolved === 'allowed'
      return (
        <div style={{ ...mono, color: allowed ? 'var(--text-2)' : 'var(--danger)' }}>
          {allowed ? '✓ 已允许' : '✗ 已拒绝'}<span style={{ color: 'var(--text-3)' }}> · {ev.text || '权限确认'}</span>
        </div>
      )
    }

    case 'tool_result':
      return (
        <pre style={{ ...mono, margin: 0, padding: '10px 12px', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-2)' }}>
          {typeof ev.exit === 'number' && (
            <span style={{ color: ev.exit === 0 && !ev.isError ? 'var(--text-3)' : 'var(--danger)' }}>exit code: {ev.exit}{'\n'}</span>
          )}
          {ev.text}
        </pre>
      )

    case 'error':
      return (
        <div style={{ ...mono, color: 'var(--danger)', border: '1px solid var(--border)', borderLeft: 'var(--border-accent-width) solid var(--danger)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-soft)', padding: '8px 12px' }}>
          {ev.code ? <span style={{ fontWeight: 600 }}>{ev.code} </span> : null}{ev.text}
        </div>
      )

    case 'retry':
      return <div style={{ ...mono, color: 'var(--warning)' }}>↻ retry {ev.attempt}/{ev.max} · 指数退避 {ev.backoff}</div>

    case 'compaction':
      return (
        <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-3)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '7px 12px', background: 'var(--bg-soft)' }}>
          context compacted{ev.from && ev.to ? <span> · {ev.from} → {ev.to} tokens</span> : null}
        </div>
      )

    case 'subagent':
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-alt)', overflow: 'hidden' }}>
          <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
            <span style={{ fontWeight: 600 }}>sub-agent</span>
            <span style={{ color: 'var(--text-3)' }}>{ev.task}</span>
          </div>
          <div style={{ padding: '12px 12px 2px' }}>
            <TraceList events={ev.events || []} animate={false} interactive={false} depth={1} />
          </div>
        </div>
      )

    default:
      return null
  }
}

export function TraceList({ events, revealed, animate, interactive, decisions, onResolve, depth = 0 }: {
  events: IslandEvent[]; revealed?: number | null; animate: boolean; interactive: boolean
  decisions?: Record<number, string>; onResolve?: (i: number, d: string) => void; depth?: number
}) {
  const list = withIterations(events)
  const count = revealed == null ? list.length : revealed
  return (
    <div>
      {list.slice(0, count).map((ev, i) => (
        <TraceRow
          key={i}
          animate={animate}
          dot={dotFor(ev)}
          label={LABELS[ev.role]}
          iteration={ev.role === 'assistant' ? ev._iter : null}
          isLast={i === count - 1}
        >
          <EventBody
            ev={ev}
            decision={decisions ? decisions[i] : undefined}
            interactive={interactive && (revealed == null || i === count - 1)}
            onResolve={(d) => onResolve && onResolve(i, d)}
            depth={depth}
          />
        </TraceRow>
      ))}
    </div>
  )
}

export function IslandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border-strong)' }} />)}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-1)', fontWeight: 600, marginLeft: '4px' }}>{title}</span>
      {subtitle && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-3)' }}>{subtitle}</span>}
    </div>
  )
}
