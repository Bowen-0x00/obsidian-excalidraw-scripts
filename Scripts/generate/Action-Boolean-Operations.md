---
name: 高保真布尔运算 (Boolean Operations)
description: 基于渲染缓存的布尔运算工具，支持合并、相交、差集等操作，完美保留自定义箭头的轮廓。
author: ymjr
version: 1.0.1
license: MIT
usage: 选中至少两个图形（包括原生矩形/圆/菱形以及带有自定义路径的箭头），运行此脚本，选择布尔运算类型，生成完美的 SVG 合并路径。
features:
  - 路径精准提取：绕过 Rough.js 的混乱描边，提取底层的填充轮廓或渲染缓存，确保几何准确
  - 智能几何生成：对原生图形采用纯数学多边形生成，杜绝草图交叉线导致的布尔崩溃
  - SVG 路径输出：布尔结果转化为轻量化 SVG Path (M...Z)，极大优化渲染性能并消除内部拼接缝隙
  - 多语言支持：自动跟随 Obsidian 环境切换中英文提示
dependencies:
  - 依赖插件自带的 PolyBool 引擎
autorun: false
---
/*
```javascript
*/

const locales = {
    zh: {
        notice_select: "请先选中至少两个图形进行布尔运算！",
        notice_fail: "布尔运算失败：图形不相交或产生了非法结果！",
        notice_success: "✅ 布尔运算完成！",
        prompt_action: "请选择要执行的布尔操作："
    },
    en: {
        notice_select: "Please select at least two shapes to perform boolean operations!",
        notice_fail: "Boolean operation failed: shapes do not intersect or invalid result!",
        notice_success: "✅ Boolean operation complete!",
        prompt_action: "Select the boolean action:"
    }
};

