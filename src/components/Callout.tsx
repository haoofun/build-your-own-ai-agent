import type { ReactNode } from 'react'

interface Props {
  type?: 'info' | 'tip' | 'warning' | 'danger'
  title?: string
  children: ReactNode
}

const colors = {
  info:    { border: 'var(--border-strong)', text: 'var(--text-2)', titleColor: 'var(--text-1)' },
  tip:     { border: 'var(--border-strong)', text: 'var(--text-2)', titleColor: 'var(--text-1)' },
  warning: { border: 'var(--warning)',       text: 'var(--text-2)', titleColor: 'var(--warning)' },
  danger:  { border: 'var(--danger)',        text: 'var(--text-2)', titleColor: 'var(--danger)'  },
}

export default function Callout({ type = 'info', title, children }: Props) {
  const c = colors[type]
  return (
    <div style={{
      margin: '1rem 0',
      border: `1px solid ${c.border}`,
      borderLeftWidth: '3px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-soft)',
      padding: '0.75rem 1rem',
      fontSize: 'var(--text-body)',
      color: c.text,
    }}>
      {title && (
        <div style={{ fontWeight: 600, color: c.titleColor, marginBottom: '0.25rem' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
