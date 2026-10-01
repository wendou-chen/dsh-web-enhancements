import { isTargetEditable } from '../../shared/dom-utils.js';

export interface FileSearchController {
  dispose: () => void;
}

export function initFileSearch(): () => void {
  let observer: MutationObserver | null = null;
  let activeContainer: HTMLElement | null = null;

  function highlightMatch(text: string, query: string): string {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(`(${escaped})`, 'gi');
    return text.replace(reg, '<mark class="dsh-search-match">$1</mark>');
  }

  function getFileTypeIconKind(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['md', 'markdown'].includes(ext)) return '📝';
    if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) return '📜';
    if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return '⚙️';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📕';
    if (['tex', 'latex'].includes(ext)) return '📐';
    return '📄';
  }

  function mountSearchBar(filesRootEl: HTMLElement) {
    if (filesRootEl.querySelector('.dsh-file-search-bar')) return;

    const header = filesRootEl.querySelector('[data-files-header], div:first-child');
    if (!header) return;

    const bar = document.createElement('div');
    bar.className = 'dsh-file-search-bar';
    bar.innerHTML = `
      <div class="dsh-file-search-input-wrapper">
        <span class="dsh-file-search-icon">🔍</span>
        <input type="text" class="dsh-file-search-input" placeholder="按文件名快速搜索并预览 (Esc 清空)..." spellcheck="false" />
        <button type="button" class="dsh-file-search-clear" title="清空搜索" style="display: none;">✕</button>
      </div>
      <div class="dsh-file-search-dropdown" style="display: none;">
        <ul class="dsh-file-search-list"></ul>
      </div>
    `;

    // 插入在 header 之后
    header.insertAdjacentElement('afterend', bar);

    const input = bar.querySelector('.dsh-file-search-input') as HTMLInputElement;
    const clearBtn = bar.querySelector('.dsh-file-search-clear') as HTMLButtonElement;
    const dropdown = bar.querySelector('.dsh-file-search-dropdown') as HTMLElement;
    const list = bar.querySelector('.dsh-file-search-list') as HTMLUListElement;

    let selectedIndex = -1;

    function renderResults(query: string) {
      const q = query.trim().toLowerCase();
      if (!q) {
        dropdown.style.display = 'none';
        clearBtn.style.display = 'none';
        list.innerHTML = '';
        selectedIndex = -1;
        return;
      }

      clearBtn.style.display = 'flex';

      // 抓取当前页面文件树中的所有文件与目录项
      const fileElements = Array.from(filesRootEl.querySelectorAll<HTMLElement>('[data-files-entry="file"], [data-files-entry="directory"]'));
      
      const matchedItems: Array<{
        el: HTMLElement;
        name: string;
        path: string;
        isDir: boolean;
        btn: HTMLButtonElement | null;
      }> = [];

      for (const el of fileElements) {
        const path = el.getAttribute('data-files-path') || '';
        const isDir = el.getAttribute('data-files-entry') === 'directory';
        const nameSpan = el.querySelector('span:last-child');
        const name = nameSpan?.textContent?.trim() || path.split(/[\/\\]/).pop() || '';
        const btn = el.querySelector('button');

        if (name.toLowerCase().includes(q) || path.toLowerCase().includes(q)) {
          matchedItems.push({ el, name, path, isDir, btn });
        }
      }

      if (matchedItems.length === 0) {
        list.innerHTML = `
          <li class="dsh-file-search-empty">
            <span class="empty-icon">📂</span>
            <span>未在已展开的文件树中找到与 "${query}" 匹配的文件</span>
          </li>
        `;
        dropdown.style.display = 'block';
        selectedIndex = -1;
        return;
      }

      list.innerHTML = matchedItems
        .map((item, index) => {
          const icon = item.isDir ? '📁' : getFileTypeIconKind(item.name);
          const highlightedName = highlightMatch(item.name, query);
          const highlightedPath = highlightMatch(item.path, query);
          return `
            <li class="dsh-file-search-item" data-index="${index}">
              <span class="item-icon">${icon}</span>
              <div class="item-meta">
                <div class="item-name">${highlightedName}</div>
                <div class="item-path">${highlightedPath}</div>
              </div>
            </li>
          `;
        })
        .join('');

      dropdown.style.display = 'block';
      selectedIndex = 0;
      updateSelection();

      // 点击项事件绑定
      const renderedLis = list.querySelectorAll<HTMLLIElement>('.dsh-file-search-item');
      renderedLis.forEach((li, idx) => {
        li.addEventListener('click', () => {
          const target = matchedItems[idx];
          if (target && target.btn) {
            target.btn.click();
            dropdown.style.display = 'none';
            input.value = '';
            clearBtn.style.display = 'none';
          }
        });
      });
    }

    function updateSelection() {
      const items = list.querySelectorAll<HTMLElement>('.dsh-file-search-item');
      items.forEach((it, idx) => {
        if (idx === selectedIndex) {
          it.classList.add('is-selected');
          it.scrollIntoView({ block: 'nearest' });
        } else {
          it.classList.remove('is-selected');
        }
      });
    }

    input.addEventListener('input', () => {
      renderResults(input.value);
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll<HTMLElement>('.dsh-file-search-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          selectedIndex = (selectedIndex + 1) % items.length;
          updateSelection();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          updateSelection();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          (items[selectedIndex] as HTMLElement)?.click();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.value = '';
        renderResults('');
        input.blur();
      }
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      renderResults('');
      input.focus();
    });

    // 点击外部自动收起下拉
    document.addEventListener('click', (e) => {
      if (!bar.contains(e.target as Node)) {
        dropdown.style.display = 'none';
      }
    });
  }

  function checkAndAttach() {
    const filesRoots = document.querySelectorAll<HTMLElement>('[data-files-state="tree"]');
    filesRoots.forEach((el) => {
      mountSearchBar(el);
    });
  }

  observer = new MutationObserver(() => {
    checkAndAttach();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 初始检测一次
  checkAndAttach();

  return () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    document.querySelectorAll('.dsh-file-search-bar').forEach((el) => el.remove());
  };
}
