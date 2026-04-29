---
name: 文本高亮块 (UI版)
description: 悬浮面板：在文本编辑模式下，为选中的文字生成指定颜色的底层高亮块。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行此脚本以唤起“背景高亮工具”悬浮面板。进入文本编辑状态并选中部分文字，在面板上使用取色器选择颜色，点击生成按钮，即可在选中的文字底层自动铺设对应颜色的矩形高亮色块。
features:
  - 包含悬浮 DOM 面板与系统取色器
  - 结合 Canvas `measureText` 实现跨行多段文本高亮块的自动物理位置对齐与生成
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先在文本编辑状态下选中文字片段！",
    ui_title: "🖍️ 背景高亮工具",
    ui_apply: "生成高亮块"
  },
  en: {
    notice_select: "Please select text in edit mode first!",
    ui_title: "🖍️ Background Highlighter",
    ui_apply: "Generate Highlight"
  }
};
const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();

function applyHighlight(color) {
    const editingTextElement = api.getAppState().editingTextElement;
    const editable = ea.targetView.contentEl.querySelector("textarea.excalidraw-wysiwyg");
    
    if (!editingTextElement || !editable || editable.selectionStart === editable.selectionEnd) {
        new Notice(t("notice_select"));
        return;
    }

    const canvas = ea.targetView.contentEl.querySelector('canvas.excalidraw__canvas.interactive');
    const ctx = canvas.getContext("2d");

    ea.style.strokeColor = "transparent";
    ea.style.backgroundColor = color;
    ea.style.fillStyle = "solid";
    ea.style.roughness = 0;
    ea.style.roundness = { type: 3 };

    ctx.font = `${editingTextElement.fontSize}px ${ea.getFontFamily(editingTextElement.fontFamily)}`;
    let text_lines = editingTextElement.text.split("\n");
    const lineHeight = editingTextElement.height / text_lines.length;
    let currentPosSum = 0;

    for (let i = 0; i < text_lines.length; i++) {
        const lineLength = text_lines[i].length;
        if (editable.selectionStart < currentPosSum + lineLength && editable.selectionEnd > currentPosSum) {
            let startRel = Math.max(0, editable.selectionStart - currentPosSum);
            let endRel = Math.min(lineLength, editable.selectionEnd - currentPosSum);
            
            let xOffset = startRel > 0 ? ctx.measureText(text_lines[i].substring(0, startRel)).width : 0;
            const highlightWidth = ctx.measureText(text_lines[i].substring(startRel, endRel)).width;
            
            ea.addRect(editingTextElement.x + xOffset, editingTextElement.y + (i * lineHeight), highlightWidth, lineHeight);
        }
        currentPosSum += (lineLength + 1);
        if (currentPosSum > editable.selectionEnd) break;
    }
    ea.addElementsToView(false, false, false);
    setTimeout(() => editable.focus(), 50);
}

function createPanel() {
    if (document.getElementById("ea-highlight-bg-panel")) return;

    const panel = document.createElement('div');
    panel.id = "ea-highlight-bg-panel";
    panel.style.cssText = `position:fixed; top:200px; right:150px; width:220px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 8px 24px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const header = document.createElement('div');
    header.style.cssText = `padding:8px 12px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b style="font-size:13px;">${t("ui_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer;">✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; justify-content:space-between; align-items:center; gap:10px;`;

    const colorPicker = document.createElement('input');
    colorPicker.type = "color";
    colorPicker.value = "#f8961e";
    colorPicker.style.cssText = "width:35px; height:35px; padding:0; border:none; cursor:pointer; background:none;";

    const btnApply = document.createElement('button');
    btnApply.innerText = t("ui_apply");
    btnApply.style.cssText = "flex:1; padding:6px; background:var(--interactive-accent); color:var(--text-on-accent); border:none; border-radius:4px; cursor:pointer;";
    btnApply.onmousedown = (e) => { e.preventDefault(); applyHighlight(colorPicker.value); };

    content.appendChild(colorPicker);
    content.appendChild(btnApply);
    panel.appendChild(content);
    document.body.appendChild(panel);

    header.querySelector('#close-btn').onclick = () => panel.remove();
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
}

createPanel();