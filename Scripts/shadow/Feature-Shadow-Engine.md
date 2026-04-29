---
name: Shadow 渲染引擎 (视觉层)
description: 后台引擎：提供多图层阴影渲染。精准读取元素的静态 shadow 配置，并与 Hover 引擎无缝联动。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。读取并解析元素上的 `customData.shadow` 配置数组，利用 Canvas Context 原生绘制支持模糊和无限叠加的阴影效果。
features:
  - 拦截 `drawElementOnCanvasTextBefore` 和 `drawElementOnCanvasTextAfter` 钩子
  - 完美适配基于 Excalidraw 放缩倍率 (`zoom`) 的阴影自适应
  - 无缝承接 `Feature-Hover-Engine` 推送过来的 Hover/Click 覆盖样式 (`_hoverActive` / `_clickActive`)
dependencies:
  - 作为基础视觉引擎，被 Action-Toggle-Shadow 调用
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
const SCRIPT_ID = "ymjr.feature.shadow-engine";

const applyShadowToContext = (element, shadow, context, zoom) => {
    if (!shadow) return;

    // 安全获取数值，避免 0 被判定为 false
    const getVal = (val, def, ea, api) => {
        const p = parseFloat(val);
        return isNaN(p) ? def : p;
    };

    let deltaColor = parseInt(shadow.shadowColor);
    if (!isNaN(deltaColor) && !String(shadow.shadowColor).startsWith('#')) {
        const color = element.backgroundColor === 'transparent' ? element.strokeColor : element.backgroundColor;
        if (typeof ea.getCM === "function") {
            const cm = ea.getCM(color);
            context.shadowColor = cm.lightnessTo(Math.max(cm.lightness + deltaColor, 0)).stringHEX({alpha: false});
        } else {
            context.shadowColor = "rgba(0,0,0,0.3)"; 
        }
    } else {
        context.shadowColor = shadow.shadowColor || "rgba(0,0,0,0.2)";
    }

    const maxSize = Math.max(element.width, element.height);

    // 💡 核心修复：规避 0 带来的判定异常
    let shadowBlur = getVal(shadow.shadowBlur, 10, ea, api);
    if (shadow.shadowBlur !== undefined && !String(shadow.shadowBlur).includes("px")) shadowBlur = maxSize * shadowBlur;

    let shadowOffsetX = getVal(shadow.shadowOffsetX, 5, ea, api);
    if (shadow.shadowOffsetX !== undefined && !String(shadow.shadowOffsetX).includes("px")) shadowOffsetX = element.width * shadowOffsetX;

    let shadowOffsetY = getVal(shadow.shadowOffsetY, 5, ea, api);
    if (shadow.shadowOffsetY !== undefined && !String(shadow.shadowOffsetY).includes("px")) shadowOffsetY = element.height * shadowOffsetY;
    
    context.shadowBlur = shadowBlur * zoom;
    context.shadowOffsetX = shadowOffsetX * zoom;
    context.shadowOffsetY = shadowOffsetY * zoom;
};

// ====================== 渲染拦截 ======================
const handleRenderElementBefore = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { element, context, appState, generateElementWithCanvas, drawElementFromCanvas, allElementsMap, renderConfig } = ctx;
    
    let shadows = [];
    
    const isHovered = ExcalidrawAutomate.plugin._ymjr_HoverState?.activeIds?.has(element.id);
    const hoverData = isHovered ? ExcalidrawAutomate.plugin._ymjr_HoverState?.hoverData : null;
    
    // 如果悬停且带有阴影配置，则使用悬停阴影
    if (hoverData && hoverData.shadow) {
        shadows = Array.isArray(hoverData.shadow) ? hoverData.shadow : [hoverData.shadow];
    } 
    // 否则兜底使用静态阴影
    else if (element.customData?.shadow) {
        shadows = Array.isArray(element.customData.shadow) ? element.customData.shadow : [element.customData.shadow];
    }

    if (shadows.length === 0) return false;

    if (shadows.length > 1 && generateElementWithCanvas && drawElementFromCanvas) {
        const elementWithCanvas = generateElementWithCanvas(element, allElementsMap, renderConfig, appState);
        if (elementWithCanvas) {
            for (let i = 0; i < shadows.length - 1; i++) {
                context.save();
                applyShadowToContext(element, shadows[i], context, appState.zoom.value);
                drawElementFromCanvas(elementWithCanvas, context, renderConfig, appState, allElementsMap);
                context.restore();
            }
        }
    }

    context.save();
    applyShadowToContext(element, shadows[shadows.length - 1], context, appState.zoom.value);
    element._needsShadowRestore = true; 
    
    return false; 
};

const handleRenderElementAfter = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { element, context } = ctx;
    if (element._needsShadowRestore) {
        context.restore(); 
        delete element._needsShadowRestore;
    }
};

function mountFeature() {
    if (!window.EA_Core) return;
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'renderElementBefore', handleRenderElementBefore, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'renderElementAfter', handleRenderElementAfter, 50);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID, 'renderElementBefore');
            window.EA_Core.unregisterHook(SCRIPT_ID, 'renderElementAfter');
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}


mountFeature();