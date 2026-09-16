# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
