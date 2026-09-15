# DSH 全能增强套件：输入框智能折叠与沉浸式打字唤醒重构实施计划（Codex 交付专用）

## 一、 项目背景与根因定义

### 1. 核心业务痛点
在 DSH（DeepSeek Harness）日常使用中，用户经常在输入框中粘入多行长文本、长代码或大段引用回复。此时若点击「📉 收起输入」，当前插件的实现会导致**在收起状态下输入框完全无法接收输入，光标彻底消失，键盘敲击无响应，用户被迫必须手动点击展开后才能继续打字**，严重打断思考与输入流。

### 2. 底层技术硬伤定位
- **破坏 DSH 复合三层架构**：DSH 输入区由 `外层滚动容器 (_scroll) + 绝对定位透明输入框 (textarea) + 绝对定位高亮层 (_backdrop) + 静态幽灵撑开层 (_mirror)` 构成。原代码在 `guard.ts` 中强行给 `textarea` 写入 `height: 52px; overflow-y: auto;`，导致内外产生双重滚动条撕裂，光标滚入视口外部的负坐标区域；
- **粗暴截断全局事件流**：原代码在 `handlePointer` 中，于 `mousedown` 的**捕获阶段（capture: true）**调用了 `e.preventDefault()` 和 `e.stopPropagation()`。在 W3C 标准下，`mousedown` 上的 `preventDefault()` 会**直接杀死浏览器的默认文本聚焦与光标落点机制**，并阻断 DSH 的 React 顶层合成事件；
- **缺乏交互自适应感知**：原代码缺乏对键盘输入（`keydown` / `beforeinput`）的监听与智能唤醒机制，收起状态被死锁在 52px 无法自愈。

---

## 二、 目标与核心架构设计（Smart Compact & Wakeup）

### 1. 设计原则
- **非侵入式约束（Non-intrusive Styling）**：
  严禁修改 `composer`（`textarea` 或 `Lexical contenteditable`）自身的定位与盒模型属性；仅对外层包裹容器（`[class*="_scroll"]`）约束紧凑高度（`38px`，刚好容纳单行文本 + 上下内边距 + 光标）并启用平滑缓动过渡；
- **智能按键唤醒（Type-to-Expand）**：
  收起状态下，用户无需手动点开，**直接敲击键盘输入任意字符，输入框以 `0.22s` 平滑动画展开回正常自适应高度**，首字 100% 录入，零丢字、零延迟；
- **智能点击唤醒（Click-to-Expand）**：
  收起状态下，用户只要用鼠标点击输入框或卡片的任意有效文本区域，**立即平滑展开并将光标精确定位到文本末尾**；
- **快捷避让（Escape-to-Collapse）**：
  当长输入框展开后用户想临时查看上方 AI 消息时，按 **`Escape` 键**即可一键收起为 38px 紧凑单行条；
- **DSH 扩展生命周期安全（Extension Guard 合规）**：
  严格维持前端依赖白名单，不引入非标准外部模块，确保在 DSH Web 与 Desktop 双端 100% 启动安全与热重载无损。

---

## 三、 分步落地执行与代码实现

### 步骤 1：重构核心守护类 `src/client/features/collapse/guard.ts`
将 `D:\dsh-web-enhancements\src\client\features\collapse\guard.ts` 完全替换为以下开箱即用的现代化自适应控制器：

