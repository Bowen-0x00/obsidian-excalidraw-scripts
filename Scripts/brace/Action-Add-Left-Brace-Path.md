---
name: Add left brace(path)
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
    log_add_brace: "添加左侧 SVG 大括号"
  },
  en: {
    log_add_brace: "Add Left SVG Brace"
  }
};
console.log(t("log_add_brace"));
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) return;

// 1. 计算包围盒
const top = Math.min(...selectedEls.map(el => el.y));
const bottom = selectedEls.reduce((max, el) => Math.max(max, el.y + el.height), -Infinity);
const left = Math.min(...selectedEls.map(el => el.x));
const height = bottom - top;
const centerY = height / 2;

// 2. 形状参数
const w = Math.min(20, height * 0.15); // 臂宽
const t = Math.min(15, height * 0.1);  // 尖长
const q = Math.min(25, height * 0.2);  // 弯曲缓冲
const totalWidth = w + t;

// 3. SVG Path (🚨 核心修复：起点强制为 0,0，向左画进入负数 X 轴)
// 起点: 右上角 (0, 0)
// 上弯: 控制点 (-w, 0) -> 终点 (-w, q)
// 尖嘴: 控制点 (-w, centerY) -> 终点 (-totalWidth, centerY)
const pathData = [
  `M 0 0`,
  `Q ${-w} 0, ${-w} ${q}`,
  `L ${-w} ${centerY - q}`,
  `Q ${-w} ${centerY}, ${-totalWidth} ${centerY}`, // 尖嘴上半
  `Q ${-w} ${centerY}, ${-w} ${centerY + q}`,       // 尖嘴下半
  `L ${-w} ${height - q}`,
  `Q ${-w} ${height}, 0 ${height}`
].join(" ");

// 4. 占位点 (🚨 核心修复：所有点的 X 坐标均减去 totalWidth，保证第一点是 [0,0])
const points = [
  [0, 0],
  [-w, q],
  [-w, centerY - q],
  [-totalWidth, centerY], // 尖端
  [-w, centerY + q],
  [-w, height - q],
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

// 6. 定位 (🚨 核心修复：起点(0,0)就在图形的最右侧，所以直接定位在 left - 10 即可)
element.x = left - 10;
element.y = top;

ea.addElementsToView(false, false, true);