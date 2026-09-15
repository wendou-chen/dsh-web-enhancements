import { MermaidManager } from './renderer.js';

export function initMermaid(): () => void {
  const manager = new MermaidManager();
  void manager.start();

  return () => {
    manager.dispose();
  };
}
