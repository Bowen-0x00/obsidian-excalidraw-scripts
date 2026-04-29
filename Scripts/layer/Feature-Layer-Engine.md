---
name: 图层控制核心引擎
description: 后台引擎：提供图层显示、隐藏、不可选拦截（修复点击击穿问题），以及新元素的自动图层归属。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为图层功能的基础常驻后台。通过拦截底层鼠标事件（shouldSelectElement）和元素更新事件（replaceAllElements），实现真实意义上的图层锁定与新元素图层自动归属。
features:
  - 拦截 shouldSelectElement 彻底修复 Excalidraw 原生的点击击穿隐患
  - 拦截 replaceAllElements 为当前活动层中新创建的元素自动赋予 `customData.layer` 属性
  - 独立状态管理（_ymjr_layer_engine），防止与其他脚本状态相互污染
dependencies:
  - 供 Action-Toggle-Layer-UI 面板调用并消费其数据结构
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

const SCRIPT_ID = "ymjr.feature.layer-engine";

// 1. 初始化独立的数据仓库 (防污染)
if (!ExcalidrawAutomate.plugin._ymjr_layer_engine) {
    ExcalidrawAutomate.plugin._ymjr_layer_engine = {
        layers: new Map([['all', true]]),
        selectableLayers: new Map([['all', true]]),
        pos: { left: 0, top: 0 },
        activeLayer: 'all', 
        showLayers: 'all'
    };
}
const layerData = ExcalidrawAutomate.plugin._ymjr_layer_engine;

// 2. Hook：处理选中拦截 (修复单点点击依然能选中的问题)
const handleShouldSelectElement = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { element, pointerDownState } = contextPayload;
    if (!element) return;

    let blockSelection = false;

    if (element.customData?.hide) {
        blockSelection = true;
    } else if (element.customData?.layer) {
        const layerName = element.customData.layer;
        if (layerData.layers.get(layerName) === false || layerData.selectableLayers.get(layerName) === false) {
            blockSelection = true;
        }
    }

    if (blockSelection) {
        contextPayload.shouldSelect = false;
        
        // 【关键修复】如果存在 pointerDownState（代表是鼠标点击事件触发的拦截）
        // 强制把 hit.element 抹除，彻底阻断 Excalidraw 将其作为交互目标
        if (pointerDownState && pointerDownState.hit) {
            pointerDownState.hit.element = null;
        }
    }
};

// 3. Hook：全局静态场景渲染提示 (修复 context undefined 报错)
const handleRenderStaticScene = (payload) => {
    const { ea, api } = payload;
    if (!ea || !api) return;

    const { canvas, context, appState } = payload;
    
    // // 安全获取 2D 上下文：如果 payload 未直接提供 context，则从 canvas 中提取
    // const ctx = context || (canvas && canvas.getContext ? canvas.getContext('2d') : null);
    
    // if (!ctx || !appState) return; // 防御性拦截，避免报错

    // if (layerData.showLayers !== 'all' && layerData.showLayers !== 'none') {
    //     ctx.save();
    //     const zoom = appState.zoom?.value || 1;
    //     ctx.font = `${48 / zoom}px serif`;
    //     ctx.fillStyle = "var(--text-color-primary, #000)"; 
    //     ctx.fillText(`Target Layer: ${layerData.activeLayer}`, 10 / zoom, 50 / zoom);
    //     ctx.restore();
    // }
};

// 4. Hook：拦截元素更新，赋予新元素图层归属
const handleReplaceAllElements = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { scene, nextElements } = context;
    const activeLayer = layerData.activeLayer;

    if (!activeLayer || activeLayer === 'all') return;
    if (!Array.isArray(nextElements)) return; 

    for (let i = 0; i < nextElements.length; i++) {
        const el = nextElements[i];
        if (!scene.elementsMap.has(el.id)) {
            if (!el.customData?.layer) {
                nextElements[i].customData = {
                        ...(el.customData || {}),
                        layer: activeLayer
                };
            }
        }
    }
};

// 5. 挂载与卸载
async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'shouldSelectElement', handleShouldSelectElement, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'renderStaticScene', handleRenderStaticScene, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'replaceAllElements', handleReplaceAllElements, 60);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}



mountFeature();