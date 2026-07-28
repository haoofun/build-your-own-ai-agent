/* ──────────────────────────────────────────────────────────────────────────
 * ChapterMilestone —— 章末总结：这一章的代码到底动了什么。
 *
 * THESIS: BYOX 的承诺是「项目在长大」，所以章末该回答的不是「你学到了什么」，
 *   而是「哪些文件新增了、哪些改了、里面多了什么东西」。这是一份**代码变更清单**，
 *   不是知识点回顾——读者拿它对账，也拿它确认自己的目录和书里一致。
 * OWN-WORLD: zinc 单色 + IBM Plex Mono 的文件树，连接线（├─ └─）由组件画，
 *   作者只写数据。与 Steps 的竖轨、AgentTrace 的角色点同属一套「工程图纸」语法。
 * FORM: 变更清单（新增 / 修改分组）+ 一句能力结论收尾，不是仪表盘。
 * DEGRADATION: 纯文本 + 语义列表，电子书端可直出等价的缩进文件树。
 *
 * 写法：
 *   <ChapterMilestone
 *     added={[
 *       { path: 'src/cli.ts', items: [
 *         { name: 'callModel()', note: '调用 Messages API' },
 *         { name: 'REPL 循环',   note: '读取输入并打印响应' },
 *       ]},
 *       { path: 'package.json', note: 'ESM + dev 脚本' },
 *     ]}
 *     changed={[...]}
 *     summary="现在这个 CLI 能在终端里连续问答……"
 *   />
 * ────────────────────────────────────────────────────────────────────────── */
import { Fragment, type ReactNode } from 'react'

export interface ChangeItem {
  /** 文件里新增/改动的东西：函数名、常量、循环…… */
  name: string
  /** 它干什么，一句话 */
  note?: string
}

export interface FileChange {
  /** 相对项目根的路径 */
  path: string
  /** 整个文件层面的说明（没有 items 时用） */
  note?: string
  /** 文件内部的结构，画成树 */
  items?: ChangeItem[]
}

interface Props {
  /** 本章新增的文件 */
  added?: FileChange[]
  /** 本章改动的已有文件 */
  changed?: FileChange[]
  /** 收尾一句：现在这份代码能做什么 */
  summary?: string
  /** 可选：清单与结论之间的补充说明 */
  children?: ReactNode
}

const mono = 'var(--font-mono)'

const groupLabel: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--text-2xs)',
  letterSpacing: '0.04em',
  color: 'var(--text-3)',
  marginBottom: '0.4rem',
}

/* 一个分组 = 一张三列表格（连接线 / 名字 / 说明）。文件行让名字跨前两列，
   于是同组内所有说明——文件级的和文件内部的——落在同一条竖线上。 */
const grid: React.CSSProperties = {
  margin: 0,
  padding: '0 0 0 0.9rem',
  listStyle: 'none',
  display: 'grid',
  gridTemplateColumns: 'auto auto 1fr',
  columnGap: '0.85rem',
  fontFamily: mono,
  fontSize: '13px',
  lineHeight: 1.85,
}

const noteStyle: React.CSSProperties = { color: 'var(--text-2)' }

function FileRows({ file, first }: { file: FileChange; first: boolean }) {
  const items = file.items ?? []
  const gap = first ? 0 : '0.5rem'
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ gridColumn: '1 / 3', color: 'var(--text-1)', paddingTop: gap }}>
        {file.path}
      </span>
      <span style={{ ...noteStyle, paddingTop: gap }}>{file.note ?? ''}</span>

      {items.map((it, i) => (
        <Fragment key={it.name}>
          <span style={{ color: 'var(--text-3)', userSelect: 'none' }}>
            {i === items.length - 1 ? '└─' : '├─'}
          </span>
          <span style={{ color: 'var(--text-1)' }}>{it.name}</span>
          <span style={noteStyle}>{it.note ?? ''}</span>
        </Fragment>
      ))}
    </li>
  )
}

export default function ChapterMilestone({ added, changed, summary, children }: Props) {
  const groups: [string, FileChange[] | undefined][] = [
    ['新增', added],
    ['修改', changed],
  ]

  return (
    <div style={{
      margin: '1.5rem 0',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--text-1)',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-soft)',
      padding: '1rem 1.15rem',
    }}>
      <div style={{
        fontFamily: mono,
        fontSize: 'var(--text-2xs)',
        letterSpacing: '0.04em',
        color: 'var(--text-3)',
        textTransform: 'uppercase',
        marginBottom: '0.85rem',
      }}>
        → 本章代码 · milestone
      </div>

      {groups.map(([label, files]) =>
        files && files.length > 0 ? (
          <div key={label} style={{ marginBottom: '0.9rem' }}>
            <div style={groupLabel}>{label}</div>
            <ul style={grid}>
              {files.map((f, i) => <FileRows key={f.path} file={f} first={i === 0} />)}
            </ul>
          </div>
        ) : null
      )}

      {children && (
        <div style={{
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-body)',
          color: 'var(--text-2)',
          marginBottom: '0.75rem',
        }}>
          {children}
        </div>
      )}

      {summary && (
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '0.8rem',
          fontSize: 'var(--text-body)',
          fontWeight: 600,
          lineHeight: 1.6,
          letterSpacing: '-0.01em',
          color: 'var(--text-1)',
        }}>
          {summary}
        </div>
      )}
    </div>
  )
}
