---
name: 连线实时测量引擎
description: 后台引擎：提供连线/箭头拖拽时的实时长度测量与文本标签自动跟随。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为前置依赖挂载，在画板中拖拽含有 measure 属性的连线时，自动计算长度并实时刷新文本标签位置。
features:
  - 拦截 handlePointDragging 钩子以实现实时重绘
  - 提供安全、高性能的内存级别节点更新，绕过 Excalidraw 原生 API 卡顿
  - 暴露 updateMeasureText API 给外部面板使用
dependencies:
  - 供 "连线测量与精控面板" (Action-Measure-Panel.md) 配合使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_no_core: "EA_Core 未运行",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_no_core: "EA_Core not running",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.measure-engine";

// 辅助计算长度和中心偏移
function calculateMeasure(points, ratio, unit) {
    if (!points || points.length < 2) return null;
    const dx = points[points.length - 1][0] - points[0][0];
    const dy = points[points.length - 1][1] - points[0][1];
    const distance = Math.hypot(dx, dy) / ratio;
    const distanceFixed = (distance % 1 !== 0 ? distance.toFixed(2) : distance) + unit;
    return { dx, dy, distanceFixed };
}

// 核心更新逻辑：彻底分离“创建”与“更新”逻辑，绕过底层校验崩溃
const updateMeasureText = async (elementsToMeasure, isLiveDrag = false) => {
    const api = ea.getExcalidrawAPI();
    if (!api) return;
    
    // 1. 获取最新鲜的视图元素字典
    const elementsMap = api.getSceneElementsMap?.() || new Map(ea.getViewElements().map(el => [el.id, el]));
    
    let requiresCreation = false;
    const elsToCreateOrUpdate = [];
    let needsManualRefresh = false;

    for (const origElement of elementsToMeasure) {
        if (!origElement?.customData?.measure || !["line", "arrow"].includes(origElement.type)) continue;

        const meas = calculateMeasure(origElement.points, Number(origElement.customData.measure.ratio) || 10, origElement.customData.measure.unit);
        if (!meas) continue;

        const cx = origElement.x + meas.dx / 2;
        const cy = origElement.y + meas.dy / 2;

        const textBound = origElement.boundElements?.find(b => b.type === "text" || b.type === "textElement");
        const liveTextEl = textBound ? elementsMap.get(textBound.id) : null;

        if (liveTextEl) {
            // ========================================================
            // 【存量更新】：直接突变内存对象，绝不调用 API 重绘
            // ========================================================
            liveTextEl.text = liveTextEl.rawText = liveTextEl.originalText = meas.distanceFixed;
            liveTextEl.x = cx - liveTextEl.width / 2;
            liveTextEl.y = cy - liveTextEl.height / 2;
            liveTextEl.version = (liveTextEl.version || 0) + 1;

            // 🚀 核心修复：Excalidraw 严格校验文本层级必须高于箭头层级
            // FractionalIndex 是字符串比较。若文本层级 <= 箭头层级，追加 "a" 强制提高层级，阻止崩溃
            if (liveTextEl.fractionalIndex <= origElement.fractionalIndex) {
                liveTextEl.fractionalIndex = origElement.fractionalIndex + "a";
            }
            needsManualRefresh = true;
        } else {
            // ========================================================
            // 【增量创建】：放入队列，后续统一调用安全 API
            // ========================================================
            if (!isLiveDrag) {
                requiresCreation = true;
                elsToCreateOrUpdate.push({ origElement, meas, cx, cy });
            }
        }
    }

    // 2. 仅在需要新建文字时，才触发 EA 的重量级重建机制
    if (requiresCreation && elsToCreateOrUpdate.length > 0) {
        ea.clear();
        const editContainers = [];

        for (const { origElement, meas, cx, cy } of elsToCreateOrUpdate) {
            ea.style.backgroundColor = "transparent";
            ea.style.verticalAlign = "middle";
            ea.style.textAlign = "center";
            
            const textId = ea.addText(0, 0, meas.distanceFixed);
            const newTextEl = ea.getElement(textId);
            
            newTextEl.containerId = origElement.id;
            newTextEl.x = cx - newTextEl.width / 2;
            newTextEl.y = cy - newTextEl.height / 2;
            
            // 🚀 核心修复：新建时强制注入合法的图层索引关系
            newTextEl.fractionalIndex = origElement.fractionalIndex + "a";

            // 绑定容器
            const liveContainer = elementsMap.get(origElement.id);
            if (liveContainer) {
                editContainers.push(liveContainer);
                ea.copyViewElementsToEAforEditing([liveContainer]);
                const eaContainer = ea.getElement(liveContainer.id);
                eaContainer.boundElements = eaContainer.boundElements || [];
                eaContainer.boundElements.push({ type: "text", id: textId });
            }
        }
        await ea.addElementsToView(false, false, true); 
    } 
    // 3. 非拖拽且仅更新数值时，触发一次 React 轻量刷新
    else if (!isLiveDrag && needsManualRefresh) {
        api.updateScene({ elements: api.getSceneElements() });
    }
};

// Hook：拖拽控制节点时触发
const handlePointDragging = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    let element;
    if (contextPayload && !contextPayload.element && arguments.length > 1) {
        element = arguments[0];
    } else {
        element = contextPayload?.element;
    }

    if (element?.customData?.measure && ["line", "arrow"].includes(element?.type)) {
        // isLiveDrag 设置为 true，走纯内存突变，不再卡顿和崩溃
        updateMeasureText([element], true);
    }
    return false; 
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'handlePointDragging', handlePointDragging, 60);

    // 暴露给面板脚本调用
    ExcalidrawAutomate.plugin.measureEngine = { updateMeasureText };

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        delete ExcalidrawAutomate.plugin.measureEngine; 
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();