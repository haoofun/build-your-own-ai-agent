import { defineCollection, z } from 'astro:content'

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // draft 页：仅 dev 可见，生产构建排除（见 src/pages/[...slug].astro）。
    // 用于设计样章等不进正式章节的页面。
    draft: z.boolean().optional(),
  }),
})

export const collections = { docs }
