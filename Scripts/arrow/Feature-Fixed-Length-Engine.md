---
name: 连线定长控制引擎
description: 后台引擎：提供连线/箭头在拖拽节点时的长度锁定计算（圆规旋转效果）。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为前置依赖挂载，为连线或箭头提供定长旋转能力。
features:
  - 拦截 handlePointDragging 钩子，计算定长圆规旋转坐标
  - 强制锁定半径，覆盖 Excalidraw 默认的连线拖拽坐标更新
dependencies:
  - 供 "连线定长配置面板" (Action-Fixed-Length-Panel.md) 配合使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_drag_error: "[Feature: FixedLength] 拖拽错误:",
    log_no_core: "EA_Core 未运行",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_drag_error: "[Feature: FixedLength] Dragging Error:",
    log_no_core: "EA_Core not running",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.fixed-length-engine";

// 辅助数学计算：两点距离
function distance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
}

// 核心拖拽处理逻辑
const handlePointDragging = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    // 兼容可能传入的 context 封装或直接的多参数
    let element, newDraggingPointPosition, draggingPoint, linearElementEditor;
    
    if (contextPayload && !contextPayload.element && arguments.length > 1) {
        [element, newDraggingPointPosition, draggingPoint, linearElementEditor] = arguments;
    } else {
        ({ element, newDraggingPointPosition, draggingPoint, linearElementEditor } = contextPayload || {});
    }

    // 前置拦截：无数据、未开启定长、非线型元素直接跳过
    if (!element || !element.customData?.fixedLength) return false;
    if (!["line", "arrow"].includes(element.type)) return false;

    try {
        // 尝试获取当前正在拖拽的节点索引 (兼容 Excalidraw 不同版本的编辑器状态)
        const draggingIndex = linearElementEditor?.activePointIndex 
            ?? linearElementEditor?.hoverPointIndex 
            ?? linearElementEditor?.pointerDownState?.lastClickedPoint;
        
        if (draggingIndex === undefined || draggingIndex === null) return false;

        // 计算逻辑：以 [0, 0] 为基准点，保持原有的拖拽距离，但更新为新的角度
        const basePoint = [0, 0];
        const length = distance(draggingPoint, basePoint);
        const angle = Math.atan2(
            newDraggingPointPosition[1] - basePoint[1], 
            newDraggingPointPosition[0] - basePoint[0]
        );

        const points = element.points;
        if (points && points[draggingIndex]) {
            // 覆盖当前的拖拽坐标，强制锁定半径
            points[draggingIndex][0] = basePoint[0] + length * Math.cos(angle);
            points[draggingIndex][1] = basePoint[1] + length * Math.sin(angle);
        }
    } catch (e) {
        console.error(t("log_drag_error"), e);
    }
    
    return false; // 不阻断其他 hook 的执行
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    
    // 卸载旧实例防止重复挂载
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    // 挂载总线
    window.EA_Core.registerHook(SCRIPT_ID, 'handlePointDragging', handlePointDragging, 60);
    
    // 注册清理函数到 ExcalidrawAutomate.plugin，避免污染 window
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();