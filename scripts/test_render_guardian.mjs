import { healMarkdownMath } from '../src/client/features/render-guardian/healer.ts';

console.log('=== 开始执行 Render Guardian 数学公式与 Markdown 渲染自愈单元测试 ===\n');

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

console.log('🎉 Render Guardian 文本自愈核心全部通过！');
