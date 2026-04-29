---
name: 生成高亮标注 (Callout)
description: 动作脚本：将选中的文本一键转换为带有图标和背景色的 Callout 标注。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板上的文本元素，运行此脚本并在弹窗中选择 Callout 的类型（Info/Warning/Error 等），脚本会在文本左侧生成图标并添加背景色。
features:
  - 自动注入 `customData.callout` 将其转化为受控容器
dependencies:
  - 必须依赖 [Feature-Callout-Engine] 提供文本编辑时的实时避让排版
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    suggester_type: "选择 Callout 类型",
    label_solid: "Solid (实色/双色模式)",
    label_alpha: "Alpha (透明/单色模式)",
    suggester_color: "选择颜色模式 (Color Type)",
    notice_created: "已创建 Callout: {type}"
  },
  en: {
    suggester_type: "Select Callout Type",
    label_solid: "Solid (Bicolor)",
    label_alpha: "Alpha (Monochrome/Transparent)",
    suggester_color: "Select Color Type",
    notice_created: "Callout created: {type}"
  }
};

// 1. 定义 Callout 类型和对应的颜色
const CALLOUT_THEMES = {
    note: "#1775D9", info: "#1775D9", tip: "#16A6AB", success: "#1DA51D",
    failure: "#DD2C38", warning: "#DE7417", error: "#DD2C38", quote: "#9E9E9E",
    cite: "#9E9E9E", example: "#8F47E1", danger: "#DD2C38", bug: "#DD2C38",
    question: "#DE7417", abstract: "#16A6AB",
};

// 2. 交互式选择类型与颜色模式
const typeNames = Object.keys(CALLOUT_THEMES);
const selectedType = await utils.suggester(typeNames, typeNames, t("suggester_type"));
if (!selectedType) return;

const colorModeOptions = ["solid", "alpha"];
const colorModeLabels = [t("label_solid"), t("label_alpha")];
const selectedColorType = await utils.suggester(colorModeLabels, colorModeOptions, t("suggester_color"));
if (!selectedColorType) return;

// 3. 创建矩形 (坐标设为 0，因为稍后 addElementsToView(true) 会自动将其移动到视口中心)
const rectWidth = 400;
const rectHeight = 150; 
const id = ea.addRect(0, 0, rectWidth, rectHeight);
const el = ea.getElement(id);

// 4. 设置 Excalidraw 原生属性
el.strokeColor = CALLOUT_THEMES[selectedType];
// 如果是 solid 实色模式，背景为白；如果是 alpha 模式，背景为透明（引擎会自动渲染透明淡色层）
el.backgroundColor = selectedColorType === "solid" ? "#FFFFFF" : "transparent"; 
el.fillStyle = "solid";
el.strokeWidth = 2;
el.roundness = { type: 3 }; // 确保使用圆角

// 5. 注入自定义数据
el.customData = {
    ...el.customData,
    callout: {
        type: selectedType,
        colorType: selectedColorType
    },
    // 可选：你原来定义的 hover 与 shadow 特效数据
    hover: {
        shadow: {
            shadowColor: "-20",
            shadowBlur: "24px",
            shadowOffsetX: "24px",
            shadowOffsetY: "24px"
        }
    },
    shadow: {
        shadowColor: "-20",
        shadowBlur: "12px",
        shadowOffsetX: "12px",
        shadowOffsetY: "12px"
    }
};

// 6. 添加到画布 (第一个参数 true 表示自动居中放置在当前视图或鼠标指针处)
await ea.addElementsToView(true, false, false);
new Notice(t("notice_created", { type: selectedType }));