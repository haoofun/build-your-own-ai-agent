<script setup>
// 首页 —— 推介 + 交互式 CLI 编码 agent、「把本书喂给你的 agent」CTA band、三张特性卡片。
// 纯网站地盘（见 CLAUDE.md 单源边界）：不进 book/、不过 pandoc、不进 llms.txt。
// hero 用 CliCodingAgent（招牌交互件，无运行按钮、停在权限确认处、案例可切换）；
// AgentTrace 移作章节正文教学件、CliTranscript 作其电子书静态降级（见各组件注释）。
import CliCodingAgent from './CliCodingAgent.vue'
import CopyCommand from './CopyCommand.vue'

const REPO = 'https://github.com/haoofun/build-your-own-ai-agent'

const features = [
  { n: '01', t: '渐进式构建', d: '不是源码导读。每章跟写、每章可运行、每章比上一章明显更强，代码按章打 tag 随时对照。' },
  { n: '02', t: '零 agent 框架', d: '只用官方 SDK 或裸 fetch。agent loop、工具系统、权限确认、compaction、子 agent、MCP，全部亲手实现。' },
  { n: '03', t: '不止于玩具', d: '上下文压缩、子 agent、MCP、skills、评测——越过多数教程止步的地方，抵达 Claude Code 的真实形态。' },
]

// CTA：只用已上线的真实入口（llms.txt / llms-full.txt 由发布管线生成、现已可访问）。
// 配套陪读 skill 随正文上线，故文案如实标注「即将」，不放置 404 链接。
const ctaTabs = [
  {
    label: '粘贴给 agent',
    command:
      '读 https://build-your-own-ai-agent.com/llms.txt，按其中的章节顺序带我从零写一个编码 agent；每章结束前先让我自己动手。',
  },
  { label: 'llms.txt', command: 'https://build-your-own-ai-agent.com/llms.txt' },
  { label: 'llms-full.txt', command: 'https://build-your-own-ai-agent.com/llms-full.txt' },
]
</script>

<template>
  <div class="byoa-home">
    <!-- hero -->
    <div class="byoa-hero">
      <div class="byoa-hero__pitch">
        <div class="byoa-eyebrow">// free · open-source · TypeScript</div>
        <h1>Build Your Own AI Agent</h1>
        <div class="byoa-hero__zh">从零复刻一个 Claude Code</div>
        <p class="byoa-hero__tagline">
          用 TypeScript 从零手写一个能改代码、跑命令、自我迭代的编码 agent——不用任何 agent
          框架，每章结束都有可运行的成果。
        </p>
        <div class="byoa-hero__actions">
          <a class="byoa-btn byoa-btn--primary" href="/00-intro">开始阅读</a>
          <a class="byoa-btn byoa-btn--secondary" :href="REPO" target="_blank" rel="noreferrer">在 GitHub 上查看</a>
        </div>
      </div>

      <!-- 招牌：一个真实跑起来的 CLI 编码 agent —— 点 y/N 决定它能不能动手 -->
      <div>
        <div class="byoa-trace-label">// 你要造的东西——点 y/N，决定它能不能动手</div>
        <CliCodingAgent />
      </div>
    </div>

    <!-- 把本书喂给你的 agent -->
    <div class="byoa-cta">
      <div class="byoa-trace-label">// 不想自己读？让你的 agent 教你</div>
      <p class="byoa-cta__lead">
        把本站喂给你的编码 agent（Claude Code、Cursor……）。<b>llms.txt 现已可用</b>——贴下面这段，它就能按本书的章节顺序和讲法，一步步带你从零写出这个
        agent；你随时可以打断提问、要求跳章或重讲。配套的苏格拉底式陪读 skill 会随正文一起上线。
      </p>
      <div class="byoa-cta__cmd">
        <div>
          <CopyCommand multiline :tabs="ctaTabs" />
        </div>
      </div>
    </div>

    <!-- 为什么不一样 -->
    <div class="byoa-features">
      <div v-for="f in features" :key="f.n" class="byoa-card">
        <div class="byoa-card__eyebrow">{{ f.n }}</div>
        <div class="byoa-card__title">{{ f.t }}</div>
        <p class="byoa-card__body">{{ f.d }}</p>
      </div>
    </div>
  </div>
</template>
