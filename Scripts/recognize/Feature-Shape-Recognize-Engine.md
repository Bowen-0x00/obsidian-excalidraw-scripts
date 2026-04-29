---
name: 几何规则化引擎 (后台计算层)
description: 后台引擎：提供纯粹的数学转化算法与 PointerUp 拦截器。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻。通过 Action 面板来控制自动模式的开关或执行手动转换。
features:
  - 核心几何拉直剔除算法
  - 拦截 handleCanvasPointerUp，智能抓取 elements 数组最后一个元素进行防抖转换
dependencies:
  - 与 Action-Convert-Shape 配合使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_mounted: "[{id}] 🚀 引擎核心(V5.1)挂载完毕",
    log_unmounted: "[{id}] 🔌 已卸载"
  },
  en: {
    log_mounted: "[{id}] 🚀 Engine Core mounted",
    log_unmounted: "[{id}] 🔌 Unmounted"
  }
};

const SCRIPT_ID = "ymjr.feature.shape-engine-pro";

ea.plugin._ymjr_shape = ea.plugin._ymjr_shape || {};
const ShapeCore = ea.plugin._ymjr_shape;

// 默认关闭自动模式，由 Action 面板来控制
ShapeCore.autoMode = false;
ShapeCore.autoTimer = null;

// ==========================================
// 1. 数学与几何分析算法库 (V4.0 的角度剔除法)
// ==========================================
function pointLineDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    let t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function rdp(points, epsilon) {
    if (points.length < 3) return points;
    let maxDist = 0, index = 0; const end = points.length - 1;
    for (let i = 1; i < end; i++) {
        const dist = pointLineDist(points[i], points[0], points[end]);
        if (dist > maxDist) { maxDist = dist; index = i; }
    }
    if (maxDist > epsilon) return rdp(points.slice(0, index + 1), epsilon).slice(0, -1).concat(rdp(points.slice(index), epsilon));
    return [points[0], points[end]];
}

function computeAngle(A, B, C) {
    let AB = Math.hypot(A[0]-B[0], A[1]-B[1]), CB = Math.hypot(C[0]-B[0], C[1]-B[1]);
    if (AB === 0 || CB === 0) return 180;
    let dot = (A[0]-B[0])*(C[0]-B[0]) + (A[1]-B[1])*(C[1]-B[1]);
    return Math.acos(Math.max(-1, Math.min(1, dot / (AB * CB)))) * 180 / Math.PI;
}

function polygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += points[i][0] * points[j][1] - points[j][0] * points[i][1];
    }
    return Math.abs(area / 2);
}

function fitLineLeastSquares(points) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0; const n = points.length;
    points.forEach(p => { sumX += p[0]; sumY += p[1]; sumXY += p[0] * p[1]; sumX2 += p[0] * p[0]; });
    const xMean = sumX / n, yMean = sumY / n, denominator = sumX2 - sumX * xMean;
    if (Math.abs(denominator) < 1e-5) return { isVertical: true, x: xMean };
    const slope = (sumXY - sumX * yMean) / denominator;
    return { isVertical: false, slope, intercept: yMean - slope * xMean };
}

ShapeCore.recognizeShape = (points) => {
    if (!points || points.length < 2) return null;
    let xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    let w = maxX - minX, h = maxY - minY, maxSpan = Math.max(w, h);
    let isClosed = Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]) < maxSpan * 0.15;

    let simplified = rdp(points, maxSpan * 0.04);
    if (isClosed) simplified[simplified.length - 1] = simplified[0];

    let changed = true, iter = 0;
    while (changed && iter < 5) {
        changed = false; let res = [simplified[0]];
        for (let i = 1; i < simplified.length - 1; i++) {
            if (computeAngle(res[res.length-1], simplified[i], simplified[i+1]) < 155) res.push(simplified[i]);
            else changed = true;
        }
        res.push(simplified[simplified.length-1]);
        if (isClosed && res.length > 3 && computeAngle(res[res.length-2], res[0], res[1]) > 155) {
            res.pop(); res.shift(); res.push(res[0]); changed = true;
        }
        simplified = res; iter++;
    }

    let vertexCount = simplified.length;
    if (!isClosed && vertexCount <= 2) {
        const lineModel = fitLineLeastSquares(points);
        let correctedStart = lineModel.isVertical ? [lineModel.x, points[0][1]] : [points[0][0], lineModel.slope * points[0][0] + lineModel.intercept];
        let correctedEnd = lineModel.isVertical ? [lineModel.x, points[points.length - 1][1]] : [points[points.length - 1][0], lineModel.slope * points[points.length - 1][0] + lineModel.intercept];
        return { type: "line", start: correctedStart, end: correctedEnd, bounds: { x: minX, y: minY, w, h } };
    }

    let cx = minX + w / 2, cy = minY + h / 2, a = w / 2, b = h / 2, ellipseError = 0;
    points.forEach(p => ellipseError += Math.abs((Math.pow(p[0] - cx, 2) / Math.pow(a, 2) + Math.pow(p[1] - cy, 2) / Math.pow(b, 2)) - 1));
    if (isClosed && (ellipseError / points.length) < 0.20 && vertexCount > 5) return { type: "ellipse", bounds: { x: minX, y: minY, w, h } };

    if (isClosed) {
        if (vertexCount === 4) return { type: "polygon", points: simplified, isClosed: true };
        if (vertexCount === 5) {
            let polyArea = polygonArea(simplified);
            let cX = 0, cY = 0; for(let i=0; i<4; i++) { cX += simplified[i][0]; cY += simplified[i][1]; }
            let centroidOffset = Math.hypot((cX/4) - cx, (cY/4) - cy);
            if (polyArea > w * h * 0.75) return { type: "rectangle", bounds: { x: minX, y: minY, w, h } };
            if (polyArea > w * h * 0.4 && polyArea < w * h * 0.6 && centroidOffset < maxSpan * 0.08) return { type: "diamond", bounds: { x: minX, y: minY, w, h } };
        }
    }
    return { type: "polygon", points: simplified, isClosed: isClosed };
};

