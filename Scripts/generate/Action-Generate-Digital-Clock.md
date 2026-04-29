---
name: Digital
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
    log_start: "🚀 正在生成原生数字 IC 库 (无 SVG 路径)",
    notice_success: "✨ 原生 IC 库生成完毕"
  },
  en: {
    log_start: "🚀 Generating Native Digital IC Library (No SVG Path)",
    notice_success: "✨ Native IC Library Generated"
  }
};
console.log(t("log_start"));

const api = ea.getExcalidrawAPI();

ea.reset();

// --- Configuration ---
const START_X = api.getAppState().scrollX + 400;
const START_Y = api.getAppState().scrollY + 300;
const COLOR = "#1e1e1e";
const STROKE_WIDTH = 2;
const GRID_X = 120; 
const GRID_Y = 120; 

// --- Math Helpers for Curves ---

// Generate points for a Quadratic Bezier curve (for OR/XOR shapes)
const getQuadBezierPoints = (p0, p1, p2, segments = 10) => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
        const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
        points.push([x, y]);
    }
    return points;
};

// Generate points for a Semi-Circle Arc (for AND/NAND)
const getArcPoints = (cx, cy, radius, startAngle, endAngle, segments = 10) => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / segments);
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        points.push([x, y]);
    }
    return points;
};

// --- Drawing Helpers ---

function drawBubble(cx, cy) {
    const r = 3.5;
    // addEllipse(x, y, width, height)
    const id = ea.addEllipse(cx - r, cy - r, r * 2, r * 2);
    ea.style.fillStyle = "solid";
    ea.style.backgroundColor = "transparent"; // Hollow bubble
    return id;
}

// --- Component Generators ---

