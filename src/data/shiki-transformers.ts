/* ──────────────────────────────────────────────────────────────────────────
 * 自写的两个 Shiki transformer —— 构建期跑，零客户端 JS、零布局抖动。
 *
 * 1. transformerFileTitle：给围栏加文件名。
 *      ```ts title="src/cli.ts"
 *    在 <pre> 上落 data-title，标签由 custom.css 画在代码面左上角。
 *    电子书端 pandoc 只会看到 ```ts，title= 被当作 info string 的附加词忽略，
 *    不破坏单源。
 *
 * 2. transformerTerminalPrompt：终端 transcript 里把提示符和内容分开。
 *    只作用于 text / plaintext / console 围栏（真代码块不碰），把行首的
 *    `you>` / `claude>` / `$` 切成独立 span，并给整行打 term-line-* 类，
 *    让「谁在说话」和「说了什么」在视觉上分层。
 * ────────────────────────────────────────────────────────────────────────── */
import type { ShikiTransformer } from 'shiki'
import type { Element, Text } from 'hast'

/** ```ts title="src/cli.ts" —— 把文件名落到 <pre data-title> */
export function transformerFileTitle(): ShikiTransformer {
  return {
    name: 'byoa:file-title',
    pre(node) {
      const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw
      if (!raw) return
      const m = /(?:title|file)=(?:"([^"]+)"|'([^']+)')/.exec(raw)
      if (!m) return
      node.properties['data-title'] = m[1] ?? m[2]
    },
  }
}

const TRANSCRIPT_LANGS = new Set(['text', 'plaintext', 'txt', 'console', 'shellsession'])

/** 行首 `you>` / `claude>` / `$` —— 提示符切成独立 span，整行标 kind */
const PROMPT_RE = /^(you>|claude>|\$)(\s+)/

export function transformerTerminalPrompt(): ShikiTransformer {
  return {
    name: 'byoa:terminal-prompt',
    line(node) {
      if (!TRANSCRIPT_LANGS.has(this.options.lang)) return

      const first = node.children[0] as Element | undefined
      if (!first || first.type !== 'element') return
      const text = first.children[0] as Text | undefined
      if (!text || text.type !== 'text') return

      const m = PROMPT_RE.exec(text.value)
      if (!m) return

      const kind = m[1] === 'you>' ? 'you' : m[1] === 'claude>' ? 'claude' : 'shell'
      text.value = text.value.slice(m[0].length)

      node.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: { class: `term-prompt term-prompt-${kind}` },
        children: [{ type: 'text', value: m[1] + m[2] }],
      })

      const cls = node.properties.class
      node.properties.class = `${typeof cls === 'string' ? cls : 'line'} term-line term-line-${kind}`
    },
  }
}
