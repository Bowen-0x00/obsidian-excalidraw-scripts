---
name: Add bottom brace(path)
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
    log_add_brace: "添加底部 SVG 大括号"
  },
  en: {
    log_add_brace: "Add Bottom SVG Brace"
  }
};
console.log(t("log_add_brace"));
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) return;

// 1. 计算包围盒
const bottom = selectedEls.reduce((max, el) => Math.max(max, el.y + el.height), -Infinity);
const left = Math.min(...selectedEls.map(el => el.x));
const right = selectedEls.reduce((max, el) => Math.max(max, el.x + el.width), -Infinity);
const width = right - left;
const centerX = width / 2;

// 2. 形状参数
const h = Math.min(20, width * 0.15); // 臂高
const t = Math.min(15, width * 0.1);  // 尖高
const q = Math.min(25, width * 0.2);  // 弯曲缓冲
const totalHeight = h + t;

// 3. SVG Path (起点已经是 0,0，向下画进入正数 Y 轴)
const pathData = [
  `M 0 0`,
  `Q 0 ${h}, ${q} ${h}`,
  `L ${centerX - q} ${h}`,
  `Q ${centerX} ${h}, ${centerX} ${totalHeight}`, // 尖嘴左半
  `Q ${centerX} ${h}, ${centerX + q} ${h}`,       // 尖嘴右半
  `L ${width - q} ${h}`,
  `Q ${width} ${h}, ${width} 0`
].join(" ");

// 4. 占位点
const points = [
  [0, 0],
  [q, h],
  [centerX - q, h],
  [centerX, totalHeight], // 尖端
  [centerX + q, h],
  [width - q, h],
  [width, 0]
];

// 5. 创建元素
ea.style.strokeColor = "#1e1e1e";
ea.style.strokeWidth = 2;
ea.style.roughness = 0;
ea.style.roundness = null;

const id = ea.addLine(points);
const element = ea.getElement(id);
element.customData = { ...element.customData, svgPathShape: pathData };

// 6. 定位 (放在下方，起点0,0对应图形左上角)
element.x = left;
element.y = bottom + 10;

ea.addElementsToView(false, false, true);