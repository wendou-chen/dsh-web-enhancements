# 🚀 DSH 全能增强套件 (dsh-web-enhancements)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DSH Compatibility](https://img.shields.io/badge/DSH-Web%20%7C%20Desktop-green.svg)](https://github.com/wendou-chen/dsh-web-enhancements)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Bundled with tsdown](https://img.shields.io/badge/Bundler-tsdown%20(Rolldown)-orange.svg)](https://github.com/sxzz/tsdown)
[![Cordis Microkernel](https://img.shields.io/badge/Architecture-Cordis%20Fiber-purple.svg)](https://cordis.moe/)

**DSH 全能增强套件 (`dsh-web-enhancements`)** 是专为 **DeepSeek Harness (DSH)** 深度定制的一站式全功能前端与宿主增强插件。

全面兼容 **DSH Web 端** 与 **DSH Desktop 桌面端**，无缝补齐大模型对话中的公式交互、图表渲染、长文本划词、输入流控制与界面防遮挡痛点，提供媲美原生桌面应用的流畅交互体验。

---

## ✨ 核心特性矩阵

### 1. 🧮 LaTeX 数学公式一键复制 (LaTeX Click-to-Copy)
- **悬停感知**：鼠标划过 KaTeX / MathJax 数学公式时自动高亮微蓝边框并转换为复制手型；
- **智能源码提取**：点击公式即刻从 DOM / `<annotation>` 节点提取原始 LaTeX 代码；
- **XML 实体反转义**：自动修复矩阵和多行公式中的 HTML 转义符（如 `&amp;` ➔ `&`、`&lt;` ➔ `<`），复制出的公式可直接无缝粘贴至 Overleaf、Typora 或 LaTeX 编译器；
- **毛玻璃 Toast 预览**：顶部浮现高质感毛玻璃气泡，实时展示已复制的 LaTeX 源码缩略预览。

### 2. 📊 Mermaid 交互式图表渲染引擎 (Mermaid Interactive Canvas)
- **动态自动渲染**：自动识别模型输出的 ` ```mermaid ` 代码块并渲染为矢量级高清交互 SVG；
- **全功能控制栏**：
  - 🔍 **缩放/平移**：支持放大、缩小、原点复位与鼠标拖拽自由平移（Pan & Zoom）；
  - 📋 **源码复制**：一键复制原始 Mermaid 流程图/时序图/类图 DSL；
  - 💾 **SVG 导出**：一键将当前图表导出为独立高清矢量 SVG 文件；
  - 🔲 **全屏 Modal 视窗**：点击全屏按钮展开大视口沉浸式预览复杂系统架构图；
- **流式防抖与容错**：内置 300ms 打字防抖，语法解析异常时自动展示局部错误 Banner 并保留代码块，绝不破坏页面流。

### 3. 💬 Voyager 风格划词引用回复 (Smart Quote & Reply)
- **智能悬浮气泡**：选中会话中的任意段落时，自动在选区上方居中浮现「💬 引用回复」胶囊按钮；
- **高保真逆向格式化**：
  - 选区内的数学公式自动反解析为标准的 Markdown 行内公式 `$...$` 或块级公式 `$$...$$`；
  - 选区内的代码块高保真保留语言标签与原有缩进排版；
- **Lexical / DOM 状态穿透**：穿透 React / Lexical 受控状态机，安全将 `> 引用文本` 插入输入框，并自动对焦在引用段落下方首个空行，直接输入回复即可。

### 4. ⚡ 发送快捷键切换与原生插话 (Send Mode & Native Steer)
- **双模式一键切换**：
  - **`Ctrl+Enter 发送` 模式（默认推荐）**：单按 `Enter` 换行，组合键 `Ctrl+Enter` 快速发送，极大便利长 Prompt 编写；
  - **`Enter 发送` 模式**：单按 `Enter` 发送，`Shift+Enter` 换行，贴合日常 IM 习惯；
- **三重输入法（IME）防抖屏障**：
  - 结合 `isComposing` 事件标志、`keyCode === 229` 与 50ms 状态锁，100% 杜绝拼音/五笔输入法选字回车时的误发送；
- **原生生成态插话（Steer Bypass）**：
  - 与 DSH 官方 `busyEnter: queue` 深度协同；
  - 模型流式生成时按下 `Ctrl+Enter` 自动放行原生 `accelerated` 加速手势，**100% 触发原生 `Steer` 插话**，空闲时毫秒级直发，杜绝长文本掉入后台排队队列。

### 5. 📉 输入框智能折叠与沉浸式唤醒 (Smart Compact & Wakeup)
- **单行紧凑模式（38px）**：点击「📉 收起输入」按钮，将底部输入区域平滑收缩至 38px，彻底消除对上方聊天记录的遮挡与鼠标事件拦截；
- **沉浸式打字唤醒（Type-to-Expand）**：收起状态下无需手动点开，**直接在键盘敲击任意字符，输入框瞬间以 `0.22s` 平滑动画展开**，首字 100% 录入、零吞字、零延迟；
- **智能点击唤醒（Click-to-Expand）**：收起状态下点击输入框任意区域，自动展开并精准将光标停留在文本末尾；
- **快捷避让（Escape-to-Collapse）**：在展开编辑时长文本后，按 **`Escape` 键**即可瞬间收起为紧凑单行条。

### 6. 🛡️ Render Guardian 智能自愈引擎 (DOM Render Guardian)
- **DOM 突变监控**：通过 `MutationObserver` 实时守护页面渲染流水线；
- **公式与 Markdown 局部自愈**：自动修复流式生成过程中的语法断裂与奇数未闭合公式符号；
- **插槽与组件生命周期防护**：避免由于异常渲染导致的白屏或上下文错位。

---

## ⌨️ 快捷键速查表

| 操作 / 场景 | `Ctrl+Enter 发送` 模式 (默认) | `Enter 发送` 模式 |
| :--- | :--- | :--- |
| **发送消息 / 提交提示词** | <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (或 <kbd>Cmd</kbd> + <kbd>Enter</kbd>) | <kbd>Enter</kbd> |
| **输入框换行** | <kbd>Enter</kbd> | <kbd>Shift</kbd> + <kbd>Enter</kbd> |
| **生成中即时插话 (Steer)** | <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | <kbd>Ctrl</kbd> + <kbd>Enter</kbd> |
| **收起输入框 (避让上方正文)** | <kbd>Escape</kbd> (或点击右侧胶囊) | <kbd>Escape</kbd> (或点击右侧胶囊) |
| **唤醒展开输入框** | 直接键盘打字 / 鼠标点击输入框 | 直接键盘打字 / 鼠标点击输入框 |
| **复制数学公式源码** | 鼠标左键点击公式任意位置 | 鼠标左键点击公式任意位置 |

---

## 🏗️ 架构与底层工程规范

```
dsh-web-enhancements/
├── cordis.patch.yml          # DSH 宿主 Cordis 依赖装配补丁
├── package.json              # 模块元数据与 Peer 依赖声明
├── tsdown.config.ts          # 基于 Rolldown 的沙箱前端打包配置 (window.__ModuleLoader__)
├── tsconfig.json             # TypeScript 编译配置 (ES2023 / NodeNext)
├── src/
│   ├── index.ts              # Host 侧插件入口 (Cordis Microkernel Lifecycle)
│   ├── schema.ts             # Schemastery 配置契约定义
│   └── client/               # 前端 Client 沙箱增强核心
│       ├── index.ts          # 前端总入口与 SlotRegistry 双键插槽注册
│       ├── styles.ts         # 响应式主题与动效样式表
│       ├── features/         # 独立功能域 (可插拔解耦)
│       │   ├── collapse/     # 输入框紧凑折叠与智能打字唤醒控制器
│       │   ├── formula-copy/ # LaTeX / KaTeX / MathJax 提取与反转义器
│       │   ├── mermaid/      # Mermaid 动态渲染器与交互工具栏
│       │   ├── quote-reply/  # Voyager 划词拦截与 Lexical AST 注入器
│       │   ├── render-guardian/ # DOM 突变监控与 Markdown/LaTeX 容错自愈
│       │   └── send-mode/    # 发送状态机与 IME 三重防抖策略
│       └── shared/           # 通用工具层 (剪贴板 / DOM 操作 / 毛玻璃 Toast)
└── scripts/                  # 自动化场景验证与构建脚本
```

### 1. 严格契约：Cordis 双键插槽规范
为了同时兼容 DSH 内置的 `list` 类型插槽（强校验 `options.id`）与 `keyed` 类型插槽（强校验 `options.key`），插件内部在注册所有插槽时均严格保持双键对齐：
```typescript
ctx.slots.inject('settings.plugin.item', () =>
  ctx.slots.register({
    name: 'settings.plugin.item',
    id: '@dsh-external/dsh-web-enhancements-panel',
    key: '@dsh-external/dsh-web-enhancements-panel',
    label: () => '全能增强套件',
    component: () => ({ ... })
  })
);
```

### 2. 零外部依赖泄露沙箱
客户端采用 `tsdown`（基于 Rust Rolldown 内核）编译输出单文件 `lib/client.js`。所有外部依赖（除 DSH 前端运行时静态白名单 `react`、`@deepseek-ai/dsh-client-ui-slots` 外）全部内联打包，杜绝沙箱 `ERR_MODULE_NOT_FOUND`。

### 3. 微内核 Fiber 生命周期管理
所有全局事件监听器（`keydown`、`mousedown`、`selectionchange`）以及 `<style>` 标签均严格由 `ctx.effect()` 托管。在插件热重载或卸载时，自动触发 `dispose()` 全量清理，保证 **0 事件泄漏、0 内存残留、0 样式污染**。

---

## 📦 安装与使用指南

### 方式一：使用 DSH 超级注入器（推荐 · 免重启热加载）

若您的 DSH 已经装载了 `dsh-super-injector`，可直接在终端或 Agent 中一键免重启热注入：

```powershell
# 1. 克隆仓库到本地目录
git clone https://github.com/wendou-chen/dsh-web-enhancements.git "D:/dsh-web-enhancements"
cd "D:/dsh-web-enhancements"

# 2. 安装依赖并编译产物
npm install
npm run build:client
npx tsc -p tsconfig.json

# 3. 通过 DSH 工具执行热注入
dev_inject_plugin(dir: "D:/dsh-web-enhancements")
```

### 方式二：手动配置 Profile 装配（冷启动方式）

1. 在 `~/.dsh/profiles/web/package.json`（或 `desktop` Profile）的 `dependencies` 中添加软链接：
   ```json
   {
     "dependencies": {
       "dsh-web-enhancements": "link:D:/dsh-web-enhancements"
     },
     "dsh": {
       "bundles": [
         "dsh-web-enhancements"
       ]
     }
   }
   ```
2. 在对应 Profile 的 `node_modules/` 下建立软链接（Windows Junction）：
   ```powershell
   cmd /c mklink /J "C:\Users\<YourUser>\.dsh\profiles\web\node_modules\dsh-web-enhancements" "D:\dsh-web-enhancements"
   ```
3. 启动或重启 DSH 服务即可生效。

---

## ⚙️ 配置项说明

在 `~/.dsh/settings.yaml` 中可对套件的各项功能进行单独开关控制：

```yaml
web-enhancements:
  enableFormulaCopy: true       # 启用 LaTeX 数学公式点击复制与 Toast 预览
  enableMermaid: true           # 启用 Mermaid 图表自动渲染与交互式工具栏
  enableQuoteReply: true        # 启用 Voyager 风格划词引用回复
  enableSendMode: true          # 启用快捷键发送模式切换
  defaultSendMode: 'ctrl-enter' # 默认模式：'ctrl-enter' (推荐) 或 'enter'
  enableInputCollapse: true     # 启用底部输入框原生一键收起/展开与防遮挡治理
```

---

## 🧪 自动化测试与质量验收

本套件包含完整的实机自动化验证脚本，确保在各类复杂场景下稳定运行：

```powershell
# 1. 运行输入框智能折叠与唤醒 5 项核心场景验收
node scripts/verify_scenarios.mjs

# 2. 运行 Render Guardian 数学公式与 Markdown 容错自愈单测
node scripts/test_render_guardian.mjs

# 3. 运行引用回复焦点与光标下移自动化测试
node scripts/verify_quote_reply_focus.mjs

# 4. 执行 DSH Extension Guard v4.0 端到端生命周期与健康自检
node "$env:USERPROFILE\.dsh\.agents\skills\dsh-extension-guard\scripts\verify_dsh.mjs"
```

---

## 🤝 参与贡献

欢迎提交 Issue 与 Pull Request！

1. Fork 本仓库并创建特性分支：`git checkout -b feat/my-cool-feature`
2. 运行构建与静态检查：`npm run typecheck && npm run build:client`
3. 提交变更：`git commit -m 'feat: add my cool feature'`
4. 推送分支：`git push origin feat/my-cool-feature`
5. 发起 Pull Request

---

## 📄 开源许可证

本项目采用 [MIT License](LICENSE) 开源协议。
