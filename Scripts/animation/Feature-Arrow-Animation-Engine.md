---
name: 高性能动画引擎
description: 后台引擎：支持流光、穿梭、以及基于轨迹运算的飞行箭头动画。
author: ymjr
version: 1.0.0
license: MIT
autorun: true
---
/*
```javascript
*/
var locales = {
    zh: { log_mounted: "[动画引擎] 🚀 挂载完毕", log_unmounted: "[动画引擎] 🔌 已卸载" },
    en: { log_mounted: "[Anim Engine] 🚀 Mounted", log_unmounted: "[Anim Engine] 🔌 Unmounted" }
};

const SCRIPT_ID = "ymjr.feature.animation-engine";

if (!ExcalidrawAutomate.plugin._ymjr_animation_engine) {
    ExcalidrawAutomate.plugin._ymjr_animation_engine = {
        globalOffset: 0,
        lastTime: performance.now(),
        loopId: null,
        pathCache: new Map() 
    };
}
const state = ExcalidrawAutomate.plugin._ymjr_animation_engine;

// ==========================================
// 拦截主画布渲染：仅处理 dash 动画的底层透明化
// ==========================================
const handleDrawElement = (payload) => {
    const { element, context, renderConfig, rc } = payload;
    const anim = element.customData?.animation;
    
    // 🚀 核心修复 1：只拦截 dash。arrow 和 flow 保持原生渲染，保留最鲜艳的颜色！
    if (anim && anim.type === "dash") {
        if (['text', 'image', 'iframe', 'embeddable'].includes(element.type)) return false;

        const api = window.ExcalidrawAutomate?.getExcalidrawAPI();
        if (!api) return false;

        context.lineJoin = element?.strokeLineJoin ?? "round";
        context.lineCap = element?.strokeLineCap ?? "round";

        const shapes = api.ShapeCache.generateElementShape(element, renderConfig);
        if (!shapes) return false;

        const shapeArr = Array.isArray(shapes) ? shapes : [shapes];
        
        context.save();
        shapeArr.forEach((shape, index) => {
            if (typeof shape !== "string" && shape && shape.options) {
                const clonedShape = JSON.parse(JSON.stringify(shape));
                // 仅对 dash 动画让底色透明，因为我们要画流动的虚线
                clonedShape.options.stroke = "transparent"; 
                rc.draw(clonedShape);
            }
        });
        context.restore();

        return true; 
    }
    return false; // arrow 和 flow 返回 false，让 Excalidraw 原生画出鲜艳的底线！
};

// ==========================================
// 核心：视觉特效绘制 (仅在 Overlay 上绘制增量动画)
// ==========================================
function drawAnimationEffects(ctx, pathStr, el, anim) {
    const color = el.strokeColor;
    const speedRatio = (anim.speed || 40) / 40;
    const offset = -(state.globalOffset * speedRatio);
    const path2d = new Path2D(pathStr);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    switch (anim.type) {
        case "flow":
            // 高亮流光拖尾 (底层已有实线，这里只画发光部分)
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = el.strokeWidth + 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = color;
            ctx.setLineDash([30, 150]);
            ctx.lineDashOffset = offset * 2;
            ctx.stroke(path2d);

            // 白色核心
            ctx.lineWidth = Math.max(1, el.strokeWidth - 1);
            ctx.strokeStyle = "#FFFFFF";
            ctx.shadowBlur = 0;
            ctx.stroke(path2d);
            break;

        case "dash":
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeStyle = color;
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            
            const gap = anim.dashSize || 12;
            ctx.setLineDash([gap, gap]);
            ctx.lineDashOffset = offset;
            ctx.stroke(path2d);
            break;

        case "arrow":
            // 1. 利用 SVG 节点缓存提升计算性能
            let cache = state.pathCache.get(el.id);
            if (!cache || cache.pathStr !== pathStr) {
                const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                tempPath.setAttribute("d", pathStr);
                cache = { pathStr, domPath: tempPath, length: tempPath.getTotalLength() };
                state.pathCache.set(el.id, cache);
            }

            const pathLen = cache.length;
            if (pathLen === 0) break;

            // 2. 计算当前运动点距和坐标
            const travelSpeed = (anim.speed || 40) * 1.5; 
            const currentDist = (state.globalOffset * travelSpeed) % pathLen;
            const pt = cache.domPath.getPointAtLength(currentDist);
            
            // 计算切线角度
            const delta = Math.min(currentDist + 1, pathLen);
            const ptNext = cache.domPath.getPointAtLength(delta);
            const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x);

            // 3. 绘制飞行的自适应箭头 (底层已有实线，这里只画飞行的头部)
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(angle);
            
            const arrSize = Math.max(8, el.strokeWidth * 3.5); 
            const headType = el.endArrowhead || "arrow"; 
            
            ctx.beginPath();
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            
            if (headType === "arrow" || headType === "chevron") {
                ctx.moveTo(-arrSize * 0.5, -arrSize * 0.8);
                ctx.lineTo(arrSize * 0.5, 0);
                ctx.lineTo(-arrSize * 0.5, arrSize * 0.8);
                ctx.strokeStyle = color;
                ctx.lineWidth = el.strokeWidth * 1.5;
                ctx.stroke();
            } else if (headType.includes("circle") || headType === "dot") {
                ctx.arc(0, 0, arrSize * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = headType.includes("outline") ? "#ffffff" : color;
                ctx.fill();
                if (headType.includes("outline")) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = el.strokeWidth;
                    ctx.stroke();
                }
            } else if (headType.includes("diamond")) {
                ctx.moveTo(arrSize * 0.8, 0);
                ctx.lineTo(0, -arrSize * 0.6);
                ctx.lineTo(-arrSize * 0.8, 0);
                ctx.lineTo(0, arrSize * 0.6);
                ctx.closePath();
                ctx.fillStyle = headType.includes("outline") ? "#ffffff" : color;
                ctx.fill();
                if (headType.includes("outline")) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = el.strokeWidth;
                    ctx.stroke();
                }
            } else if (headType === "bar") {
                ctx.moveTo(arrSize * 0.5, -arrSize * 0.8);
                ctx.lineTo(arrSize * 0.5, arrSize * 0.8);
                ctx.strokeStyle = color;
                ctx.lineWidth = el.strokeWidth * 1.5;
                ctx.stroke();
            } else {
                ctx.moveTo(arrSize * 0.8, 0);
                ctx.lineTo(-arrSize * 0.5, -arrSize * 0.6);
                ctx.lineTo(-arrSize * 0.5, arrSize * 0.6);
                ctx.closePath();
                ctx.fillStyle = headType.includes("outline") ? "#ffffff" : color;
                ctx.fill();
                if (headType.includes("outline")) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = el.strokeWidth;
                    ctx.stroke();
                }
            }
            
            ctx.restore();
            break;
    }
}