```typescript
import { findDshComposer, DshComposer, isTextArea, focusComposerEnd } from '../../shared/dom-utils.js';

const STORAGE_KEY = 'dshInputCollapsed';
/** 单行紧凑模式的高度（恰好容纳 1 行完整文字 + 上下内边距 + 原生光标） */
export const COMPACT_SCROLL_HEIGHT = 38;

export class CollapseGuard {
  private collapsed = false;
  private observer: MutationObserver | null = null;
  private boundComposer: DshComposer | null = null;
  private onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private onBeforeInputHandler: ((e: Event) => void) | null = null;

  constructor() {
    try {
      this.collapsed = localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      this.collapsed = false;
    }
  }

  public isCollapsed(): boolean {
    return this.collapsed;
  }

  public setCollapsed(value: boolean): void {
    this.collapsed = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch (_) {}

    if (this.collapsed) {
      this.applyCollapsed();
    } else {
      this.applyExpanded();
    }
  }

  public toggle(): boolean {
    this.setCollapsed(!this.collapsed);
    return this.collapsed;
  }

  public start(): void {
    if (this.collapsed) {
      this.applyCollapsed();
    }

    // 观察 DOM 树节点挂载，确保会话切换后新挂载的输入框依然遵循状态
    this.observer = new MutationObserver(() => {
      if (this.collapsed) {
        this.applyCollapsed();
      }
      this.attachComposerListeners();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.attachComposerListeners();
  }

  /**
   * 为当前活动的输入框绑定智能交互唤醒监听：
   * 1. 收起状态下，按键输入（keydown/beforeinput）自动平滑展开；
   * 2. 展开状态下，按 Escape 键快捷收起。
   */
  private attachComposerListeners(): void {
    const composer = findDshComposer();
    if (!composer || composer === this.boundComposer) return;

    this.detachComposerListeners();
    this.boundComposer = composer;

    this.onKeyDownHandler = (e: KeyboardEvent) => {
      // 1. 展开状态下：按 Esc 键快捷收起避让正文
      if (!this.collapsed && e.key === 'Escape') {
        e.preventDefault();
        this.setCollapsed(true);
        return;
      }

      // 2. 收起状态下：敲击有效输入键自动唤醒展开（排除独立按下的功能修饰键）
      if (this.collapsed) {
        if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) {
          return;
        }
        this.setCollapsed(false);
      }
    };

    this.onBeforeInputHandler = () => {
      if (this.collapsed) {
        this.setCollapsed(false);
      }
    };

    composer.addEventListener('keydown', this.onKeyDownHandler as EventListener, true);
    composer.addEventListener('beforeinput', this.onBeforeInputHandler as EventListener, true);
  }

  private detachComposerListeners(): void {
    if (this.boundComposer) {
      if (this.onKeyDownHandler) {
        this.boundComposer.removeEventListener('keydown', this.onKeyDownHandler as EventListener, true);
      }
      if (this.onBeforeInputHandler) {
        this.boundComposer.removeEventListener('beforeinput', this.onBeforeInputHandler as EventListener, true);
      }
      this.boundComposer = null;
    }
  }

  /**
   * 应用收起状态：
   * 绝不破坏 composer 自身的 height/maxHeight/overflow；
   * 仅约束外层滚动容器（_scroll）的最大高度，保持单行紧凑预览，彻底消除双滚动条错位。
   */
  public applyCollapsed(): void {
    const composer = findDshComposer();
    if (!composer) return;

    // 清理可能遗留的内联脏样式，恢复原生绝对定位与撑开机制
    composer.style.height = '';
    composer.style.maxHeight = '';
    composer.style.overflowY = '';

    const scroll = composer.closest('[class*="_scroll"]') as HTMLElement | null;
    if (scroll) {
      scroll.style.maxHeight = `${COMPACT_SCROLL_HEIGHT}px`;
      scroll.style.overflowY = 'auto';
      scroll.style.transition = 'max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }

  /**
   * 应用展开状态：
   * 清除滚动容器高度限制，恢复多行自适应高度。
   */
  public applyExpanded(): void {
    const composer = findDshComposer();
    if (!composer) return;

    composer.style.height = '';
    composer.style.maxHeight = '';
    composer.style.overflowY = '';

    const scroll = composer.closest('[class*="_scroll"]') as HTMLElement | null;
    if (scroll) {
      scroll.style.maxHeight = '';
      scroll.style.overflowY = '';
      scroll.style.transition = 'max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    requestAnimationFrame(() => {
      if (!composer.isConnected) return;
      composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    });
  }

  /**
   * 点击卡片/输入框时的唤醒恢复：
   * 彻底移除有害的 preventDefault / stopPropagation，让浏览器原生事件自然流转。
   * 用户在收起状态下点击卡片输入区时，自动平滑展开并对焦末尾。
   */
  public handlePointer(e: MouseEvent): void {
    if (!this.collapsed) return;
    const composer = findDshComposer();
    if (!composer) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // 若点击的是工具栏按钮、发送按钮、模型选择器等操作控件，放行原生行为，不强行展开
    if (target.closest('button, select, [role="button"], [role="menuitem"]')) {
      return;
    }

    const card = composer.closest('[class*="_card"]') as HTMLElement | null;
    if ((card && card.contains(target)) || composer.contains(target) || target === composer) {
      this.setCollapsed(false);
      requestAnimationFrame(() => {
        focusComposerEnd(composer);
      });
    }
  }

  public dispose(): void {
    this.observer?.disconnect();
    this.detachComposerListeners();
    this.applyExpanded();
  }
}
```

---

### 步骤 2：重构特性入口 `src/client/features/collapse/index.ts`
将 `D:\dsh-web-enhancements\src\client\features\collapse\index.ts` 替换为以下代码，消除有害的捕获阶段拦截，并加入双向状态自愈同步：