// ==========================================
// 2. EA 视图转换统一接口
// ==========================================
ShapeCore.convertElements = async (elements, ea, mode = "auto") => {
    ea.clear(); 
    let hasNew = false;
    
    for (const el of elements) {
        if (el.type !== "freedraw") continue;

        const recognized = ShapeCore.recognizeShape(el.points);
        if (!recognized) continue;

        ea.style.strokeColor = el.strokeColor;
        ea.style.backgroundColor = el.backgroundColor;
        ea.style.strokeWidth = el.strokeWidth;
        ea.style.roughness = el.roughness;
        ea.style.fillStyle = el.fillStyle;
        ea.style.strokeStyle = el.strokeStyle;

        let finalType = mode === "auto" ? recognized.type : mode;
        let b = recognized.bounds;
        let ex = el.x + (b ? b.x : 0);
        let ey = el.y + (b ? b.y : 0);

        if (finalType === "rectangle") ea.addRect(ex, ey, b.w, b.h);
        else if (finalType === "ellipse") ea.addEllipse(ex, ey, b.w, b.h);
        else if (finalType === "diamond") ea.addDiamond(ex, ey, b.w, b.h);
        else if (finalType === "line") {
            let start = recognized.start || [0,0];
            let end = recognized.end || [b.w, b.h];
            ea.addLine([ [el.x + start[0], el.y + start[1]], [el.x + end[0], el.y + end[1]] ]);
        } else if (finalType === "polygon") {
            let polyPoints = recognized.points.map(p => [el.x + p[0], el.y + p[1]]);
            if (recognized.isClosed && polyPoints.length > 0) polyPoints.push([...polyPoints[0]]);
            ea.addLine(polyPoints);
        }
        hasNew = true;
    }

    if (hasNew) {
        await ea.addElementsToView(false, false);
        ea.deleteViewElements(elements);
    }
};

// ==========================================
// 3. EA Core Hook 拦截器 (智能抓取数组末尾元素)
// ==========================================
const handlePointerUp = (payload) => {
    if (!ShapeCore.autoMode) return false;
    
    const { ea, api } = payload;
    if (!ea || !api) return false;

    // 直接从场景全量元素中获取最后一个
    const elements = api.getSceneElements();
    if (!elements || elements.length === 0) return false;
    
    const lastEl = elements[elements.length - 1];

    if (lastEl.type === "freedraw") {
        clearTimeout(ShapeCore.autoTimer);
        // 延迟 0.5s，等用户彻底画完再转换
        ShapeCore.autoTimer = setTimeout(async () => {
            // 确认该元素没被用户光速撤销
            const currentEls = api.getSceneElements();
            if (currentEls.some(el => el.id === lastEl.id)) {
                await ShapeCore.convertElements([lastEl], ea, "auto");
            }
        }, 500);
    }
    return false;
};

// ==========================================
// 4. 挂载逻辑
// ==========================================
async function mountFeature() {
    if (typeof ea.plugin[`disable_${SCRIPT_ID}`] === "function") ea.plugin[`disable_${SCRIPT_ID}`]();
    if (window.EA_Core) window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerUp', handlePointerUp, 70);

    ea.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        clearTimeout(ShapeCore.autoTimer);
        delete ea.plugin._ymjr_shape.autoMode;
        delete ea.plugin._ymjr_shape.recognizeShape;
        delete ea.plugin._ymjr_shape.convertElements;
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };
    console.log(t("log_mounted", { id: SCRIPT_ID }));
}
mountFeature();