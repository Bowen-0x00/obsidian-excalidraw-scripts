---
name: Add shadow
description: 动作脚本：自动生成对应的图形元素。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行此脚本生成图形。
features:
  - 自动计算并生成图形
dependencies:
  - 无依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    prompt_style: "阴影样式?",
    notice_done: "添加阴影完成",
    desc_color: "数字 -20: 亮度衰减 20; 16进制 RGB 字符串 #FF0000: 红色。",
    desc_blur: "数字 0.1: 大小 = 0.1 * 元素宽度; 字符串 2px: 大小 = 2px。",
    desc_offsetX: "数字 0.1: 偏移 = 0.1 * 元素宽度; 字符串 2px: 偏移 = 2px。",
    desc_offsetY: "数字 0.1: 偏移 = 0.1 * 元素宽度; 字符串 2px: 偏移 = 2px。"
  },
  en: {
    prompt_style: "shadow style?",
    notice_done: "Add shadow done",
    desc_color: "number -20: lightness decay 20; 16 radix RGB string #FF0000: red.",
    desc_blur: "number 0.1: size = 0.1 * element.width; string 2px: size = 2px.",
    desc_offsetX: "number 0.1: offset = 0.1 * element.width; string 2px: offset = 2px.",
    desc_offsetY: "number 0.1: offset = 0.1 * element.width; string 2px: offset = 2px."
  }
};
const selectedEls = ea.getViewSelectedElements();
if (!selectedEls?.length) return
let settings = ea.getScriptSettings();
if(!settings["shadowColor"]) {
    settings = {
      "shadowColor": {
        value: "-20",
        description: t("desc_color")
      },
      "shadowBlur": {
        value: "0.1",
        description: t("desc_blur")
      },
      "shadowOffsetX": {
        value: "0.1",
        description: t("desc_offsetX")
      },
      "shadowOffsetY": {
        value: "0.1",
        description: t("desc_offsetY")
      }
    };
    ea.setScriptSettings(settings);
}

let param = 
`{
  "shadowColor": "${settings["shadowColor"].value}",
  "shadowBlur": "${settings["shadowBlur"].value}",
  "shadowOffsetX": "${settings["shadowOffsetX"].value}",
  "shadowOffsetY": "${settings["shadowOffsetY"].value}"
}
`
const input = await utils.inputPrompt(t("prompt_style"), param, param);
if (!input) return;
config = JSON.parse(input)

selectedEls.forEach((el) => {
  el.customData = {
    ...el.customData,
    shadow: el?.customData?.shadow || []
  }
  el.customData.shadow.push(config)
})

ea.copyViewElementsToEAforEditing(selectedEls);
ea.addElementsToView();
new Notice(t("notice_done"));