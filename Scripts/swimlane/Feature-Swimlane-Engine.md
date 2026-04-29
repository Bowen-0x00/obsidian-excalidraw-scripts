---
name: 泳道核心引擎
description: 提供泳道的自定义渲染、彻底防干扰收起展开(PointerDown级拦截)、子元素跟随及标题自适应排版。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，为带有 customData.swimlane 的矩形元素提供强大的容器行为模式。包括自动吞并移入的元素、双击展开/折叠、自适应标题高度等。
features:
  - 重写 `drawElementOnCanvas` 原生渲染管线以绘制半透明标题栏及发光边框
  - 实现基于物理碰撞的自动归属逻辑（元素拖入/拖出容器时的智能绑定）
  - 接管 `beforeDeleteSelectedElements` 彻底解决 Excalidraw 原生删除组导致的子元素误删问题
  - 支持复杂的多级嵌套泳道以及自适应折叠/展开算法
dependencies:
  - 供 Action-Toggle-Swimlane 调用来初始化容器数据
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
const SCRIPT_ID = "ymjr.feature.swimlane-engine";

const isContainerElement = (el) => !!el?.customData?.swimlane;

// ====================== 核心算法工具 ======================
const hexToRgba = (hex, alpha) => {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const pointRotateRads = (point, center, angle) => {
    const x = point[0] - center[0], y = point[1] - center[1];
    return [ x * Math.cos(angle) - y * Math.sin(angle) + center[0], x * Math.sin(angle) + y * Math.cos(angle) + center[1] ];
};

// --- 通用容器吞并与解绑引擎 (替代之前繁琐的方法) ---
const syncContainerMembership = (App, modifiedElements) => {
    const allElements = App.scene.getNonDeletedElements();
    let targetContainers = modifiedElements.filter(isContainerElement);
    
    // 如果移动了普通元素，则所有容器都有可能成为其新归属，需要全面遍历检查碰撞
    if (modifiedElements.some(e => !isContainerElement(e))) {
        targetContainers = allElements.filter(isContainerElement);
    }

    targetContainers.forEach(container => {
        const isCollapsed = container.customData?.isCollapsed;
        // 核心 AABB 碰撞检测
        const elementsInContainer = allElements.filter(el => {
            if (el.id === container.id || isContainerElement(el) || el.isDeleted) return false;
            return (el.x >= container.x && el.y >= container.y &&
                    el.x + el.width <= container.x + container.width &&
                    el.y + el.height <= container.y + container.height);
        });
        const idsInContainer = new Set(elementsInContainer.map(e => e.id));

        allElements.forEach(element => {
            // 元素落入容器中 -> 强制绑定
            if (idsInContainer.has(element.id)) {
                if (element.customData?.parent !== container.id) {
                    App.scene.mutateElement(element, { customData: { ...element.customData, parent: container.id } });
                }
            } 
            // 元素移出容器 -> 解除绑定
            else if (element.customData?.parent === container.id) {
                if (!isCollapsed) { // 收起状态下，元素超出边界是假象，实施保护不解绑
                    const newCustomData = { ...element.customData };
                    delete newCustomData.parent;
                    App.scene.mutateElement(element, { customData: newCustomData });
                }
            }
        });
    });
};

// ====================== 渲染覆写 ======================
const handleDrawElementOnCanvas = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { element, context, renderConfig, rc } = ctx;

    if (element.type === "rectangle" && element.customData?.swimlane) {
        const HEADER_HEIGHT = element.customData.swimlaneHeaderHeight || 40;
        const w = element.width;
        const h = element.height;
        
        const actualHeaderHeight = Math.min(HEADER_HEIGHT, Math.max(0, h));
        const bodyHeight = Math.max(0, h - actualHeaderHeight);

        const r = (element.roundness && typeof element.roundness.value === 'number') 
                  ? element.roundness.value 
                  : (element.roundness ? 8 : 0);
                  
        const settings = element.customData.swimlane;
        const userColor = settings.color;
        const baseColor = (userColor && userColor !== "auto") ? userColor : ((element.strokeColor === "transparent") ? "#000000" : element.strokeColor);

        context.save();
        
        // 1. 绘制主体背景 (Body)
        if (bodyHeight > 0 && element.backgroundColor && element.backgroundColor !== "transparent") {
            context.fillStyle = element.backgroundColor;
            context.beginPath();
            if (context.roundRect && r > 0) context.roundRect(0, actualHeaderHeight, w, bodyHeight, [0, 0, r, r]);
            else context.rect(0, actualHeaderHeight, w, bodyHeight);
            context.fill();
        }
        
        // 2. 绘制标题栏背景 (Header)
        if (actualHeaderHeight > 0) {
            context.save();
            context.globalAlpha = 0.15; 
            context.fillStyle = baseColor;
            context.beginPath();
            
            if (context.roundRect && r > 0) {
                if (bodyHeight <= 1) context.roundRect(0, 0, w, actualHeaderHeight, r); 
                else context.roundRect(0, 0, w, actualHeaderHeight, [r, r, 0, 0]);
            } else {
                context.rect(0, 0, w, actualHeaderHeight);
            }
            context.fill();
            context.restore();
        }

        // 3. 绘制边框线条 (Stroke)
        context.lineWidth = element.strokeWidth || 1;
        context.strokeStyle = element.strokeColor || "#000000";
        context.lineJoin = "round";

        if (bodyHeight > 1 && !element.customData.isCollapsed) {
            context.save();
            context.beginPath();
            if (context.roundRect && r > 0) context.roundRect(0, 0, w, h, r);
            else context.rect(0, 0, w, h);
            context.clip();

            context.beginPath();
            context.moveTo(0, actualHeaderHeight);
            context.lineTo(w, actualHeaderHeight);
            context.stroke();
            context.restore();
        }

        context.beginPath();
        if (context.roundRect && r > 0) context.roundRect(0, 0, w, h, r);
        else context.rect(0, 0, w, h);
        context.stroke();
        
        context.restore();
        return true; 
    }
    return false;
};

