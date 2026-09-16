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
 * 纯函数：对原始 LaTeX 公式文本进行 7 阶启发式语法自愈与规范化
 */
export function healLatexFormula(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let healed = raw.trim();

  // 0. 清理 KaTeX 错误信息污染与外层围栏（移除错误高亮组合字符 \u0332、前缀及裸 $$ 符号）
  if (healed.startsWith('ParseError:')) {
    const match = healed.match(/at position \d+:\s*([\s\S]+)$/);
    if (match) {
      healed = match[1];
    }
  }
  healed = healed.replace(/[\u0300-\u036f]/g, ''); // 移除下划线等组合字符
  healed = healed.replace(/^\$\$+|\$\$+$/g, '').replace(/^\$+|\$+$/g, '').trim();

  // 1. XML / HTML 实体反转义
  healed = healed
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

  // 2. 宏命令与特殊符号纠正
  healed = healed
    .replace(/\\rarr\b/g, '\\rightarrow')
    .replace(/\\larr\b/g, '\\leftarrow')
    .replace(/\\lrarr\b/g, '\\leftrightarrow')
    .replace(/\\doublebarwedge\b/g, '\\overline{=}')
    .replace(/\\bold\{/g, '\\mathbf{')
    .replace(/\\oiint\b/g, '\\iint')
    .replace(/\\degree\b/g, '^\\circ')
    .replace(/\\s\.t\.\b/g, '\\text{s.t.}');

  // 3. 环境名称规范化 (KaTeX 顶层不支持 align / gather，需统一转为 aligned / gathered)
  healed = healed
    .replace(/\\begin\{align\*?\}/g, '\\begin{aligned}')
    .replace(/\\end\{align\*?\}/g, '\\end{aligned}')
    .replace(/\\begin\{gather\*?\}/g, '\\begin{gathered}')
    .replace(/\\end\{gather\*?\}/g, '\\end{gathered}');

  // 4. Alignment 自动包裹与环境闭合配平
  const openEnvCount = (healed.match(/\\begin\{(?:aligned|matrix|bmatrix|pmatrix|vmatrix|cases|array|split|gathered)\}/g) || []).length;
  const closeEnvCount = (healed.match(/\\end\{(?:aligned|matrix|bmatrix|pmatrix|vmatrix|cases|array|split|gathered)\}/g) || []).length;

  if (openEnvCount === 0 && closeEnvCount === 0 && (/&|\\\\/.test(healed))) {
    // 既没有 \begin 也没有 \end，但包含 & 或 \\：整体包裹
    healed = `\\begin{aligned}\n${healed}\n\\end{aligned}`;
  } else if (openEnvCount > closeEnvCount) {
    // 缺少 \end：补齐尾部
    healed += '\n\\end{aligned}'.repeat(openEnvCount - closeEnvCount);
  } else if (closeEnvCount > openEnvCount) {
    // 缺少 \begin：补齐头部
    healed = '\\begin{aligned}\n'.repeat(closeEnvCount - openEnvCount) + healed;
  }

  // 5. 行级 \left 与 \right 括号配平守卫
  // LaTeX 规定 \left 和 \right 不得跨越换行符 \\，否则 KaTeX 会抛出 Expected '\right', got '\end'
  let lines = healed.split('\\\\');
  lines = lines.map((line) => {
    // 排除转义的反斜杠等干扰
    const openLeftMatches = line.match(/\\left(?:[\(\[\{\.\|\/\\]|\\vert|\\Vert|\\langle|\\lfloor|\\lceil)/g) || [];
    const closeRightMatches = line.match(/\\right(?:[\)\]\}\.\|\/\\]|\\vert|\\Vert|\\rangle|\\rfloor|\\rceil)/g) || [];

    const openLeft = openLeftMatches.length;
    const closeRight = closeRightMatches.length;

    if (openLeft > closeRight) {
      line += ' \\right.'.repeat(openLeft - closeRight);
    } else if (closeRight > openLeft) {
      line = ' \\left.'.repeat(closeRight - openLeft) + line;
    }
    return line;
  });
  healed = lines.join('\\\\');

  // 6. 全局大括号闭合检查
  // 补齐末尾未闭合的大括号
  const openBraces = (healed.match(/(?<!\\)\{/g) || []).length;
  const closeBraces = (healed.match(/(?<!\\)\}/g) || []).length;
  if (openBraces > closeBraces) {
    healed += '}'.repeat(openBraces - closeBraces);
  }

  // 7. CJK 中文字符包裹（防止在数学模式下直接报错）
  healed = healed.replace(
    /([^\\](?:\\quad|\\qquad|\s|^))([\u4e00-\u9fa5\uff0c\uff08\uff09\uff1a\u3002\u3001]+)/g,
    '$1\\text{$2}'
  );

  return healed;
}

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