```typescript
import { CollapseGuard } from './guard.js';

export function initInputCollapse(): () => void {
  const guard = new CollapseGuard();
  guard.start();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dsh-action-pill dsh-collapse-pill';

  const render = () => {
    const collapsed = guard.isCollapsed();
    btn.textContent = collapsed ? '📈 展开输入' : '📉 收起输入';
    btn.title = collapsed
      ? '恢复输入框多行展开（点击输入框或敲击键盘亦可自动唤醒）'
      : '收起输入框为单行紧凑模式，避让正文（Esc 可快捷收起）';
  };

  btn.addEventListener('click', () => {
    guard.toggle();
    render();
  });

  render();
  document.body.appendChild(btn);

  // 当用户因敲击键盘或点击卡片触发自动展开时，同步更新右上角按钮状态
  const stateSyncTimer = window.setInterval(() => {
    const isCollapsed = guard.isCollapsed();
    const isRenderedCollapsed = (btn.textContent || '').includes('展开输入');
    if (isCollapsed !== isRenderedCollapsed) {
      render();
    }
  }, 250);

  // 在正常冒泡阶段监听 mousedown，检测到卡片点击即自动平滑展开（不拦截任何默认事件）
  const onMousedown = (e: MouseEvent) => {
    guard.handlePointer(e);
  };
  document.addEventListener('mousedown', onMousedown, false);

  return () => {
    window.clearInterval(stateSyncTimer);
    document.removeEventListener('mousedown', onMousedown, false);
    guard.dispose();
    btn.remove();
  };
}
```

---

### 步骤 3：构建与静态编译检查
在 `D:\dsh-web-enhancements` 目录下执行编译流水线：
```powershell
Push-Location "D:\dsh-web-enhancements"
# 1. 静态类型校验
npx tsc --noEmit
# 2. 客户端 Rollup/Rolldown 打包产出 lib/client.js
npx tsdown
# 3. Host 端 TypeScript 编译
npx tsc
Pop-Location
```
**交付验证标准**：退出码为 0，且产物 `D:\dsh-web-enhancements\lib\client.js` 与 `lib/index.js` 均成功更新。

---

### 步骤 4：零停机热重载与生效
利用 DSH 内部的超级注入器热重载命令，将新版代码推送至当前运行实例，免重启生效：
```powershell
# 通过 DSH 工具 API 调用热重载
dev_reload_package(packageName: "dsh-web-enhancements")
```
或者在浏览器中按 `F5` 刷新页面重新加载静态脚本。

---

## 四、 自动化与实机测试验证规范（Test Matrix）

针对本次改造，必须逐一验证以下 5 个场景，确保 100% 达到预期的人性化交互：

| 测试场景编号 | 操作步骤 | 预期交互结果 |
| :--- | :--- | :--- |
| **TC-01：长文本收起与避让** | 在输入框中输入或粘贴 10 行以上内容，点击右下角 **「📉 收起输入」** 按钮。 | 输入框以 0.22s 平滑缓动收缩为 **38px 单行高度**，上方聊天流获得完整视野，界面绝不抖动。 |
| **TC-02：收起状态下键盘直接打字** | 在处于收起的 38px 状态下，直接在键盘敲击文字（如输入“你好”）。 | **输入框瞬间自动平滑展开**，所敲击的首字完整上屏，无吞字、无卡顿，光标跟随文字前进。 |
| **TC-03：收起状态下鼠标点击唤醒** | 在处于收起的 38px 状态下，鼠标左键点击输入框任意文本区域。 | **输入框瞬间自动平滑展开**，光标精准停留在文本最后一行末尾，无需二次点击。 |
| **TC-04：快捷键一键避让** | 在输入框展开写完一段话后，按下键盘 **`Escape`** 键。 | 输入框立刻收缩回 38px 单行紧凑栏，右下角药丸按钮自动同步变为 **「📈 展开输入」**。 |
| **TC-05：已有快捷键逻辑无冲突** | 测试 `Enter`（换行）与 `Ctrl+Enter`（发送/排队/插话）。 | 发送行为完全正常，空输入按 Ctrl+Enter 保持安全拦截，绝不误触停止按钮导致会话中断。 |

---

## 五、 DSH 终极生命周期与健康自检（确保 100% 可启动）

依据 `dsh-extension-guard` 守卫规范，在交付前必须执行离线静态全项自检：
```powershell
node "$env:USERPROFILE\.codex\skills\dsh-extension-guard\scripts\verify_dsh.mjs" --offline-only
```
**合格标准**：
- 阶段 0（缺陷自愈）、阶段 1（凭据完整性）、阶段 2（Provider 协议）、阶段 3（Bundle 声明）、阶段 4（模块导入及 External 纯净度）**全部输出 `[PASS]`**；
- 绝不产生孤立进程占用 `3080` 端口；
- 确保 DSH 重启或冷启动时绝对正常加载。
