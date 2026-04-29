---
name: 脑图核心引擎
description: 后台引擎：提供脑图折叠、排版、快捷键创建节点及实时高亮渲染。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，为带有 customData.mindmap 的元素提供折叠展开的右上角图标绘制，实现回车和 Tab 键的快捷节点生成与连线，实现方向键导航节点，以及监听节点的增删实现自动排版。
features:
  - 拦截 handleCanvasPointerDown/Up 实现点击展开/折叠按钮
  - 拦截 onKeyDown 实现键盘方向键漫游脑图、Tab/Enter 快速新建节点、/键 折叠展开
  - 拦截 _renderInteractiveScene 在脑图根节点与父节点上绘制圆圈数字图标
  - 提供 window.MindmapAPI 供脑图动作脚本调用进行连线刷新与布局重排
dependencies:
  - 被所有脑图相关的 Action 脚本依赖
autorun: true
---
/*
```javascript
*/

var locales = {
  zh: {
    setting_desc: "⚠️ 请不要在此直接修改 JSON 代码。请运行 'Change Mindmap Style' 样式脚本，通过可视化 UI 面板修改脑图全局默认设置。",
    log_parse_fail: "解析脑图配置失败，将使用默认回退配置",
    notice_success: "✨ 解析生成完成，正在自动排版...",
    notice_no_engine: "⚠️ 脑图核心引擎未运行，无法自动排版，请手动开启 Engine 脚本！",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    setting_desc: "⚠️ Do not modify JSON directly. Use 'Change Mindmap Style' script UI to update global defaults.",
    log_parse_fail: "Failed to parse mindmap configuration, using fallback defaults.",
    notice_success: "✨ Parse complete, re-layout in progress...",
    notice_no_engine: "⚠️ Mindmap engine not running, layout skipped. Enable Engine script!",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};
const SCRIPT_ID = "ymjr.feature.mindmap-engine";

const DEFAULT_LEVELS = [
    { level: 1, strokeColor: "black", textColor: "#ffffff", fontSize: 24, strokeWidth: 2 },
    { level: 2, strokeColor: "black", textColor: "black", fontSize: 20, strokeWidth: 1 },
    { level: 3, strokeColor: "black", textColor: "black", fontSize: 16, strokeWidth: 1 },
    { level: 4, strokeColor: "black", textColor: "black", fontSize: 14, strokeWidth: 1 }
];

const FALLBACK_THEMES = {
    "rainbow": { name: "🌈 彩虹分枝", rootBg: "#343a40", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419", "#3bc9db"], levels: DEFAULT_LEVELS },
    "morandi": { name: "🎨 莫兰迪色", rootBg: "#495057", colors: ["#5c7a82", "#b38269", "#788560", "#a68894", "#7a6c5d"], levels: DEFAULT_LEVELS },
    "business": { name: "💼 商务蓝调", rootBg: "#0b2545", colors: ["#1864ab", "#0b7285", "#087f5b", "#5f3dc4", "#c92a2a"], levels: DEFAULT_LEVELS },
    "custom": { name: "⚙️ 自定义色", rootBg: "#1e1e1e", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419"], levels: DEFAULT_LEVELS }
};

const FALLBACK_SETTINGS = {
    direction: "LR", arrowType: "normal", defaultGap: 15, curveLength: 40, lengthBetweenElAndLine: 100, enableFixedPoint: true,
    theme: "rainbow",
    customTheme: { rootBg: FALLBACK_THEMES["custom"].rootBg, colors: [...FALLBACK_THEMES["custom"].colors], levels: JSON.parse(JSON.stringify(DEFAULT_LEVELS)) }
};


// --- Settings Initialization (跨脚本共享存储) ---
let engineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["Mindmap_Engine"] || {};
if (!engineSettings["Mindmap Configuration"]) {
    engineSettings["Mindmap Configuration"] = {
        value: JSON.stringify({ themes: FALLBACK_THEMES, defaultSettings: FALLBACK_SETTINGS }),
        description: t("setting_desc")
    };
    ExcalidrawAutomate.plugin.settings.scriptEngineSettings["Mindmap_Engine"] = engineSettings;
    (async () => { await ExcalidrawAutomate.plugin.saveSettings(); })(); 
}

let mindmapConfig;
try {
    mindmapConfig = JSON.parse(engineSettings["Mindmap Configuration"].value);
} catch (e) {
    console.error(t("log_parse_fail"), e);
    mindmapConfig = { themes: FALLBACK_THEMES, defaultSettings: FALLBACK_SETTINGS };
}

const THEMES = mindmapConfig.themes || FALLBACK_THEMES;
const DEFAULT_SETTINGS = mindmapConfig.defaultSettings || FALLBACK_SETTINGS;

function lightenHex(hex, percent) {
    if (!hex || hex === "transparent") return hex;
    let num = parseInt(hex.replace("#",""), 16);
    if (isNaN(num)) return hex;
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt; let G = (num >> 8 & 0x00FF) + amt; let B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

function resolveStyle(level, branchIndex, settings) {
    const themeKey = settings?.theme || "rainbow";
    let theme = THEMES[themeKey] || THEMES["rainbow"];
    
    if (themeKey === "custom" && settings?.customTheme) {
        theme = { ...theme, ...settings.customTheme };
    }

    const levels = theme.levels || DEFAULT_LEVELS;
    const lvlConfig = level <= levels.length ? levels[level - 1] : levels[levels.length - 1];

    let bg = "transparent";
    if (level === 1) {
        bg = theme.rootBg;
    } else {
        const colors = theme.colors && theme.colors.length > 0 ? theme.colors : THEMES["rainbow"].colors;
        const baseColor = colors[branchIndex % colors.length];
        bg = level > 2 ? lightenHex(baseColor, Math.min((level - 2) * 15, 60)) : baseColor;
    }

    return { backgroundColor: bg, textColor: lvlConfig.textColor, strokeColor: lvlConfig.strokeColor, fontSize: lvlConfig.fontSize, strokeWidth: lvlConfig.strokeWidth };
}

const MindmapState = { mindmapPosMap: new Map(), treeElements: [], hoveredMindmapElement: null };

const getExpandedTreeElements = (baseItems, elementsMap, allElements) => {
    const expandedMap = new Map();
    // 优化：避免重复查询
    const addGroupElements = (el) => {
        if (!el.groupIds?.length || !allElements) return;
        for (let i = 0; i < allElements.length; i++) {
            const a = allElements[i];
            if (!expandedMap.has(a.id) && a.groupIds?.some(gid => el.groupIds.includes(gid))) {
                expandedMap.set(a.id, a);
            }
        }
    };

    baseItems.forEach(item => {
        if (!item || !item.id) return;
        const el = elementsMap.get(item.id);
        if (!el) return;
        expandedMap.set(el.id, el);
        
        if (el.boundElements) {
            for (let i = 0; i < el.boundElements.length; i++) {
                const b = el.boundElements[i];
                if (b.type !== "arrow") {
                    const boundEl = elementsMap.get(b.id);
                    if (boundEl) expandedMap.set(boundEl.id, boundEl);
                }
            }
        }
        addGroupElements(el);
    });
    return Array.from(expandedMap.values());
};

const getElementAbsoluteCoords = (element) => [element.x, element.y, element.x + element.width, element.y + element.height];

const checkOverlap = (el1, el2) => {
    if (!el1 || !el2 || el1.id === el2.id) return false;
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(el1);
    const [tx1, ty1, tx2, ty2] = getElementAbsoluteCoords(el2);
    return !(x2 < tx1 || x1 > tx2 || y2 < ty1 || y1 > ty2);
};

const isDescendant = (potentialParentId, targetId, elementsMap) => {
    let current = elementsMap.get(targetId);
    while (current?.customData?.mindmap?.parent) {
        if (current.customData.mindmap.parent === potentialParentId) return true;
        current = elementsMap.get(current.customData.mindmap.parent);
    }
    return false;
};

const getDropZone = (dragged, target, direction = "LR") => {
    const [dx1, dy1, dx2, dy2] = getElementAbsoluteCoords(dragged);
    const [tx1, ty1, tx2, ty2] = getElementAbsoluteCoords(target);
    const dCenterY = ((dy1 + dy2) / 2) - ((ty1 + ty2) / 2);
    const dCenterX = ((dx1 + dx2) / 2) - ((tx1 + tx2) / 2);
    if (direction === "LR" || direction === "RL") {
        if (direction === "LR" && dCenterX > 0 && Math.abs(dCenterX) > Math.abs(dCenterY)) return "child";
        if (direction === "RL" && dCenterX < 0 && Math.abs(dCenterX) > Math.abs(dCenterY)) return "child";
        return dCenterY < 0 ? "sibling-before" : "sibling-after";
    } else {
        if (direction === "TD" && dCenterY > 0 && Math.abs(dCenterY) > Math.abs(dCenterX)) return "child";
        if (direction === "BU" && dCenterY < 0 && Math.abs(dCenterY) > Math.abs(dCenterX)) return "child";
        return dCenterX < 0 ? "sibling-before" : "sibling-after";
    }
};

const attachNodeToMindmap = async (draggedEl, targetEl, dropZone, App) => {
    const elementsMap = App.scene.getNonDeletedElementsMap();
    const allElements = App.scene.getNonDeletedElements();
    const rootId = targetEl.customData.mindmap.root;
    const rootEl = elementsMap.get(rootId);
    let rootSettings = rootEl?.customData?.mindmap?.settings || DEFAULT_SETTINGS;
    const direction = rootSettings.direction || "LR";

    let newParentId = dropZone === "child" ? targetEl.id : targetEl.customData.mindmap.parent;
    if (!newParentId) newParentId = targetEl.id; 
    
    const newParentEl = elementsMap.get(newParentId);
    const shouldHide = newParentEl?.customData?.hide || newParentEl?.customData?.mindmap?.status === "close";
    const newLevel = (newParentEl?.customData?.mindmap?.level || 0) + 1;

    let branchRootId = draggedEl.id;
    if (newLevel > 1) {
        let p = newParentEl;
        while(p && p.customData?.mindmap?.level > 2) { p = elementsMap.get(p.customData.mindmap.parent); }
        if (p && p.customData?.mindmap?.level === 2) branchRootId = p.id;
    }
    
    const rootChildren = allElements.filter(e => e.customData?.mindmap?.parent === rootId && e.id !== rootId && e.id !== draggedEl.id);
    rootChildren.sort((a,b) => a.y - b.y);
    let tempBranchIndex = rootChildren.findIndex(e => e.id === branchRootId);
    if (tempBranchIndex === -1) tempBranchIndex = rootChildren.length;

    let arrowIdsToDelete = [];
    // 优化：使用简单的 for 循环
    for(let i = 0; i < allElements.length; i++){
        const el = allElements[i];
        if (el.type === "arrow" && el.endBinding?.elementId === draggedEl.id) {
            arrowIdsToDelete.push(el.id);
        }
    }

    const oldParentId = draggedEl.customData?.mindmap?.parent;
    const descendantUpdates = [];
    const findDescendants = (parentId, currentLevel) => {
        for (let i = 0; i < allElements.length; i++) {
            const child = allElements[i];
            if (child.customData?.mindmap?.parent === parentId) {
                descendantUpdates.push({ child, level: currentLevel + 1 }); 
                findDescendants(child.id, currentLevel + 1, ea);
            }
        }
    };
    findDescendants(draggedEl.id, newLevel, ea);

    ea.clear();
    let elementsToEdit = [draggedEl, ...descendantUpdates.map(d => d.child)];
    const relatedEls = [];
    
    for (let i = 0; i < elementsToEdit.length; i++) {
        const el = elementsToEdit[i];
        if (el.boundElements) {
            for (let j = 0; j < el.boundElements.length; j++) {
                const b = el.boundElements[j];
                if (b.type !== "arrow") { 
                    const bEl = elementsMap.get(b.id); 
                    if (bEl) relatedEls.push(bEl); 
                }
            }
        }
    }
    
    elementsToEdit = [...new Set([...elementsToEdit, ...relatedEls])];
    ea.copyViewElementsToEAforEditing(elementsToEdit);

    if (shouldHide) {
        elementsToEdit.forEach(el => {
            const eaEl = ea.getElement(el.id);
            if (eaEl) eaEl.customData = { ...(eaEl.customData || {}), hide: true };
        });
    }
    
    const eaDragged = ea.getElement(draggedEl.id);
    if (eaDragged) {
        const style = resolveStyle(newLevel, tempBranchIndex, rootSettings);
        if (style) {
            eaDragged.backgroundColor = style.backgroundColor; eaDragged.strokeColor = style.strokeColor || "black"; eaDragged.strokeWidth = style.strokeWidth || 1;
            if (eaDragged.type === "text") eaDragged.fontSize = style.fontSize;
            if (eaDragged.boundElements) {
                eaDragged.boundElements.forEach(b => {
                    if (b.type === "text") { const t = ea.getElement(b.id); if (t) { t.strokeColor = style.textColor || "black"; t.fontSize = style.fontSize; } }
                });
            }
        }
        eaDragged.customData = { ...eaDragged.customData, mindmap: { ...(eaDragged.customData?.mindmap || {}), status: eaDragged.customData?.mindmap?.status || "open", root: rootId, parent: newParentId, level: newLevel } };
    }

    descendantUpdates.forEach(d => {
        const eaChild = ea.getElement(d.child.id);
        if (eaChild) {
            const style = resolveStyle(d.level, tempBranchIndex, rootSettings);
            if (style) {
                eaChild.backgroundColor = style.backgroundColor; eaChild.strokeColor = style.strokeColor || "black"; eaChild.strokeWidth = style.strokeWidth || 1;
                if (eaChild.type === "text") eaChild.fontSize = style.fontSize;
                if (eaChild.boundElements) {
                    eaChild.boundElements.forEach(b => {
                        if (b.type === "text") { const t = ea.getElement(b.id); if (t) { t.strokeColor = style.textColor || "black"; t.fontSize = style.fontSize; } }
                    });
                }
            }
            eaChild.customData = { ...eaChild.customData, mindmap: { ...(eaChild.customData?.mindmap || {}), root: rootId, level: d.level } };
        }
    });

    if (!ea.getElement(newParentId)) ea.copyViewElementsToEAforEditing([newParentEl]);
    
    let startPort = "right", endPort = "left";
    if (direction === "RL") { startPort = "left"; endPort = "right"; }
    else if (direction === "TD") { startPort = "bottom"; endPort = "top"; }
    else if (direction === "BU") { startPort = "top"; endPort = "bottom"; }

    const arrowId = ea.connectObjects(newParentId, startPort, draggedEl.id, endPort, { startArrowHead: null });
    if (shouldHide) { const eaArrow = ea.getElement(arrowId); if (eaArrow) eaArrow.customData = { ...(eaArrow.customData || {}), hide: true }; }

    if (oldParentId) {
        let eaOldParent = ea.getElement(oldParentId);
        if (!eaOldParent) {
            const oldParentEl = elementsMap.get(oldParentId);
            if (oldParentEl) { ea.copyViewElementsToEAforEditing([oldParentEl]); eaOldParent = ea.getElement(oldParentId); }
        }
        if (eaOldParent && eaOldParent.boundElements) {
            eaOldParent.boundElements = eaOldParent.boundElements.filter(b => b.type !== "arrow" || !arrowIdsToDelete.includes(b.id));
            if (eaOldParent.boundElements.length === 0) eaOldParent.boundElements = null;
        }
    }

    if (arrowIdsToDelete.length > 0) {
        const arrowsToEdit = arrowIdsToDelete.map(id => elementsMap.get(id)).filter(Boolean);
        ea.copyViewElementsToEAforEditing(arrowsToEdit);
        arrowsToEdit.forEach(arr => { const eaArr = ea.getElement(arr.id); if (eaArr) eaArr.isDeleted = true; });
    }

    await ea.addElementsToView(false, false, true);

    setTimeout(async () => {
        const updatedElementsMap = App.scene.getNonDeletedElementsMap(); const updatedElements = App.scene.getNonDeletedElements();
        const freshRootEl = updatedElementsMap.get(rootId); if (!freshRootEl) return;
        const mindmap = new Mindmap(updatedElements, freshRootEl);
        mindmap.setElements(updatedElements, updatedElementsMap); mindmap.buildNodeTree(freshRootEl, null, 1, null);
        MindmapState.mindmapPosMap.set(rootId, mindmap);
        const rootNode = mindmap.NodeMap.get(rootId); if (!rootNode) return;
        const [children, arrows] = mindmap.getChildren(rootNode, true, (el) => updatedElementsMap.get(el.id)?.customData?.hide);
        const rawItems = [...children, ...arrows, rootNode];
        const treeElements = getExpandedTreeElements(rawItems, updatedElementsMap, updatedElements);
        mindmap.clearElements(); await window.MindmapAPI.runLayout(treeElements, true);
    }, 100);
};

const isPointHittingMindmapIcon = (element, elementsMap, x, y) => {
    if (!element?.customData?.mindmap?.root) return false;
    
    // 优化：避免创建大量临时数组进行寻找
    let hasStartArrow = false;
    if (element.boundElements) {
        for (let i = 0; i < element.boundElements.length; i++) {
            const el = element.boundElements[i];
            if (el.type === "arrow") {
                const arrowEl = elementsMap.get(el.id);
                if (arrowEl?.startBinding?.elementId === element.id) {
                    hasStartArrow = true;
                    break;
                }
            }
        }
    }
    if (!hasStartArrow) return false;

    const threshold = 4; const iconWidth = 20; const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
    const rootEl = elementsMap.get(element.customData.mindmap.root); const direction = rootEl?.customData?.mindmap?.settings?.direction || "LR";
    let hitLink = false;
    switch (direction) {
        case "LR": hitLink = x > x2 - threshold - iconWidth / 2 && x < x2 + threshold + iconWidth / 2 && y > y1 + element.height / 2 - threshold - iconWidth / 2 && y < y1 + element.height / 2 + threshold + iconWidth / 2; break;
        case "RL": hitLink = x > x1 - threshold - iconWidth / 2 && x < x1 + threshold + iconWidth / 2 && y > y1 + element.height / 2 - threshold - iconWidth / 2 && y < y1 + element.height / 2 + threshold + iconWidth / 2; break;
        case "TD": hitLink = x > x1 + element.width / 2 - threshold - iconWidth / 2 && x < x1 + element.width / 2 + threshold + iconWidth / 2 && y > y2 - threshold - iconWidth / 2 && y < y2 + threshold + iconWidth / 2; break;
        case "BU": hitLink = x > x1 + element.width / 2 - threshold - iconWidth / 2 && x < x1 + element.width / 2 + threshold + iconWidth / 2 && y > y1 - threshold - iconWidth / 2 && y < y1 + threshold + iconWidth / 2; break;
        default: hitLink = x > x2 - threshold - iconWidth / 2 && x < x2 + threshold + iconWidth / 2 && y > y1 + element.height / 2 - threshold - iconWidth / 2 && y < y1 + element.height / 2 + threshold + iconWidth / 2; break;
    }
    return hitLink;
};

const isPointHittingMindmap = (element, elementsMap, appState, x, y) => {
    if (!element?.customData?.mindmap) return false;
    const isMobile = appState?.stylesPanelMode === "mobile" || false;
    if (!isMobile && appState.viewModeEnabled) {
        const [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return true;
    }
    return isPointHittingMindmapIcon(element, elementsMap, x, y);
};

const findHitMindmapElement = (App, scenePointer) => {
    if (!App || !scenePointer) return null;
    const elementsMap = App.scene.getNonDeletedElementsMap();
    const elements = App.scene.getNonDeletedElements();
    
    // 性能优化重点：代替 .slice().reverse().find()，直接采用原数组倒序查询，实现 0 GC 开销
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el?.customData?.mindmap && isPointHittingMindmap(el, elementsMap, App.state, scenePointer.x, scenePointer.y)) {
            return el;
        }
    }
    return null;
};

class MindmapNode {
    constructor(element, rootId, parentId, level) {
        this.parent = null; this.parentArrow = null; this.children = []; this.childrenArrow = []; this.level = level; this.id = element.id;
        if (!element?.customData?.mindmap) element.customData = { ...element.customData, mindmap: { status: "open", root: rootId, parent: parentId, level: level } };
    }
}

class Mindmap {
    constructor(elements, element) { this.rootId = element.customData.mindmap.root; this.NodeMap = new Map(); }
    clearElements() { this.elements = []; this.elementsMap = []; this.arrowElements = []; }
    setElements(elements, elementsMap) { this.elements = elements; this.elementsMap = elementsMap; this.arrowElements = elements.filter((el) => el.type == "arrow"); }
    buildNodeTree(element, parentNode, level, arrow) {
        let startArrowElements = this.arrowElements.filter((el) => el.startBinding && el.startBinding.elementId == element.id);
        let node = new MindmapNode(element, this.rootId, parentNode?.id, (parentNode?.level || 0) + 1);
        if (level == 1) this.rootNode = node;
        this.NodeMap.set(node.id, node); node.parent = parentNode;
        parentNode && parentNode?.children.push(node); node.parentArrow = arrow;
        startArrowElements.forEach((el) => {
            node.childrenArrow.push(el);
            let child = this.elementsMap?.get(el.endBinding.elementId); this.buildNodeTree(child, node, level+1, el);
        });
    }
    getChildren(node, recursion=true, filter=undefined) {
        const children = []; const arrows = [];
        if (filter && node.children.length) {
            const firstChildEl = this.elementsMap.get(node.children[0].id);
            if (firstChildEl && filter(firstChildEl)) return [[], []];
        }
        children.push(...node?.children); arrows.push(...node?.childrenArrow);
        
        // 性能优化：避免在循环体内使用 .concat 产生大量无用数组和 GC
        const childrenEls = children.map((el) => this.elementsMap?.get(el.id)).filter(el => el);
        let groupElements = [];
        
        for (let i = 0; i < childrenEls.length; i++) {
            const groups = ea.getElementsInTheSameGroupWithElement(childrenEls[i], this.elements);
            for (let j = 0; j < groups.length; j++) {
                if (!groups[j]?.customData?.zoomHide && !groups[j]?.customData?.mindmap) {
                    groupElements.push(groups[j]);
                }
            }
        }
        children.push(...groupElements);
        
        if (recursion) {
            node.children.forEach(el => { const [_children, _arrows] = this.getChildren(el, true, filter); children.push(..._children); arrows.push(..._arrows); });
        }
        return [children, arrows];
    }
    
    async changeVisibility(element, currentNode, recursion, visiable, status) {
        const [children, arrows] = this.getChildren(currentNode, recursion);
        const childrenEls = children.map((el) => this.elementsMap?.get(el.id)).filter(el => el);
        const arrowEls = arrows.map((el) => this.elementsMap?.get(el.id)).filter(el => el);
        const boundElements = [];
        
        childrenEls.forEach(el => {
            if (el.boundElements) {
                el.boundElements.forEach(bound => { if (bound.type != "arrow") boundElements.push(this.elementsMap?.get(bound.id)); });
            }
        });
        
        let groupElements = [];
        for (let i = 0; i < childrenEls.length; i++) {
            const groups = ea.getElementsInTheSameGroupWithElement(childrenEls[i], this.elements);
            for (let j = 0; j < groups.length; j++) {
                if (!groups[j]?.customData?.zoomHide && !groups[j]?.customData?.mindmap) {
                    groupElements.push(groups[j]);
                }
            }
        }
        
        element?.customData?.mindmap && (element.customData.mindmap.status = status);
        if (status == "close") {
            childrenEls.forEach((el) => { el = this.elementsMap?.get(el.id); el?.customData?.mindmap && (el.customData.mindmap.status = status); });
        }
        ea.clear();
        let changedVisiableEls = [...new Set([...childrenEls, ...groupElements, ...arrowEls, ...boundElements])];
        changedVisiableEls.forEach((el) => { el.customData = el.customData || {}; el.customData.hide = !visiable; });
        ea.copyViewElementsToEAforEditing([...changedVisiableEls, element]);
        await ea.addElementsToView(false, false, false);
    }
    
    async addNewNode(element, currentNode, pos, state) {
        const newEls = []; let parentNode, level, newElX, newElY;
        
        const rootEl = this.elementsMap?.get(this.rootId);
        let rootSettings = rootEl?.customData?.mindmap?.settings || DEFAULT_SETTINGS;
        const direction = rootSettings.direction || "LR";
        const isHorizontal = ["LR", "RL"].includes(direction);

        if (pos == "next") {
            parentNode = currentNode; level = element.customData.mindmap.level+1;
            newElX = direction === "RL" ? element.x - 100 : element.x + element.width + 20; 
            newElY = element.y;
            
            if (currentNode.children && currentNode.children.length > 0) {
                let maxVal = -Infinity;
                currentNode.children.forEach(c => {
                    const childEl = this.elementsMap.get(c.id);
                    if (childEl) {
                        const val = isHorizontal ? childEl.y : childEl.x;
                        if (val > maxVal) maxVal = val;
                    }
                });
                if (maxVal !== -Infinity) {
                    if (isHorizontal) newElY = maxVal + 100;
                    else newElX = maxVal + 100;
                }
            }
        }
        if (pos =="same") {
            parentNode = currentNode.parent; level = element.customData.mindmap.level;
            
            if (isHorizontal) {
                newElX = element.x; newElY = element.y + element.height + 20;
            } else {
                newElX = element.x + element.width + 20; newElY = element.y;
            }
        }

        let parentEl = this.elementsMap?.get(parentNode.id);

        let branchIndex = 0;
        const rootChildren = this.rootNode.children;
        if (level === 2 && pos === "next") {
            branchIndex = rootChildren.length;
        } else {
            let pNode = parentNode; let targetId = pos === "same" ? currentNode.id : parentNode.id;
            while(pNode && pNode.level > 2) { targetId = pNode.id; pNode = pNode.parent; }
            if(pNode && pNode.level === 2) targetId = pNode.id;
            branchIndex = rootChildren.findIndex(n => n.id === targetId);
            if(branchIndex === -1) branchIndex = rootChildren.length;
        }

        const targetStyle = resolveStyle(level, branchIndex, rootSettings);

        ea.style.opacity = parentEl?.opacity || 100; ea.style.roughness = element.roughness || 0;
        ea.style.fillStyle = element.fillStyle || "solid"; ea.style.roundness = element.roundness; ea.style.fontFamily  = state.currentItemFontFamily;

        if (targetStyle) {
            ea.style.backgroundColor = targetStyle.backgroundColor;
            ea.style.strokeColor = targetStyle.strokeColor || "black";
            ea.style.fontSize = targetStyle.fontSize;
            ea.style.strokeWidth = targetStyle.strokeWidth || 1;
        }

        const newElId = ea.addText(newElX, newElY, "new element", {box:true, textAlign: "center", textVerticalAlign: "middle", boxStrokeColor: ea.style.strokeColor});
        const newEl = ea.getElement(newElId); 
        newEl.strokeColor = targetStyle.strokeColor || "black";
        
        this.elementsMap.set(newEl.id, newEl); this.elements.push(newEl);
        const boundElId = newEl.boundElements[0].id; 
        const boundElement = ea.getElement(boundElId);

        boundElement.strokeColor = targetStyle.textColor || "black";
        this.elementsMap.set(boundElId, boundElement); this.elements.push(boundElement);
        
        if(pos == "same") { newEl.width = element.width; newEl.height = element.height; }
        const newNode = new MindmapNode(newEl, this.rootId, parentNode?.id, level);
        parentEl.boundElements = parentEl?.boundElements?.length != 0 ?  parentEl.boundElements : null;
        ea.copyViewElementsToEAforEditing([parentEl]);
        const arrowId = ea.connectObjects(parentNode.id, "right", newEl.id, "left", {startArrowHead: null});
        let arrowEl = ea.getElement(arrowId); this.elementsMap.set(arrowEl.id, arrowEl); this.elements.push(arrowEl);
        await ea.addElementsToView(false, false, false);
        newNode.parent = parentNode; newNode.parentArrow = arrowEl; this.NodeMap.set(newNode.id, newNode);
        this.elementsMap.set(parentNode.id, ea.getElement(parentNode.id));
        if (parentNode) { parentNode.childrenArrow.push(arrowEl); parentNode.children.push(newNode); }

        newEls.push(newEl); newEls.push(arrowEl);
        return [newEl, newEls];
    }
}

class MindMapLayouter {
    constructor(elements, config) {
        this.elements = elements; this.config = config; this.changedElementsSet = new Set();  
        this.elIdMap = new Map(); this.nodeMap = new Map(); this.visited = new Set();              
    }
    runLayout() {
        if (!this.elements?.length) return;
        for (let i = 0; i < this.elements.length; i++) {
            const el = this.elements[i];
            this.elIdMap.set(el.id, el);
            if (!["arrow", "line"].includes(el.type)) this.nodeMap.set(el.id, this.createNode(el));
        }
        for (let i = 0; i < this.elements.length; i++) {
            const el = this.elements[i];
            if (!["arrow", "line"].includes(el.type)) continue;
            const startId = el.startBinding?.elementId; const endId   = el.endBinding?.elementId;
            if (startId && endId && this.nodeMap.has(startId) && this.nodeMap.has(endId)) {
                const parentNode = this.nodeMap.get(startId); const childNode  = this.nodeMap.get(endId);
                parentNode.children.push(childNode); parentNode.linkChildrensLines.push(el); childNode.parent = parentNode; 
            }
        }
        const roots = [...this.nodeMap.values()].filter((node) => !node.parent);
        for (let i = 0; i < roots.length; i++) {
            const rootNode = roots[i];
            this.visited.clear(); this.calculateDimensions(rootNode);   
            let startX = rootNode.el.x; let startY = rootNode.el.y;
            if (this.isHorizontal()) { startY = rootNode.el.y + rootNode.el.height / 2 - rootNode.totalHeight / 2; } 
            else { startX = rootNode.el.x + rootNode.el.width / 2 - rootNode.totalWidth / 2; }
            this.assignPositions(rootNode, startX, startY);    
        }
    }
    createNode(el) { return { el, parent: null, children: [], linkChildrensLines: [], totalHeight: 0, totalWidth: 0, childrenTotalHeight: 0, childrenTotalWidth: 0 }; }
    isHorizontal() { return ["LR", "RL"].includes(this.config.direction); }
    calculateDimensions(node) {
        if (this.visited.has(node.el.id)) return;
        this.visited.add(node.el.id);

        if (node.el.customData?.hide) {
            node.totalHeight = 0; node.totalWidth = 0;
            node.childrenTotalHeight = 0; node.childrenTotalWidth = 0;
            for (let i = 0; i < node.children.length; i++) { this.calculateDimensions(node.children[i]); }
            return;
        }

        if (!node.children.length) {
            node.totalHeight = node.el.height + this.config.defaultGap; node.totalWidth = node.el.width + this.config.defaultGap;
            node.childrenTotalHeight = 0; node.childrenTotalWidth = 0; return;
        }
        let sumH = 0, sumW = 0;
        for (let i = 0; i < node.children.length; i++) { 
            const child = node.children[i];
            this.calculateDimensions(child); 
            sumH += child.totalHeight; 
            sumW += child.totalWidth; 
        }
        node.childrenTotalHeight = sumH; node.childrenTotalWidth = sumW;
        if (this.isHorizontal()) { node.totalHeight = Math.max(node.el.height + this.config.defaultGap, sumH); } 
        else { node.totalWidth = Math.max(node.el.width + this.config.defaultGap, sumW); }
    }
    assignPositions(node, bboxX, bboxY) {
        node.children.sort((a, b) => this.isHorizontal() ? ((a.el.y + a.el.height / 2) - (b.el.y + b.el.height / 2)) : ((a.el.x + a.el.width / 2) - (b.el.x + b.el.width / 2)));
        const sortedLines = [];
        node.children.forEach(child => { const line = node.linkChildrensLines.find(l => l.endBinding?.elementId === child.el.id || l.startBinding?.elementId === child.el.id); if (line) sortedLines.push(line); });
        node.linkChildrensLines = sortedLines;

        let newX = node.el.x; let newY = node.el.y;
        if (this.isHorizontal()) { newY = bboxY + node.totalHeight / 2 - node.el.height / 2; if (node.parent) newX = bboxX; } 
        else { newX = bboxX + node.totalWidth / 2 - node.el.width / 2; if (node.parent) newY = bboxY; }

        const dx = newX - node.el.x; const dy = newY - node.el.y;
        if (dx !== 0 || dy !== 0) {
            node.el.x = newX; node.el.y = newY; this.changedElementsSet.add(node.el);
            if (["rectangle", "diamond", "ellipse"].includes(node.el.type)) {
                const textDesc = (node.el.boundElements ?? []).find(b => b.type === "text");
                if (textDesc) { const textEl = this.elIdMap.get(textDesc.id); if (textEl) { textEl.x += dx; textEl.y += dy; this.changedElementsSet.add(textEl); } }
            }
            if (node.el.groupIds?.length) {
                this.elements.filter(item => item.groupIds?.some(gid => node.el.groupIds.includes(gid))).forEach(g => {
                    if (g.id !== node.el.id) { g.x += dx; g.y += dy; this.changedElementsSet.add(g); }
                });
            }
        }

        if (node.children.length === 0) return;

        let currentChildBboxY = bboxY + (node.totalHeight - node.childrenTotalHeight) / 2; let currentChildBboxX = bboxX + (node.totalWidth - node.childrenTotalWidth) / 2;

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i]; const line = node.linkChildrensLines[i];
            let nextBboxX = bboxX; let nextBboxY = bboxY;
            if (this.config.direction === "LR") { nextBboxX = node.el.x + node.el.width + this.config.lengthBetweenElAndLine + this.config.curveLength; nextBboxY = currentChildBboxY; currentChildBboxY += child.totalHeight; } 
            else if (this.config.direction === "RL") { nextBboxX = node.el.x - this.config.lengthBetweenElAndLine - this.config.curveLength - child.el.width; nextBboxY = currentChildBboxY; currentChildBboxY += child.totalHeight; } 
            else if (this.config.direction === "TD") { nextBboxY = node.el.y + node.el.height + this.config.lengthBetweenElAndLine + this.config.curveLength; nextBboxX = currentChildBboxX; currentChildBboxX += child.totalWidth; } 
            else if (this.config.direction === "BU") { nextBboxY = node.el.y - this.config.lengthBetweenElAndLine - this.config.curveLength - child.el.height; nextBboxX = currentChildBboxX; currentChildBboxX += child.totalWidth; }
            this.assignPositions(child, nextBboxX, nextBboxY); if (line) this.updateLine(node, child, line);
        }
    }

    updateLine(parentNode, childNode, line) {
        line.x = parentNode.el.x + parentNode.el.width; line.y = parentNode.el.y + parentNode.el.height / 2;
        if (this.config.direction === "RL") { line.x = parentNode.el.x; } 
        else if (this.config.direction === "TD") { line.x = parentNode.el.x + parentNode.el.width / 2; line.y = parentNode.el.y + parentNode.el.height; } 
        else if (this.config.direction === "BU") { line.x = parentNode.el.x + parentNode.el.width / 2; line.y = parentNode.el.y; }

        line.startBinding = { elementId: parentNode.el.id, focus: 0, gap: 1 };
        line.endBinding = { elementId: childNode.el.id, focus: 0, gap: 1 };

        if (this.config.enableFixedPoint) {
            line.startBinding.mode = "inside";
            line.endBinding.mode = "inside";
            if (this.config.direction === "LR") { line.startBinding.fixedPoint = [1.0, 0.5]; line.endBinding.fixedPoint = [0.0, 0.5]; } 
            else if (this.config.direction === "RL") { line.startBinding.fixedPoint = [0.0, 0.5]; line.endBinding.fixedPoint = [1.0, 0.5]; } 
            else if (this.config.direction === "TD") { line.startBinding.fixedPoint = [0.5, 1.0]; line.endBinding.fixedPoint = [0.5, 0.0]; } 
            else if (this.config.direction === "BU") { line.startBinding.fixedPoint = [0.5, 0.0]; line.endBinding.fixedPoint = [0.5, 1.0]; }
        } else {
            delete line.startBinding.fixedPoint; delete line.startBinding.mode;
            delete line.endBinding.fixedPoint; delete line.endBinding.mode;
        }

        let childConnX = childNode.el.x; let childConnY = childNode.el.y + childNode.el.height / 2;
        if (this.config.direction === "RL") childConnX = childNode.el.x + childNode.el.width;
        else if (this.config.direction === "TD") { childConnX = childNode.el.x + childNode.el.width / 2; childConnY = childNode.el.y; }
        else if (this.config.direction === "BU") { childConnX = childNode.el.x + childNode.el.width / 2; childConnY = childNode.el.y + childNode.el.height; }

        const dx = childConnX - line.x; const dy = childConnY - line.y;
        if (this.config.arrowType === "elbow") {
            line.elbowed = true;
            if (this.isHorizontal()) { line.points = [[0, 0], [dx / 2, 0], [dx / 2, dy], [dx, dy]]; } 
            else { line.points = [[0, 0], [0, dy / 2], [dx, dy / 2], [dx, dy]]; }
        } else {
            line.elbowed = false; const isAligned = this.isHorizontal() ? Math.abs(dy) < 1 : Math.abs(dx) < 1;
            if (line.customData?.curveArrow || parentNode.children.length === 1 || isAligned) {
                line.points = [ [0, 0], [dx, dy] ];
            } else {
                if (this.isHorizontal()) { line.points = [ [0, 0], [dx * 0.4, dy * 0.8905], [dx, dy] ]; } 
                else { line.points = [ [0, 0], [dx * 0.8905, dy * 0.4], [dx, dy] ]; }
            }
        }
        this.changedElementsSet.add(line);
    }
}

window.MindmapAPI = {
    runLayout: async (sceneElements, commitToHistory = false) => {
        const rootEl = sceneElements.find(el => el.customData?.mindmap?.root === el.id);
        const rootSettings = rootEl?.customData?.mindmap?.settings || DEFAULT_SETTINGS;

        const layouter = new MindMapLayouter(sceneElements, {
            direction: rootSettings.direction || "LR", arrowType: rootSettings.arrowType || "normal", enableFixedPoint: rootSettings.enableFixedPoint ?? true,
            defaultGap: Number(rootSettings.defaultGap ?? 10), curveLength: Number(rootSettings.curveLength ?? 40), lengthBetweenElAndLine: Number(rootSettings.lengthBetweenElAndLine ?? 100),
        });
        layouter.runLayout();
        const changedElements = Array.from(new Set([...layouter.changedElementsSet, ...sceneElements]));
        const notArrowEls = changedElements.filter((el) => el.type !== "arrow");
        const arrowEls = changedElements.filter((el) => el.type === "arrow");
        if (notArrowEls.length > 0) {
            ea.clear(); ea.copyViewElementsToEAforEditing(notArrowEls);
            await ea.addElementsToView(false, false, commitToHistory, false, "EVENTUALLY");
        }
        if (arrowEls.length > 0) {
            ea.clear(); ea.copyViewElementsToEAforEditing(arrowEls);
            await ea.addElementsToView(false, false, commitToHistory, false, "EVENTUALLY"); ea.clear();
        }
    }
};

const handlePointerMove = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { App, scenePointer } = context; if (!App || !scenePointer) return false;
    const hitMindmapElement = findHitMindmapElement(App, scenePointer, ea);
    if (hitMindmapElement) {
        if (App.interactiveCanvas) App.interactiveCanvas.style.cursor = "pointer";
        MindmapState.hoveredMindmapElement = hitMindmapElement; return true; 
    }
    MindmapState.hoveredMindmapElement = null; return false;
};

