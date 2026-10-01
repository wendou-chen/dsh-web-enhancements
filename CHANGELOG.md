# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-10-01

### 🚀 Highlights & New Features

- **工作区绝对物理路径秒级复制 (`workspace-path`)**:
  - 左侧工作区列表 Hover 快捷注入 `📁 / 📋` 路径复制按钮，点击即刻复制真实物理路径。
  - 悬浮控制球快捷菜单增加“📋 复制当前工作区路径”选项。
  - 8 重多级防御与路径解析引擎：URL Hash 逆查 ➔ `workspaces.items` 反查 ➔ React Fiber 节点直读 ➔ 标题匹配 ➔ Windows 路径反斜杠规范化。
- **Shift+Tab 智能模式轮转 (`mode-cycle`)**:
  - 全局捕获阶段拦截 `Shift+Tab`，实现「标准模式 ⇄ Plan 计划模式 ⇄ Goal 目标模式」无缝三态轮转。
  - 智能识别自定义 Agent 预设，自动跳过 Goal 模式实现双态循环。
  - 零丢失光标焦点与输入内容，搭配高对比度毛玻璃 Toast 实时视觉反馈。
- **悬浮控制球交互与光标优化 (`floating-ball`)**:
  - 修复指针样式为标准手型 `cursor: pointer`，杜绝 `grab` 抓手光标。
  - 容器外围 100% 点击穿透（`pointer-events: none`），仅小球圆盘与激活菜单响应事件，绝不遮挡底层网页交互。
- **LaTeX 公式复制双层同心框消除 (`formula-copy`)**:
  - 精准匹配顶层容器（`:not(.katex-display *)` 排除嵌套子节点，并显式清除子节点样式），消除块级公式内部多层叠加阴影。
- **工作区文件快速过滤与一键直达 (`file-search`)**:
  - 右侧文件列表顶部注入模糊检索，即时高亮匹配项并联动 Markdown 预览。
- **任务完成提示音与可缩放通知窗 (`task-notifier`)**:
  - 桌面与 Web 端任务完成音频提示与浮窗状态通知。
- **Cordis 显式依赖注入与守卫合规 (`dsh-dev-guard`)**:
  - 补齐 `workspaces`、`remote.commands` 等依赖，通过 6 大路由 26 项健康守卫断言。

## [0.2.0] - 2026-09-16

### 🚀 Major Breakthrough: 7-Stage Heuristic LaTeX Auto-Healing & Lossless Live Re-Rendering

- **7-Stage Heuristic LaTeX Syntax Auto-Healer (`healLatexFormula`)**:
  - **Stage 1 (XML/HTML Unescape)**: Eliminates `&amp;` ➔ `&`, `&lt;` ➔ `<`, `&gt;` ➔ `>`, `&nbsp;` ➔ ` `.
  - **Stage 2 (Macro & Symbol Normalizer)**: Maps non-standard macros like `\rarr` ➔ `\rightarrow`, `\larr` ➔ `\leftarrow`, `\bold{` ➔ `\mathbf{`, `\oiint` ➔ `\iint`, `\degree` ➔ `^\circ`, `\s.t.` ➔ `\text{s.t.}`.
  - **Stage 3 (Environment Standardization)**: Automatically converts top-level unsupported environments like `\begin{align*?}` ➔ `\begin{aligned}` and `\begin{gather*?}` ➔ `\begin{gathered}`.
  - **Stage 4 (Alignment Auto-Wrapping & Balance)**: Automatically wraps raw alignment operators `&` and line breaks `\\` inside `\begin{aligned} ... \end{aligned}`, and balances missing opening/closing environment tags.
  - **Stage 5 (Row-Level `\left` / `\right` Delimiter Balancing)**: Solves KaTeX's notorious `Expected '\right', got '\end'` by balancing delimiters line-by-line across `\\` line breaks with `\right.` / `\left.`.
  - **Stage 6 (Global Brace Closure Guard)**: Auto-closes mismatched or truncated `{` braces.
  - **Stage 7 (CJK Chinese Character Math Isolation)**: Isolates raw Chinese text in math mode by wrapping with `\text{...}`.
- **Client-Side Lossless KaTeX Re-Rendering Engine (`RenderGuardian`)**:
  - Intercepts broken `.katex-error` nodes and extracts the pristine LaTeX source from `el.textContent`.
  - Runs the 7-stage healer and calls `katex.renderToString`.
  - Seamlessly **replaces error nodes in-place with high-definition rendered KaTeX vector math** (`.dsh-math-healed-wrapper`).
  - Seamlessly integrates with `formula-copy` so users can click to copy the healed, valid LaTeX source.
  - Retains graceful error pill fallback only if all 7 heuristic passes fail.

## [0.1.0] - 2026-09-15

### ✨ Highlights & Initial Release

- **LaTeX Formula Click-to-Copy**: Click KaTeX / MathJax formulas to copy source code with XML unescape and frosted glass toast.
- **Mermaid Interactive Diagram Renderer**: Auto-renders Mermaid blocks with zoom, pan, export SVG, copy source, and fullscreen modal.
- **Voyager-Style Selection Quote-Reply**: Floating `💬 引用回复` toolbar with LaTeX math & codeblock indentation preservation.
- **Send Mode Switch & Native Steer Acceleration**: Toggle between `Ctrl+Enter 发送` and `Enter 发送` with 3-tier IME composition lock and native Steer bypass.
- **Smart Compact Input Collapse & Wakeup**: 38px compact single-line bar with instant Type-to-Expand, Click-to-Expand, and `Escape` hotkey.
- **Cordis Container & DSH Extension Guard v4.0 Compliance**: Dual-key slot registration and clean `ctx.effect` lifecycle.