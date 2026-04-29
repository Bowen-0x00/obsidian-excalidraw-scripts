---
name: Add top brace
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
    log_add_brace: "添加顶部大括号",
    notice_added: "已添加顶部大括号"
  },
  en: {
    log_add_brace: "Add top brace",
    notice_added: "Add top brace done"
  }
};
console.log(t("log_add_brace"));
const shiftKey = ea.targetView.modifierKeyDown.shiftKey;

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

const top = Math.min(...selectedEls.map(el => el.y))
const bottom = selectedEls.reduce(function(max, el) {
  const sum = el.y + el.height;
  return Math.max(max, sum);
}, -Infinity);
const left = Math.min(...selectedEls.map(el => el.x))
const right = selectedEls.reduce(function(max, el) {
  const sum = el.x + el.width;
  return Math.max(max, sum);
}, -Infinity);
const width = right - left
let points;
if (!shiftKey) {
  points = [[-width*0.5, 0],
                [-width*0.4, -width*0.1],
                [-width*0.1, -width*0.1, ],
                [0, -width*0.2],
                [width*0.1, -width*0.1],
                [width*0.4, -width*0.1],
                [width*0.5, 0]]

  ea.style.roughness = 0;
  ea.style.roundness = {type: 2};
  ea.style.strokeWidth = 2;
} else {
    points = [[-width*0.5, 0],
                [-width*0.4, -width*0.1],
                [-width*0.08, -width*0.1, ],
                [0, -width*0.2],
                [width*0.08, -width*0.1],
                [width*0.4, -width*0.1],
                [width*0.5, 0]]

  ea.style.roughness = 0;
  ea.style.roundness = null;
  ea.style.strokeWidth = 2;
}
const id = ea.addLine(points);
const element = ea.getElement(id)
element.x = left
element.y = top
ea.addElementsToView(false, false, true);
new Notice(t("notice_added"));