// ====================== Hook 处理器 (UI 与 交互) ======================
const ICON_PADDING = 12;
const ICON_SIZE = 14;

const handleRenderCustomIcons = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { element, context, appState } = ctx;
    if (!isContainerElement(element)) return;

    const isCollapsed = element.customData?.isCollapsed || false;
    const cx = element.x + element.width / 2; const cy = element.y + element.height / 2;
    
    context.save();
    context.translate(appState.scrollX + cx, appState.scrollY + cy); context.rotate(element.angle); context.translate(-element.width / 2, -element.height / 2);
    context.fillStyle = appState.viewBackgroundColor === "#121212" ? "#333" : "#fff"; context.strokeStyle = appState.viewBackgroundColor === "#121212" ? "#ccc" : "#000"; context.lineWidth = 1.2;
    
    context.beginPath();
    if (context.roundRect) context.roundRect(ICON_PADDING, ICON_PADDING, ICON_SIZE, ICON_SIZE, 2);
    else context.rect(ICON_PADDING, ICON_PADDING, ICON_SIZE, ICON_SIZE);
    context.fill(); context.stroke();
    
    context.beginPath(); context.strokeStyle = appState.viewBackgroundColor === "#121212" ? "#fff" : "#000";
    const midX = ICON_PADDING + ICON_SIZE / 2; const midY = ICON_PADDING + ICON_SIZE / 2; const lineRad = 3.5;
    context.moveTo(midX - lineRad, midY); context.lineTo(midX + lineRad, midY);
    if (isCollapsed) { context.moveTo(midX, midY - lineRad); context.lineTo(midX, midY + lineRad); }
    context.stroke(); context.restore();
};

const handlePointerMove = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, scenePointer } = ctx;
    if (!scenePointer) return;

    const hitIcon = App.scene.getNonDeletedElements().some(el => {
        if (!isContainerElement(el)) return false;
        const [rotX, rotY] = pointRotateRads([scenePointer.x, scenePointer.y], [el.x + el.width / 2, el.y + el.height / 2], -el.angle);
        return (rotX >= el.x + ICON_PADDING - 2 && rotX <= el.x + ICON_PADDING + ICON_SIZE + 2 && rotY >= el.y + ICON_PADDING - 2 && rotY <= el.y + ICON_PADDING + ICON_SIZE + 2);
    });

    if (hitIcon && App.interactiveCanvas) App.interactiveCanvas.style.cursor = "pointer";
};

const handleCanvasPointerDown = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, event, scenePointer } = ctx;
    if (!scenePointer) return false;

    const clickX = scenePointer.x; 
    const clickY = scenePointer.y;
    const elements = App.scene.getNonDeletedElements();

    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (!isContainerElement(el)) continue;

        const [rotX, rotY] = pointRotateRads([clickX, clickY], [el.x + el.width / 2, el.y + el.height / 2], -el.angle);
        const iconX = el.x + ICON_PADDING; 
        const iconY = el.y + ICON_PADDING;
        const threshold = 6;
        
        if (rotX >= iconX - threshold && rotX <= iconX + ICON_SIZE + threshold && rotY >= iconY - threshold && rotY <= iconY + ICON_SIZE + threshold) {
            if (event && typeof event.preventDefault === "function") { 
                event.preventDefault(); 
                event.stopPropagation(); 
            }
            toggleSwimlaneCollapse(App, el);
            return true; 
        }
    }
    return false;
};

