<script setup>
// 关于页 —— /about，layout: page，纯网站地盘。
// 项目简介、许可证、Build Your Own X 流派背景。
const REPO = 'https://github.com/haoofun/build-your-own-ai-agent'
const SITE = 'https://build-your-own-ai-agent.com'

const SIBLINGS = [
  { t: 'Build your own Git',       d: '从零理解版本控制的本质：object store、树与提交、分支' },
  { t: 'Build your own Redis',     d: '从零实现 RESP 协议、内存 KV、持久化，理解 Redis 的权衡' },
  { t: 'Build your own Shell',     d: '从零写一个 shell：fork、exec、管道、重定向，逐一拆解' },
  { t: 'Build your own SQLite',    d: '从零实现 B-Tree 存储、SQL 解析、查询执行引擎' },
]
</script>

<template>
  <div class="about-page">
    <div class="about-eyebrow">// 关于本项目</div>
    <h1 class="about-h1">一本免费、开源的「从零复刻」教程</h1>
    <p class="about-intro">
      《Build Your Own AI Agent》是一本
      <strong>build-your-own-x</strong>
      风格的教学项目：用 ~2500 行 TypeScript、不依赖任何 agent 框架，渐进式地手写出一个具备
      agent loop、文件读写、shell 执行、权限确认、上下文压缩、子 agent 与 MCP 能力的编码 agent。
    </p>

    <div class="about-actions">
      <a class="byoa-btn byoa-btn--primary" :href="SITE" target="_blank" rel="noreferrer">访问网站</a>
      <a class="byoa-btn byoa-btn--secondary" :href="REPO" target="_blank" rel="noreferrer">在 GitHub 查看</a>
    </div>

    <!-- 许可 -->
    <h2 class="about-h2">许可</h2>
    <div class="about-licenses">
      <div class="about-license-row">
        <span class="about-badge">代码</span>
        <span class="about-license-text">MIT —— 随意使用、修改、分发。</span>
      </div>
      <div class="about-license-row">
        <span class="about-badge">书稿</span>
        <span class="about-license-text">CC BY-NC-SA 4.0 —— 署名、非商业、相同方式共享。</span>
      </div>
    </div>

    <!-- 定位与差异化 -->
    <h2 class="about-h2">为什么是「从零复刻」</h2>
    <p class="about-body">
      市面上 Claude Code 相关内容大多停留在使用介绍或源码解读。本书选择另一条路：
      <strong>教学型 from-scratch 实现</strong>——每章从动机出发，手写核心逻辑，章末项目可运行，且比上一章明显更强。这条路更长，但理解也更深。
    </p>
    <p class="about-body">
      免费且开源，中文首发。代码按章打 git tag，读者随时可对照参考实现。
      llms.txt 现已可用——可以直接把本站喂给你的编码 agent，让它照着本书的顺序和讲法带你学。
    </p>

    <!-- BYOX 系列 -->
    <h2 class="about-h2">"Build Your Own X" 系列</h2>
    <p class="about-body">
      本项目属于经典的「亲手复刻」流派——通过从零重写一个你每天在用的工具，真正理解它。
      下面是同流派的一些代表作，收录于
      <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noreferrer">github.com/codecrafters-io/build-your-own-x</a>。
    </p>
    <div class="about-siblings">
      <div v-for="s in SIBLINGS" :key="s.t" class="about-sibling">
        <div class="about-sibling__title">{{ s.t }}</div>
        <div class="about-sibling__desc">{{ s.d }}</div>
      </div>
    </div>

    <!-- 页脚 -->
    <div class="about-footer">
      <span>// 书稿文字 CC BY-NC-SA 4.0 · 代码 MIT · © 2026 haoo</span>
      <span>// 状态：写作前期，章节将逐章发布上线</span>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 24px 96px;
  font-family: var(--font-sans);
}

.about-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-3);
  margin-bottom: 12px;
}

.about-h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-1);
}

.about-intro {
  font-size: var(--text-h4);
  line-height: 1.75;
  color: var(--text-2);
  margin: 16px 0 0;
}
.about-intro strong {
  color: var(--text-1);
  font-weight: 600;
}

.about-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.about-h2 {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-1);
  margin: 56px 0 8px;
  padding: 0;
  border: 0;
}

.about-body {
  font-size: var(--text-h4);
  line-height: 1.75;
  color: var(--text-2);
  margin: 12px 0 0;
}
.about-body strong {
  color: var(--text-1);
  font-weight: 600;
}
.about-body a {
  color: var(--text-1);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  transition: text-decoration-color var(--duration-fast) var(--ease);
}
.about-body a:hover {
  text-decoration-color: var(--text-1);
}

/* 许可区 */
.about-licenses {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.about-license-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-h4);
  color: var(--text-2);
}
.about-badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-1);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  flex: none;
}
.about-license-text {
  line-height: 1.6;
}

/* BYOX 系列卡片 */
.about-siblings {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
}
@media (max-width: 580px) {
  .about-siblings {
    grid-template-columns: 1fr;
  }
}
.about-sibling {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-soft);
  padding: 16px;
  transition: border-color var(--duration-fast) var(--ease);
}
.about-sibling:hover {
  border-color: var(--text-1);
}
.about-sibling__title {
  font-size: var(--text-h4);
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 6px;
}
.about-sibling__desc {
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--text-2);
}

/* 页脚 */
.about-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
