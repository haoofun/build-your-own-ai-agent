# Build Your Own AI Agent —— 从零复刻一个 Claude Code

> 用 TypeScript 从零手写一个能改代码、跑命令、自我迭代的编码 agent——不用任何 agent 框架，每章结束都有可运行的成果。
>
> **状态**：写作前期（spike 周）。章节将逐章发布于 [build-your-own-ai-agent.com](https://build-your-own-ai-agent.com)。
> 本 README 为临时版，正式版随正文 1.0 重写。当前章级目录是暂定展开，Part 目标见 `OUTLINE.md`。

## 仓库结构

```
src/content/docs/  章节 markdown（唯一内容源 → 网站 / 电子书 / llms.txt）
code/              参考实现，按已冻结 checkpoint 打 chapter-* tag（M1 起）
astro.config.ts    网站配置（Astro + React）
scripts/           电子书构建（pandoc）
WRITING.md         写作规范（pandoc 兼容约定）
OUTLINE.md         Part 目标与暂定章节展开
```

## 本地开发

```bash
npm install
npm run dev       # 本地预览 http://localhost:4321
npm run build     # 构建（含 dead link 检查 + llms.txt 生成）
npm run ebook     # 电子书冒烟构建（需 pandoc：brew install pandoc）
```

## 部署（Cloudflare Pages）

| 配置项 | 值 |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 环境变量 | `NODE_VERSION=22` |

自定义域名：`build-your-own-ai-agent.com`（域名在 Cloudflare Registrar，同面板绑定）。

## License

代码 [MIT](https://opensource.org/licenses/MIT) · 书稿文字 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