async function runBooleanAction() {
    const api = ea.getExcalidrawAPI();
    const elements = ea.getViewSelectedElements();

    if (elements.length < 2) {
        new Notice(t("notice_select"));
        return;
    }

    const PolyBool = ea.getPolyBool();
    const actionLabels = ["合并 (Union)", "相交 (Intersect)", "减去 (Difference)", "反向减去 (Reversed Diff)", "异或 (XOR)"];
    const actions = [PolyBool.union, PolyBool.intersect, PolyBool.difference, PolyBool.differenceRev, PolyBool.xor];

    const selectedActionLabel = await utils.suggester(actionLabels, actionLabels, t("prompt_action"));
    if (!selectedActionLabel) return;
    const polyboolAction = actions[actionLabels.indexOf(selectedActionLabel)];

    // --- 基础数学图形生成器（彻底避开手绘交叉线） ---
    function getRectPoints(el) {
        if (el.roundness) {
            const w = el.width, h = el.height;
            const r = Math.min(w, h) * 0.15; 
            const poly = [];
            const steps = 8;
            for(let i=0; i<=steps; i++) poly.push([r + r*Math.cos(Math.PI + (Math.PI/2)*(i/steps)), r + r*Math.sin(Math.PI + (Math.PI/2)*(i/steps))]);
            for(let i=0; i<=steps; i++) poly.push([w-r + r*Math.cos(-Math.PI/2 + (Math.PI/2)*(i/steps)), r + r*Math.sin(-Math.PI/2 + (Math.PI/2)*(i/steps))]);
            for(let i=0; i<=steps; i++) poly.push([w-r + r*Math.cos((Math.PI/2)*(i/steps)), h-r + r*Math.sin((Math.PI/2)*(i/steps))]);
            for(let i=0; i<=steps; i++) poly.push([r + r*Math.cos(Math.PI/2 + (Math.PI/2)*(i/steps)), h-r + r*Math.sin(Math.PI/2 + (Math.PI/2)*(i/steps))]);
            return poly;
        }
        return [[0, 0], [el.width, 0], [el.width, el.height], [0, el.height]];
    }

    function getDiamondPoints(el) {
        return [[el.width/2, 0], [el.width, el.height/2], [el.width/2, el.height], [0, el.height/2]];
    }

    function getEllipsePoints(el) {
        const poly = [];
        const steps = 36;
        const rx = el.width / 2, ry = el.height / 2;
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            poly.push([rx + rx * Math.cos(angle), ry + ry * Math.sin(angle)]);
        }
        return poly;
    }

    function transformPolygon(poly, el) {
        const cx = el.width / 2;
        const cy = el.height / 2;
        const cos = Math.cos(el.angle);
        const sin = Math.sin(el.angle);
        return poly.map(([x, y]) => {
            const nx = x - cx, ny = y - cy;
            const rx = nx * cos - ny * sin;
            const ry = nx * sin + ny * cos;
            return [
                Math.round((rx + cx + el.x) * 100) / 100, 
                Math.round((ry + cy + el.y) * 100) / 100
            ];
        });
    }

    function cleanPolygon(poly) {
        if (!poly || poly.length === 0) return [];
        let cleaned = [poly[0]];
        for (let i = 1; i < poly.length; i++) {
            const prev = cleaned[cleaned.length - 1];
            const curr = poly[i];
            if (Math.hypot(curr[0] - prev[0], curr[1] - prev[1]) > 0.5) {
                cleaned.push(curr);
            }
        }
        if (cleaned.length > 2) {
            const start = cleaned[0];
            const end = cleaned[cleaned.length - 1];
            if (Math.hypot(end[0] - start[0], end[1] - start[1]) <= 0.5) cleaned.pop();
        }
        return cleaned;
    }

    // --- 核心提取逻辑 ---
    function extractAbsolutePolygons(el) {
        if (el.type === "rectangle" && !el.customData?.svgPathShape) return [transformPolygon(getRectPoints(el), el)];
        if (el.type === "ellipse" && !el.customData?.svgPathShape) return [transformPolygon(getEllipsePoints(el), el)];
        if (el.type === "diamond" && !el.customData?.svgPathShape) return [transformPolygon(getDiamondPoints(el), el)];

        let shapeArray = api.ShapeCache?.get(el);
        if (!shapeArray) shapeArray = api.ShapeCache?.generateElementShape(el);
        if (!shapeArray) return [];

        if (!Array.isArray(shapeArray)) shapeArray = [shapeArray];

        let polygons = [];

        shapeArray.forEach(drawable => {
            if (!drawable || !drawable.sets) return;

            let targetSet = drawable.sets.find(s => s.type === 'fillPath');
            if (!targetSet) targetSet = drawable.sets.find(s => s.type === 'path');
            if (!targetSet) return;

            let currentPoly = [];
            targetSet.ops.forEach(op => {
                if (op.op === 'move') {
                    if (currentPoly.length > 2) polygons.push(cleanPolygon(currentPoly));
                    currentPoly = [[op.data[0], op.data[1]]];
                } else if (op.op === 'lineTo') {
                    currentPoly.push([op.data[0], op.data[1]]);
                } else if (op.op === 'bcurveTo') {
                    const p0 = currentPoly[currentPoly.length - 1] || [0, 0];
                    const [cp1x, cp1y, cp2x, cp2y, p3x, p3y] = op.data;
                    const steps = 15;
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        const x = Math.pow(1-t, 3)*p0[0] + 3*Math.pow(1-t, 2)*t*cp1x + 3*(1-t)*Math.pow(t, 2)*cp2x + Math.pow(t, 3)*p3x;
                        const y = Math.pow(1-t, 3)*p0[1] + 3*Math.pow(1-t, 2)*t*cp1y + 3*(1-t)*Math.pow(t, 2)*cp2y + Math.pow(t, 3)*p3y;
                        currentPoly.push([x, y]);
                    }
                }
            });
            if (currentPoly.length > 2) polygons.push(cleanPolygon(currentPoly));
        });

        return polygons.map(poly => transformPolygon(poly, el));
    }

    // ---- 开始执行 ----
    const sortedElements = [...elements].sort((a, b) => (b.opacity / 100) - (a.opacity / 100));
    const topStyleEl = sortedElements[0];

    let accumulatedPolygons = extractAbsolutePolygons(elements[0]);

    for (let i = 1; i < elements.length; i++) {
        const toolPolygons = extractAbsolutePolygons(elements[i]);
        const resultObj = polyboolAction({
            regions: accumulatedPolygons, inverted: false
        }, {
            regions: toolPolygons, inverted: false
        });
        accumulatedPolygons = resultObj.regions;
    }

    if (!accumulatedPolygons || accumulatedPolygons.length === 0) {
        new Notice(t("notice_fail"));
        return;
    }

    // 重算 Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    accumulatedPolygons.forEach(region => {
        region.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
    });
    const newWidth = maxX - minX;
    const newHeight = maxY - minY;

    // 生成高保真 SVG Path
    let svgPathStr = "";
    accumulatedPolygons.forEach(region => {
        if (region.length < 3) return;
        svgPathStr += `M ${region[0][0] - minX} ${region[0][1] - minY} `;
        for (let i = 1; i < region.length; i++) {
            svgPathStr += `L ${region[i][0] - minX} ${region[i][1] - minY} `;
        }
        svgPathStr += "Z "; 
    });

    // 继承原元素的属性
    ea.style.strokeColor = topStyleEl.strokeColor;
    ea.style.backgroundColor = topStyleEl.backgroundColor;
    ea.style.fillStyle = topStyleEl.fillStyle;
    ea.style.strokeWidth = topStyleEl.strokeWidth;
    ea.style.strokeStyle = topStyleEl.strokeStyle;
    ea.style.roughness = topStyleEl.roughness;
    ea.style.opacity = topStyleEl.opacity;

    // 🚀 核心修复：用闭合的四边形作为载体，欺骗 Excalidraw 将其识别为多边形，解锁填充和背景色面板
    const newElementId = ea.addLine([
        [0, 0],
        [newWidth, 0],
        [newWidth, newHeight],
        [0, newHeight],
        [0, 0]
    ]);
    
    const newElement = ea.getElement(newElementId);

    newElement.x = minX;
    newElement.y = minY;
    newElement.width = newWidth;
    newElement.height = newHeight;
    newElement.angle = 0; 
    newElement.customData = {
        ...(topStyleEl.customData || {}),
        svgPathShape: svgPathStr.trim(),
        highlightLine: false 
    };

    ea.deleteViewElements(elements);
    ea.addElementsToView(false, false, true);

    new Notice(t("notice_success"));
}

runBooleanAction();