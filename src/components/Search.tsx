import { useState, useEffect, useRef } from 'react'
import { CHAPTERS, N_TO_SLUG } from '../data/chapters'

export default function Search() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = q.trim()
    ? CHAPTERS.filter((c) =>
        `${c.n} ${c.t} ${c.m || ''} ${c.partTitle}`.toLowerCase().includes(q.toLowerCase())
      )
    : CHAPTERS

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [q, open])

  const close = () => { setOpen(false); setQ('') }

  const choose = (n: string) => {
    const slug = N_TO_SLUG[n]
    if (slug) { window.location.href = `/${slug}`; close() }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) choose(results[active].n) }
    else if (e.key === 'Escape') { close() }
  }

  return (
    <>
      <button
        className="search-trigger"
        onClick={() => setOpen(true)}
        aria-label="搜索章节 (⌘K)"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 10px',
          minWidth: '160px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-3)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <svg className="search-trigger-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <span className="search-trigger-label">搜索</span>
        <kbd className="search-trigger-kbd" style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
          color: 'var(--text-3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-inline)', padding: '1px 5px',
          lineHeight: 1.4,
        }}>⌘K</kbd>
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'var(--overlay)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '12vh',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 92vw)',
              background: 'var(--bg)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* search input row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)', flex: 'none' }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="搜索章节、里程碑…"
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  background: 'transparent',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-body)',
                  color: 'var(--text-1)',
                }}
              />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
                color: 'var(--text-3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inline)', padding: '2px 6px',
              }}>esc</span>
            </div>

            {/* results list */}
            <div style={{ maxHeight: '52vh', overflowY: 'auto', padding: 8 }}>
              {results.length === 0 && (
                <div style={{
                  padding: '28px 12px', textAlign: 'center',
                  color: 'var(--text-3)', fontSize: 'var(--text-sm)',
                }}>
                  没有匹配 "{q}" 的章节
                </div>
              )}
              {results.map((c, i) => (
                <div
                  key={c.n}
                  onClick={() => choose(c.n)}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: i === active ? 'var(--bg-soft)' : 'transparent',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
                    color: 'var(--text-3)', width: 20, flex: 'none',
                  }}>{c.n}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: 'var(--text-sm)',
                      fontWeight: 600, color: 'var(--text-1)',
                      letterSpacing: '-0.01em',
                    }}>{c.t}</span>
                    {c.m && (
                      <span style={{
                        display: 'block', fontSize: 'var(--text-2xs)',
                        color: 'var(--text-3)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{c.m}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* footer hints */}
            <div style={{
              display: 'flex', gap: 16,
              padding: '8px 16px',
              borderTop: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
              color: 'var(--text-3)',
            }}>
              <span>↑↓ 导航</span>
              <span>↵ 打开</span>
              <span>esc 关闭</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