// ==========================================
// Overlay 画布刷新机制 (带 Z-index 橡皮擦修复)
// ==========================================
function processOverlayCanvasForView(view) {
    if (!view || !view.excalidrawAPI) return;
    const api = view.excalidrawAPI;
    const elementsMap = api.App?.scene?.getNonDeletedElementsMap?.();
    if (!elementsMap) return;

    const activeView = app.workspace.getActiveFileView();
    if (view !== activeView || activeView.getViewType() !== "excalidraw") return; 

    // 获取所有元素，保持原生的层级顺序
    const elements = Array.from(elementsMap.values());
    const animEls = elements.filter(el => el.customData?.animation);
    const wrapper = view.contentEl.querySelector('.excalidraw') || view.contentEl;
    let canvas = wrapper.querySelector('.ymjr-anim-overlay');

    if (animEls.length === 0) {
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.className = "ymjr-anim-overlay";
        Object.assign(canvas.style, {
            position: "absolute", inset: "0", pointerEvents: "none", zIndex: "5"
        });
        wrapper.appendChild(canvas);
    }

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const appState = api.getAppState();
    ctx.save();
    
    ctx.scale(dpr, dpr);
    ctx.scale(appState.zoom.value, appState.zoom.value);
    ctx.translate(appState.scrollX, appState.scrollY);

    // 🚀 核心修复 2：按层级顺序遍历所有元素
    for (const el of elements) {
        const anim = el.customData?.animation;
        
        ctx.save();
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(el.angle);
        ctx.translate(-cx, -cy);
        ctx.translate(el.x, el.y);

        if (anim) {
            // 绘制动画层
            ctx.globalCompositeOperation = 'source-over';
            const shapes = api.ShapeCache.generateElementShape(el, null);
            if (shapes) {
                const shapeArr = Array.isArray(shapes) ? shapes : [shapes];
                for (let i = 0; i < shapeArr.length; i++) {
                    const shape = shapeArr[i];
                    if (typeof shape === "string") continue;
                    if (el.type === "arrow" && i > 0) continue;

                    let pathStr = shape.svgPathStr;
                    if (!pathStr && api.ShapeCache.rg && api.ShapeCache.rg.toPaths) {
                        const paths = api.ShapeCache.rg.toPaths(shape);
                        if (paths && paths.length > 0) {
                            pathStr = paths.map(p => p.d).join(" ");
                        }
                    }
                    if (pathStr) {
                        drawAnimationEffects(ctx, pathStr, el, anim);
                    }
                }
            }
        } else {
            // 🚀 核心修复 3：普通元素作为橡皮擦，抠出透明区域，完美还原遮挡关系
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = "rgba(0,0,0,1)";
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.lineWidth = el.strokeWidth || 2;
            
            if (el.type === "text" || el.type === "image") {
                // 文字和图片直接用包围盒擦除
                ctx.fillRect(0, 0, el.width, el.height);
            } else {
                // 形状元素按真实路径擦除
                const shapes = api.ShapeCache.generateElementShape(el, null);
                if (shapes) {
                    const shapeArr = Array.isArray(shapes) ? shapes : [shapes];
                    shapeArr.forEach(shape => {
                        if (shape.svgPathStr) {
                            const p2d = new Path2D(shape.svgPathStr);
                            // 如果元素有背景填充色，则擦除内部区域
                            if (el.backgroundColor && el.backgroundColor !== "transparent") {
                                ctx.fill(p2d);
                            }
                            // 擦除边框区域
                            ctx.stroke(p2d);
                        }
                    });
                }
            }
        }
        ctx.restore();
    }
    ctx.restore();
}

function animationLoop() {
    const now = performance.now();
    const dt = (now - state.lastTime) / 1000;
    state.lastTime = now;
    
    state.globalOffset = (state.globalOffset + dt * 40) % 100000;

    const views = app.workspace.getLeavesOfType("excalidraw").map(l => l.view);
    for (const view of views) {
        processOverlayCanvasForView(view);
    }
    state.loopId = requestAnimationFrame(animationLoop);
}

async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core 未运行，无法挂载核心 Hook");

    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    window.EA_Core.registerHook(SCRIPT_ID, 'drawElementOnCanvas', handleDrawElement, 60);

    state.lastTime = performance.now();
    animationLoop();
    console.log(locales.zh.log_mounted);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (state.loopId) {
            cancelAnimationFrame(state.loopId);
            state.loopId = null;
        }
        if (state.pathCache) state.pathCache.clear();
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        document.querySelectorAll('.ymjr-anim-overlay').forEach(el => el.remove());
        console.log(locales.zh.log_unmounted);
    };
}

mountFeature();