const toggleSwimlaneCollapse = async (App, container) => {
    const isCollapsing = !container.customData.isCollapsed;
    const headerHeight = container.customData.swimlaneHeaderHeight || 40;
    
    const parentToChildrenMap = new Map();
    App.scene.getNonDeletedElements().forEach(e => {
        const pid = e.customData?.parent;
        if (pid) { 
            if (!parentToChildrenMap.has(pid)) parentToChildrenMap.set(pid, []); 
            parentToChildrenMap.get(pid).push(e.id); 
        }
    });

    const childrenToToggle = [];
    const toggleDescendants = (parentId, hide, ea, api) => {
        const kids = parentToChildrenMap.get(parentId) || [];
        kids.forEach(kidId => {
            const child = App.scene.getNonDeletedElementsMap().get(kidId);
            if (child) {
                childrenToToggle.push(child);
                toggleDescendants(kidId, hide, ea, api);
            }
        });
    };
    toggleDescendants(container.id, isCollapsing, ea, api);

    const newContainerData = { ...container.customData, isCollapsed: isCollapsing };
    let newHeight = container.height;
    
    if (isCollapsing) {
        if (container.height > headerHeight + 10) newContainerData.originalHeight = container.height;
        newHeight = headerHeight;
    } else {
        if (container.customData.originalHeight && container.customData.originalHeight > headerHeight) {
            newHeight = container.customData.originalHeight;
        } else {
            newHeight = headerHeight + 150; 
        }
    }

    if (typeof ea !== "undefined") {
        ea.clear();
        const elementsToEdit = [...childrenToToggle, container];
        ea.copyViewElementsToEAforEditing(elementsToEdit);
        
        childrenToToggle.forEach(child => {
            const eaChild = ea.getElement(child.id);
            if (eaChild) eaChild.customData = { ...(eaChild.customData || {}), hide: isCollapsing };
        });

        const eaContainer = ea.getElement(container.id);
        if (eaContainer) {
            eaContainer.customData = newContainerData;
            eaContainer.height = newHeight;
        }
        
        await ea.addElementsToView(false, false, true);
    }
};

const onCanvasDoubleClick = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, sceneX, sceneY } = ctx;
    const elements = App.scene.getNonDeletedElements();

    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (!isContainerElement(el)) continue;

        const [rotX, rotY] = pointRotateRads(
            [sceneX, sceneY], 
            [el.x + el.width / 2, el.y + el.height / 2], 
            -el.angle
        );
        
        const iconX = el.x + ICON_PADDING; 
        const iconY = el.y + ICON_PADDING;
        const threshold = 8; 
        
        if (rotX >= iconX - threshold && rotX <= iconX + ICON_SIZE + threshold && rotY >= iconY - threshold && rotY <= iconY + ICON_SIZE + threshold) {
            return true; 
        }
    }
    return false;
};

// ====================== Hook 处理器 (容器生命周期全接管) ======================

// ====================== Hook 处理器 (容器生命周期全接管) ======================

// 1. 【防误删】拦截删除请求，直接修改属性踢出子元素
let _orphanedChildrenToSelect = [];
const handleBeforeDeleteSelectedElements = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    // 💡 兼容 Core 传递的是大写 App 还是小写 app
    const App = ctx.App || ctx.app; 
    const { elements, appState } = ctx;
    _orphanedChildrenToSelect = [];

    const containersToBeDeleted = new Set(
        elements.filter((el) => appState.selectedElementIds[el.id] && isContainerElement(el)).map(el => el.id)
    );
    if(containersToBeDeleted.size === 0) return;
    
    elements.forEach((el) => {
        if (el.customData?.parent && containersToBeDeleted.has(el.customData.parent)) {
            _orphanedChildrenToSelect.push(el.id); // 记录孤儿
            
            // 💡 直接删除属性，避免其被核心引擎连带删除
            delete appState.selectedElementIds[el.id];

            // 原地解绑父子关系
            const newCustomData = { ...el.customData };
            delete newCustomData.parent;
            if (App && App.scene) {
                App.scene.mutateElement(el, { customData: newCustomData });
            }
        }
    });
};

