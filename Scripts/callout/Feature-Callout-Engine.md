---
name: Callout 核心引擎
description: 后台引擎：拦截并渲染携带 Callout 标记的元素，提供高级容器视觉和内部文本自适应排版。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。为所有包含 `customData.callout` 的元素提供底层渲染能力。
features:
  - 拦截 `drawElementOnCanvas` 自定义绘制带侧边栏和图标的 Callout UI
  - 拦截 `beforeStartTextEditing` 等钩子实现 Callout 文本向右偏移排版和自适应边界
  - 维持 Excalidraw 原生选中框和文本编辑器一致性
dependencies:
  - 独立运行，供 Callout 系列的 Action 动作脚本调用
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
const SCRIPT_ID = "ymjr.feature.callout-engine";

// ====================== 静态资源与常量 ======================
const CALLOUT_ICONS_SVG = {
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`,
    note: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-info"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`,
    tip: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-check"><path d="M20 6 9 17l-5-5"></path></svg>`,
    failure: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`,
    cite: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-quote"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"></path><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"></path></svg>`,
    quote: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-quote"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"></path><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"></path></svg>`,
    example: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-list"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    danger: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>`,
    bug: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-bug"><path d="m8 2 1.88 1.88"></path><path d="M14.12 3.88 16 2"></path><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"></path><path d="M12 20v-9"></path><path d="M6.53 9C4.6 8.8 3 7.1 3 5"></path><path d="M6 13H2"></path><path d="M3 21c0-2.1 1.7-3.9 3.8-4"></path><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"></path><path d="M22 13h-4"></path><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"></path></svg>`,
    question: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-help-circle"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>`,
    abstract: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-clipboard-list"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>`
};

const CALLOUT_BG_COLORS = {
    note: "#DAE9FA", info: "#DAE9FA", tip: "#D9F5F5", success: "#DAF5E5", failure: "#FCE0E4", warning: "#FCEAD9", 
    error: "#FADABD", quote: "#F1F1F1", cite: "#F1F1F1", example: "#EBE5FC", danger: "#FCE0E4", bug: "#FCE0E4", 
    question: "#FCEAD9", abstract: "#D9F5F5"
};

const CALLOUT_ICON_COLORS = {
    note: "#1775D9", info: "#1775D9", tip: "#16A6AB", success: "#1DA51D", failure: "#DD2C38", warning: "#DE7417", 
    error: "#DD2C38", quote: "#9E9E9E", cite: "#9E9E9E", example: "#8F47E1", danger: "#DD2C38", bug: "#DD2C38", 
    question: "#DE7417", abstract: "#16A6AB"
};

const CALLOUT_HEADER_HEIGHT = 36;
const CALLOUT_STRIP_WIDTH = 6;

const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

window._calloutIconCache = window._calloutIconCache || new Map();
const getColoredIconImage = (type, color, ea, api) => {
    const cacheKey = `${type}-${color}`;
    if (window._calloutIconCache.has(cacheKey)) {
        return window._calloutIconCache.get(cacheKey);
    }
    const svgRaw = CALLOUT_ICONS_SVG[type] || CALLOUT_ICONS_SVG.note;
    
    let svgColored = svgRaw;
    if (svgColored.includes('currentColor')) {
        svgColored = svgColored.replaceAll('currentColor', color);
    } else if (svgColored.includes('fill="')) {
        svgColored = svgColored.replace(/fill="[^"]*"/g, `fill="${color}"`);
    } else {
        svgColored = svgColored.replace('<svg', `<svg fill="${color}"`);
    }
    const img = new Image();
    img.src = `data:image/svg+xml,${encodeURIComponent(svgColored)}`;
    
    img.onload = () => {
        if (api) api.updateScene({ appState: { ...api.getAppState() } });
    };
    window._calloutIconCache.set(cacheKey, img);
    return img;
};

