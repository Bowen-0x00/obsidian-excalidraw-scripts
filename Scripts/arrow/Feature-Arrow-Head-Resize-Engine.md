---
name: 箭头局部拉伸引擎
description: 后台引擎：提供点级别拖拽拦截，实现仅拉伸箭头局部的效果。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为前置依赖挂载，提供连线点级别拖拽拦截功能，实现仅拉伸箭头局部（而非整体位移）的视觉效果。
features:
  - 拦截 handlePointDragging 钩子
  - 根据 customData 中配置的 fixedPoints 和 dragablePoint 计算局部拉伸量和角度
  - 修改拖拽节点位置实现局部形变
dependencies:
  - 供 "设置箭头局部拉伸" (Action-Toggle-Arrow-Head.md) 配合使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_no_core: "EA_Core 引擎未运行",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_no_core: "EA_Core engine not running",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.arrowhead-resize-engine";

// --- 纯函数：数学计算模块 ---
function rotate(x, y, cx, cy, angle) {
    return [
        (x - cx) * Math.cos(angle) - (y - cy) * Math.sin(angle) + cx,
        (x - cx) * Math.sin(angle) + (y - cy) * Math.cos(angle) + cy,
    ];
}

function distance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
}

function regularIndex(indexes, points) {
    if (!indexes || !Array.isArray(indexes)) return [];
    return indexes.map(index => index === -1 ? points.length - 1 : index);
}

// --- 核心 Hook 处理器 ---
const handlePointDragging = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    // 适配你的 Hook Engine：假设入参已封装进 context 对象中
    const { element, newDraggingPointPosition, draggingPoint, linearElementEditor } = contextPayload;

    if (!element?.customData?.fixedDragablePoints) return false;
    if (!["line", "arrow"].includes(element.type)) return false;

    const draggingIndex = linearElementEditor.hoverPointIndex;
    if (draggingIndex === undefined) return false;

    const points = element.points;
    const config = element.customData.fixedDragablePoints;
    
    // 校验拖拽点是否在允许名单中
    const dragablePointIndex = regularIndex(config.dragablePointIndex, points);
    if (!dragablePointIndex.includes(draggingIndex)) return false;

    const fixedPointsIndex = regularIndex(config.fixedPointsIndex, points);
    
    // 计算基准中心点
    let basePoint = [0, 0];
    if (config.centerIndex && config.centerIndex.length > 0) {
        const centerIndex = regularIndex(config.centerIndex, points);
        basePoint = centerIndex.reduce((acc, curr) => {
            const p = points[curr];
            return [acc[0] + p[0], acc[1] + p[1]];
        }, [0, 0]);
        basePoint[0] /= centerIndex.length;
        basePoint[1] /= centerIndex.length;
    }

    // 计算距离差异 (只拉伸长度，不影响固定点的相对位置)
    const currentDistance = distance(draggingPoint, basePoint);
    const nextDistance = distance(newDraggingPointPosition, basePoint);
    const delta = nextDistance - currentDistance;

    const currentAngle = Math.atan2(draggingPoint[1] - basePoint[1], draggingPoint[0] - basePoint[0]);
    const angle0Points = points.map(p => rotate(p[0], p[1], basePoint[0], basePoint[1], -currentAngle));

    const nextAngle = Math.atan2(newDraggingPointPosition[1] - basePoint[1], newDraggingPointPosition[0] - basePoint[0]);
    
    // 核心重构：仅对非固定点应用形变拉伸
    const resizedPoints = angle0Points.map((p, index) => {
        if (fixedPointsIndex.includes(index)) {
            return p;
        } else {
            return [p[0] + delta, p[1]];
        }
    });

    const nextPoints = resizedPoints.map((p, index) => {
        if (index === draggingIndex) {
            return newDraggingPointPosition;
        } else {
            return rotate(p[0], p[1], basePoint[0], basePoint[1], nextAngle);
        }
    });

    element.points = nextPoints;
    return true; // 拦截默认拖拽行为
};

// --- 生命周期挂载 ---
async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    // 注册点级别拖拽 Hook
    window.EA_Core.registerHook(SCRIPT_ID, 'handlePointDragging', handlePointDragging, 60);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();