const handlePointerUp = async (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    // view=app.workspace.getActiveFileView();
    // ea=window.ExcalidrawAutomate.getAPI(view)
    const { App, event, scenePointer } = context;
    const elementsMap = App?.scene?.getNonDeletedElementsMap?.(); const allElements = App?.scene?.getNonDeletedElements();
    const selectedEls = App.scene.getSelectedElements(App.state); const mainSelectedEls = selectedEls.filter(el => !el.containerId);

    if (mainSelectedEls.length === 1) {
        const draggedEl = mainSelectedEls[0];
        if (draggedEl.customData?.mindmap && draggedEl.customData.mindmap.root === draggedEl.id) { } 
        else {
            const targetEl = allElements.find(el => el.id !== draggedEl.id && el.customData?.mindmap && checkOverlap(draggedEl, el) && !isDescendant(draggedEl.id, el.id, elementsMap) );
            if (targetEl) {
                if (event && typeof event.preventDefault === "function") { event.preventDefault(); event.stopPropagation(); }
                const rootId = targetEl.customData?.mindmap?.root || targetEl.id; const rootEl = elementsMap.get(rootId);
                const direction = rootEl?.customData?.mindmap?.settings?.direction || "LR";
                const dropZone = getDropZone(draggedEl, targetEl, direction);

                ea.viewUpdateScene({ appState: { selectedElementIds: {}, selectedGroupIds: {}, editingGroupId: null, activeEmbeddable: null, selectedElementsAreBeingDragged: false, draggingElement: null, cursorButton: "up" }, captureUpdate: "NEVER" });
                if (App.interactiveCanvas) App.interactiveCanvas.style.cursor = "";

                setTimeout(async () => { await attachNodeToMindmap(draggedEl, targetEl, dropZone, App); if (App.interactiveCanvas) App.interactiveCanvas.style.cursor = ""; }, 10);
                return true;
            }
        }
    }

    const targetElement = findHitMindmapElement(App, scenePointer, ea) || MindmapState.hoveredMindmapElement;
    if (ea?.plugin?.settings?.mindmapHandle && targetElement) {
        if (event && typeof event.preventDefault === "function") { event.preventDefault(); event.stopPropagation(); }
        const element = targetElement;
        ea.viewUpdateScene({ appState: { selectedElementIds: [], selectedGroupIds: {}, editingGroupId: null, activeEmbeddable: null } });
        const elements = App.scene.getNonDeletedElements();
        
        let mindmap = MindmapState.mindmapPosMap.get(element.customData.mindmap.root);
        let currentNode = mindmap ? mindmap.NodeMap.get(element.id) : null;
        
        if (!MindmapState.mindmapPosMap.get(element.customData.mindmap.root) || (currentNode && !currentNode?.children?.length)) {
            const rootEl = elementsMap?.get(element.customData.mindmap.root);
            mindmap = new Mindmap(elements, element); mindmap.setElements(elements, elementsMap); mindmap.buildNodeTree(rootEl, null, 1, null);
            MindmapState.mindmapPosMap.set(element.customData.mindmap.root, mindmap);
        } else { mindmap.setElements(elements, elementsMap); }
        
        currentNode = mindmap.NodeMap.get(element.id);
        const isCtrl = event?.ctrlKey; 
        let recursion = element.customData.mindmap.status === "open" ? true : isCtrl;
        let visiable = element.customData.mindmap.status === "open" ? false : true;
        let status = element.customData.mindmap.status === "open" ? "close" : "open";
        
        await mindmap.changeVisibility(element, currentNode, recursion, visiable, status);
        const rootNode = mindmap.NodeMap.get(mindmap.rootId);
        const [children, arrows] = mindmap.getChildren(rootNode, true, (el) => mindmap.elementsMap?.get(el.id)?.customData?.hide);
        
        const rawItems = [...children, ...arrows, rootNode, element];
        const treeElements = getExpandedTreeElements(rawItems, elementsMap, elements);
        mindmap.clearElements(); await window.MindmapAPI.runLayout(treeElements, false); return true; 
    }
    return false;
};

