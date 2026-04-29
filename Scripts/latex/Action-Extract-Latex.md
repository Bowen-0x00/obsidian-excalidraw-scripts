---
name: 提取文本内的 LaTeX
description: 动作脚本：自动将选中文字中的 $公式$ 提取分离，并原位生成支持缩放的 LaTeX 元素。
author: ymjr (Modified)
version: 1.0.0
license: MIT
usage: 选中包含 $...$ 包裹的数学公式的文本元素，运行此脚本。脚本会自动将文本切割，并将由 $包裹的内容提取为原生的 Excalidraw LaTeX 元素，保持相对位置不变。
features:
  - 自动正则匹配解析 `$公式$`，将文本打断并重组
  - 完美继承原文本的字号、字体与颜色，并根据缩放率 (`scale`) 自动适应公式大小
  - 修复 `$$` 空解析崩溃问题，全面兼容固定宽度的多行文本换行
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选中包含 $LaTeX$ 的文本元素！",
    notice_done: "✅ LaTeX 公式提取完毕"
  },
  en: {
    notice_select: "Please select text elements containing $LaTeX$ first!",
    notice_done: "✅ LaTeX extraction complete"
  }
};


const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements().filter(el => el.type === "text");

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

// 修复正则：支持单$和双$$，并确保内部必须有内容，防止匹配到空字符串导致后续 undefined
let pattern = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g;
let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
ctx.save();
ea.clear();

for (let selectedEl of selectedEls) {
    ctx.font = `${selectedEl.fontSize}px ${ea.getFontFamily(selectedEl.fontFamily)}`;
    ea.style.strokeColor = selectedEl.strokeColor;
    ea.style.fontSize = selectedEl.fontSize;
    ea.style.fontFamily = selectedEl.fontFamily;
    
    let scale = selectedEl.fontSize / 15;
    // 获取当前文本的实际行高 (以像素为单位)
    let lineHeight_px = selectedEl.fontSize * (selectedEl.lineHeight || 1.2);

    // 1. 将原文本按公式拆分成 Token 数组
    let tokens = [];
    let lastIdx = 0;
    let match;
    while ((match = pattern.exec(selectedEl.text)) !== null) {
        if (match.index > lastIdx) {
            tokens.push({ type: 'text', value: selectedEl.text.substring(lastIdx, match.index) });
        }
        tokens.push({ type: 'latex', value: match[0] });
        lastIdx = match.index + match[0].length;
    }
    if (lastIdx < selectedEl.text.length) {
        tokens.push({ type: 'text', value: selectedEl.text.substring(lastIdx) });
    }

    let curX = selectedEl.x;
    let curY = selectedEl.y;

    // 2. 遍历 Tokens，按行累加渲染
    for (let token of tokens) {
        if (token.type === 'text') {
            // 通过识别原生换行符，拆解多行文本
            let parts = token.value.split('\n');
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) {
                    // 一旦出现换行，X 归零，Y 增加行高
                    curX = selectedEl.x;
                    curY += lineHeight_px;
                }
                let textPart = parts[i];
                if (textPart) {
                    await ea.addText(curX, curY, textPart);
                    let width = ctx.measureText(textPart).width;
                    curX += width;
                }
            }
        } else if (token.type === 'latex') {
            let isDouble = token.value.startsWith('$$');
            let mathContent = isDouble 
                ? token.value.substring(2, token.value.length - 2) 
                : token.value.substring(1, token.value.length - 1);
            
            // 跳过空内容的公式提取
            if (!mathContent.trim()) continue; 
            
            let id = await ea.addLaTex(curX, curY, mathContent);
            let el = ea.getElement(id);
            
            // 确保生成成功，防止报错
            if (el) {
                el.width *= scale;
                el.height *= scale;
                // 将公式基于当前文本行垂直居中
                el.y = curY + (selectedEl.fontSize / 2) - (el.height / 2);
                el.customData = { ...el.customData, latex: { scale: scale } };
                
                curX += el.width;
            }
        }
    }
    
    // 清除源文本元素
    ea.deleteViewElements([selectedEl]);
}

ctx.restore();
ea.addElementsToView(false, false, false);
new Notice(t("notice_done"));