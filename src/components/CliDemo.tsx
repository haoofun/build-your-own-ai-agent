import { useState, useEffect, useRef } from 'react'

/* ──────────────────────────────────────────────────────────────────────────
 * 首页 hero 的活 demo —— 一条轴上的三层自洽度：
 *   chat（只会答） → ReAct agent（边想边做的循环） → Plan agent（先写计划再执行）
 * 左列是固定的 chat 对照，右列是会真的循环到「✓ 完成」的 agent。
 * 权限只是循环里的一个节点：每种模式都恰好有一个「等你批准」的检查点，
 *   但位置不同 —— ReAct 在动手写之前停一下，Plan 在执行前先让你批准整份计划。
 * ────────────────────────────────────────────────────────────────────────── */

type Mode = 'react' | 'plan'

interface Step {
  type: 'text' | 'tool' | 'result' | 'answer' | 'plan' | 'todo'
  text?: string
  name?: string
  input?: string
  confirmText?: string
  needsConfirm?: boolean
  exit?: number
  items?: string[]
  done?: number
}

interface Scenario {
  prompt: string
  denyAnswer: string
  script: Step[]
}

const SCENARIOS: Record<Mode, Scenario> = {
  react: {
    prompt: "'修复 cart 的 bug，跑 npm test 直到全绿'",
    denyAnswer:
      '已取消。改文件是写操作——没有你的批准，我不会动 src/cart.js。\n想先确认会怎么改？我可以只打印 diff 给你看。',
    script: [
      { type: 'text', text: '轮 1 · 先跑测试，看哪里红了。' },
      {
        type: 'tool', name: 'bash', input: 'command: npm test', exit: 1,
        text: 'FAIL  test/cart.test.js\n  ✕ applyDiscount 减免 25% → 期望 75，实际 25',
      },
      { type: 'text', text: '轮 2 · applyDiscount 把「减免」当成了「保留」。读源码确认。' },
      {
        type: 'tool', name: 'read_file', input: 'path: src/cart.js', exit: 0,
        text: 'export function applyDiscount(total, rate) {\n  return total * rate;   // ← bug',
      },
      { type: 'text', text: '确认了。精确替换那一行——这是写操作，需要你批准。' },
      {
        type: 'tool', name: 'edit_file',
        input: 'path: src/cart.js\n- return total * rate;\n+ return total * (1 - rate);',
        confirmText: 'edit src/cart.js（1 处替换）', needsConfirm: true, exit: 0,
        text: '已写入 src/cart.js（1 处替换）',
      },
      { type: 'text', text: '轮 3 · 改完，再跑一次确认。' },
      {
        type: 'tool', name: 'bash', input: 'command: npm test', exit: 0,
        text: 'PASS  test/cart.test.js\n  ✓ 2 passed, 2 total',
      },
      {
        type: 'answer',
        text: '修好了：total * rate → total * (1 - rate)，npm test 全绿。\n这一圈——跑、看、改、再跑——就是 agent loop。',
      },
    ],
  },
  plan: {
    prompt: "'把 cart 重构成支持多币种'",
    denyAnswer:
      '好，先不动手。计划里哪一步你想改？\n改完计划我再开始执行，一步都不会跳。',
    script: [
      { type: 'text', text: '这个任务较大，先写一份计划，等你批准再动手。' },
      {
        type: 'plan', needsConfirm: true, confirmText: '批准这份计划，开始执行',
        items: ['读 cart.js 摸清现状', '抽出 convert() 货币转换', '改 applyDiscount 支持币种', '更新并跑测试'],
      },
      { type: 'text', text: '计划已批准。按顺序逐步执行——' },
      { type: 'tool', name: 'read_file', input: 'path: src/cart.js', exit: 0, text: 'export function applyDiscount(total, rate) { … }' },
      { type: 'todo', done: 1 },
      { type: 'tool', name: 'edit_file', input: '+ function convert(amount, from, to) { … }', exit: 0, text: '已写入 convert()' },
      { type: 'todo', done: 2 },
      { type: 'tool', name: 'edit_file', input: 'applyDiscount(total, rate, currency)', exit: 0, text: '已更新 applyDiscount 签名' },
      { type: 'todo', done: 3 },
      { type: 'tool', name: 'bash', input: 'command: npm test', exit: 0, text: 'PASS  6 passed, 6 total' },
      { type: 'todo', done: 4 },
      {
        type: 'answer',
        text: '✓ 完成：4/4 步按计划执行，全绿。\n先写计划、再逐步执行，就是 plan 模式——大任务里它比边想边做更不容易跑偏。',
      },
    ],
  },
}

const STEP_MS = 560

interface Line extends Step {
  kind: 'prompt' | 'text' | 'tool' | 'result' | 'denied' | 'answer' | 'plan'
}