const handleKeyDown = (context) => {
    const { App, event, ea, api } = context;
    if (!ea || !api) return;

    const selectedEls = ea.getViewSelectedElements();
    if (!selectedEls.length) return false;
    const selectedEl = selectedEls.find(el => !el.containerId) || selectedEls[0];

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code) && selectedEl.customData?.mindmap) {
        const elementsMap = App.scene.getNonDeletedElementsMap(); const elements = App.scene.getNonDeletedElements();
        const mindmap = new Mindmap(elements, selectedEl); const rootEl = elementsMap.get(selectedEl.customData.mindmap.root);
        mindmap.setElements(elements, elementsMap); mindmap.buildNodeTree(rootEl, null, 1, null);
        
        const node = mindmap.NodeMap.get(selectedEl.id); if (!node) return false;

        let targetNode = null; const direction = rootEl?.customData?.mindmap?.settings?.direction || "LR";

        if (direction === "LR" || direction === "RL") {
            if (event.code === "ArrowLeft") targetNode = direction === "LR" ? node.parent : node.children.find(c => !elementsMap.get(c.id)?.customData?.hide);
            if (event.code === "ArrowRight") targetNode = direction === "LR" ? node.children.find(c => !elementsMap.get(c.id)?.customData?.hide) : node.parent;
            if (event.code === "ArrowUp" || event.code === "ArrowDown") {
                let sameLevelNodes = Array.from(mindmap.NodeMap.values()).filter(n => { const el = elementsMap.get(n.id); return n.level === node.level && el && !el.customData?.hide; });
                sameLevelNodes.sort((a, b) => { const elA = elementsMap.get(a.id); const elB = elementsMap.get(b.id); return (elA ? elA.y + elA.height / 2 : 0) - (elB ? elB.y + elB.height / 2 : 0); });
                const idx = sameLevelNodes.findIndex(s => s.id === node.id);
                if (event.code === "ArrowUp" && idx > 0) targetNode = sameLevelNodes[idx - 1];
                if (event.code === "ArrowDown" && idx < sameLevelNodes.length - 1) targetNode = sameLevelNodes[idx + 1];
            }
        }
        event.preventDefault(); event.stopPropagation();
        if (targetNode) ea.viewUpdateScene({ appState: { selectedElementIds: { [targetNode.id]: true } } });
        return true;
    }
    
    if (["Tab", "Enter"].includes(event.code)) {
        const elements = ea.getViewElements();
        let elementsMap = App?.scene?.getNonDeletedElementsMap?.() || elements.reduce((acc, el) => acc.set(el.id, el), new Map());
        elements.forEach(el => elementsMap.set(el.id, el));
        
        if (selectedEl?.customData?.mindmap) {
            event.preventDefault(); event.stopPropagation();
            (async () => {
                let mindmap = MindmapState.mindmapPosMap.get(selectedEl.customData.mindmap.root); const rootEl = elementsMap?.get(selectedEl.customData.mindmap.root);
                if (!mindmap || !(mindmap.NodeMap.get(selectedEl.id)?.children?.length)) {
                    mindmap = new Mindmap(elements, selectedEl); mindmap.setElements(elements, elementsMap); mindmap.buildNodeTree(rootEl, null, 1, null);
                    MindmapState.mindmapPosMap.set(selectedEl.customData.mindmap.root, mindmap);
                } else { mindmap.setElements(elements, elementsMap); }
                const currentNode = mindmap.NodeMap.get(selectedEl.id); const rootNode = mindmap.NodeMap.get(mindmap.rootId);
                
                const [newEl, newEls] = await mindmap.addNewNode(selectedEl, currentNode, event.code === "Enter" ? "same" : "next", App.state);
                const [children, arrows] = mindmap.getChildren(rootNode, true, (el) => ea.getElement(el.id)?.customData?.hide);
                
                ea.selectElementsInView([newEl]); setTimeout(() => App.startTextEditing({ sceneX: 0, sceneY: 0, container: newEl }), 0);
                
                const rawItems = [...children, ...arrows, rootNode, ...newEls];
                const treeElements = getExpandedTreeElements(rawItems, elementsMap, elements);
                await window.MindmapAPI.runLayout(treeElements, true); mindmap.clearElements();
            })();
            return true;
        }
    }

    if ((event.key === "/" || event.key === "?") && selectedEl.customData?.mindmap) {
        event.preventDefault(); event.stopPropagation();
        (async () => {
            const elementsMap = App.scene.getNonDeletedElementsMap(); const elements = App.scene.getNonDeletedElements();
            let mindmap = MindmapState.mindmapPosMap.get(selectedEl.customData.mindmap.root);
            if (!mindmap || !(mindmap.NodeMap.get(selectedEl.id)?.children?.length)) {
                const rootEl = elementsMap?.get(selectedEl.customData.mindmap.root);
                mindmap = new Mindmap(elements, selectedEl); mindmap.setElements(elements, elementsMap); mindmap.buildNodeTree(rootEl, null, 1, null);
                MindmapState.mindmapPosMap.set(selectedEl.customData.mindmap.root, mindmap);
            } else { mindmap.setElements(elements, elementsMap); }

            const currentNode = mindmap.NodeMap.get(selectedEl.id); if (!currentNode || !currentNode.children.length) return;
            const isCtrl = event.ctrlKey || event.metaKey; const recursion = selectedEl.customData.mindmap.status === "open" ? true : isCtrl;
            const visiable = selectedEl.customData.mindmap.status === "open" ? false : true; const status = selectedEl.customData.mindmap.status === "open" ? "close" : "open";
            await mindmap.changeVisibility(selectedEl, currentNode, recursion, visiable, status);
            const rootNode = mindmap.NodeMap.get(mindmap.rootId);
            const [children, arrows] = mindmap.getChildren(rootNode, true, (el) => mindmap.elementsMap?.get(el.id)?.customData?.hide);
            const rawItems = [...children, ...arrows, rootNode, selectedEl];
            const treeElements = getExpandedTreeElements(rawItems, elementsMap, elements);
            mindmap.clearElements(); await window.MindmapAPI.runLayout(treeElements, false);
        })();
        return true;
    }
    return false;
};