// ====================== 图形渲染 ======================
const handleDrawElementOnCanvas = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { element, context } = ctx;

    if (element.type === "rectangle" && element.customData?.callout) {
        const calloutData = element.customData.callout;
        const type = calloutData.type || "note";
        const colorType = calloutData.colorType || "solid"; 
        
        const w = element.width;
        const h = element.height;
        const hh = CALLOUT_HEADER_HEIGHT; 
        const sw = CALLOUT_STRIP_WIDTH;  
        const r = (element.roundness && typeof element.roundness.value === 'number') 
                  ? element.roundness.value 
                  : (element.roundness ? 8 : 0);

        let mainColor;
        let headerFill;
        let bodyFill;

        const isUserColor = element.strokeColor !== "#000000" && element.strokeColor !== "transparent";
        const defaultMainColor = CALLOUT_ICON_COLORS[type] || CALLOUT_ICON_COLORS.note;

        if (colorType === "solid") {
            mainColor = isUserColor ? element.strokeColor : defaultMainColor;
            headerFill = CALLOUT_BG_COLORS[type] || CALLOUT_BG_COLORS.note;
            bodyFill = "#FFFFFF"; 
        } else {
            mainColor = isUserColor ? element.strokeColor : defaultMainColor;
            headerFill = hexToRgba(mainColor, 0.25); 
            bodyFill = hexToRgba(mainColor, 0.1);
        }

        context.save();

        // 1. Body 背景
        context.beginPath();
        if (context.roundRect && r > 0) context.roundRect(0, 0, w, h, r);
        else context.rect(0, 0, w, h);
        context.fillStyle = bodyFill;
        context.fill();

        context.save();
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.shadowColor = 'transparent'; 
        
        // 2. Header 背景
        context.beginPath();
        if (context.roundRect && r > 0) context.roundRect(0, 0, w, hh, [r, r, 0, 0]);
        else context.rect(0, 0, w, hh);
        context.fillStyle = headerFill;
        context.fill();

        // 3. 左侧条 (Strip)
        context.beginPath();
        context.moveTo(sw, 0);
        context.lineTo(r, 0);
        context.quadraticCurveTo(0, 0, 0, r);
        context.lineTo(0, h - r);
        context.quadraticCurveTo(0, h, r, h);
        context.lineTo(sw, h);
        context.lineTo(sw, 0);
        context.closePath();
        context.fillStyle = headerFill;
        context.fill();

        // 4. 绘制图标
        const iconSize = 24;
        const iconPadding = 8;
        const iconX = sw + iconPadding;
        const iconY = (hh - iconSize) / 2; 

        const img = getColoredIconImage(type, mainColor, ea, api);
        if (img.complete && img.naturalWidth > 0) {
            context.drawImage(img, iconX, iconY, iconSize, iconSize);
        }

        // 5. 绘制标题文字
        let titleText = calloutData.title || type.charAt(0).toUpperCase() + type.slice(1);
        if (titleText) {
            context.font = "bold 16px sans-serif"; 
            context.textAlign = "left";
            context.textBaseline = "middle";
            context.fillStyle = mainColor;
            const textX = iconX + iconSize + 6; 
            const textY = hh / 2;
            context.fillText(titleText, textX, textY);
        }

        context.restore();
        context.restore();
        return true; 
    }
    return false;
};

// ====================== 文本边界 Hooks ======================

const handleBeforeStartTextEditing = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.container?.customData?.callout) {
        ctx.verticalAlign = "top"; 
        ctx.textAlign = "left"; // Callout 文本靠左排布
        ctx.forceVerticalAlign = true;
        ctx.forceTextAlign = true;
        ctx.shouldBindToContainer = true;
        ctx.shouldResizeContainer = true; 
    }
};

const handleComputeBoundTextPosition = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.container?.customData?.callout) {
        ctx.verticalAlign = "top";
        ctx.textAlign = "left";
        ctx.headerOffset = CALLOUT_HEADER_HEIGHT; 
        ctx.stripOffset = 10; // 左侧条宽度 + 间距
    }
};

