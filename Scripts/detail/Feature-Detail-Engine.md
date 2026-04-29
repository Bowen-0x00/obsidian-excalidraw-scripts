---
name: 详情核心引擎
description: 提供Detail容器的外部右上角图标渲染、点击拦截、关联元素跟随以及选中拦截。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为后台常驻引擎挂载，负责处理所有具有 detail 和 hide 属性元素的渲染和交互。
features:
  - 拦截 renderCustomIcons，在 Target 元素右上角绘制动态展开/收起（+/-）按钮
  - 拦截 handleCanvasPointerDown，实现点按按钮时的状态切换与元素隐藏
  - 拦截 modifyElementsToDrag，实现子元素跟随 Target 一起被拖拽
  - 拦截 shouldSelectElement，阻止被隐藏(hide:true)的子元素被框选或点击选中
dependencies:
  - 被 "绑定/解除 Detail 关系" 动作依赖
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
const SCRIPT_ID = "ymjr.feature.detail-engine";

const isTargetElement = (el) => !!el?.customData?.detail;

const ICON_SIZE = 16;
const ICON_MARGIN = 6; // 距离外边框的间距

// ====================== 核心算法工具 ======================
const pointRotateRads = (point, center, angle) => {
    const x = point[0] - center[0], y = point[1] - center[1];
    return [ x * Math.cos(angle) - y * Math.sin(angle) + center[0], x * Math.sin(angle) + y * Math.cos(angle) + center[1] ];
};

// ====================== Hook 处理器 ======================

// 1. 渲染自定义图标 (外部右上角)
const handleRenderCustomIcons = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { element, context, appState } = ctx;
    if (!isTargetElement(element)) return;

    const isCollapsed = element.customData.detail.status === "hide";
    const cx = element.x + element.width / 2; 
    const cy = element.y + element.height / 2;
    
    context.save();
    context.translate(appState.scrollX + cx, appState.scrollY + cy); 
    context.rotate(element.angle); 
    // 平移到元素物理左上角作为原点 (0,0)
    context.translate(-element.width / 2, -element.height / 2);
    
    // 计算外部右上角的本地坐标
    const drawX = element.width + ICON_MARGIN;
    const drawY = - ICON_SIZE - ICON_MARGIN;
    
    // 绘制图标背景
    context.fillStyle = appState.viewBackgroundColor === "#121212" ? "#333" : "#fff"; 
    context.strokeStyle = appState.viewBackgroundColor === "#121212" ? "#ccc" : "#000"; 
    context.lineWidth = 1.2;
    
    context.beginPath();
    if (context.roundRect) context.roundRect(drawX, drawY, ICON_SIZE, ICON_SIZE, 4);
    else context.rect(drawX, drawY, ICON_SIZE, ICON_SIZE);
    context.fill(); 
    context.stroke();
    
    // 绘制内部加减号 (+ / -)
    context.beginPath(); 
    context.strokeStyle = appState.viewBackgroundColor === "#121212" ? "#fff" : "#000";
    const midX = drawX + ICON_SIZE / 2; 
    const midY = drawY + ICON_SIZE / 2; 
    const lineRad = 4;
    
    context.moveTo(midX - lineRad, midY); 
    context.lineTo(midX + lineRad, midY); // 减号(-)
    
    if (isCollapsed) { 
        context.moveTo(midX, midY - lineRad); 
        context.lineTo(midX, midY + lineRad); // 加上竖线变成(+)
    }
    context.stroke(); 
    context.restore();
};

// 2. 指针悬停判定 (匹配外部右上角坐标)
const handlePointerMove = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, scenePointer } = ctx;
    if (!scenePointer) return;

    const hitIcon = App.scene.getNonDeletedElements().some(el => {
        if (!isTargetElement(el)) return false;
        const [rotX, rotY] = pointRotateRads([scenePointer.x, scenePointer.y], [el.x + el.width / 2, el.y + el.height / 2], -el.angle);
        const hitX = el.x + el.width + ICON_MARGIN;
        const hitY = el.y - ICON_SIZE - ICON_MARGIN;
        return (rotX >= hitX && rotX <= hitX + ICON_SIZE && rotY >= hitY && rotY <= hitY + ICON_SIZE);
    });

    if (hitIcon && App.interactiveCanvas) App.interactiveCanvas.style.cursor = "pointer";
};

