import { useState, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// 克制的 ease-out 入场（无回弹、无弹性）——工程文档气质，不是营销弹跳
const EASE_OUT = [0.22, 1, 0.36, 1] as const

/* ──────────────────────────────────────────────────────────────────────────
 * 首页 hero 的活 demo —— 同一个问题，两种世界（左文右器，按钮切换）：
 *   左列：固定的框架文案 + Chat ⇄ Agent 分段开关 + 随选项变化的讲解。
 *   右列：一台会变形的「设备」——
 *     · Chat  → 一台仿真的聊天 app（气泡 + 输入框 + 明确的「死胡同」）：
 *               读得懂问题、给得出建议，却改不动文件、跑不了测试，对话到此为止。
 *     · Agent → 一台仿真的 CLI（浅灰面、非深色终端）：同一个模型多包一层循环，
 *               真的去跑测试、读源码、改那一行、再跑一遍，直到 ✓ 完成。
 * 权限只是循环里的一个节点：ReAct 在动手写之前停一下，Plan 在执行前先批整份计划。
 * ────────────────────────────────────────────────────────────────────────── */

type View = 'chat' | 'agent'
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

// 两侧问的是同一句话 —— chat 与 agent 的分水岭就在这句之后
const SHARED_PROMPT = '修复 cart 的 bug，跑 npm test 直到全绿'

// chat 侧：读得懂、答得出，却动不了手
const CHAT_REPLY =
  '看报错，applyDiscount 多半把 rate 用反了——total * rate 实际应该是 total * (1 - rate)。\n你把那一行改掉，再跑一次 npm test，应该就绿了。'
const CHAT_DEADEND = '到此为止 —— 它给得出建议，却改不动文件、也跑不了那次测试。活还得你自己干。'

const CHAT_COPY =
  'chat 读得懂问题，甚至猜得到 bug 就在 applyDiscount。但它改不动那一行、跑不了那次测试——建议给到，活还得你自己干。这是今天多数人用的 AI。'
const AGENT_COPY =
  'agent 是同一个模型，外面多包一层循环：它真的去跑测试、读源码、改那一行、再跑一遍。看到红，就再来一轮，直到全绿。这本书，就教你从零写出这层循环。'

const SCENARIOS: Record<Mode, Scenario> = {
  react: {
    prompt: `'${SHARED_PROMPT}'`,
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

const STEP_MS = 480       // 一步与下一步之间的「思考」间隔

// 模拟真实流式：token 成簇到达、节奏不均、偶有网络/批处理停顿。
// 每拍随机吐 1–3 字；约 1/7 的概率撞上一次 140–360ms 的停顿，其余 18–52ms。
function streamTick() {
  const chars = 1 + Math.floor(Math.random() * 3)
  const stall = Math.random() < 0.14
  const delay = stall ? 140 + Math.random() * 220 : 18 + Math.random() * 34
  return { chars, delay }
}

// 只有模型「生成」的文本会流式；工具输入 / 结果是结构化 I/O，瞬间打印
const STREAMS = (t?: Step['type']) => t === 'text' || t === 'answer'

interface Line extends Step {
  kind: 'prompt' | 'text' | 'tool' | 'result' | 'denied' | 'answer' | 'plan'
  streaming?: boolean
}

export default function CliDemo() {
  const reduce = useReducedMotion()
  const [view, setView] = useState<View>('chat')
  const [mode, setMode] = useState<Mode>('react')
  const scn = SCENARIOS[mode]

  // ── agent 引擎状态 ───────────────────────────────────────────────
  const [lines, setLines] = useState<Line[]>([])
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState<Step | null>(null)
  const [planDone, setPlanDone] = useState(0)
  const [done, setDone] = useState(false)
  const [typed, setTyped] = useState(0) // 当前流式行已显示的字数
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── chat 仿真状态 ────────────────────────────────────────────────
  const [chatPhase, setChatPhase] = useState<'thinking' | 'typing'>('thinking')
  const [chatTyped, setChatTyped] = useState(0)

  const reset = (m: Mode) => {
    setLines([{ kind: 'prompt', text: SCENARIOS[m].prompt }])
    setStep(0)
    setPending(null)
    setPlanDone(0)
    setDone(false)
    setTyped(0)
  }

  // 进入 agent（或切换 ReAct/Plan）→ 从头跑这段 transcript
  useEffect(() => { if (view === 'agent') reset(mode) }, [mode, view])

  // 进入 chat → 先「思考」一下，再逐字吐出回复（reduced-motion 直接落定）
  useEffect(() => {
    if (view !== 'chat') return
    setChatTyped(0)
    if (reduce) { setChatPhase('typing'); setChatTyped(CHAT_REPLY.length); return }
    setChatPhase('thinking')
    const t = setTimeout(() => setChatPhase('typing'), 620)
    return () => clearTimeout(t)
  }, [view, reduce])

  useEffect(() => {
    if (view !== 'chat' || chatPhase !== 'typing' || reduce) return
    if (chatTyped >= CHAT_REPLY.length) return
    const { chars, delay } = streamTick()
    const t = setTimeout(() => setChatTyped((n) => Math.min(n + chars, CHAT_REPLY.length)), delay)
    return () => clearTimeout(t)
  }, [view, chatPhase, chatTyped, reduce])
  const chatDone = chatPhase === 'typing' && chatTyped >= CHAT_REPLY.length

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lines, pending, planDone, typed])

  // agent 驱动器：逐步推进脚本
  useEffect(() => {
    if (view !== 'agent' || pending || done || step >= scn.script.length) return
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
      } else if (STREAMS(item.type) && !reduce) {
        // assistant 文本 → 流式逐字；推进交给打字 effect，打完才走下一步
        setTyped(0)
        setLines((ls) => [...ls, { kind: item.type as Line['kind'], text: item.text, streaming: true }])
      } else {
        setLines((ls) => [...ls, { kind: item.type as Line['kind'], text: item.text }])
        if (item.type === 'answer') setDone(true)
        setStep((s) => s + 1)
      }
    }, delay)
    return () => clearTimeout(t)
  }, [step, pending, done, mode, view])

  // 流式打字：找到当前 streaming 行，逐块吐字，吐完落定并推进
  useEffect(() => {
    if (view !== 'agent') return
    const idx = lines.findIndex((l) => l.streaming)
    if (idx === -1) return
    const full = lines[idx].text ?? ''
    if (typed >= full.length) {
      setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, streaming: false } : l)))
      if (lines[idx].kind === 'answer') setDone(true)
      setStep((s) => s + 1)
      return
    }
    const { chars, delay } = streamTick()
    const t = setTimeout(() => setTyped((n) => n + chars), delay)
    return () => clearTimeout(t)
  }, [lines, typed, view])

  const approve = () => {
    const item = scn.script[step]
    if (item.type === 'tool') setLines((ls) => [...ls, { kind: 'result', exit: item.exit, text: item.text }])
    setPending(null)
    setStep((s) => s + 1)
  }

  const deny = () => {
    setTyped(0)
    setLines((ls) => [...ls, { kind: 'denied' }, { kind: 'answer', text: scn.denyAnswer, streaming: !reduce }])
    setPending(null)
    setStep(scn.script.length)
    if (reduce) setDone(true) // 非 reduce 时由打字 effect 完成后落定
  }

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7 }

  // 流式行只显示已吐出的部分，行尾骑一个闪烁光标
  const shown = (l: Line) => (l.streaming ? (l.text ?? '').slice(0, typed) : (l.text ?? ''))
  const caret = <span className="hd-caret" style={{ marginLeft: 1 }}>▊</span>

  const renderLine = (l: Line, i: number) => {
    if (l.kind === 'prompt') return (
      <div key={i} style={{ ...mono, display: 'flex', gap: 8, marginTop: i ? 14 : 0 }}>
        <span style={{ color: 'var(--text-3)' }}>➜</span>
        <span style={{ color: 'var(--text-3)' }}>spike</span>
        <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{l.text}</span>
      </div>
    )
    if (l.kind === 'text') return (
      <div key={i} style={{ ...mono, color: 'var(--text-2)', marginTop: 8 }}>{shown(l)}{l.streaming && caret}</div>
    )
    if (l.kind === 'tool') return (
      // 模型「发出」的调用 —— → 方向 + 右侧 agent 标，与下方的返回成对
      <div key={i} style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
          <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>→</span>
          <span style={{ fontWeight: 600 }}>调用工具</span>
          <span style={{ color: 'var(--text-3)' }}>{l.name}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 'var(--text-2xs)' }}>agent 发出</span>
        </div>
        <pre style={{ ...mono, margin: 0, padding: '9px 11px', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{l.input}</pre>
      </div>
    )
    if (l.kind === 'result') {
      // 环境「返回」的结果 —— ← 方向 + 状态点 + 右侧 系统 标，灰底以区别于发出
      const ok = l.exit === 0
      return (
        <div key={i} style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-soft)', overflow: 'hidden' }}>
          <div style={{ ...mono, display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>
            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>←</span>
            <span style={{ fontWeight: 600 }}>工具结果</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: ok ? 'var(--text-3)' : 'var(--danger)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? 'var(--text-2)' : 'var(--danger)', display: 'inline-block' }} />
              exit {l.exit}
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 'var(--text-2xs)' }}>系统返回</span>
          </div>
          <pre style={{ ...mono, margin: 0, padding: '9px 11px', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{l.text}</pre>
        </div>
      )
    }
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
      <div key={i} style={{ ...mono, color: 'var(--text-1)', marginTop: 10, padding: '8px 10px', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>{shown(l)}{l.streaming && caret}</div>
    )
    return null
  }

  const modeBtn = (m: Mode): React.CSSProperties => {
    const active = m === mode
    return {
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', cursor: 'pointer',
      padding: '3px 9px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
      border: `1px solid ${active ? 'var(--text-1)' : 'var(--border)'}`,
      background: active ? 'var(--text-1)' : 'transparent',
      color: active ? 'var(--bg)' : 'var(--text-3)',
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
        .hd-root { width: 100%; }
        .hd-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
          gap: clamp(28px, 4vw, 60px);
          align-items: center;
        }
        @media (max-width: 880px) {
          .hd-grid { grid-template-columns: 1fr; gap: 22px; align-items: stretch; }
        }

        /* ── 左列：框架文案 + 切换 ─────────────────────────────── */
        .hd-left { max-width: 38ch; }
        @media (max-width: 880px) { .hd-left { max-width: none; } }
        .hd-eyebrow { font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-3); }
        .hd-lead {
          margin: 12px 0 18px;
          font-size: clamp(16px, 1.4vw, 19px);
          line-height: 1.55;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--text-1);
        }
        .hd-lead b { font-weight: 600; }
        .hd-body { margin: 18px 0 0; font-size: var(--text-sm); line-height: 1.8; color: var(--text-2); min-height: 5.4em; }

        /* segmented toggle —— 与 hero 的读者身份开关同语汇 */
        .hd-seg {
          position: relative; display: inline-grid; grid-template-columns: 1fr 1fr;
          padding: 3px; background: var(--bg-alt);
          border: 1px solid var(--border); border-radius: var(--radius-full);
        }
        .hd-seg-thumb {
          position: absolute; top: 3px; left: 3px;
          width: calc(50% - 3px); height: calc(100% - 6px);
          background: var(--bg); border: 1px solid var(--border);
          border-radius: var(--radius-full); box-shadow: var(--shadow-sm);
          transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hd-seg[data-view='agent'] .hd-seg-thumb { transform: translateX(100%); }
        .hd-seg-opt {
          position: relative; z-index: 1;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 7px 18px; font-family: var(--font-sans); font-size: var(--text-sm);
          font-weight: 500; color: var(--text-3); background: transparent;
          border: 0; border-radius: var(--radius-full); cursor: pointer; white-space: nowrap;
          transition: color var(--duration-fast) var(--ease);
        }
        .hd-seg-opt:hover { color: var(--text-2); }
        .hd-seg-opt.active { color: var(--text-1); }
        .hd-seg-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.55; }

        /* ── 右列：会变形的设备 ────────────────────────────────── */
        .hd-right { min-width: 0; }
        .hd-window {
          height: 412px; display: flex; flex-direction: column; overflow: hidden;
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          background: var(--bg); box-shadow: var(--shadow-sm);
        }
        .hd-winbar {
          flex: none; display: flex; align-items: center; gap: 8px;
          padding: 8px 13px; border-bottom: 1px solid var(--border); background: var(--bg-alt);
        }
        .hd-dots { display: flex; gap: 6px; }
        .hd-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-strong); display: block; }
        .hd-winname { font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-3); }
        .hd-modes { display: flex; gap: 6px; }

        /* 设备上方的「运行模式」选择条 —— 两视图共存以保持等高（终端标题栏回归纯净） */
        .hd-strip { display: flex; align-items: center; gap: 10px; min-height: 28px; margin-bottom: 11px; }
        .hd-strip-label { font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-3); }

        .hd-body-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; }

        /* chat 设备：sans 气泡 + 输入条 + 死胡同 —— 大众熟悉的聊天 app */
        .hd-chat-id { display: flex; align-items: center; gap: 8px; }
        .hd-chat-av { width: 18px; height: 18px; border-radius: 50%; background: var(--text-1); flex: none; }
        .hd-chat-name { font-family: var(--font-sans); font-size: var(--text-xs); font-weight: 600; color: var(--text-1); }
        .hd-chatbody { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 15px; font-family: var(--font-sans); }
        .hd-bubble-user {
          margin-left: auto; width: fit-content; max-width: 80%;
          font-size: 13.5px; line-height: 1.5; color: var(--bg);
          background: var(--text-1); border-radius: 13px 13px 3px 13px; padding: 8px 12px;
        }
        .hd-asst { display: flex; gap: 9px; margin-top: 16px; }
        .hd-asst-av { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--border); background: var(--bg-soft); }
        .hd-asst-msg { font-size: 13.5px; line-height: 1.65; color: var(--text-2); white-space: pre-wrap; max-width: 85%; }
        .hd-asst-msg .hd-mono { font-family: var(--font-mono); font-size: 0.92em; color: var(--text-1); }
        .hd-think { display: inline-flex; gap: 4px; padding-top: 5px; }
        .hd-think span { width: 5px; height: 5px; border-radius: 50%; background: var(--text-3); animation: hd-think 1.2s var(--ease) infinite; }
        .hd-think span:nth-child(2) { animation-delay: 0.18s; }
        .hd-think span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes hd-think { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
        .hd-deadend {
          display: flex; gap: 9px; margin-top: 16px; padding: 10px 12px;
          border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-alt);
          font-family: var(--font-sans); font-size: var(--text-xs); line-height: 1.6; color: var(--text-2);
        }
        .hd-deadend .x { color: var(--danger); font-weight: 600; flex: none; }
        .hd-chatinput {
          flex: none; display: flex; align-items: center; gap: 9px;
          padding: 10px 12px; border-top: 1px solid var(--border); background: var(--bg);
        }
        .hd-chatinput .field {
          flex: 1; padding: 9px 13px; border: 1px solid var(--border); border-radius: var(--radius-full);
          font-family: var(--font-sans); font-size: var(--text-xs); color: var(--text-3); background: var(--bg-alt);
        }
        .hd-chatinput .send {
          flex: none; width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid var(--border); background: var(--bg-alt); color: var(--text-3);
          display: flex; align-items: center; justify-content: center; font-size: 14px;
        }

        /* 设备脚注：左 chat 一句话，右 agent loop + 重跑 */
        .hd-devfoot {
          display: flex; align-items: center; gap: 10px; min-height: 26px;
          margin-top: 11px; flex-wrap: wrap;
          font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-3);
        }
        .hd-devfoot .loop b { color: var(--text-1); font-weight: 500; }
        .hd-devfoot .loop span { color: var(--text-2); }
        .hd-replay {
          margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--font-mono); font-size: var(--text-2xs); cursor: pointer;
          padding: 4px 11px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: transparent; color: var(--text-2);
          transition: border-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
        }
        .hd-replay:hover { border-color: var(--text-1); color: var(--text-1); }

        @keyframes hd-pulse { 0%, 100% { border-color: var(--border-strong); } 50% { border-color: var(--text-2); } }
        .hd-pending { animation: hd-pulse 1.5s var(--ease) infinite; }
        @keyframes hd-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .hd-caret { display: inline-block; color: var(--text-2); animation: hd-blink 1s steps(1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hd-pending, .hd-think span { animation: none; }
          .hd-caret { animation: none; opacity: 1; }
          .hd-seg-thumb { transition: none; }
        }
      `}</style>

      <div className="hd-grid">
        {/* ── 左列：同一个问题，两种回应 ───────────────────────── */}
        <div className="hd-left">
          <div className="hd-eyebrow">// 同一个问题，两种回应</div>
          <p className="hd-lead">
            把「<b>{SHARED_PROMPT}</b>」这一句，<br />分别交给 chat 和 agent——
          </p>
          <div className="hd-seg" data-view={view} role="tablist" aria-label="对比 chat 与 agent">
            <span className="hd-seg-thumb" aria-hidden="true" />
            <button
              className={`hd-seg-opt ${view === 'chat' ? 'active' : ''}`}
              role="tab" aria-selected={view === 'chat'} type="button"
              onClick={() => setView('chat')}
            >
              <span className="hd-seg-dot" aria-hidden="true" />Chat
            </button>
            <button
              className={`hd-seg-opt ${view === 'agent' ? 'active' : ''}`}
              role="tab" aria-selected={view === 'agent'} type="button"
              onClick={() => setView('agent')}
            >
              <span className="hd-seg-dot" aria-hidden="true" />Agent
            </button>
          </div>
          <p className="hd-body">{view === 'chat' ? CHAT_COPY : AGENT_COPY}</p>
        </div>

        {/* ── 右列：会变形的设备 ───────────────────────────────── */}
        <div className="hd-right">
          <motion.div
            key={view}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            {/* 运行模式条：agent 的 ReAct/Plan 从终端标题栏挪到这里；chat 只标身份 */}
            <div className="hd-strip">
              {view === 'agent' ? (
                <>
                  <span className="hd-strip-label">agent ›</span>
                  <div className="hd-modes" role="tablist" aria-label="agent 模式">
                    <button onClick={() => setMode('react')} style={modeBtn('react')} role="tab" aria-selected={mode === 'react'} type="button">ReAct</button>
                    <button onClick={() => setMode('plan')} style={modeBtn('plan')} role="tab" aria-selected={mode === 'plan'} type="button">Plan</button>
                  </div>
                </>
              ) : (
                <span className="hd-strip-label">chat ›</span>
              )}
            </div>

            {view === 'chat' ? (
              /* ── chat：仿真聊天 app ─────────────────────────── */
              <div className="hd-window">
                <div className="hd-winbar">
                  <div className="hd-chat-id">
                    <span className="hd-chat-av" aria-hidden="true" />
                    <span className="hd-chat-name">AI 助手</span>
                  </div>
                </div>
                <div className="hd-chatbody">
                  <div className="hd-bubble-user">{SHARED_PROMPT}</div>
                  <div className="hd-asst">
                    <span className="hd-asst-av" aria-hidden="true" />
                    <div className="hd-asst-msg">
                      {chatPhase === 'thinking' ? (
                        <span className="hd-think" aria-label="正在输入"><span /><span /><span /></span>
                      ) : (
                        <>{CHAT_REPLY.slice(0, chatTyped)}{!chatDone && caret}</>
                      )}
                    </div>
                  </div>
                  {chatDone && (
                    <motion.div
                      className="hd-deadend"
                      initial={reduce ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                    >
                      <span className="x" aria-hidden="true">✕</span>
                      <span>{CHAT_DEADEND}</span>
                    </motion.div>
                  )}
                </div>
                <div className="hd-chatinput">
                  <div className="field">发消息……</div>
                  <span className="send" aria-hidden="true">↑</span>
                </div>
              </div>
            ) : (
              /* ── agent：仿真 CLI（浅灰面，非深色终端）──────────── */
              <div className="hd-window">
                <div className="hd-winbar">
                  <div className="hd-dots" aria-hidden="true">
                    {[0, 1, 2].map((i) => <span key={i} className="hd-dot" />)}
                  </div>
                  <span className="hd-winname">npx tsx cli.ts — your-own-agent</span>
                </div>

                <div ref={scrollRef} className="hd-body-scroll">
                  {/* key={mode} → 切换 ReAct/Plan 时旧 transcript 不再硬闪，新的淡入浮起 */}
                  <motion.div
                    key={mode}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                  >
                    {lines.map((l, i) => (
                      <motion.div
                        key={i}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.26, ease: EASE_OUT }}
                      >
                        {renderLine(l, i)}
                      </motion.div>
                    ))}

                    {/* 活终端：两步之间「思考」、且没有行正在打字时的闪烁光标 */}
                    {!pending && !done && lines.length > 0 && step < scn.script.length && !lines.some((l) => l.streaming) && (
                      <div style={{ ...mono, marginTop: 8 }}>
                        <span className="hd-caret">▊</span>
                      </div>
                    )}

                    {pending && (
                      <motion.div
                        className="hd-pending"
                        initial={reduce ? false : { opacity: 0, scale: 0.98, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.24, ease: EASE_OUT }}
                        style={{ marginTop: 13, padding: 11, border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--bg-alt)' }}
                      >
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
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>

          {/* 设备脚注 */}
          <div className="hd-devfoot">
            {view === 'chat' ? (
              <span>chat · 一问一答，没有下一步</span>
            ) : (
              <>
                <span className="loop">
                  <span>决定</span> → <span>执行</span> → <span>观察</span>　<b>↺ 直到 ✓ 完成</b>
                </span>
                {done && (
                  <button onClick={() => reset(mode)} className="hd-replay" type="button">↺ 重新运行</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
