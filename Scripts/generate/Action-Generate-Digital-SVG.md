---
name: Ditital(svg)
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
    log_start: "🚀 正在生成数字 IC 库 v5 (归一化数据)",
    notice_success: "✨ 最终 IC 库 v5：归一化并适配完毕"
  },
  en: {
    log_start: "🚀 Generating Digital IC Library v5 (Normalized Data)",
    notice_success: "✨ Final IC Library V5: Normalized & Fitted"
  }
};
console.log(t("log_start"));
const api = ea.getExcalidrawAPI();

// --- Configuration ---
const START_X = ea.getExcalidrawAPI().getAppState().scrollX + 400;
const START_Y = ea.getExcalidrawAPI().getAppState().scrollY + 300;
const COLOR = "#1e1e1e";
const STROKE_WIDTH = 2;
const GRID_X = 110; 
const GRID_Y = 100; 

// --- Helper: Circle Path ---
const circlePath = (cx, cy, r) => {
    return `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 0 ${r*2} 0 a ${r} ${r} 0 1 0 -${r*2} 0`;
};

// --- 🛠️ Helper: Measure SVG Path Bounding Box ---
const measurePath = (pathData) => {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.style.position = "absolute";
    svg.style.visibility = "hidden";
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);
    try {
        const bbox = path.getBBox();
        return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    } finally {
        document.body.removeChild(svg);
    }
};

// --- 🛠️ NEW Helper: Shift SVG Path Data ---
// 解析路径字符串，将所有绝对坐标减去 dx, dy
const shiftPathData = (pathData, dx, dy) => {
    return pathData.replace(/([a-zA-Z])([^a-zA-Z]*)/g, (match, command, paramsStr) => {
        const params = paramsStr.trim().split(/[\s,]+/).filter(p => p !== "").map(Number);
        if (params.length === 0) return match;

        switch (command) {
            case 'M': case 'L': case 'T': // (x y)+
            case 'C': // (x1 y1 x2 y2 x y)+
            case 'S': case 'Q': // (x1 y1 x y)+
                for (let i = 0; i < params.length; i += 2) {
                    params[i] -= dx;
                    params[i+1] -= dy;
                }
                break;
            case 'H': // (x)+
                 for (let i = 0; i < params.length; i++) params[i] -= dx;
                 break;
            case 'V': // (y)+
                 for (let i = 0; i < params.length; i++) params[i] -= dy;
                 break;
            case 'A': // (rx ry rot large sweep x y)+
                // A 指令有 7 个参数，只有最后两个是坐标 (x, y)
                for (let i = 0; i < params.length; i += 7) {
                    params[i+5] -= dx;
                    params[i+6] -= dy;
                }
                break;
            // 小写指令 (m, l, h, v...) 是相对坐标，不需要平移！
            // 因为起点 M 已经被平移了，相对路径会自动跟随。
            default:
                break;
        }
        return `${command} ${params.join(" ")}`;
    });
};

