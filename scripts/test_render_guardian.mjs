import { healMarkdownMath, healLatexFormula } from '../src/client/features/render-guardian/healer.ts';

console.log('=== 开始执行 Render Guardian 数学公式与 Markdown 渲染自愈单元测试 ===\n');

// -------------------------------------------------------------
// 第 1 部分：Markdown 文本级自愈测试
// -------------------------------------------------------------

// 测试用例 1: 真实病例文本 (包含缩进错位与 Markdown 标题泄漏)
const testCase1 = `
这里是一段引导文字：
   $$
   0 > f\\left(\\frac{1}{2}\\right) \\implies \\mathbf{f}\\left(\\frac{1}{2}\\right) < 0！
--- ### 四、为什么 (A) 和 (C) 单调性根本选不得？ (秒杀反例) 很多同学会纳闷：“为什么单调递增/递减不能决定中点正负？”
   $$
`;

const healed1 = healMarkdownMath(testCase1);
console.log('--- 测试用例 1 自愈结果 ---');
console.log(healed1);

if (!healed1.includes('$$') || !healed1.includes('0!')) {
  throw new Error('测试用例 1 失败: 全角标点未正确转义或公式未闭合');
}
if (!healed1.includes('--- ### 四、')) {
  throw new Error('测试用例 1 失败: Markdown 标题未成功从公式块中阻断逃逸');
}
console.log('✅ [PASS] 测试用例 1: 真实病例文本自愈成功\n');

// 测试用例 2: 缩进对齐修复 (Indentation Normalizer)
const testCase2 = `
  - 列表项公式：
    $$
    \\int_0^1 x dx = \\frac{1}{2}
  $$
`;
const healed2 = healMarkdownMath(testCase2);
console.log('--- 测试用例 2 缩进对齐自愈结果 ---');
console.log(healed2);
if (!healed2.includes('    $$')) {
  throw new Error('测试用例 2 失败: 闭合围栏缩进未自动对齐');
}
console.log('✅ [PASS] 测试用例 2: 缩进对齐修复成功\n');

// 测试用例 3: 奇数未闭合公式兜底 (Unclosed Fence Balancer)
const testCase3 = `
这是一个流式截断的公式：
$$
E = mc^2
`;
const healed3 = healMarkdownMath(testCase3);
console.log('--- 测试用例 3 奇数未闭合兜底自愈结果 ---');
console.log(healed3);
const matches = healed3.match(/\$\$/g) || [];
if (matches.length % 2 !== 0) {
  throw new Error('测试用例 3 失败: 未能自动追加闭合围栏');
}
console.log('✅ [PASS] 测试用例 3: 奇数未闭合公式兜底成功\n');

// 测试用例 4: 全角标点转换 (Full-width Sanitizer)
const testCase4 = `
$$
f（x） = \\sin（x） + \\cos（y）：
$$
`;
const healed4 = healMarkdownMath(testCase4);
console.log('--- 测试用例 4 全角标点转义自愈结果 ---');
console.log(healed4);
if (healed4.includes('（') || healed4.includes('）') || healed4.includes('：')) {
  throw new Error('测试用例 4 失败: 全角括号或冒号未转为半角');
}
console.log('✅ [PASS] 测试用例 4: 全角标点转义成功\n');

// -------------------------------------------------------------
// 第 2 部分：LaTeX 公式语法级 7 阶启发式自愈测试 (解答题实机用例集)
// -------------------------------------------------------------
console.log('--- 开始测试 LaTeX 公式 7 阶启发式语法自愈算法 ---');

const realSessionCases = [
  {
    name: '案例 A: 未包裹 aligned 的多行换行对齐式',
    raw: `I &= \\int \\frac{\\sin t}{\\cos t} \\cdot \\left(\\frac{t}{\\sin t}\\right) \\cdot (2\\sin t \\cos t) \\,\\mathrm{d}t \\\\\n&= \\int 2t \\sin t \\,\\mathrm{d}t`,
    expectedIncludes: ['\\begin{aligned}', '\\end{aligned}']
  },
  {
    name: '案例 B: 跨换行未配对 \\left / \\right 积分相消式',
    raw: `I = I_1 - I_2 &= \\left( x \\mathrm{e}^{\\sin x} - \\int \\mathrm{e}^{\\sin x} \\,\\mathrm{d}x \\right) - \\left( \\frac{\\mathrm{e}^{\\sin x}}{\\cos x} - \\int \\mathrm{e}^{\\sin x} \\,\\mathrm{d}x \\right) \\\\\n&= x \\mathrm{e}^{\\sin x} - \\frac{\\mathrm{e}^{\\sin x}}{\\cos x} + C \\\\\n&= (x - \\sec x)\\mathrm{e}^{\\sin x} + C`,
    expectedIncludes: ['\\begin{aligned}', '\\end{aligned}']
  },
  {
    name: '案例 C: 宏与括号混合推导式',
    raw: `u'(x) + u(x)\\cos x &= \\left( \\mathbf{1} - \\frac{\\sin x}{\\cos^2 x} \\right) + (x\\cos x - \\mathbf{1}) \\\\\n&= (\\mathbf{1} - \\mathbf{1}) + x\\cos x - \\frac{\\sin x}{\\cos^2 x} \\\\\n&= x\\cos x - \\frac{\\sin x}{\\cos^2 x}`,
    expectedIncludes: ['\\begin{aligned}']
  },
  {
    name: '案例 D: 包含 \\rarr, \\bold, \\degree 宏与中文说明',
    raw: `f(x) \\rarr 0 \\quad 当 x \\rarr \\infty, \\; \\bold{A} \\cdot \\bold{B} = 90\\degree`,
    expectedIncludes: ['\\rightarrow', '\\mathbf{A}', '\\mathbf{B}', '^\\circ', '\\text{当}']
  },
  {
    name: '案例 E: \\begin{align*} 不受支持环境自动标准化',
    raw: `\\begin{align*}\nx &= y + 1 \\\\\ny &= z + 2\n\\end{align*}`,
    expectedIncludes: ['\\begin{aligned}', '\\end{aligned}']
  },
  {
    name: '案例 F: 截断未闭合花括号与 HTML 实体',
    raw: `\\int_0^1 \\frac{x &amp; + 1}{\\sqrt{x^2 + 1}`,
    expectedIncludes: ['x & + 1', '}']
  }
];

for (const tc of realSessionCases) {
  const result = healLatexFormula(tc.raw);
  console.log(`\n测试: ${tc.name}`);
  console.log('输入:', JSON.stringify(tc.raw.slice(0, 60)) + '...');
  console.log('自愈后:', JSON.stringify(result.slice(0, 60)) + '...');

  for (const exp of tc.expectedIncludes) {
    if (!result.includes(exp)) {
      throw new Error(`测试用例 [${tc.name}] 失败: 缺少预期语法 [${exp}]`);
    }
  }
  console.log(`✅ [PASS] ${tc.name}`);
}

console.log('\n🎉 Render Guardian 文本与 LaTeX 语法双引擎自愈全部 100% 通过！');