const handlePointerDown = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { App, event, scenePointer } = context;
    const hitMindmapElement = findHitMindmapElement(App, scenePointer, ea) || MindmapState.hoveredMindmapElement;
    if (ea?.plugin?.settings?.mindmapHandle && hitMindmapElement) {
        if (event && typeof event.preventDefault === "function") { event.preventDefault(); event.stopPropagation(); } return true; 
    } return false;
};

const handleElementsDragged = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { selectedElements, scene } = context; const elementsMap = scene?.getNonDeletedElementsMap?.();
    selectedElements.forEach((el) => {
        if (el?.customData?.mindmap) {
            const rootEl = elementsMap?.get(el.customData.mindmap.root);
            if (rootEl?.customData?.mindmap?.settings?.arrowType == 'normal')  {
                el.boundElements?.forEach(boundElement => {
                    if (boundElement.type == "arrow") {
                        const be = elementsMap?.get(boundElement.id);
                        if (be && be.points && be.points.length >= 3) {
                            if (be.startBinding?.elementId == el.id || be.endBinding?.elementId == el.id) {
                                const newPoints = be.points.map(p => [...p]);
                                newPoints[1][0] = 0.4 * (newPoints[2][0] - newPoints[0][0]);  newPoints[1][1] = (newPoints[2][1] - newPoints[0][1]) * 0.8905; be.points = newPoints;
                            }
                        }
                    }
                });
            }
        }
    }); return false;
};

