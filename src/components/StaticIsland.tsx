/* ──────────────────────────────────────────────────────────────────────────
 * StaticIsland —— 正文教学孤岛的静态基座（继承链：StaticIsland ⊂ AgentTrace ⊂ hero）。
 * 纯静态渲染：不需要 client 指令，构建期出 HTML，文本可选中、可重排，
 * 也是电子书端的降级形态（无 JS 时它就是最终形态）。
 * 阶段 2 会在此基础上加「逐步展开」做成交互版 AgentTrace。
 * ────────────────────────────────────────────────────────────────────────── */

interface Step {
  kind: 'prompt' | 'text' | 'tool' | 'result' | 'answer'
  text?: string
  name?: string
  input?: string
  exit?: number
}

interface Props {
  title?: string
  caption?: string
  steps?: Step[]
}

const DEFAULT_STEPS: Step[] = [
  { kind: 'prompt', text: "'读 config.ts，MAX_RETRIES 上限是多少？'" },
  { kind: 'text', text: '只读问答，我读一下 config.ts。' },
  { kind: 'tool', name: 'read_file', input: 'path: src/config.ts', exit: 0,
    text: '// hard-capped at 7 — broker drops messages on the 8th attempt\nexport const MAX_RETRIES = 7;' },
  { kind: 'answer', text: '上限是 7。再高会触发 broker 在第 8 次投递时丢消息——注释有据可查。' },
]

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.7 }

export default function StaticIsland({ title = 'npx tsx cli.ts — your-own-agent', caption, steps = DEFAULT_STEPS }: Props) {
  return (
    <div className="island" role="figure" aria-label={caption || '终端会话示例'}>
      <div className="island-bar">
        <span className="island-dots" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
        <span className="island-name">{title}</span>
      </div>

      <div className="island-body">
        {steps.map((s, i) => {
          if (s.kind === 'prompt') return (
            <div key={i} style={{ ...mono, display: 'flex', gap: 8, marginTop: i ? 14 : 0 }}>
              <span style={{ color: 'var(--text-3)' }}>➜</span>
              <span style={{ color: 'var(--text-3)' }}>spike</span>
              <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{s.text}</span>
            </div>
          )
          if (s.kind === 'text') return (
            <div key={i} style={{ ...mono, color: 'var(--text-2)', marginTop: 8 }}>{s.text}</div>
          )
          if (s.kind === 'tool') return (
            <div key={i} style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', overflow: 'hidden' }}>
              <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 11px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
                <span style={{ fontWeight: 600 }}>工具请求</span>
                <span style={{ color: 'var(--text-3)' }}>{s.name}</span>
              </div>
              <pre style={{ ...mono, margin: 0, padding: '9px 11px', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{s.input}</pre>
              {s.text && (
                <pre style={{ ...mono, margin: 0, padding: '9px 11px', background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
                  <span style={{ color: s.exit === 0 ? 'var(--text-3)' : 'var(--danger)' }}>exit code: {s.exit ?? 0}</span>{'\n'}{s.text}
                </pre>
              )}
            </div>
          )
          if (s.kind === 'result') return (
            <pre key={i} style={{ ...mono, margin: '8px 0 0', padding: '9px 11px', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
              <span style={{ color: s.exit === 0 ? 'var(--text-3)' : 'var(--danger)' }}>exit code: {s.exit ?? 0}</span>{'\n'}{s.text}
            </pre>
          )
          if (s.kind === 'answer') return (
            <div key={i} style={{ ...mono, color: 'var(--text-1)', marginTop: 10, padding: '8px 10px', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>{s.text}</div>
          )
          return null
        })}
      </div>

      {caption && <div className="island-caption">{caption}</div>}
    </div>
  )
}
