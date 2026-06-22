<script setup>
// 大纲页 —— /outline，layout: page，纯网站地盘。
// 展示全书 16 章 + 附录的完整结构，每章含里程碑描述。
// 通过 VitePress sidebar 配置判断哪些章节已发布，已发布的渲染为链接。
import { computed } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData()

const PARTS = [
  {
    id: 'p0', part: '第〇部分', title: '起点', sub: null,
    chapters: [
      { file: '00-intro',          n: '00', t: '导言：把黑盒拆开',               m: '环境就绪，看完最终成品演示' },
      { file: '01-first-api-call', n: '01', t: '一次 API 调用',                  m: '一个会失忆的聊天 CLI——连问"我叫什么"都答不出' },
    ],
  },
  {
    id: 'p1', part: '第一部分', title: '核心循环', sub: 'agent 的本质',
    chapters: [
      { file: '02-tool-use',   n: '02', t: 'Tool Use：给模型一双手',          m: '能查时间、算算术的助手' },
      { file: '03-agent-loop', n: '03', t: 'Agent Loop：循环直到完成',        m: '记得住你上一句的代码问答 agent' },
      { file: '04-write-edit', n: '04', t: '写与改：Write、Edit 与 diff',     m: '能修真实 bug 的最小编码 agent' },
      { file: '05-bash',       n: '05', t: 'Bash：让 agent 跑命令',           m: '丢给它一个失败的测试，它自己修到通过' },
    ],
  },
  {
    id: 'p2', part: '第二部分', title: '从玩具到可用', sub: null,
    chapters: [
      { file: '06-system-prompt', n: '06', t: '系统提示词与环境感知',          m: '注入环境后答对"当前分支有什么未提交改动"' },
      { file: '07-permissions',   n: '07', t: '权限系统：信任但确认',          m: 'agent 不再能悄悄 rm -rf' },
      { file: '08-context',       n: '08', t: '上下文管理：对抗有限的窗口',   m: '长对话不再爆窗口、API 账单下降' },
      { file: '09-robustness',    n: '09', t: '健壮性：真实世界的网络与错误', m: '429 自动退避、Ctrl+C 取消、报错自我修正' },
    ],
  },
  {
    id: 'p3', part: '第三部分', title: '进阶能力', sub: null,
    chapters: [
      { file: '10-subagents',  n: '10', t: '子 agent：分而治之',             m: '主 agent 派子 agent 全库搜索，自己保持清爽' },
      { file: '11-plan-todo',  n: '11', t: '计划与待办：让 agent 有条理',    m: '开 todo 的多步任务不漏步骤' },
      { file: '12-mcp',        n: '12', t: 'MCP：接入外部世界',              m: '你的 agent 能用上整个 MCP 生态' },
      { file: '13-skills',     n: '13', t: '自定义命令与 Skills',             m: '实现一个 /commit skill，按需加载眼见为实' },
    ],
  },
  {
    id: 'p4', part: '第四部分', title: '收尾', sub: null,
    chapters: [
      { file: '14-terminal-ui', n: '14', t: '终端体验打磨',                  m: '流式 markdown、spinner、工具调用折叠' },
      { file: '15-evals',       n: '15', t: '评测：怎么知道它变好了',        m: '三配置的通过率与 token 成本对比表' },
      { file: '16-release',     n: '16', t: '发布',                          m: '干净容器里 npm i -g 后三分钟跑通 demo' },
    ],
  },
  {
    id: 'pa', part: '附录', title: 'Appendix', sub: null,
    chapters: [
      { file: 'appendix-a-api-providers', n: 'A', t: 'API 提供商选择',   m: 'Anthropic 直连 / OpenRouter / 兼容端点' },
      { file: 'appendix-b-model-adapter', n: 'B', t: '多模型适配层',       m: '' },
      { file: 'appendix-c-glossary',      n: 'C', t: '术语表（中英对照）', m: '' },
    ],
  },
]

// Build set of available links from sidebar (sidebar only contains existing files)
const available = computed(() => {
  const s = new Set()
  const sidebar = theme.value.sidebar
  if (Array.isArray(sidebar)) {
    for (const group of sidebar) {
      for (const item of (group.items || [])) {
        if (item.link) s.add(item.link.replace(/^\//, ''))
      }
    }
  }
  return s
})

function isAvailable(file) {
  return available.value.has(file)
}
</script>

<template>
  <div class="outline-page">
    <div class="outline-eyebrow">// 课程大纲 v0.1 · 16 章 + 附录</div>
    <h1 class="outline-h1">从一次 API 调用，到一个&nbsp;~2500&nbsp;行的编码&nbsp;agent</h1>
    <p class="outline-intro">
      每章固定结构：<strong>为什么需要它 → 原理拆解 → 动手实现 → 跑起来看效果 → 练习与延伸</strong>。每章结束项目必须可运行，且比上一章明显更强。代码按章打 git tag，随时对照。
    </p>

    <div class="outline-parts">
      <section v-for="p in PARTS" :key="p.id" class="outline-part">
        <div class="outline-part__head">
          <span class="outline-part__num">{{ p.part }}</span>
          <h2 class="outline-part__title">{{ p.title }}</h2>
          <span v-if="p.sub" class="outline-part__sub">{{ p.sub }}</span>
        </div>

        <div class="outline-part__rows">
          <component
            v-for="c in p.chapters"
            :key="c.n"
            :is="isAvailable(c.file) ? 'a' : 'div'"
            :href="isAvailable(c.file) ? `/${c.file}` : undefined"
            class="outline-row"
            :class="{ 'outline-row--link': isAvailable(c.file), 'outline-row--coming': !isAvailable(c.file) }"
          >
            <span class="outline-row__n">{{ c.n }}</span>
            <span class="outline-row__body">
              <span class="outline-row__title">{{ c.t }}</span>
              <span v-if="c.m" class="outline-row__milestone">
                <span class="outline-row__arrow">里程碑 →</span>
                <span class="outline-row__m">{{ c.m }}</span>
              </span>
              <span v-if="!isAvailable(c.file)" class="outline-row__badge">正在写作中</span>
            </span>
          </component>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.outline-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 24px 96px;
  font-family: var(--font-sans);
}

.outline-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-3);
  margin-bottom: 12px;
}

.outline-h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-1);
}

.outline-intro {
  font-size: var(--text-h4);
  line-height: 1.75;
  color: var(--text-2);
  margin: 16px 0 0;
}
.outline-intro strong {
  color: var(--text-1);
  font-weight: 600;
}

.outline-parts {
  margin-top: 48px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.outline-part__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.outline-part__num {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  flex: none;
}
.outline-part__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-1);
  border: 0;
  padding: 0;
}
.outline-part__sub {
  font-size: var(--text-sm);
  color: var(--text-3);
}

.outline-part__rows {
  display: flex;
  flex-direction: column;
}

.outline-row {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 16px;
  align-items: baseline;
  padding: 12px 8px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: background var(--duration-fast) var(--ease);
}
.outline-row--link:hover {
  background: var(--bg-soft);
}
.outline-row--coming {
  cursor: default;
}

.outline-row__n {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-3);
  padding-top: 1px;
}

.outline-row__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.outline-row__title {
  font-size: var(--text-h4);
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: -0.01em;
  line-height: 1.4;
}
.outline-row--coming .outline-row__title {
  color: var(--text-3);
}

.outline-row__milestone {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.outline-row__arrow {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  flex: none;
}
.outline-row__m {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--text-2);
}
.outline-row--coming .outline-row__m {
  color: var(--text-3);
}

.outline-row__badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  letter-spacing: 0.03em;
}
</style>
