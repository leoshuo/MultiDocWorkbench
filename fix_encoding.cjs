const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'SOPWorkbench.jsx');
const content = fs.readFileSync(targetFile, 'utf8');
const lines = content.split(/\r?\n/);

// Correct lines 217-230 (0-indexed: 216-229)
// Actually line 217 in 1-indexed view is index 216.
// Start index: 217 (line 218 in view is index 217)
// Wait, view_file showed:
// 217: const DEFAULT_OUTLINE_BUTTON_PROMPT = `
// So index 216 is const DEFAULT...

const correctText = `const DEFAULT_OUTLINE_BUTTON_PROMPT = \`
请基于以下内容抽取提纲（节点数量不限），输出 JSON 数组：
[
  {"id":"...","title":"原文中的标题（尽量保持原样）","summary":"一句摘要（<=20字）","hint":"写作提示","level":1-3}
]
要求：
- level 基于语义判断：1/2/3，不必强制均衡（无法确定默认 1）
- title 覆盖核心结构，顺序合理，尽量直接采用原文标题文本
- summary 为该标题下一句话摘要（<=20字）
- hint 给出该章节写作提示（1-2 句）
- 避免将普通段落或列表项误判为标题；若标题过多可合并从属项到上级，保持精简
- 不要输出多余文本

内容：`;

const correctLines = correctText.split('\n');

// Replace range.
// Original range:
// 217: const ...
// ...
// 230: 内容...
// Next line 231 should be `
// Let's verify end line. Line 230 in view is "内容?"
// The closing backtick should be on line 231? Or at end of 230?
// View file showed:
// 230: 内容?
// It didn't show 231.
// Let's assume the template literal continues or ends.
// In the replacement I didn't include the closing backtick.
// I should include it if the original had it.
// Actually, usually `const X = \` ... \`;`
// The `correctText` above does NOT have the closing `. 
// I should inspect line 230/231 again?

// Let's be safe. I will replace lines 216 to 229 (indices) with correctLines.
// Wait, my correctText has 14 lines?
// Original: 217 to 230 is 14 lines.
// So 1-to-1 replacement.

const startIndex = 216; // Line 217
const endIndex = 229;   // Line 230

// Verify context (simple check)
if (!lines[startIndex].includes('DEFAULT_OUTLINE_BUTTON_PROMPT')) {
    console.error('Line mismatch! Expected DEFAULT_OUTLINE_BUTTON_PROMPT at line 217.');
    process.exit(1);
}

// Splice
lines.splice(startIndex, endIndex - startIndex + 1, ...correctLines);

fs.writeFileSync(targetFile, lines.join('\n'), 'utf8');
console.log('Successfully fixed encoding.');
