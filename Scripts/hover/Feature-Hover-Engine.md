---
name: Hover 交互引擎 (状态管理)
description: 全局状态机。检测鼠标悬停事件，解析 target 目标，并自动控制鼠标光标形态。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为前置依赖运行，用于监听 Excalidraw 的鼠标悬停事件（PointerMove），主要服务于那些需要在光标悬停时改变形态或触发特效的脚本。
features:
  - 维持全局的 Hover 状态机（activeIds 和 triggerId）
  - 解析 hover 自定义数据中的 target 目标
  - 控制 Excalidraw 画布中鼠标指针的样式（如变手型）
dependencies:
  - 无前置依赖
  - 为其他交互型脚本提供基础支持（如 Collapse, Mindmap, 连线高亮等）
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.hover-engine";

ExcalidrawAutomate.plugin._ymjr_HoverState = ExcalidrawAutomate.plugin._ymjr_HoverState || {
    triggerId: null,   
    activeIds: new Set(), 
    hoverData: null    
};

function resolveTargetIds(hitElement, App, ea) {
    const hoverData = hitElement.customData?.hover;
    if (!hoverData) return [hitElement.id];

    if (Array.isArray(hoverData.id) && hoverData.id.length > 0) return hoverData.id;
    if (typeof hoverData.id === "string") {
        if (hoverData.id === "self") return [hitElement.id];
        if (hoverData.id === "target") {
            const groupElements = ea.getElementsInTheSameGroupWithElement(
                hitElement, 
                App.scene.getNonDeletedElements()
            );
            const targetEl = groupElements.find(el => el?.customData?.hover?.target);
            return targetEl ? [targetEl.id] : [];
        }
    }
    return [hitElement.id];
}

// 强制刷新视图引擎
function triggerRedraw(App, ea) {
    ea.viewUpdateScene({ appState: { zoom: { value: App.state.zoom.value + 0.00001 } } });
}

// ====================== 核心 Hook ======================
const handleCanvasPointerMove = (ctx) => {
    const { App, event, hitElement, ea, api } = ctx;
    if (!ea || !api) return;
    if (!ea?.plugin) return;
    const currentState = ExcalidrawAutomate.plugin._ymjr_HoverState;
    const isHoverValid = hitElement && hitElement.customData?.hover;

    // 1. 处理状态更新
    if (!isHoverValid) {
        if (currentState.activeIds.size > 0) {
            currentState.activeIds.clear();
            currentState.triggerId = null;
            currentState.hoverData = null;
            triggerRedraw(App, ea); 
        }
    } else {
        if (currentState.triggerId !== hitElement.id) {
            const targetIds = resolveTargetIds(hitElement, App, ea);
            currentState.triggerId = hitElement.id;
            currentState.activeIds = new Set(targetIds);
            currentState.hoverData = hitElement.customData.hover;
            triggerRedraw(App, ea);
        }
    }

    // 2. 光标控制逻辑
    if (hitElement && App.interactiveCanvas) {
        const cd = hitElement.customData || {};
        
        // 💡 判断 hover.pointer 开关，默认开启
        let wantsHoverPointer = false;
        if (cd.hover) {
            wantsHoverPointer = cd.hover.pointer !== false; 
        }

        const needsPointer = cd.collapse || cd.Mindmap || cd.highlightLine || wantsHoverPointer;
        
        let shouldSetCursor = false;
        if (cd.onPointerDownHook) {
            const hook = cd.onPointerDownHook;
            if (!hook.withKey) shouldSetCursor = true;
            else if ((hook.withKey === 'shift' && event.shiftKey) ||
                     (hook.withKey === 'ctrl' && event.ctrlKey) ||
                     (hook.withKey === 'alt' && event.altKey)) {
                shouldSetCursor = true;
            }
        }

        if (needsPointer || shouldSetCursor) {
            App.interactiveCanvas.style.cursor = "pointer";
        }
    }
};

function mountFeature() {
    if (!window.EA_Core) return;
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerMove', handleCanvasPointerMove, 50);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();