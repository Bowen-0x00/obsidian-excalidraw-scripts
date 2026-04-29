---
name: 缩略图导航核心引擎
description: 后台引擎：提供缩略图（小地图）的实时渲染、视图更新与鼠标拖拽平移同步逻辑。
author: ymjr
version: 1.0.0
license: MIT
usage: 常驻后台引擎，专门响应 `thumbnailCanvas` 的渲染请求，隔离 `renderStaticScene` 防止高分屏等缩放参数互相污染。
features:
  - 拦截 `renderStaticScene` 利用独立的离屏 `tempCanvas` 及 Rough.js 进行干净的缩略图生成
  - 监听画板元素的更改并在适当时机触发小地图同步
  - 处理小地图内红框（取景框）的拖拽交互及对应的主画布视口 `updateScene` 漫游反切
dependencies:
  - 配合 Action-Toggle-Thumbnail 使用
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

const SCRIPT_ID = "ymjr.feature.thumbnail-engine";

// 模块级状态变量
let rectX = 0;
let rectY = 0;
let rectWidth = 0;
let rectHeight = 0;

let isDragging = false;
let downOffsetX = 0;
let downOffsetY = 0;

let dragStatescrollX = 0;
let dragStatescrollY = 0;
let downRectX = 0;
let downRectY = 0;

const handleRenderStaticScene = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    // 防重入锁，避免无限递归崩溃
    if (window.__isRenderingThumbnail) return false;

    const { renderConfig, throttle, _renderStaticScene, rough } = contextPayload;
    
    const targetViewId = ea?.targetView?.id;
    if (!targetViewId) return false;
    
    let thumbnailCanvas = document.getElementById(`thumbnailCanvas-${targetViewId}`);
    if (!thumbnailCanvas) return false;

    if (!api) return false;
    
    let state = api.getAppState();
    let ctx = thumbnailCanvas.getContext("2d", { willReadFrequently: true });

    const showRect = (ea, api) => {
        if (!thumbnailCanvas.thumbnail) return;
        
        // 【关键修复】重置画布的变换矩阵，防止 Excalidraw 底层的高分屏 scale 污染
        ctx.resetTransform();

        let ratioX = thumbnailCanvas.thumbnail.ratio;
        let ratioY = thumbnailCanvas.thumbnail.ratio;
        let x = (thumbnailCanvas.thumbnail.scrollX - state.scrollX) * ratioX;
        let y = (thumbnailCanvas.thumbnail.scrollY - state.scrollY) * ratioY;

        ctx.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        
        if (thumbnailCanvas.thumbnail.imageData) {
            ctx.putImageData(thumbnailCanvas.thumbnail.imageData, 0, 0);
        }
        
        // 画外边框
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height); 
        
        // 画视图红框
        ctx.strokeStyle = "#ff4d4f"; 
        ctx.lineWidth = 2;
        rectWidth = (state.width / state.zoom.value) * ratioX;
        rectHeight = (state.height / state.zoom.value) * ratioY;
        
        if (!isDragging) {
            rectX = x;
            rectY = y;
        }

        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    };

    if (thumbnailCanvas.thumbnail && !thumbnailCanvas.updateImage) {
        showRect(ea, api);
    }

    if (!thumbnailCanvas.flag || thumbnailCanvas.updateImage) {
        // 【关键修复】使用临时画布进行渲染，隔离底层引擎对原始宽高和缩放的修改
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = thumbnailCanvas.width;
        tempCanvas.height = thumbnailCanvas.height;
        
        const roughInst = rough || window.rough;
        if (!roughInst) return false;

        let rc = roughInst.canvas(tempCanvas);
        let elements = ea.getViewElements();
        let { height, topX, topY, width } = ea.getBoundingBox(elements);
        
        width = width || 1;
        height = height || 1;
        let ratio = Math.min(thumbnailCanvas.width / width, thumbnailCanvas.height / height);
        
        window.__isRenderingThumbnail = true; 
        try {
            _renderStaticScene({
                ...renderConfig,
                canvas: tempCanvas,
                rc: rc,
                elements: elements,
                visibleElements: elements,
                scale: 1,
                appState: {
                    ...renderConfig.appState,
                    scrollX: -topX,
                    scrollY: -topY,
                    zoom: { value: ratio }
                },
                renderConfig: {
                    ...renderConfig.renderConfig,
                    renderGrid: false,
                    isExporting: false
                }
            });
        } catch (e) {
            console.error(`[Feature: Thumbnail] Render Error:`, e);
        } finally {
            window.__isRenderingThumbnail = false; 
        }
        
        // 将绘制好的临时画布等比例压缩到真正的 UI 画布上
        ctx.resetTransform();
        ctx.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        
        let imageData = ctx.getImageData(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        
        thumbnailCanvas.thumbnail = {
            scrollX: -topX,
            scrollY: -topY,
            zoom: ratio,
            imageData: imageData,
            ratio: ratio,
            width: width,
            height: height
        };
        
        thumbnailCanvas.updateImage = false;
        
        if (!thumbnailCanvas.flag) {
            thumbnailCanvas.flag = true;
            
            const handleMouseEvents = (event, ea, api) => {
                const { offsetX, offsetY } = event;
                switch (event.type) {
                    case "mousedown":
                        // 判断是否点在了红框内
                        if (offsetX >= rectX && offsetX <= rectX + rectWidth && offsetY >= rectY && offsetY <= rectY + rectHeight) {
                            isDragging = true;
                            downOffsetX = offsetX;
                            downOffsetY = offsetY;
                            downRectX = rectX;
                            downRectY = rectY;
                            let currentState = api.getAppState(); 
                            dragStatescrollX = currentState.scrollX;
                            dragStatescrollY = currentState.scrollY; 
                            thumbnailCanvas.style.cursor = "grabbing"; // 拖拽时变为抓取
                        }
                        break;
                    case "mouseup":
                    case "mouseleave":
                        isDragging = false;
                        thumbnailCanvas.style.cursor = "pointer"; // 恢复为小手
                        break;
                    case "mousemove":
                        if (isDragging) {
                            let moveX = offsetX - downOffsetX;
                            let moveY = offsetY - downOffsetY;
                            api.updateScene({
                                appState: {
                                    scrollX: dragStatescrollX - moveX / thumbnailCanvas.thumbnail.ratio,
                                    scrollY: dragStatescrollY - moveY / thumbnailCanvas.thumbnail.ratio
                                }
                            });
                            rectX = downRectX + moveX;
                            rectY = downRectY + moveY;
                            showRect(ea, api);
                        }
                        break;
                }
            };
            thumbnailCanvas.addEventListener("mousedown", handleMouseEvents);
            thumbnailCanvas.addEventListener("mouseup", handleMouseEvents);
            thumbnailCanvas.addEventListener("mousemove", handleMouseEvents);
            thumbnailCanvas.addEventListener("mouseleave", handleMouseEvents);
        }
        showRect(ea, api);
    }
    return false;
};

const handleReplaceAllElements = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const targetViewId = ea?.targetView?.id;
    if (!targetViewId) return false;
    let thumbnailCanvas = document.getElementById(`thumbnailCanvas-${targetViewId}`);
    if (thumbnailCanvas) thumbnailCanvas.updateImage = true;
    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'renderStaticScene', handleRenderStaticScene, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'replaceAllElements', handleReplaceAllElements, 60);
    
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}


mountFeature();