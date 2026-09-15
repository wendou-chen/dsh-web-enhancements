import { SendModePolicy, SendMode } from './policy.js';

export function initSendMode(defaultMode: SendMode = 'ctrl-enter'): () => void {
  const policy = new SendModePolicy(defaultMode);

  // 浮动切换药丸
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dsh-action-pill dsh-send-mode-pill';

  const render = () => {
    const mode = policy.getMode();
    btn.textContent = mode === 'ctrl-enter' ? '⌨️ Ctrl+Enter 发送' : '⌨️ Enter 发送';
    btn.title = mode === 'ctrl-enter'
      ? '当前模式：Ctrl+Enter 发送、Enter 换行（点击切换）'
      : '当前模式：Enter 发送、Shift+Enter 换行（点击切换）';
  };

  btn.addEventListener('click', () => {
    policy.toggleMode();
    render();
  });

  render();
  document.body.appendChild(btn);

  const onKeydown = (e: KeyboardEvent) => policy.handleKeydown(e);
  const onCompStart = () => policy.onCompositionStart();
  const onCompEnd = () => policy.onCompositionEnd();

  window.addEventListener('keydown', onKeydown, true);
  document.addEventListener('compositionstart', onCompStart, true);
  document.addEventListener('compositionend', onCompEnd, true);

  return () => {
    window.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('compositionstart', onCompStart, true);
    document.removeEventListener('compositionend', onCompEnd, true);
    btn.remove();
  };
}
