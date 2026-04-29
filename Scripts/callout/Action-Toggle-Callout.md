---
name: 切换 Callout 标注状态
description: 动作脚本：在不同的 Callout 类型之间进行切换，或取消其 Callout 状态。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中已经成为 Callout 的标注框，运行脚本唤起切换面板，选择其他类型以无缝替换图标和颜色。如果选择“移除标记”，则恢复为普通的文本和矩形组合。
features:
  - 动态替换绑定的 SVG 图标和背景色
dependencies:
  - 必须依赖 [Feature-Callout-Engine] 提供排版支持
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select_rect: "请先选择至少一个矩形元素",
    label_remove: "移除 Callout 标记",
    suggester_type: "设置 Callout 类型",
    label_solid: "Solid (实色/双色模式)",
    label_alpha: "Alpha (透明/单色模式)",
    suggester_color: "选择颜色模式 (Color Type)",
    notice_removed: "已移除 Callout 属性",
    notice_applied: "已应用 Callout 样式: {type}"
  },
  en: {
    notice_select_rect: "Please select at least one rectangle element",
    label_remove: "Remove Callout Tag",
    suggester_type: "Set Callout Type",
    label_solid: "Solid (Bicolor)",
    label_alpha: "Alpha (Monochrome/Transparent)",
    suggester_color: "Select Color Type",
    notice_removed: "Callout property removed",
    notice_applied: "Callout style applied: {type}"
  }
};

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements().filter(el => el.type === "rectangle");

if (selectedEls.length === 0) {
    new Notice(t("notice_select_rect"));
    return;
}

const isAlreadyCallout = !!selectedEls[0]?.customData?.callout;

const CALLOUT_THEMES = {
    note: "#1775D9", info: "#1775D9", tip: "#16A6AB", success: "#1DA51D",
    failure: "#DD2C38", warning: "#DE7417", error: "#DD2C38", quote: "#9E9E9E",
    cite: "#9E9E9E", example: "#8F47E1", danger: "#DD2C38", bug: "#DD2C38",
    question: "#DE7417", abstract: "#16A6AB",
};

const types = Object.keys(CALLOUT_THEMES);
const options = [...types];
if (isAlreadyCallout) {
    options.unshift(t("label_remove")); 
}

const selection = await utils.suggester(
    options, 
    options, 
    t("suggester_type")
);

if (!selection) return;

let selectedColorType = "alpha";
if (selection !== t("label_remove")) {
    const colorModeOptions = ["solid", "alpha"];
    const colorModeLabels = [t("label_solid"), t("label_alpha")];
    selectedColorType = await utils.suggester(
        colorModeLabels, 
        colorModeOptions, 
        t("suggester_color")
    );
    if (!selectedColorType) return;
}

ea.copyViewElementsToEAforEditing(selectedEls);
const eaElements = ea.getElements(); 

eaElements.forEach((el) => {
    if (selection === t("label_remove")) {
        if (el.customData) {
            delete el.customData.callout;
            delete el.customData.hover;
            delete el.customData.shadow;
        }
    } else {
        el.strokeColor = CALLOUT_THEMES[selection] || el.strokeColor;
        el.backgroundColor = selectedColorType === "solid" ? "#FFFFFF" : "transparent";
        el.fillStyle = "solid";
        el.strokeWidth = 2;
        el.roundness = { type: 3 }; 

        el.customData = {
            ...el.customData,
            callout: {
                type: selection,
                colorType: selectedColorType
            },
            hover: {
                shadow: {
                    shadowColor: "-20", shadowBlur: "24px", shadowOffsetX: "24px", shadowOffsetY: "24px"
                }
            },
            shadow: {
                shadowColor: "-20", shadowBlur: "12px", shadowOffsetX: "12px", shadowOffsetY: "12px"
            }
        };
    }
});

await ea.addElementsToView();

if (selection === t("label_remove")) {
    new Notice(t("notice_removed"));
} else {
    new Notice(t("notice_applied", { type: selection }));
}