const handleElementsDeleted = async (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { elements, appState, App } = context; ea.setView("active");
    const selectedEls = ea.getViewSelectedElements(); const elementsMap = App?.scene?.getNonDeletedElementsMap?.();
    function deleteOrphan(node, ea, ea) {
        if (node) { let el = elementsMap?.get(node.id); if (el?.customData?.mindmap) { delete el.customData.mindmap; node.children.forEach(n => deleteOrphan(n, ea)); } }
    }
    let elementsToUpdate = []; let arrowsToDelete = []; let affectedRoots = new Set();
    selectedEls.forEach(el => {
        if (el?.customData?.mindmap && el.id != el.customData.mindmap.root) {
            const rootId = el.customData.mindmap.root; const mindmap = MindmapState.mindmapPosMap.get(rootId);
            if (!mindmap) return; affectedRoots.add(rootId); mindmap.setElements(elements, elementsMap);
            const node = mindmap.NodeMap.get(el.id); const parentNode = node?.parent; if (!parentNode) return;
            let deleteArrow; let arrows = [];
            parentNode.childrenArrow.map(arrEl => elementsMap?.get(arrEl.id)).forEach(arrow => {
                if (arrow?.endBinding?.elementId) { if (arrow.endBinding.elementId != node.id) arrows.push(arrow); else deleteArrow = arrow; }
            });
            parentNode.childrenArrow = arrows; let children = new Set(parentNode.children); children.delete(node); parentNode.children = [...children];
            node.children.forEach(child => deleteOrphan(child, ea));
            ea.clear(); mindmap.NodeMap.delete(node.id);
            if (deleteArrow) {
                appState.selectedElementIds[deleteArrow.id] = true; arrowsToDelete.push(deleteArrow);
                const parentEl = elementsMap?.get(parentNode.id);
                if (parentEl?.boundElements?.length > 0) {
                    const newBoundElements = parentEl.boundElements.filter(b => !(b.type == "arrow" && b.id == deleteArrow.id));
                    parentEl.boundElements = newBoundElements.length > 0 ? newBoundElements : null; elementsToUpdate.push(parentEl);
                }
            }
        }
    });
    if (arrowsToDelete.length > 0 || elementsToUpdate.length > 0) {
        ea.clear(); ea.copyViewElementsToEAforEditing([...arrowsToDelete, ...elementsToUpdate]);
        ea.getElements().forEach(el => { if (el.type === "arrow" && arrowsToDelete.some(a => a.id === el.id)) el.isDeleted = true; });
        await ea.addElementsToView(false, false, false);
    }
    for (const rootId of affectedRoots) {
        const mindmap = MindmapState.mindmapPosMap.get(rootId);
        if (mindmap) {
            const rootNode = mindmap.NodeMap.get(rootId);
            if (rootNode) {
                const [children, arrows] = mindmap.getChildren(rootNode, true, (el) => mindmap.elementsMap?.get(el.id)?.customData?.hide);
                const rawItems = [...children, ...arrows, rootNode];
                const treeElements = getExpandedTreeElements(rawItems, elementsMap, elements).filter(el => el && !selectedEls.some(sel => sel.id === el.id) && !arrowsToDelete.some(a => a.id === el.id));
                mindmap.clearElements(); await window.MindmapAPI.runLayout(treeElements, true);
            }
        }
    }
    return false;
};