const handleComputeContainerDimension = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.container?.customData?.callout) {
        ctx.result = Math.max(ctx.dimension + ctx.padding * 2 + CALLOUT_HEADER_HEIGHT, 60);
    }
};

const handleGetBoundTextMaxWidth = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.container?.customData?.callout) {
        const stripWidth = 10;
        ctx.result = ctx.width - ctx.padding * 2 - stripWidth;
    }
};

const handleGetBoundTextMaxHeight = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.container?.customData?.callout) {
        ctx.result = ctx.height - ctx.padding * 2 - CALLOUT_HEADER_HEIGHT;
    }
};

// ====================== 挂载系统 ======================
const clearShapeCacheForExtensions = () => {
    setTimeout(() => {
        const api = ea.getExcalidrawAPI();
        if (!api) return;

        const elements = api.getSceneElements();

        const allElsMap = typeof api.App.getSceneElementsMapIncludingDeleted === "function" 
            ? api.App.getSceneElementsMapIncludingDeleted() 
            : new Map(elements.map(el => [el.id, el]));

        let hasUpdates = false;
        const updatedElementsMap = new Map();

        for (const curr of elements) {
            if (curr.customData?.callout) {
                
                if (api.ShapeCache) {
                    api.ShapeCache.cache.delete(curr);
                }

                if (curr.boundElements) {
                    for (const b of curr.boundElements) {
                        const bEl = allElsMap.get(b.id);
                        
                        if (bEl && bEl.type === "text" && bEl.containerId === curr.id) {
                            
                            const stripOffset = 10;
                            const headerOffset = CALLOUT_HEADER_HEIGHT;
                            const textX = curr.x + stripOffset;
                            const textY = curr.y + headerOffset;

                            let newX = textX;
                            let newY = textY;

                            // 2. 绕容器中心点处理旋转
                            if (curr.angle && curr.angle !== 0) {
                                const cx = curr.x + curr.width / 2;
                                const cy = curr.y + curr.height / 2;
                                const textCenterX = textX + bEl.width / 2;
                                const textCenterY = textY + bEl.height / 2;

                                // 2D 旋转矩阵
                                newX = cx + (textCenterX - cx) * Math.cos(curr.angle) - (textCenterY - cy) * Math.sin(curr.angle) - bEl.width / 2;
                                newY = cy + (textCenterX - cx) * Math.sin(curr.angle) + (textCenterY - cy) * Math.cos(curr.angle) - bEl.height / 2;
                            }

                            // 3. 记录将要更新的文本元素状态
                            updatedElementsMap.set(bEl.id, {
                                ...bEl,
                                x: newX,
                                y: newY,
                                textAlign: "left",
                                verticalAlign: "top"
                            });
                            hasUpdates = true;
                        }
                    }
                }
            }
        }

        // 4. 将更新合并回全量数组并静默推送给引擎
        if (hasUpdates) {
            const nextElements = elements.map(el => updatedElementsMap.get(el.id) || el);
            api.updateScene({ elements: nextElements });
        }
    }, 50);
};

function mountFeature() {
    if (!window.EA_Core) return;
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    const core = window.EA_Core;
    
    // 挂载渲染 Hook
    core.registerHook(SCRIPT_ID, 'drawElementOnCanvas', handleDrawElementOnCanvas, 60);

    // 挂载文本排版 Hooks
    core.registerHook(SCRIPT_ID, 'beforeStartTextEditing', handleBeforeStartTextEditing, 60);
    core.registerHook(SCRIPT_ID, 'computeBoundTextPosition', handleComputeBoundTextPosition, 60);
    core.registerHook(SCRIPT_ID, 'computeContainerDimension', handleComputeContainerDimension, 60);
    core.registerHook(SCRIPT_ID, 'getBoundTextMaxWidth', handleGetBoundTextMaxWidth, 60);
    core.registerHook(SCRIPT_ID, 'getBoundTextMaxHeight', handleGetBoundTextMaxHeight, 60);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));


    clearShapeCacheForExtensions();
}

mountFeature();