// 3. 点击拦截与状态切换
const handleCanvasPointerDown = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, event, scenePointer } = ctx;
    if (!scenePointer) return false;

    const elements = App.scene.getNonDeletedElements();
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (!isTargetElement(el)) continue;

        const [rotX, rotY] = pointRotateRads([scenePointer.x, scenePointer.y], [el.x + el.width / 2, el.y + el.height / 2], -el.angle);
        const hitX = el.x + el.width + ICON_MARGIN;
        const hitY = el.y - ICON_SIZE - ICON_MARGIN;
        const threshold = 6; // 增加容错点击面积
        
        if (rotX >= hitX - threshold && rotX <= hitX + ICON_SIZE + threshold && rotY >= hitY - threshold && rotY <= hitY + ICON_SIZE + threshold) {
            if (event?.preventDefault) { event.preventDefault(); event.stopPropagation(); }
            toggleDetailVisibility(App, el);
            return true; // 拦截底层交互
        }
    }
    return false;
};

// 4. 执行状态切换 (渲染自适应刷新)
const toggleDetailVisibility = async (App, targetEl) => {
    const isCollapsing = targetEl.customData.detail.status === "show";
    const nextStatus = isCollapsing ? "hide" : "show";
    const detailIds = targetEl.customData.detail.ids || [];
    
    if (typeof ea !== "undefined") {
        ea.clear();
        const elementsMap = App.scene.getNonDeletedElementsMap();
        const detailsToToggle = detailIds.map(id => elementsMap.get(id)).filter(Boolean);
        
        ea.copyViewElementsToEAforEditing([...detailsToToggle, targetEl]);
        
        detailsToToggle.forEach(child => {
            const eaChild = ea.getElement(child.id);
            if (eaChild) eaChild.customData = { ...(eaChild.customData || {}), hide: isCollapsing };
        });

        const eaTarget = ea.getElement(targetEl.id);
        if (eaTarget) {
            eaTarget.customData.detail.status = nextStatus;
        }
        await ea.addElementsToView(false, false, true);
    }
};

// 5. 拖拽时打包跟随
const handleModifyElementsToDrag = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, selectedElements, pointerDownState } = ctx;
    const elementsToMove = new Set(selectedElements); 
    const allElementsMap = App.scene.getNonDeletedElementsMap();

    selectedElements.forEach(current => {
        if (isTargetElement(current) && current.customData.detail.relative) {
            (current.customData.detail.ids || []).forEach(id => {
                const childEl = allElementsMap.get(id);
                if (childEl && !elementsToMove.has(childEl)) elementsToMove.add(childEl);
            });
        }
    });

    ctx.elementsToDrag = Array.from(elementsToMove);
    if (pointerDownState) pointerDownState.cachedElementsToDrag = ctx.elementsToDrag;
};

// 6. 核心拦截：彻底防止收起的元素被框选/全选/单击选中
const handleShouldSelectElement = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.element?.customData?.hide) {
        ctx.shouldSelect = false; 
    }
};

// ====================== 挂载逻辑 ======================
function mountFeature() {
    if (!window.EA_Core) return;
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    const core = window.EA_Core;
    core.registerHook(SCRIPT_ID, 'renderCustomIcons', handleRenderCustomIcons, 60);
    core.registerHook(SCRIPT_ID, 'handleCanvasPointerMove', handlePointerMove, 60);
    core.registerHook(SCRIPT_ID, 'handleCanvasPointerDown', handleCanvasPointerDown, 110); 
    core.registerHook(SCRIPT_ID, 'modifyElementsToDrag', handleModifyElementsToDrag, 60);
    // 注入我们新设计的 Context Property 拦截器
    core.registerHook(SCRIPT_ID, 'shouldSelectElement', handleShouldSelectElement, 50);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}



mountFeature();