// 2. 【删除后重选】将刚才解绑保住的子元素，重新设置为选中状态
const handleAfterDeleteSelectedElements = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const App = ctx.App || ctx.app;
    
    if (_orphanedChildrenToSelect.length > 0) {
        // 如果 Core 主动抛出了 selectedElementIds 引用，则直接同步修改
        if (ctx.selectedElementIds) {
            _orphanedChildrenToSelect.forEach(id => {
                ctx.selectedElementIds[id] = true;
            });
        } 
        // 💡 如果为了保持 Core 纯净没有抛出引用，则使用微任务异步恢复选中状态
        else {
            const idsToSelect = [..._orphanedChildrenToSelect];
            setTimeout(() => {
                if (App && App.setState) {
                    const currentSelection = App.state.selectedElementIds || {};
                    const nextSelection = { ...currentSelection };
                    idsToSelect.forEach(id => nextSelection[id] = true);
                    App.setState({ selectedElementIds: nextSelection });
                }
            }, 0);
        }
        _orphanedChildrenToSelect = []; // 及时清理
    }
};

// 3. 【拖拽打包】附带子元素一起移动，加入缓存防止卡顿
const handleModifyElementsToDrag = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, selectedElements, pointerDownState } = ctx;
    
    const cachedElements = pointerDownState?.cachedElementsToDrag;
    const isCacheValid = cachedElements && 
        cachedElements.length >= selectedElements.length &&
        selectedElements.every(sel => cachedElements.some(c => c.id === sel.id));

    if (isCacheValid) {
        ctx.elementsToDrag = cachedElements;
        return;
    }

    const allElements = App.scene.getNonDeletedElements();
    const parentToChildrenMap = new Map();
    allElements.forEach((el) => {
        const pid = el.customData?.parent;
        if (pid) { if (!parentToChildrenMap.has(pid)) parentToChildrenMap.set(pid, []); parentToChildrenMap.get(pid).push(el.id); }
    });

    const elementsToMove = new Set(selectedElements); 
    const queue = [...selectedElements];
    while (queue.length > 0) {
        const current = queue.shift();
        const childIds = parentToChildrenMap.get(current.id);
        if (childIds) {
            childIds.forEach(childId => {
                const childEl = allElements.find(el => el.id === childId);
                if (childEl && !elementsToMove.has(childEl)) { elementsToMove.add(childEl); queue.push(childEl); }
            });
        }
    }
    ctx.elementsToDrag = Array.from(elementsToMove);
    if (pointerDownState) pointerDownState.cachedElementsToDrag = ctx.elementsToDrag;
};

// 4. 【脱手判定】拖拽结束后自动重新计算吞并和剥离
const handlePointerUpDragSync = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, appState, pointerDownState } = ctx;
    if (pointerDownState && pointerDownState.drag.hasOccurred) {
        const selectedElements = App.scene.getSelectedElements(appState);
        syncContainerMembership(App, selectedElements);
    } else {
        // 如果只是单击，确保选中状态穿透
        const selectedIds = { ...appState.selectedElementIds };
        let needsUpdate = false;
        App.scene.getNonDeletedElements().forEach(el => {
            const pid = el.customData?.parent;
            if (pid && selectedIds[pid] && !selectedIds[el.id]) {
                selectedIds[el.id] = true;
                needsUpdate = true;
            }
        });
        if (needsUpdate) App.setState({ selectedElementIds: selectedIds });
    }
};

// 5. 【形变判定】改变泳道尺寸后吞并/剥离元素
const handleAfterTransformElements = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, selectedElements } = ctx;
    syncContainerMembership(App, selectedElements);
};

// 6. 【新建判定】新建泳道时吞并下方覆盖的元素
const handleAfterCreateGenericElement = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { App, newElement } = ctx;
    if (newElement && isContainerElement(newElement)) {
        syncContainerMembership(App, [newElement]);
    }
};

// ====================== Hook 处理器 (文本排版与自适应) ======================
const handleBeforeStartTextEditing = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.container?.customData?.swimlane) {
        ctx.verticalAlign = "top"; 
        ctx.textAlign = "center";
        ctx.forceTextAlign = true;
        ctx.shouldBindToContainer = true;
        ctx.shouldResizeContainer = false; 
    }
};

const handleComputeBoundTextPosition = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    if (ctx.container?.customData?.swimlane) {
        const targetTextElement = ctx.boundTextElement || ctx.textElement || ctx.element;
        const textHeight = targetTextElement?.height || 24;
        
        // 动态计算此时应有的真实 HeaderHeight，避免异步取到旧数据导致跳动
        const BOUND_TEXT_PADDING = 8;
        const actualHeaderHeight = Math.max(40, textHeight + BOUND_TEXT_PADDING * 2);

        // 基于物理 y 坐标进行完美居中
        ctx.y = ctx.container.y + (actualHeaderHeight / 2) - (textHeight / 2);
    }
};

