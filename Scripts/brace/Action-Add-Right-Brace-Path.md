---
name: Add right brace(path)
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
    log_add_brace: "添加右侧 SVG 大括号",
    notice_no_selection: "未选中任何元素",
    notice_added: "已添加尖锐右侧大括号"
  },
  en: {
    log_add_brace: "Add Sharp Right SVG Brace",
    notice_no_selection: "No elements selected",
    notice_added: "Added sharp right brace"
  }
};
console.log(t("log_add_brace"));
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
  new Notice(t("notice_no_selection"));
  return;
}

// 1. 计算包围盒
const top = Math.min(...selectedEls.map(el => el.y));
const bottom = selectedEls.reduce((max, el) => Math.max(max, el.y + el.height), -Infinity);
const right = selectedEls.reduce((max, el) => Math.max(max, el.x + el.width), -Infinity);
const height = bottom - top;
const centerY = height / 2;

// 2. 定义形状参数
const w = Math.min(20, height * 0.15); 
const t = Math.min(15, height * 0.1);  
const q = Math.min(25, height * 0.2);  

// 3. 生成 SVG Path (起点已经是 0,0，无需负数偏移)
const pathData = [
  `M 0 0`, 
  `Q ${w} 0, ${w} ${q}`,
  `L ${w} ${centerY - q}`,
  `Q ${w} ${centerY}, ${w + t} ${centerY}`, // 尖嘴上半部 (锐利)
  `Q ${w} ${centerY}, ${w} ${centerY + q}`, // 尖嘴下半部 (锐利)
  `L ${w} ${height - q}`,
  `Q ${w} ${height}, 0 ${height}`
].join(" ");

// 4. 生成占位点
const points = [
  [0, 0],
  [w, q],
  [w, centerY - q],
  [w + t, centerY], // 尖端
  [w, centerY + q],
  [w, height - q],
  [0, height]
];

// 5. 创建元素
ea.style.strokeColor = "#1e1e1e";
ea.style.strokeWidth = 2;
ea.style.roughness = 0; 
ea.style.roundness = null; 

const id = ea.addLine(points);
const element = ea.getElement(id);
element.customData = { ...element.customData, svgPathShape: pathData };

// 6. 定位 (起点0,0对应图形左上角)
element.x = right + 10;
element.y = top;

ea.addElementsToView(false, false, true);
new Notice(t("notice_added"));