# Design

文档站的视觉系统。配套实现见 `.vitepress/theme/custom.css`（VitePress token override）与 `.vitepress/config.ts`（`markdown.theme`）。设计语言为 **zinc 单色系**，目标是「毫不费力的长文阅读」。任何新增页面 / 组件都应回到本文件对齐，再按 UX 需要外扩。

## Theme

明 / 暗双主题，同一套 Tailwind **zinc** 中性阶梯。气质：安静、工程化、克制 —— 像一份排版讲究的技术文档，而非营销页。层级靠**字重 + 墨黑标题 vs 灰正文的对比**建立，而非色相。代码面用**浅灰**（非深色终端），让整页保持统一、不抢注意力。

物理场景一句话：一位工程师在桌面浏览器上、室内常光、专注模式下，连续读 30–60 分钟技术长文并对照代码块 —— 所以默认浅色、低对比噪声、窄阅读栏。

## Color Palette

色彩策略：**Restrained**（克制）—— 中性底 + 单一「墨黑 / 墨白」强调，强调色占比 < 10%。刻意不使用品牌色相。

### 浅色（默认）

| 角色 | 值 | 说明 |
|---|---|---|
| 正文背景 bg | `#ffffff` | 纯白 |
| 次级背景 bg-alt | `#fafafa` (zinc-50) | 侧栏 / 导航 |
| 柔和面 bg-soft | `#f4f4f5` (zinc-100) | 代码块 / 行内代码 / 卡片 |
| 标题墨色 text-1 | `#18181b` (zinc-900) | 标题 / 强调 / 链接 / 强调态 |
| 正文 text-2 | `#52525b` (zinc-600) | 段落 / 列表 / 表格正文 |
| 次要 text-3 | `#a1a1aa` (zinc-400) | 占位 / 目录 / 标签 |
| 边框 border | `#e4e4e7` (zinc-200) | 分隔线 / 代码块描边 / 表格线 |

### 深色

| 角色 | 值 |
|---|---|
| bg | `#09090b` (zinc-950) |
| bg-alt | `#18181b` (zinc-900) |
| bg-soft | `#27272a` (zinc-800) |
| text-1（标题/强调） | `#fafafa` (zinc-50) |
| text-2（正文） | `#a1a1aa` (zinc-400) |
| text-3 | `#71717a` (zinc-500) |
| border | `#27272a` (zinc-800) |

强调色（`--vp-c-brand-*`）刻意映射为墨黑 / 墨白阶梯（浅色 `#18181b → #52525b`，深色 `#fafafa → #a1a1aa`），不引入蓝色等默认链接色。

**对比度**：正文 text-2 对各自 bg 满足 WCAG AA（≥4.5:1）。若日后想让正文更浅，必须重新核对对比度 —— 不为「优雅」牺牲可读性。

### 允许的例外：少量渐变 / 插画

zinc 是**底座**，不是禁令。为*降低阅读负担*服务的、克制的渐变与插画是允许的：解释性示意图、柔和的分区背景、帮助理解的配图。约束：(1) 用于辅助理解而非装饰炫技；(2) 不引入营销味；(3) 与 zinc 中性底协调（渐变尽量低饱和、近中性或单一色相）。**绝对禁止**的是营销与付费元素，不是颜色或图像本身。

## Typography

字体（不依赖 Google Fonts，对中国大陆读者友好）：

一套连贯的 IBM Plex 工程化字族（拉丁 / 中文 / 等宽统一，自带「文档工具」气质）：

- 正文（拉丁）：`IBM Plex Sans`，CJK：`IBM Plex Sans SC`，回退 `system-ui / -apple-system / PingFang SC / Microsoft YaHei / Noto Sans SC`。
- 代码：`IBM Plex Mono`，回退 `JetBrains Mono / SF Mono / Consolas`。
- 全部自托管，不碰 Google：拉丁 + 等宽走 `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono`；SC 中文 Fontsource 未打包，手动自托管自 IBM 官方包 `@ibm/plex-sans-sc`（unicode-range 分块，浏览器按页只取用到的字块），见 `theme/fonts/ibm-plex-sans-sc.css` 与 custom.css 顶部注释。

阶梯（紧凑、带负字距，工程文档质感）：

| 级别 | 字号 | 字重 | 字距 / 行高 |
|---|---|---|---|
| h1 | 30px | 600 | -0.02em / 1.3，下边距 24px |
| h2 | 22px | 600 | -0.015em / 1.4，上边距 ~2.6em，**无顶部分隔线** |
| h3 | 18px | 600 | -0.01em / 1.45 |
| h4 | 16px | 600 | — |
| 正文 | 16px | 400 | 行高 **1.75**（CJK 混排比纯拉丁稍宽） |

签名特征：**标题近黑、正文中灰**。`strong` / `b` 抬到标题墨色。

> 阶梯源自一套紧凑的文档阅读 token（正文 16px、h1 30px、h2 18px）。本项目对 CJK 长文做了两处微调 —— 正文行高 1.625 → 1.75、h2 18px → 22px（更清晰的章节导航），字族换为 IBM Plex 全家。其余忠于原设计。

## Components

- **行内代码**：bg-soft 底、无边框、圆角 4px、0.875em。
- **代码块**：bg-soft 浅灰面 + 1px border 描边 + 圆角 8px；Shiki 主题 `github-light / github-dark`；语言标签常驻右上角（悬停时让位给复制按钮）。**不使用深色终端配色**。
- **表格**：无边框线框，仅加粗（700）表头 + 细底线分隔；去斑马纹，保持安静。
- **自定义容器**（`::: tip / info / warning / danger`）：全边框 + 3px 左竖线 + bg-soft 底 + 圆角 6px。tip/info 用中性墨色，warning/danger 是唯一允许的语义暖色（amber-700 `#a16207` / red-700 `#b91c1c`）。
- **链接**：单色（标题墨色）+ 下划线（offset 3px，描边色 border，悬停转墨色）。不靠色相区分，靠下划线保证可辨识。
- **侧栏 / 右侧目录**：更小更紧凑（分组标题 12px、条目 13–14px、text-3 灰），激活态转墨色加粗、单色 marker。
- **上一章 / 下一章 pager**：1px border 卡片，悬停描边转墨色。

## Layout

- **阅读栏宽度 720px**（`.VPDoc .content-container`）—— 控制行长在舒适区间，是该设计的核心约束之一。
- 整体最大宽 `--vp-layout-max-width: 1440px`。
- 间距讲节奏：标题用较大上边距分段（靠留白而非分隔线），段落 16px 纵向韵律。
- 保留既有约定：交互孤岛容器 `.interactive-island`（网页端视觉边界，电子书端由 pandoc 降级为静态图）。

## Motion

克制。过渡仅用于链接下划线、pager 描边、目录激活态等微反馈（~0.15s ease）。新增任何动效都必须：(1) 增强已默认可见的内容，不靠 class 触发才显示；(2) 提供 `@media (prefers-reduced-motion: reduce)` 降级。不用 bounce / elastic。