export default function CliDemo() {
  const [mode, setMode] = useState<Mode>('react')
  const scn = SCENARIOS[mode]

  const [lines, setLines] = useState<Line[]>([])
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState<Step | null>(null)
  const [planDone, setPlanDone] = useState(0)
  const [done, setDone] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const reset = (m: Mode) => {
    setLines([{ kind: 'prompt', text: SCENARIOS[m].prompt }])
    setStep(0)
    setPending(null)
    setPlanDone(0)
    setDone(false)
  }

  useEffect(() => { reset(mode) }, [mode])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lines, pending, planDone])

  useEffect(() => {
    if (pending || done || step >= scn.script.length) return
    const item = scn.script[step]
    const delay = step === 0 ? 300 : STEP_MS
    const t = setTimeout(() => {
      if (item.type === 'tool') {
        setLines((ls) => [...ls, { kind: 'tool', name: item.name, input: item.input }])
        if (item.needsConfirm) setPending(item)
        else { setLines((ls) => [...ls, { kind: 'result', exit: item.exit, text: item.text }]); setStep((s) => s + 1) }
      } else if (item.type === 'plan') {
        setLines((ls) => [...ls, { kind: 'plan', items: item.items }])
        if (item.needsConfirm) setPending(item)
        else setStep((s) => s + 1)
      } else if (item.type === 'todo') {
        setPlanDone(item.done ?? 0)
        setStep((s) => s + 1)
      } else {
        setLines((ls) => [...ls, { kind: item.type as Line['kind'], text: item.text }])
        if (item.type === 'answer') setDone(true)
        setStep((s) => s + 1)
      }
    }, delay)
    return () => clearTimeout(t)
  }, [step, pending, done, mode])

  const approve = () => {
    const item = scn.script[step]
    if (item.type === 'tool') setLines((ls) => [...ls, { kind: 'result', exit: item.exit, text: item.text }])
    setPending(null)
    setStep((s) => s + 1)
  }

  const deny = () => {
    setLines((ls) => [...ls, { kind: 'denied' }, { kind: 'answer', text: scn.denyAnswer }])
    setPending(null)
    setStep(scn.script.length)
    setDone(true)
  }

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7 }

  const renderLine = (l: Line, i: number) => {
    if (l.kind === 'prompt') return (
      <div key={i} style={{ ...mono, display: 'flex', gap: 8, marginTop: i ? 14 : 0 }}>
        <span style={{ color: 'var(--text-3)' }}>➜</span>
        <span style={{ color: 'var(--text-3)' }}>spike</span>
        <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{l.text}</span>
      </div>
    )
    if (l.kind === 'text') return (
      <div key={i} style={{ ...mono, color: 'var(--text-2)', marginTop: 8 }}>{l.text}</div>
    )
    if (l.kind === 'tool') return (
      <div key={i} style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 11px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
          <span style={{ fontWeight: 600 }}>工具请求</span>
          <span style={{ color: 'var(--text-3)' }}>{l.name}</span>
        </div>
        <pre style={{ ...mono, margin: 0, padding: '9px 11px', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{l.input}</pre>
      </div>
    )
    if (l.kind === 'result') return (
      <pre key={i} style={{ ...mono, margin: '8px 0 0', padding: '9px 11px', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
        <span style={{ color: l.exit === 0 ? 'var(--text-3)' : 'var(--danger)' }}>exit code: {l.exit}</span>{'\n'}{l.text}
      </pre>
    )
    if (l.kind === 'plan') return (
      <div key={i} style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 11px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
          <span style={{ fontWeight: 600 }}>TodoWrite</span>
          <span style={{ color: 'var(--text-3)' }}>计划 · {Math.min(planDone, l.items?.length ?? 0)}/{l.items?.length ?? 0}</span>
        </div>
        <div style={{ padding: '8px 11px' }}>
          {l.items?.map((it, k) => {
            const checked = k < planDone
            return (
              <div key={k} style={{ ...mono, color: checked ? 'var(--text-3)' : 'var(--text-2)', display: 'flex', gap: 7, marginTop: k ? 3 : 0 }}>
                <span style={{ color: checked ? 'var(--text-2)' : 'var(--text-3)' }}>{checked ? '☑' : '☐'}</span>
                <span style={{ textDecoration: checked ? 'line-through' : 'none' }}>{it}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
    if (l.kind === 'denied') return (
      <div key={i} style={{ ...mono, color: 'var(--danger)', marginTop: 8 }}>✗ 已拒绝执行</div>
    )
    if (l.kind === 'answer') return (
      <div key={i} style={{ ...mono, color: 'var(--text-1)', marginTop: 10, padding: '8px 10px', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>{l.text}</div>
    )
    return null
  }

  const modeBtn = (m: Mode, label: string, sub: string): React.CSSProperties => {
    const active = m === mode
    return {
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', cursor: 'pointer',
      padding: '5px 11px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
      border: `1px solid ${active ? 'var(--text-1)' : 'var(--border)'}`,
      background: active ? 'var(--text-1)' : 'transparent',
      color: active ? 'var(--bg)' : 'var(--text-2)',
      display: 'inline-flex', alignItems: 'center', gap: 5,
      transition: 'all 0.18s var(--ease)',
    }
  }

  const btnStyle = (primary: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', cursor: 'pointer',
    padding: '4px 11px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
    border: `1px solid ${primary ? 'var(--text-1)' : 'var(--border)'}`,
    background: primary ? 'var(--text-1)' : 'transparent',
    color: primary ? 'var(--bg)' : 'var(--text-2)',
  })

  return (
    <div className="hd-root">
      <style>{`
        .hd-root { max-width: 720px; margin: 0 auto; }
        .hd-pivot { display: flex; align-items: center; gap: 12px; margin: 18px 2px; }
        .hd-pivot-rule { flex: 1; height: 1px; background: var(--border); }
        .hd-pivot-text { font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-3); white-space: nowrap; }
        .hd-pivot-text b { color: var(--text-1); font-weight: 500; }
        @keyframes hd-pulse { 0%, 100% { border-color: var(--border-strong); } 50% { border-color: var(--text-2); } }
        .hd-pending { animation: hd-pulse 1.5s var(--ease) infinite; }
        @media (prefers-reduced-motion: reduce) { .hd-pending { animation: none; } }
      `}</style>

      {/* ── chat（before：熟悉的聊天，做不了事）──────────────────── */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-alt)', padding: '13px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 11 }}>
          <span style={{ ...mono, fontSize: 'var(--text-2xs)', color: 'var(--text-3)' }}>chat · 一问一答</span>
          <span style={{ ...mono, fontSize: 'var(--text-2xs)', color: 'var(--text-3)' }}>多数工具止步于此</span>
        </div>
        <div style={{ marginLeft: 'auto', width: 'fit-content', maxWidth: '78%', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-1)', background: 'var(--bg-soft)', borderRadius: '10px 10px 2px 10px', padding: '7px 11px' }}>
          修复 cart 的 bug
        </div>
        <div style={{ maxWidth: '86%', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)', marginTop: 9 }}>
          大概是 applyDiscount 把 rate 用反了，你可以试着改成 <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>1 - rate</span>……
        </div>
        <div style={{ marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--border)', ...mono, fontSize: 'var(--text-2xs)', color: 'var(--text-3)', lineHeight: 1.6 }}>
          <span style={{ color: 'var(--danger)' }}>✕</span> 它只会说，不会动手——跑不了测试，给不了你绿色。对话到此结束。
        </div>
      </div>

      {/* ── pivot：同一个模型，多了一个循环 ──────────────────────── */}
      <div className="hd-pivot">
        <span className="hd-pivot-rule" />
        <span className="hd-pivot-text">↓ 换成 <b>agent</b>：同一个模型，多了一个<b>循环</b> ↓</span>
        <span className="hd-pivot-rule" />
      </div>

      {/* ── agent（after：会循环到完成）──────────────────────────── */}
      <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, flexWrap: 'wrap' }}>
            <span style={{ ...mono, fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginRight: 1 }}>agent ›</span>
            <button onClick={() => setMode('react')} style={modeBtn('react', '', '')}>ReAct · 边想边做</button>
            <button onClick={() => setMode('plan')} style={modeBtn('plan', '', '')}>Plan · 先计划后执行</button>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border-strong)', display: 'block' }} />)}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginLeft: 6 }}>
                npx tsx cli.ts — your-own-agent
              </span>
            </div>

            <div ref={scrollRef} style={{ padding: 14, height: 332, overflowY: 'auto' }}>
              {lines.map(renderLine)}

              {pending && (
                <div className="hd-pending" style={{ marginTop: 13, padding: 11, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--bg-alt)' }}>
                  <div style={{ ...mono, fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginBottom: 7 }}>
                    {pending.type === 'plan' ? '执行前 — 需要你批准这份计划' : '需要批准才能继续'}
                  </div>
                  <div style={{ ...mono, color: 'var(--text-1)', marginBottom: 10 }}>
                    <span style={{ color: 'var(--text-3)' }}>{pending.type === 'plan' ? 'plan ›' : `${pending.name} ›`}</span> {pending.confirmText || pending.input}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ ...mono, color: 'var(--text-2)' }}>允许吗？(y/N)</span>
                    <button onClick={approve} style={btnStyle(true)}>y · 允许</button>
                    <button onClick={deny} style={btnStyle(false)}>N · 拒绝</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
            <p style={{ ...mono, fontSize: 'var(--text-2xs)', color: 'var(--text-3)', margin: 0, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-2)' }}>决定</span>→<span style={{ color: 'var(--text-2)' }}>执行</span>→<span style={{ color: 'var(--text-2)' }}>观察</span>
              <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>↺ 直到 ✓ 完成</span>
            </p>
            {done && (
              <button onClick={() => reset(mode)} style={{ ...btnStyle(false), display: 'inline-flex', alignItems: 'center', gap: 6 }}>↺ 重新运行</button>
            )}
          </div>
        </div>
      </div>
  )
}