const library = [
    // --- ROW 1: Transistors ---
    {
        name: "NMOS", row: 0, col: 0,
        draw: (x, y) => {
            const ids = [];
            // Gate Lead (Short 8px)
            ids.push(ea.addLine([[x + 0, y + 30], [x + 10, y + 30]]));
            // Gate Plate
            ids.push(ea.addLine([[x + 10, y + 14], [x + 10, y + 46]]));
            // Channel Plate
            ids.push(ea.addLine([[x + 18, y + 10], [x + 18, y + 50]]));
            // Drain (Top -> Right 12px -> Up)
            ids.push(ea.addLine([[x + 18, y + 12], [x + 30, y + 12], [x + 30, y + 0]]));
            // Source (Bottom -> Right 12px -> Down)
            ids.push(ea.addLine([[x + 18, y + 48], [x + 30, y + 48], [x + 30, y + 60]]));
            return ids;
        }
    },
    {
        name: "PMOS", row: 0, col: 1,
        draw: (x, y) => {
            const ids = [];
            // Gate Lead
            ids.push(ea.addLine([[x-2, y + 30], [x + 2, y + 30]]));
            ids.push(drawBubble(x + 5.5, y + 30)); // Bubble centered
            ids.push(ea.addLine([[x + 9, y + 30], [x + 10, y + 30]]));
            // Plates & Rest (Same as NMOS)
            ids.push(ea.addLine([[x + 10, y + 14], [x + 10, y + 46]]));
            ids.push(ea.addLine([[x + 18, y + 10], [x + 18, y + 50]]));
            ids.push(ea.addLine([[x + 18, y + 12], [x + 30, y + 12], [x + 30, y + 0]]));
            ids.push(ea.addLine([[x + 18, y + 48], [x + 30, y + 48], [x + 30, y + 60]]));
            return ids;
        }
    },

    // --- ROW 2: Basic Gates ---
    {
        name: "NOT", row: 1, col: 0,
        draw: (x, y) => {
            const ids = [];
            // Triangle Body
            ea.style.fillStyle = "solid";
            ea.style.backgroundColor = "transparent";
            ids.push(ea.addLine([[x + 5, y + 10], [x + 5, y + 50], [x + 35, y + 30], [x + 5, y + 10]]));
            // Bubble
            ids.push(drawBubble(x + 39, y + 30));
            // Leads
            ids.push(ea.addLine([[x, y + 30], [x + 5, y + 30]])); // In
            ids.push(ea.addLine([[x + 43, y + 30], [x + 50, y + 30]])); // Out
            return ids;
        }
    },
    {
        name: "AND", row: 1, col: 1,
        draw: (x, y) => {
            const ids = [];
            // Body: Box part + Arc part
            const arcPts = getArcPoints(x + 25, y + 30, 25, -Math.PI / 2, Math.PI / 2);
            const bodyPts = [
                [x + 5, y + 5],   // Top Left
                ...arcPts,        // Right Arc
                [x + 5, y + 55],  // Bottom Left
                [x + 5, y + 5]    // Close
            ];
            ids.push(ea.addLine(bodyPts));
            // Leads
            ids.push(ea.addLine([[x, y + 15], [x + 5, y + 15]]));
            ids.push(ea.addLine([[x, y + 45], [x + 5, y + 45]]));
            ids.push(ea.addLine([[x + 50, y + 30], [x + 55, y + 30]]));
            return ids;
        }
    },
    {
        name: "OR", row: 1, col: 2,
        draw: (x, y) => {
            const ids = [];
            // Body constructed from 3 curves
            const topCurve = getQuadBezierPoints([x + 5, y + 5], [x + 35, y + 5], [x + 55, y + 30]);
            const botCurve = getQuadBezierPoints([x + 55, y + 30], [x + 35, y + 55], [x + 5, y + 55]);
            const backCurve = getQuadBezierPoints([x + 5, y + 55], [x + 15, y + 30], [x + 5, y + 5]); // Concave back
            
            ids.push(ea.addLine([...topCurve, ...botCurve, ...backCurve]));
            
            // Leads
            ids.push(ea.addLine([[x, y + 15], [x + 8, y + 15]])); // In A
            ids.push(ea.addLine([[x, y + 45], [x + 8, y + 45]])); // In B
            ids.push(ea.addLine([[x + 55, y + 30], [x + 60, y + 30]])); // Out
            return ids;
        }
    },
    {
        name: "XOR", row: 1, col: 3,
        draw: (x, y) => {
            const ids = [];
            // OR Body (shifted right by 10)
            const xOff = 10;
            const topCurve = getQuadBezierPoints([x + 5 + xOff, y + 5], [x + 35 + xOff, y + 5], [x + 55 + xOff, y + 30]);
            const botCurve = getQuadBezierPoints([x + 55 + xOff, y + 30], [x + 35 + xOff, y + 55], [x + 5 + xOff, y + 55]);
            const backCurve = getQuadBezierPoints([x + 5 + xOff, y + 55], [x + 15 + xOff, y + 30], [x + 5 + xOff, y + 5]);
            ids.push(ea.addLine([...topCurve, ...botCurve, ...backCurve]));

            // Extra Back Curve
            const extraBack = getQuadBezierPoints([x + 5, y + 55], [x + 15, y + 30], [x + 5, y + 5]);
            ids.push(ea.addLine(extraBack));

            // Leads
            ids.push(ea.addLine([[x, y + 15], [x + 8, y + 15]]));
            ids.push(ea.addLine([[x, y + 45], [x + 8, y + 45]]));
            ids.push(ea.addLine([[x + 55 + xOff, y + 30], [x + 65 + xOff, y + 30]]));
            return ids;
        }
    },

    // --- ROW 3: Derived Gates ---
    {
        name: "NAND", row: 2, col: 1,
        draw: (x, y) => {
            const ids = [];
            // Same as AND body
            const arcPts = getArcPoints(x + 25, y + 30, 25, -Math.PI / 2, Math.PI / 2);
            const bodyPts = [[x + 5, y + 5], ...arcPts, [x + 5, y + 55], [x + 5, y + 5]];
            ids.push(ea.addLine(bodyPts));
            // Bubble
            ids.push(drawBubble(x + 54, y + 30));
            // Leads
            ids.push(ea.addLine([[x, y + 15], [x + 5, y + 15]]));
            ids.push(ea.addLine([[x, y + 45], [x + 5, y + 45]]));
            ids.push(ea.addLine([[x + 58, y + 30], [x + 63, y + 30]]));
            return ids;
        }
    },
    {
        name: "NOR", row: 2, col: 2,
        draw: (x, y) => {
            const ids = [];
            // Same as OR body
            const topCurve = getQuadBezierPoints([x + 5, y + 5], [x + 35, y + 5], [x + 55, y + 30]);
            const botCurve = getQuadBezierPoints([x + 55, y + 30], [x + 35, y + 55], [x + 5, y + 55]);
            const backCurve = getQuadBezierPoints([x + 5, y + 55], [x + 15, y + 30], [x + 5, y + 5]);
            ids.push(ea.addLine([...topCurve, ...botCurve, ...backCurve]));
            // Bubble
            ids.push(drawBubble(x + 59, y + 30));
            // Leads
            ids.push(ea.addLine([[x, y + 15], [x + 8, y + 15]]));
            ids.push(ea.addLine([[x, y + 45], [x + 8, y + 45]]));
            ids.push(ea.addLine([[x + 63, y + 30], [x + 68, y + 30]]));
            return ids;
        }
    },

    // --- ROW 4: Complex Logic ---
    {
        name: "MUX (2:1)", row: 3, col: 0,
        draw: (x, y) => {
            const ids = [];
            // Flat Trapezoid
            ids.push(ea.addLine([
                [x + 15, y + 0],  // Top Left
                [x + 40, y + 20], // Top Right
                [x + 40, y + 40], // Bot Right
                [x + 15, y + 60], // Bot Left
                [x + 15, y + 0]   // Close
            ]));
            // Inputs
            ids.push(ea.addLine([[x + 5, y + 15], [x + 15, y + 15]]));
            ids.push(ea.addLine([[x + 5, y + 40], [x + 15, y + 40]]));
            // Output
            ids.push(ea.addLine([[x + 40, y + 30], [x + 55, y + 30]]));
            // Select
            ids.push(ea.addLine([[x + 30, y + 50], [x + 30, y + 65]]));
            return ids;
        }
    },
    {
        name: "ALU", row: 3, col: 1,
        draw: (x, y) => {
            const ids = [];
            // Flat-V-Flat Shape (Compressed Height 35px)
            ids.push(ea.addLine([
                [x + 0, y + 0],   // Top Left
                [x + 20, y + 0],  // Flat
                [x + 30, y + 8],  // V Notch Bottom
                [x + 40, y + 0],  // Flat
                [x + 60, y + 0],  // Top Right
                [x + 45, y + 35], // Right Slant
                [x + 15, y + 35], // Bottom Flat
                [x + 0, y + 0]    // Left Slant Close
            ]));
            // Output Arrow
            ids.push(ea.addLine([[x + 30, y + 35], [x + 30, y + 45]]));
            return ids;
        }
    },
    {
        name: "Register", row: 3, col: 2,
        draw: (x, y) => {
            const ids = [];
            // Box
            ids.push(ea.addLine([[x + 10, y + 5], [x + 50, y + 5], [x + 50, y + 55], [x + 10, y + 55], [x + 10, y + 5]]));
            // Clock Triangle (Moved UP)
            ids.push(ea.addLine([[x + 10, y + 40], [x + 18, y + 45], [x + 10, y + 50]]));
            // Leads
            ids.push(ea.addLine([[x + 5, y + 15], [x + 10, y + 15]])); // D
            ids.push(ea.addLine([[x + 50, y + 15], [x + 55, y + 15]])); // Q
            return ids;
        }
    },
    {
        name: "Crossbar", row: 3, col: 3,
        draw: (x, y) => {
            const ids = [];
            // Box
            ids.push(ea.addLine([[x + 0, y + 0], [x + 60, y + 0], [x + 60, y + 60], [x + 0, y + 60], [x + 0, y + 0]]));
            // Internal Switch Matrix X
            // Line 1: Top-Left to Bot-Right
            ids.push(ea.addLine([[x + 10, y + 15], [x + 20, y + 15], [x + 40, y + 45], [x + 50, y + 45]]));
            // Line 2: Bot-Left to Top-Right
            ids.push(ea.addLine([[x + 10, y + 45], [x + 20, y + 45], [x + 40, y + 15], [x + 50, y + 15]]));
            return ids;
        }
    }
];

// --- Main Generation Loop ---

const allGeneratedIds = [];

library.forEach(comp => {
    const x = START_X + comp.col * GRID_X;
    const y = START_Y + comp.row * GRID_Y;

    // 1. Set Style
    ea.style.strokeColor = COLOR;
    ea.style.strokeWidth = STROKE_WIDTH;
    ea.style.roughness = 0; // Clean lines
    ea.style.roundness = null; // Sharp by default, curves handle themselves via polyline
    ea.style.fillStyle = "solid";
    ea.style.backgroundColor = "transparent";

    // 2. Draw Component & Get Element IDs
    const elementIds = comp.draw(x, y);

    // 3. Add Label
    // const labelId = ea.addText(x, y + 65, comp.name, { fontSize: 10, textAlign: "center", width: 60, fontFamily: 3 });
    // elementIds.push(labelId);

    // 4. Group Elements
    ea.addToGroup(elementIds);
    
    allGeneratedIds.push(...elementIds);
});

// 5. Finalize
ea.addElementsToView(false, false, true);
ea.selectElementsInView(allGeneratedIds);
new Notice(t("notice_success"));