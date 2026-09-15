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
