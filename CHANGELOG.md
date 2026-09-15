# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-15

### ✨ Highlights & Features

- **LaTeX Formula Click-to-Copy**:
  - One-click copy for KaTeX / MathJax formulas directly to the clipboard.
  - Automatic XML entity unescaping (`&amp;` ➔ `&`, etc.) for seamless copy-paste into LaTeX editors.
  - Interactive hover glow with theme-adaptive visual feedback and floating frosted glass toast notifications.
- **Mermaid Interactive Diagram Renderer**:
  - Auto-renders ` ```mermaid ` code blocks into high-definition interactive SVG canvases.
  - Comprehensive action toolbar: Zoom in, Zoom out, Reset, Pan/Drag, Copy Source, Export SVG, and Fullscreen Modal.
  - 300ms streaming debounce with localized error banner graceful fallback and automatic Dark/Light theme sync.
- **Voyager-Style Selection Quote-Reply**:
  - Floating `💬 引用回复` toolbar dynamically positioned above user text selections.
  - High-fidelity preservation: Converts nested KaTeX formulas back into `$...$` and preserves code block indentation/syntax.
  - Direct insertion into DSH Lexical / contenteditable input state with cursor autofocus below the quote block.
- **Send Mode Switch & Native Steer Acceleration**:
  - Toggle between `Ctrl+Enter 发送` (recommended for multi-line prompts) and `Enter 发送`.
  - Triple IME composition defense (`isComposing` + `keyCode === 229` + 50ms lock) ensuring 0 misfires during Chinese/Japanese input.
  - Native Steer bypass for official `busyEnter: queue`: passes native `accelerated` gestures during AI streaming to interrupt/steer turns immediately without queuing.
- **Smart Compact Input Collapse & Wakeup**:
  - Non-intrusive container collapsing to 38px single-line height (`COMPACT_SCROLL_HEIGHT`) to maximize chat message visibility.
  - Intelligent multi-mode wakeup: Type-to-Expand (0-latency instant expansion on typing), Click-to-Expand (focuses end of text), and `Escape`-to-collapse hotkey.
- **Render Guardian - Self-Healing DOM Engine**:
  - Mutation observer monitoring DOM render health.
  - Automatic recovery and graceful fallback for malformed Markdown or broken LaTeX math blocks.
- **Cordis Container & DSH Extension Guard v4.0 Compliance**:
  - Dual-key slot registration (`id` + `key`) for list and keyed slot compatibility.
  - Clean `ctx.effect` lifecycle management with 0 residual listeners/styles on uninject/reload.
  - `tsdown` (Rolldown) zero-external sandbox bundling.
