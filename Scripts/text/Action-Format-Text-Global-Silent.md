---
name: 文本全局样式 (静默版)
description: 动作脚本：一键为选中的文本元素应用/取消默认的全局字重或加粗。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中一个或多个文本元素，或包含绑定文本的图形容器，运行此脚本将静默（无弹窗）地应用 Excalidraw 插件设置中定义的“默认全局字重/加粗”。再次运行可取消。
features:
  - 智能穿透 `boundElements` 获取绑定的文本内容
  - 动态切换写入 `customData.bold` 和 `customData.font.weight`
dependencies:
  - 需要依赖 [Feature-Text-Render-Engine] 常驻底层来解析并渲染文字样式
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请选中包含文本的元素！",
    notice_applied: "✨ 已应用全局样式",
    notice_cancelled: "🔄 已取消全局样式",
    setting_bold: "是否默认启用加粗",
    setting_weight: "默认全局字重"
  },
  en: {
    notice_select: "Please select elements containing text!",
    notice_applied: "✨ Global style applied",
    notice_cancelled: "🔄 Global style cancelled",
    setting_bold: "Enable bold by default",
    setting_weight: "Default global font weight"
  }
};

const { Notice } = ea.obsidian;

// 初始化或读取默认配置
let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["textGlobalStyle"] ?? {};
if (!settings["defaultWeight"] || !settings["defaultBold"]) {
    settings = {
        defaultBold: { value: true, description: t("setting_bold") },
        defaultWeight: { value: "800", description: t("setting_weight") },
        ...settings
    };
    ExcalidrawAutomate.plugin.settings.scriptEngineSettings["textGlobalStyle"] = settings;
    await ExcalidrawAutomate.plugin.saveSettings();
}

const isBoldTarget = settings.defaultBold.value;
const weightTarget = settings.defaultWeight.value;

const api = ea.getExcalidrawAPI();
const elementsMap = api?.App?.scene?.getNonDeletedElementsMap?.() || new Map();
const selectedEls = ea.getViewSelectedElements();
const textEls = [];

for (const el of selectedEls) {
    if (el.type === "text") {
        textEls.push(el);
    } else if (el.boundElements) {
        for (const bound of el.boundElements) {
            if (bound.type === "text") {
                const textEl = elementsMap.get(bound.id);
                if (textEl) textEls.push(textEl);
            }
        }
    }
}

if (textEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

// 检查当前状态是否已经应用了配置
const isAlreadyApplied = textEls.every(el => 
    el.customData?.bold === isBoldTarget && 
    el.customData?.font?.weight === weightTarget
);

textEls.forEach((el) => {
    el.customData = el.customData || {};
    el.customData.font = el.customData.font || {};
    
    if (isAlreadyApplied) {
        // Toggle Off
        delete el.customData.bold;
        delete el.customData.font.weight;
    } else {
        // Toggle On
        if (isBoldTarget) el.customData.bold = true;
        if (weightTarget) el.customData.font.weight = weightTarget;
    }
});

ea.copyViewElementsToEAforEditing(textEls);
ea.addElementsToView();
new Notice(isAlreadyApplied ? t("notice_cancelled") : t("notice_applied"));