// --- Component Definitions ---
const components = [
    // --- ROW 1: Transistors ---
    {
        name: "NMOS", row: 0, col: 0,
        path: [`M 2 30 L 10 30`, `M 10 10 L 10 50`, `M 18 10 L 18 50`, `M 18 12 L 30 12 L 30 0`, `M 18 48 L 30 48 L 30 60`].join(" ")
    },
    {
        name: "PMOS", row: 0, col: 1,
        path: [`M 0 30 L 2 30`, circlePath(5, 30, 3), `M 8 30 L 10 30`, `M 10 10 L 10 50`, `M 18 10 L 18 50`, `M 18 12 L 30 12 L 30 0`, `M 18 48 L 30 48 L 30 60`].join(" ")
    },
    // --- ROW 2: Basic Gates ---
    { name: "NOT", row: 1, col: 0, path: `M 5 10 L 5 50 L 35 30 Z ${circlePath(39, 30, 4)} M 43 30 L 48 30 M 0 30 L 5 30` },
    { name: "AND", row: 1, col: 1, path: `M 5 5 L 25 5 A 25 25 0 0 1 25 55 L 5 55 Z M 0 15 L 5 15 M 0 45 L 5 45 M 50 30 L 55 30` },
    { name: "OR", row: 1, col: 2, path: `M 5 5 Q 20 30 5 55 L 25 55 Q 55 55 55 30 Q 55 5 25 5 Z M 0 15 L 10 15 M 0 45 L 10 45 M 55 30 L 60 30` },
    { name: "XOR", row: 1, col: 3, path: `M 15 5 Q 30 30 15 55 L 35 55 Q 65 55 65 30 Q 65 5 35 5 Z M 0 5 Q 15 30 0 55 M -5 15 L 5 15 M -5 45 L 5 45 M 65 30 L 70 30` },
    // --- ROW 3: Derived Gates ---
    { name: "NAND", row: 2, col: 1, path: `M 5 5 L 25 5 A 25 25 0 0 1 25 55 L 5 55 Z ${circlePath(54, 30, 4)} M 0 15 L 5 15 M 0 45 L 5 45 M 58 30 L 63 30` },
    { name: "NOR", row: 2, col: 2, path: `M 5 5 Q 20 30 5 55 L 25 55 Q 55 55 55 30 Q 55 5 25 5 Z ${circlePath(59, 30, 4)} M 0 15 L 10 15 M 0 45 L 10 45 M 63 30 L 68 30` },
    // --- ROW 4: Complex Logic ---
    { name: "MUX (2:1)", row: 3, col: 0, path: [`M 15 0 L 40 20 L 40 40 L 15 60 Z`, `M 5 15 L 15 15`, `M 5 40 L 15 40`, `M 40 30 L 55 30`, `M 30 50 L 30 65`].join(" ") },
    { name: "ALU", row: 3, col: 1, path: [`M 0 0 L 20 0 L 30 8 L 40 0 L 60 0`, `L 45 35`, `L 15 35`, `Z`, `M 30 35 L 30 45`].join(" ") },
    { name: "Register", row: 3, col: 2, path: [`M 10 5 L 50 5 L 50 55 L 10 55 Z`, `M 10 40 L 18 45 L 10 50`, `M 5 15 L 10 15`, `M 50 15 L 55 15`].join(" ") },
    { name: "Crossbar", row: 3, col: 3, path: [`M 0 0 L 60 0 L 60 60 L 0 60 Z`, `M 10 15 L 20 15 L 40 45 L 50 45`, `M 10 45 L 20 45 L 40 15 L 50 15`].join(" ") }
];

// --- Generation Loop ---
const newElements = [];
const textElements = [];

components.forEach(comp => {
    // 1. 计算原始路径的 BBox
    const bbox = measurePath(comp.path);
    
    // 2. 归一化路径 (Normalize Path)
    // 将路径中所有的绝对坐标减去 bbox.x 和 bbox.y
    // 这样新路径的 BBox 就会变成 {x:0, y:0, width: w, height: h}
    const normalizedPath = shiftPathData(comp.path, bbox.x, bbox.y);

    // 3. 计算元素在画布上的位置
    // 因为路径被平移回了(0,0)，为了让它视觉上还在原来的位置，
    // 我们需要把元素的 x, y 加上之前的偏移量 (bbox.x, bbox.y)
    // 加上原来的网格位置
    const gridX = START_X + comp.col * GRID_X;
    const gridY = START_Y + comp.row * GRID_Y;
    
    // 最终位置 = 网格基准点 + 图形内部的留白偏移
    const finalX = gridX + bbox.x;
    const finalY = gridY + bbox.y;
    const w = bbox.width;
    const h = bbox.height;

    // 4. 创建 Excalidraw 元素
    const points = [[0,0], [w, 0], [w, h], [0, h]];

    ea.style.strokeColor = COLOR;
    ea.style.strokeWidth = STROKE_WIDTH;
    ea.style.roughness = 0; 
    ea.style.roundness = null;
    ea.style.fillStyle = "solid"; 

    const id = ea.addLine(points);
    const element = ea.getElement(id);

    element.width = w;
    element.height = h;
    element.x = finalX;
    element.y = finalY;

    element.customData = {
        ...element.customData,
        // 存储归一化后的干净路径
        svgPathShape: normalizedPath,
        // 存储原始尺寸，用于渲染时的比例计算
        svgViewBox: { width: w, height: h }
    };

    // 5. Label 位置调整
    const labelId = ea.addText(finalX + w/2, finalY + h + 10, comp.name, { fontSize: 10, textAlign: "center", width: 100, fontFamily: 3 });
    const textEl = ea.getElement(labelId);
    textEl.x -= textEl.width / 2; 

    newElements.push(element);
    textElements.push(textEl);
});

ea.addElementsToView(false, false, true);
ea.selectElements([...newElements, ...textElements]);
new Notice(t("notice_success"));