const handleAfterMeasureTextBoundingBox = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const { container, metrics, scene } = ctx;
    if (container?.customData?.swimlane) {
        const BOUND_TEXT_PADDING = 8;
        const newHeaderHeight = Math.max(40, metrics.height + BOUND_TEXT_PADDING * 2);
        const oldHeaderHeight = container.customData.swimlaneHeaderHeight || 40;

        if (oldHeaderHeight !== newHeaderHeight) {
            const diff = newHeaderHeight - oldHeaderHeight;
            let newHeight = container.height;
            
            // 💡 关键：标题栏变高时，泳道整体也要撑高
            if (!container.customData.isCollapsed) {
                newHeight = Math.max(newHeaderHeight, container.height + diff);
            } else {
                newHeight = newHeaderHeight;
            }

            scene.mutateElement(container, { 
                height: newHeight,
                customData: { 
                    ...container.customData, 
                    swimlaneHeaderHeight: newHeaderHeight 
                } 
            });
        }
    }
};

const handleShouldHideSelectionBox = (ctx) => {
    const { ea, api } = ctx;
    if (!ea || !api) return;

    const parentId = ctx.element.customData?.parent;
    if (parentId && ctx.appState.selectedElementIds[parentId]) {
        ctx.shouldHide = true;
    }
};

// ====================== 启动与刷新 ======================
let _codeBlockUpdateTimer = null;
const forceUpdateAllCodeBlocks = () => {
    if (_codeBlockUpdateTimer) clearTimeout(_codeBlockUpdateTimer);
    
    _codeBlockUpdateTimer = setTimeout(() => {
      const elements = ea.getViewElements();
      let hasChanges = false;
      
      const nextElements = elements.map(el => {
        if (isContainerElement(el)) {
          hasChanges = true;
          return { 
            ...el, 
            version: (el.version || 0) + 1, 
            versionNonce: Math.floor(Math.random() * 1000000000) 
          };
        }
        return el;
      });
  
      if (hasChanges) {
        ea.viewUpdateScene({ elements: nextElements });
      }
    }, 100);
  };

function mountFeature() {
    if (!window.EA_Core) return;
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    const core = window.EA_Core;
    
    // 渲染与UI交互
    core.registerHook(SCRIPT_ID, 'drawElementOnCanvas', handleDrawElementOnCanvas, 50);
    core.registerHook(SCRIPT_ID, 'renderCustomIcons', handleRenderCustomIcons, 50);
    core.registerHook(SCRIPT_ID, 'handleCanvasPointerMove', handlePointerMove, 50);
    core.registerHook(SCRIPT_ID, 'handleCanvasPointerDown', handleCanvasPointerDown, 100); 
    core.registerHook(SCRIPT_ID, 'handleCanvasDoubleClick', onCanvasDoubleClick, 100);
    core.registerHook(SCRIPT_ID, 'shouldHideSelectionBox', handleShouldHideSelectionBox, 50);
    
    // 文本排版自适应
    core.registerHook(SCRIPT_ID, 'beforeStartTextEditing', handleBeforeStartTextEditing, 50);
    core.registerHook(SCRIPT_ID, 'computeBoundTextPosition', handleComputeBoundTextPosition, 50);
    core.registerHook(SCRIPT_ID, 'afterMeasureTextBoundingBox', handleAfterMeasureTextBoundingBox, 50);
    
    // 核心生命周期全接管 (删除、拖拽、形变、新建)
    core.registerHook(SCRIPT_ID, 'beforeDeleteSelectedElements', handleBeforeDeleteSelectedElements, 50);
    core.registerHook(SCRIPT_ID, 'afterDeleteSelectedElements', handleAfterDeleteSelectedElements, 50);
    core.registerHook(SCRIPT_ID, 'modifyElementsToDrag', handleModifyElementsToDrag, 50);
    core.registerHook(SCRIPT_ID, 'onPointerUpFromPointerDown', handlePointerUpDragSync, 50); 
    core.registerHook(SCRIPT_ID, 'afterTransformElements', handleAfterTransformElements, 50);
    core.registerHook(SCRIPT_ID, 'afterCreateGenericElement', handleAfterCreateGenericElement, 50);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        delete window.drawElementOnCanvasHook;
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}



mountFeature();
forceUpdateAllCodeBlocks();