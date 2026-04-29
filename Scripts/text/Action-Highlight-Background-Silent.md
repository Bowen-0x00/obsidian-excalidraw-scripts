---
name: 文本高亮块 (静默版)
description: 动作脚本：静默读取默认设置，为选中的文字快速生成底层高亮块。
author: ymjr
version: 1.0.0
license: MIT
usage: 在文本编辑状态下使用光标选中一段文字，运行此脚本（建议绑定快捷键）。脚本将自动在被选中的文字底层生成一个预设颜色的实心无边框半圆角矩形，模拟真实荧光笔高亮的效果。
features:
  - 读取 EA 插件设置中的 `highlightBackground.defaultColor`
  - 使用 Canvas API 的 `measureText` 算法精准计算多行文本中各个被选中片段的物理宽高与 X/Y 偏移
  - 自动在文本底层原位生成对应尺寸的矩形 (`ea.addRect`)
dependencies:
  - 独立运行，无强制底层引擎依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    settings_color_desc: "背景高亮块默认颜色",
    notice_select: "请在文本编辑状态下选中文字！"
  },
  en: {
    settings_color_desc: "Default background highlight color",
    notice_select: "Please select text in edit mode!"
  }
};
const { Notice } = ea.obsidian;

// 初始化或读取默认配置
let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["highlightBackground"] ?? {};
if (!settings["defaultColor"]) {
    settings = { defaultColor: { value: "#f8961e", description: t("settings_color_desc") }, ...settings };
    ExcalidrawAutomate.plugin.settings.scriptEngineSettings["highlightBackground"] = settings;
    await ExcalidrawAutomate.plugin.saveSettings();
}
const defaultColor = settings.defaultColor.value;

const api = ea.getExcalidrawAPI();
const editingTextElement = api.getAppState().editingTextElement;
const editable = ea.targetView.contentEl.querySelector("textarea.excalidraw-wysiwyg");

if (!editingTextElement || !editable || editable.selectionStart === editable.selectionEnd) {
    new Notice(t("notice_select"));
    return;
}

const canvas = ea.targetView.contentEl.querySelector('canvas.excalidraw__canvas.interactive');
const ctx = canvas.getContext("2d");

ea.style.strokeColor = "transparent";
ea.style.backgroundColor = defaultColor;
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