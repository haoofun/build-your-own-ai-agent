/* ──────────────────────────────────────────────────────────────────────────
 * StaticIsland —— AgentTrace 的静态降级形态（继承链：StaticIsland ⊂ AgentTrace）。
 * 同一条执行链，全展开、无控件、无动画——纯静态渲染，无需 client 指令，
 * 构建期出 HTML，文本可选中、可重排。这是无 JS / 电子书路径的最终形态。
 * ────────────────────────────────────────────────────────────────────────── */
import { TraceList, IslandHeader, type IslandEvent } from './islandShared'
import { AGENT_TRACE_DEMO } from './AgentTrace'

interface Props {
  events?: IslandEvent[]
  title?: string
  subtitle?: string
  caption?: string
}

export default function StaticIsland({ events = AGENT_TRACE_DEMO, title = 'agent loop', subtitle = 'npx tsx cli.ts', caption }: Props) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>
      <IslandHeader title={title} subtitle={subtitle} />
      <div style={{ padding: '18px 18px 4px' }}>
        <TraceList events={events} revealed={null} animate={false} interactive={false} />
      </div>
      {caption && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-3)', lineHeight: 1.6 }}>
          {caption}
        </div>
      )}
    </div>
  )
}
