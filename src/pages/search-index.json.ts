import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

export const prerender = true

export interface SearchDoc {
  slug: string
  title: string
  description: string
  text: string
}

// MDX 源码 → 纯文本：去 import 语句、JSX/HTML 标签、标题井号与强调符号。
// 代码块内容保留（读者可能搜函数名/标识符），markdown 语法噪声不追求彻底干净，
// 够 Fuse.js 子串匹配用即可——搜索质量后续随正文体量再迭代。
function toPlainText(body: string): string {
  return body
    .replace(/^import\s.+$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export const GET: APIRoute = async () => {
  const entries = await getCollection('docs')
  const visible = import.meta.env.PROD ? entries.filter((e) => !e.data.draft) : entries

  const docs: SearchDoc[] = visible.map((entry) => ({
    slug: entry.slug,
    title: entry.data.title,
    description: entry.data.description ?? '',
    text: toPlainText(entry.body ?? ''),
  }))

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json' },
  })
}