// 性能优化重点：每帧高频触发钩子，彻底剥离 filter, map, some 等返回新数组的方法
const handleMindmapRender = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { appState, elementsMap, visibleElements, context } = contextPayload;
    try {
        for (let i = 0; i < visibleElements.length; i++) {
            const element = visibleElements[i];
            if (element?.customData?.hide || !element?.customData?.mindmap || ["arrow", "line"].includes(element.type)) continue;
            if (!ExcalidrawAutomate.plugin.settings.mindmapHandle) continue;

            let hasStartArrow = false;
            let isCollapsed = false;

            if (element.boundElements) {
                for (let j = 0; j < element.boundElements.length; j++) {
                    const bound = element.boundElements[j];
                    if (bound.type === "arrow") {
                        const arrowEl = elementsMap.get(bound.id);
                        if (arrowEl && arrowEl.startBinding?.elementId === element.id) {
                            hasStartArrow = true;
                            if (arrowEl.customData?.hide) isCollapsed = true;
                            break; 
                        }
                    }
                }
            }

            if (!hasStartArrow) continue;

            context.save(); context.globalAlpha = 1;
            const rootEl = elementsMap?.get(element.customData.mindmap.root);
            let [x1, y1, x2, y2] = getElementAbsoluteCoords(element);
            const cx = ((x1 + x2) / 2 + appState.scrollX); const cy = ((y1 + y2) / 2 + appState.scrollY);
            let shiftX = (x2 - x1) / 2 - (element.x - x1); let shiftY = (y2 - y1) / 2 - (element.y - y1);
            
            context.scale(appState.zoom.value, appState.zoom.value); context.translate(cx, cy); context.rotate(element.angle);
            const direction = rootEl?.customData?.mindmap?.settings?.direction || "LR";
            switch (direction) {
                case "LR": context.translate(shiftX, 0); break;
                case "RL": context.translate(-shiftX, 0); break;
                case "TD": context.translate(0, shiftY); break;
                case "BU": context.translate(0, -shiftY); break;
                default: context.translate(shiftX, 0); break;
            }

            context.beginPath(); context.arc(0, 0, 10, 0, 2 * Math.PI, false); context.fillStyle = '#ffd8a8'; context.fill(); context.lineWidth = 3; context.strokeStyle = '#ffa94d';

            if (isCollapsed) {
                context.stroke(); const mindmap = MindmapState.mindmapPosMap.get(element.customData.mindmap.root); const num = mindmap?.NodeMap?.get(element.id)?.children?.length;
                if (num) { context.fillStyle = "#f08c00"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(num, 0, 0); } 
                else { context.beginPath(); context.moveTo(-5, 0); context.lineTo(5, 0); context.moveTo(0, -5); context.lineTo(0, 5); context.stroke(); }
            } else { context.moveTo(-5, 0); context.lineTo(5, 0); context.stroke(); }
            context.restore();
        }
    } catch (e) { console.error(`[Feature: MindmapRender] Error:`, e); }
    return false; 
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(`[${SCRIPT_ID}] EA_Core 未运行`);
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerMove', handlePointerMove, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerUp', handlePointerUp, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerDown', handlePointerDown, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'onKeyDown', handleKeyDown, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'dragSelectedElements', handleElementsDragged, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'deleteSelectedElements', handleElementsDeleted, 50);
    window.EA_Core.registerHook(SCRIPT_ID, '_renderInteractiveScene', handleMindmapRender, 50);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID); MindmapState.mindmapPosMap.clear();
            ea.getExcalidrawAPI()?.updateScene({ appState: { ...ea.getExcalidrawAPI().getAppState() } });
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}


mountFeature();


