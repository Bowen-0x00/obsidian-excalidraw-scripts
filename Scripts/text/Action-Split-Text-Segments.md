---
name: 按标记分割文本
description: 动作脚本：将选中文本块通过 “==” 标记分离成多个独立的文本元素。
author: ymjr
version: 1.0.0
license: MIT
usage: 在文本元素中手动输入 `==` 作为分隔符（例如 `第一段 == 第二段`），选中该元素后运行此脚本。脚本将沿着分隔符切断文本，生成多个相互独立但保持原有 Y 轴坐标相对位置的独立文本节点。
features:
  - 完美继承原文本的样式、字体和颜色
  - 利用 Canvas 原生 measureText 精准计算并保持拆分后文本的排版位置
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请选中需要分割的文本！",
    toast_done: "文本分割完成"
  },
  en: {
    notice_select: "Please select text elements to split!",
    toast_done: "Text segments split successfully"
  }
};
const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements().filter(el => el.type === "text");

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

let canvas = ea.targetView.contentEl.querySelector('canvas.excalidraw__canvas.interactive');
const ctx = canvas.getContext("2d");
ctx.save();
ea.clear();

for (const selectedEl of selectedEls) {
    ctx.font = `${selectedEl.fontSize}px ${ea.getFontFamily(selectedEl.fontFamily)}`;
    let text_lines = selectedEl.text.split("\n");
    let max_width = 0;

    for (let j = 0; j < text_lines.length; j++) {
        let text_splited = text_lines[j].split("==");
        let sum = 0;
        
        for (let i = 0; i < text_splited.length; i++) {
            const width = ctx.measureText(text_splited[i]).width;    
            ea.style.fontFamily = selectedEl.fontFamily;
            ea.style.strokeColor = selectedEl.strokeColor;
            ea.style.fontSize = selectedEl.fontSize;
            ea.style.strokeWidth = selectedEl.strokeWidth;
            ea.style.verticalAlign = selectedEl.verticalAlign;
            ea.style.textAlign = selectedEl.textAlign;

            let height = selectedEl.height / text_lines.length;
            ea.addText(selectedEl.x + sum, selectedEl.y + j * height, text_splited[i]);
            sum += width;
        }
        
        if (sum > max_width) {
            max_width = sum;
        }
    }
    ea.deleteViewElements([selectedEl]);
}

ctx.restore();
ea.addElementsToView();
api.setToast({ message: t("toast_done"), duration: 3000, closable: true });