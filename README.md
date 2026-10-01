# 🚀 DSH 全能增强套件 (dsh-web-enhancements)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DSH Compatibility](https://img.shields.io/badge/DSH-Web%20%7C%20Desktop-green.svg)](https://github.com/wendou-chen/dsh-web-enhancements)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Bundled with tsdown](https://img.shields.io/badge/Bundler-tsdown%20(Rolldown)-orange.svg)](https://github.com/sxzz/tsdown)
[![Cordis Microkernel](https://img.shields.io/badge/Architecture-Cordis%20Fiber-purple.svg)](https://cordis.moe/)

**DSH 全能增强套件 (`dsh-web-enhancements`)** 是专为 **DeepSeek Harness (DSH)** 深度定制的一站式全功能前端与宿主增强插件。

全面兼容 **DSH Web 端** 与 **DSH Desktop 桌面端**，无缝补齐大模型对话中的公式交互、图表渲染、长文本划词、输入流控制、模式快速轮转、工作区绝对路径复制与界面防遮挡痛点，提供媲美原生桌面应用的极致交互体验。

---

## ✨ 核心特性矩阵

### 1. 📁 工作区绝对物理路径秒级复制 (Workspace Path One-Click Copy)
- **左侧列表 Hover 快捷按钮**：悬停工作区条目时，在操作栏直接浮现 `📁 / 📋` 路径复制图标，单击秒级提取绝对路径；
- **悬浮控制球一键直达**：FAB 快捷菜单中提供「📋 复制当前工作区路径」；
- **8 重多级防御解析引擎**：URL Hash 逆查 ➔ `workspaces.items` 会话反查 ➔ React Fiber 节点直读 ➔ 标题匹配 ➔ Windows 路径反斜杠规范化，彻底解决从前端提取底层物理路径的痛点。

### 2. 🎯 Shift+Tab 智能模式轮转 (Shift+Tab Mode Cycling)
- **全局三态轮转**：在任意聚焦状态下按下 `Shift+Tab`，在「标准模式 ⇄ Plan 计划模式 ⇄ Goal 目标模式」之间丝滑切换；
- **自定义 Agent 预设自适应**：自动识别自定义 Agent 预设（无 Goal 模式能力），智能降级为「标准模式 ⇄ Plan 模式」双态闭环；
- **焦点与输入保护**：零吞字、零光标跳动，配合毛玻璃高对比度 Toast 提供清晰视觉反馈。

### 3. 🎈 可拖拽悬浮控制球 (Draggable FAB Quick Controller)
- **原生指针重置**：光标维持标准点击手型 `cursor: pointer`，彻底移除 `grab` 抓手光标困扰；
- **100% 点击穿透隔离**：容器层声明 `pointer-events: none`，仅在小球圆盘与激活菜单启用 `pointer-events: auto`，绝不遮挡底层网页交互；
- **集成快捷菜单**：一键切换发送模式、开启/关闭划词引用、开启/关闭公式复制、收起/展开输入框、复制工作区路径。

### 4. 🧮 LaTeX 数学公式一键复制与去重 (LaTeX Click-to-Copy & De-nesting)
- **单层纯净微光外框**：通过 `:not(.katex-display *)` 排除嵌套子节点，并显式清除子节点样式，彻底消除 KaTeX 块级公式内部双层同心框与背景色叠加；
- **悬停感知与智能源码提取**：划过公式高亮微蓝边框，点击瞬间提取原始 LaTeX 代码；
- **XML 实体反转义**：自动消除 `&amp;`、`&lt;` 等转义字符，复制结果可直接粘贴至 Overleaf、Typora 或 Markdown 笔记；
- **毛玻璃 Toast 预览**：顶部浮现高质感气泡，实时展示已复制的 LaTeX 源码。

### 5. 📊 Mermaid 交互式图表渲染引擎 (Mermaid Interactive Canvas)
- **动态自动渲染**：自动识别模型输出的 ` ```mermaid ` 代码块并渲染为矢量级高清交互 SVG；
- **全功能控制栏**：支持缩放、平移（Pan & Zoom）、源码复制、导出 SVG 与全屏沉浸式预览；
- **流式防抖与容错**：内置 300ms 打字防抖，语法解析异常时自动展示局部错误 Banner，绝不破坏页面流。

### 6. 💬 Voyager 风格划词引用回复 (Smart Quote & Reply)
- **智能悬浮气泡**：选中会话中的任意段落时，自动在选区上方浮现「💬 引用回复」胶囊按钮（已消除黑边与未脱底方块）；
- **高保真逆向格式化**：选区内的公式自动反解析为 `$...$` / `$$...$$`，代码块保留语言标签与缩进；
- **状态穿透注入**：穿透 React / Lexical 受控状态机安全插入 `> 引用文本`，并自动对焦在下方空行。

### 7. ⚡ 发送快捷键切换与原生插话 (Send Mode & Native Steer)
- **双模式一键切换**：支持 `Ctrl+Enter 发送`（单按 Enter 换行）与 `Enter 发送`（Shift+Enter 换行）；
- **三重输入法（IME）防抖屏障**：结合 `isComposing`、`keyCode === 229` 与 50ms 状态锁，100% 杜绝输入法选字回车误发；
- **原生生成态插话（Steer Bypass）**：与 DSH 官方 `busyEnter: queue` 深度协同，生成态按 `Ctrl+Enter` 触发原生 `Steer` 插话。

### 8. 📉 输入框智能折叠与沉浸式唤醒 (Smart Compact & Wakeup)
- **单行紧凑模式（38px）**：一键将底部输入区域平滑收缩至 38px，彻底消除对聊天记录的遮挡；
- **打字与点击唤醒**：直接敲击键盘或点击输入区，`0.22s` 平滑动画展开，首字 100% 录入、零吞字；
- **快捷避让**：按 `Escape` 键即可瞬间收起为紧凑单行条。

### 9. 🛡️ Render Guardian 智能自愈引擎 (DOM Render Guardian)
- **7 阶启发式语法自愈**：消除 HTML 实体、纠正宏与符号、环境标准化、对齐自动包裹、`\left` / `\right` 逐行平衡、花括号闭合、中文数学隔离；
- **无损实时重渲染**：捕获 `.katex-error` 节点就地重渲染为矢量数学，彻底根治公式红字报错。

### 10. 🔍 工作区文件快速过滤 (Sidebar File Search)
- **右侧文件树快速检索**：在文件列表顶部注入过滤搜索栏，即时高亮匹配项并联动 Markdown 预览。

### 11. 🔔 任务完成提示音与通知窗 (Task Notifier)
- **多端任务通知**：任务结束时触发提示音，并支持可缩放浮窗展示最新进度。

---

## 🏗️ 架构与设计规范

### 1. 插槽双键注册契约规范
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
  enableWorkspacePath: true     # 启用工作区物理路径秒级复制
  enableModeCycle: true         # 启用 Shift+Tab 智能模式轮转 (标准/Plan/Goal)
  enableFloatingBall: true      # 启用可拖拽悬浮控制球
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

# 4. 执行 DSH Extension Guard 端到端生命周期与分诊健康自检
node "$env:USERPROFILE\.codex\skills\dsh-extension-guard\scripts\dispatch_doctor.mjs"
```

---

## 🧩 生态与相关项目

| 项目 | 定位 | 与本套件的关系 |
|---|---|---|
| [**dsh-render-perf**](https://github.com/wendou-chen/dsh-render-perf) | DSH Web 公式渲染性能治理 | **互补，可叠加安装**。本套件负责 UI 与交互增强；该插件负责渲染性能——在 HTTP 响应流中为前端数学渲染函数注入结果缓存，并让滚动视口外的消息块退出渲染流水线。公式密集型长会话的切换卡顿实测降低 **75%**（1832 ms → 455 ms）。 |

> 两者**零代码耦合**。本套件走稳定的 DOM / Slot 契约，迭代节奏跟随功能需求；而 `dsh-render-perf` 的补丁锚定 DSH 前端产物内部实现，必须跟随 DSH 版本适配，因此独立成库维护。同时安装没有任何冲突——本套件的公式点击复制、Render Guardian 等特性在该插件生效后均已回归验证。

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