---
name: 文本局部格式 (静默版)
description: 动作脚本：一键为正在编辑选中的文字应用默认的局部加粗和颜色标记。
author: ymjr
version: 1.0.0
license: MIT
usage: 在双击进入 Excalidraw 文本编辑模式后，用光标选中部分文字片段，然后运行此脚本（建议绑定快捷键）。被选中的文字将被静默应用预设的加粗和颜色格式。
features:
  - 精准计算 `selectionStart` 和 `selectionEnd` 的光标偏移量（自动处理换行符误差）
  - 动态向文本元素注入 `customData.boldPartial` 或 `customData.colorPartial` 数组区间
dependencies:
  - 必须依赖 [Feature-Text-Render-Engine] 常驻底层解析并渲染富文本
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请在文本编辑状态下，选中需要标记的文字！",
    setting_apply_bold: "静默执行时是否附加局部加粗",
    setting_default_color: "静默执行时的局部默认颜色"
  },
  en: {
    notice_select: "Please select the text to mark in edit mode!",
    setting_apply_bold: "Attach partial bold during silent execution",
    setting_default_color: "Default partial color for silent execution"
  }
};

const { Notice } = ea.obsidian;

// 初始化或读取默认配置
let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["textPartialStyle"] ?? {};
if (!settings["defaultColor"]) {
    settings = {
        applyBold: { value: true, description: t("setting_apply_bold") },
        defaultColor: { value: "#ff0000", description: t("setting_default_color") },
        ...settings
    };
    ExcalidrawAutomate.plugin.settings.scriptEngineSettings["textPartialStyle"] = settings;
    await ExcalidrawAutomate.plugin.saveSettings();
}

const api = ea.getExcalidrawAPI();
const editable = ea.targetView.contentEl.querySelector(".excalidraw-textEditorContainer textarea");
const editingTextElement = api.getAppState().editingTextElement;

if (!editable || !editingTextElement || editable.selectionStart === editable.selectionEnd) {
    new Notice(t("notice_select"));
    return;
}

editingTextElement.customData = editingTextElement.customData || {};
const startNewlineNum = editable.value.substring(0, editable.selectionStart).split("\n").length - 1;
const endNewlineNum = editable.value.substring(0, editable.selectionEnd).split("\n").length - 1;

const start = editable.selectionStart - startNewlineNum;
const end = editable.selectionEnd - endNewlineNum;

// 应用加粗
if (settings.applyBold.value) {
    editingTextElement.customData.boldPartial = editingTextElement.customData.boldPartial || [];
    editingTextElement.customData.boldPartial.push({ start, end });
}

// 应用颜色
if (settings.defaultColor.value) {
    editingTextElement.customData.colorPartial = editingTextElement.customData.colorPartial || [];
    editingTextElement.customData.colorPartial.push({ start, end, color: settings.defaultColor.value });
}

ea.copyViewElementsToEAforEditing([editingTextElement]);
ea.addElementsToView(false, false, false);

setTimeout(() => editable.focus(), 50);