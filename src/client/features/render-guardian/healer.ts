/**
 * DSH Markdown & LaTeX 渲染容错与文本自愈引擎
 */

/**
 * 全角标点到半角标点的映射表（针对 KaTeX 无法解析的中文符号）
 */
const FULLWIDTH_MAP: Record<string, string> = {
  '！': '!',
  '（': '(',
  '）': ')',
  '，': ',',
  '：': ':',
  '；': ';',
  '？': '?',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '【': '[',
  '】': ']',
};

/**
 * 纯函数：对原始 Markdown 文本进行四级数学公式渲染容错与自愈修复
 */
export function healMarkdownMath(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;

  // 1. 拆分代码块（``` ... ```）保护区域，代码块内部不进行公式自愈
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks: string[] = [];
  let placeholderIndex = 0;

  const textWithoutCode = raw.replace(codeBlockRegex, (match) => {
    const placeholder = `__DSH_CODE_BLOCK_PLACEHOLDER_${placeholderIndex++}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2. 逐行处理公式围栏、缩进对齐与泄漏阻断
  const lines = textWithoutCode.split('\n');
  const healedLines: string[] = [];

  let inMathBlock = false;
  let blockIndent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检查是否为 $$ 独立行
    const mathFenceMatch = line.match(/^(\s*)\$\$\s*$/);

    if (mathFenceMatch) {
      if (!inMathBlock) {
        // 进入数学公式块
        inMathBlock = true;
        blockIndent = mathFenceMatch[1];
        healedLines.push(line);
      } else {
        // 闭合数学公式块：缩进对齐修复（Indentation Normalizer）
        // 若闭合缩进小于开启缩进，自动补齐前导空格以满足 CommonMark 规范
        const currentIndent = mathFenceMatch[1];
        const fixedLine = currentIndent.length < blockIndent.length ? `${blockIndent}$$` : line;
        inMathBlock = false;
        blockIndent = '';
        healedLines.push(fixedLine);
      }
      continue;
    }

    if (inMathBlock) {
      // 检查排版泄漏阻断（Accidental Math Block Splitter）
      // 若处于公式块内部，但该行明显是 Markdown 块级结构（标题、分割线、引用、无序列表、有序列表）
      // 说明模型漏写了闭合 $$ 或误将 Markdown 包含在公式内，在此处提前插入闭合 $$ 阻断公式溢出
      const isHeading = /^(\s*)(#{1,6}\s+)/.test(line);
      const isDivider = /^(\s*)(---|===|\*\*\*)\s*$/.test(line);
      const isBlockquote = /^(\s*)>\s+/.test(line);
      const isUnorderedList = /^(\s*)[-*+]\s+/.test(line);
      const isOrderedList = /^(\s*)\d+\.\s+/.test(line);

      if (isHeading || isDivider || isBlockquote || isUnorderedList || isOrderedList) {
        // 强制提前闭合前置公式块
        healedLines.push(`${blockIndent}$$`);
        inMathBlock = false;
        blockIndent = '';
        healedLines.push(line);
        continue;
      }

      // 全角标点转义与半角化（Full-width Sanitizer）
      let sanitizedLine = line;
      for (const [full, half] of Object.entries(FULLWIDTH_MAP)) {
        if (sanitizedLine.includes(full)) {
          sanitizedLine = sanitizedLine.replaceAll(full, half);
        }
      }
      healedLines.push(sanitizedLine);
    } else {
      // 在非 $$ 块中：处理行内公式 $...$ 内部的全角字符
      const sanitizedLine = line.replace(/\$([^\$\n]+)\$/g, (match, formula) => {
        let fixedFormula = formula;
        for (const [full, half] of Object.entries(FULLWIDTH_MAP)) {
          if (fixedFormula.includes(full)) {
            fixedFormula = fixedFormula.replaceAll(full, half);
          }
        }
        return `$${fixedFormula}$`;
      });
      healedLines.push(sanitizedLine);
    }
  }

  // 3. 奇偶闭合兜底（Unclosed Fence Balancer）
  if (inMathBlock) {
    healedLines.push(`${blockIndent}$$`);
  }

  let resultText = healedLines.join('\n');

  // 4. 还原代码块
  for (let i = 0; i < codeBlocks.length; i++) {
    resultText = resultText.replace(`__DSH_CODE_BLOCK_PLACEHOLDER_${i}__`, codeBlocks[i]);
  }

  return resultText;
}
