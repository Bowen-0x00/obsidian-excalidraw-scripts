---
name: 模拟表格核心引擎
description: 后台引擎：提供表格行列拖拽大小同步、边界约束、文本换行自适应及 Tab 键快速切换单元格功能。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，专门处理 customData.table 数据结构元素的交互行为。
features:
  - 拦截 handleTextWysiwyg 监听输入，实现单元格文本换行时整行高度自适应及下方行自动排版
  - 拦截 afterTransformElements 实现表格宽高联动
  - 拦截 dragSelectedElements 限制特定连线行为并支持绑定框拖拽
  - 拦截 onKeyDown 实现 Tab/Shift+Tab 在表格单元格间光标穿梭
dependencies:
  - 无
autorun: true
---
/*
```javascript
*/
var locales = {
    zh: {
        log_unmounted: "[{id}] 🔌 模拟表格引擎已卸载",
        log_mounted: "[{id}] 🚀 模拟表格引擎挂载完毕"
    },
    en: {
        log_unmounted: "[{id}] 🔌 Table Engine Unmounted",
        log_mounted: "[{id}] 🚀 Table Engine Mounted"
    }
};

const SCRIPT_ID = "ymjr.feature.table-engine";

// ==========================================
// 1. 核心布局算法：处理输入换行时的高度同步
// ==========================================
const syncTableLayout = (triggerContainerId, api, ea, captureHistory = false) => {
    const elements = api.getSceneElements();
    const triggerEl = elements.find(e => e.id === triggerContainerId);
    if (!triggerEl || !triggerEl.customData?.table) return;

    let tableEls = ea.getElementsInTheSameGroupWithElement(triggerEl, elements).filter(el => el?.customData?.table);
    if (tableEls.length === 0) return;

    let changedEls = new Map();
    let rows = {};

    // 按行进行分组
    tableEls.forEach(el => {
        const r = el.customData.table.row;
        if (!rows[r]) rows[r] = [];
        rows[r].push(JSON.parse(JSON.stringify(el)));
    });

    const editedRowIndex = triggerEl.customData.table.row;
    if (!rows[editedRowIndex]) return;

    // 1. 获取当前行被文本撑开的最大高度
    let maxHeight = 0;
    rows[editedRowIndex].forEach(el => {
        // Excalidraw 已经原生更新了 triggerEl 的高度，找到当前行的最大值
        if (el.height > maxHeight) maxHeight = el.height;
    });

    // 2. 同步当前行的所有单元格高度
    rows[editedRowIndex].forEach(el => {
        if (Math.abs(el.height - maxHeight) > 0.5) {
            el.height = maxHeight;
            changedEls.set(el.id, el);
        }
    });

    // 3. 将受影响的下方所有行按新高度依次向下推演
    const totalRows = triggerEl.customData.table.rowNum;
    for (let r = editedRowIndex + 1; r < totalRows; r++) {
        if (!rows[r] || !rows[r - 1]) continue;
        
        const refCell = rows[r - 1][0];
        const expectedY = refCell.y + refCell.height;

        rows[r].forEach(el => {
            if (Math.abs(el.y - expectedY) > 0.5) {
                el.y = expectedY;
                changedEls.set(el.id, el);
            }
        });
    }

    // 4. 提交视图更新
    if (changedEls.size > 0) {
        const newElements = elements.map(el => changedEls.has(el.id) ? changedEls.get(el.id) : el);
        // 输入过程中使用 "none" 避免撤销栈爆炸，失焦时才 capture
        api.updateScene({ elements: newElements, storeAction: captureHistory ? "capture" : "none" });
    }
};

// ==========================================
// 2. 文本编辑 Hook (监听输入动态排版)
// ==========================================
const handleTextWysiwyg = (context) => {
    const { ea, api, element } = context;
    if (!ea || !api) return;

    const textarea = ea.targetView?.contentEl?.querySelector('textarea.excalidraw-wysiwyg');
    if (!textarea) return;

    // 获取正在编辑的文本元素绑定的单元格容器 ID
    const containerId = element?.containerId;
    if (!containerId) return;

    const elements = api.getSceneElements();
    const container = elements.find(e => e.id === containerId);
    if (!container?.customData?.table) return;

    if (!textarea._hasTableSyncListener) {
        const syncFn = (capture) => {
            // 设置微小延迟，确保 Excalidraw 原生引擎已完成本轮高度计算
            setTimeout(() => {
                syncTableLayout(containerId, api, ea, capture);
            }, 50);
        };

        // 监听实时打字换行
        textarea.addEventListener('input', () => syncFn(false));
        // 监听结束编辑完成
        textarea.addEventListener('blur', () => syncFn(true));
        
        textarea._hasTableSyncListener = true;
    }
};

// ==========================================
// 3. 大小变换 Hook (行列缩放同步)
// ==========================================
const handleAfterTransform = async (context) => {
    const { ea, api, transformHandleType, selectedElements } = context;
    if (!ea || !api || !selectedElements || selectedElements.length === 0) return;

    let selectedElement = selectedElements[0];

    // 表格行列大小同步逻辑
    if (selectedElement?.customData?.table && ['n', 's', 'w', 'e'].includes(transformHandleType)) {
        const elements = api.getSceneElements();
        let tableEls = ea.getElementsInTheSameGroupWithElement(selectedElement, elements).filter(el => el?.customData?.table);
        
        let changedEls = [];
        let elsToModify = tableEls.map(el => JSON.parse(JSON.stringify(el)));

        elsToModify.forEach((el) => {
            switch(transformHandleType) {
                case "n":
                case "s": {
                    if (el.customData.table.row === selectedElement.customData.table.row) {
                        el.y = selectedElement.y;
                        el.height = selectedElement.height;
                        changedEls.push(el);
                    }
                    if (transformHandleType === "n") {
                        if (selectedElement.customData.table.row > 0 && el.customData.table.row === selectedElement.customData.table.row - 1) {
                            el.height = selectedElement.y - el.y;
                            changedEls.push(el);
                        }
                    } else {
                        if (selectedElement.customData.table.row < selectedElement.customData.table.rowNum - 1 && el.customData.table.row === selectedElement.customData.table.row + 1) {
                            el.height = el.y + el.height - (selectedElement.y + selectedElement.height);
                            el.y = selectedElement.y + selectedElement.height;
                            changedEls.push(el);
                        }
                    }
                    break;
                }
                case "e":
                case "w": {
                    if (el.customData.table.col === selectedElement.customData.table.col) { 
                        el.x = selectedElement.x;
                        el.width = selectedElement.width;
                        changedEls.push(el);
                    }
                    if (transformHandleType === "e") {
                        if (selectedElement.customData.table.col < selectedElement.customData.table.colNum - 1 && el.customData.table.col === selectedElement.customData.table.col + 1) {
                            el.width = el.x + el.width - (selectedElement.x + selectedElement.width);
                            el.x = selectedElement.x + selectedElement.width;
                            changedEls.push(el);
                        }
                    } else {
                        if (selectedElement.customData.table.col > 0 && el.customData.table.col === selectedElement.customData.table.col - 1) {
                            el.width = selectedElement.x - el.x;
                            changedEls.push(el);
                        }
                    }
                    break;
                }
            }
        });

        if (changedEls.length > 0) {
            const idsMap = Object.fromEntries(changedEls.map(el => [el.id, el]));
            const newElements = elements.map(el => idsMap[el.id] ? idsMap[el.id] : el);
            await api.updateScene({ elements: newElements, storeAction: "capture" });
        }
    }

    // 边界框 (Bound) 调整逻辑
    if (selectedElements.some(el => el?.customData?.bound)) {
        let elements = api.getSceneElements();
        let containerEl = elements.find(el => el.id === selectedElement?.customData?.bound.id);
        if (!containerEl) return;
        
        containerEl = JSON.parse(JSON.stringify(containerEl));
        let groupElements = ea.getElementsInTheSameGroupWithElement(selectedElement, elements);
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        groupElements.forEach((el) => {
            let xx = el.x, yy = el.y, maxxx = el.x + el.width, maxyy = el.y + el.height;
            if (el.type === 'line') {
                xx = el.x + Math.min(...(el.points.map(p => p[0])));
                maxxx = el.x + Math.max(...(el.points.map(p => p[0])));
                yy = el.y + Math.min(...(el.points.map(p => p[1])));
                maxyy = el.y + Math.max(...(el.points.map(p => p[1])));
            }
            if (xx < minX) minX = xx;
            if (maxxx > maxX) maxX = maxxx;
            if (yy < minY) minY = yy;
            if (maxyy > maxY) maxY = maxyy;
        });

        containerEl.x = minX - 10;
        containerEl.y = minY - 10;
        containerEl.width = (maxX - minX) + 20;
        containerEl.height = (maxY - minY) + 20;
        containerEl.angle = selectedElement.angle;

        const newElements = elements.map(el => el.id === containerEl.id ? containerEl : el);
        await api.updateScene({ elements: newElements });
    }
};

// ==========================================
// 4. 拖拽 Hook (特定属性与绑定约束)
// ==========================================
const handleDragSelected = (context) => {
    const { ea, api, selectedElements, elementsToUpdate, scene } = context;
    if (!ea || !api) return;

    elementsToUpdate.forEach(el => {
        if (el?.customData?.connectionShape) elementsToUpdate.delete(el);
    });

    const elementsMap = scene?.getNonDeletedElementsMap?.();
    selectedElements.forEach((el) => {
        if (el?.customData?.mindmap) {
            const rootEl = elementsMap?.get(el.customData.mindmap.root);
            if (rootEl?.customData?.mindmap?.style.arrowType === 'normal') {
                el.boundElements?.forEach(bound => {
                    if (bound.type === "arrow") {
                        const be = elementsMap?.get(bound.id);
                        if (be?.startBinding?.elementId === el.id || be?.endBinding?.elementId === el.id) {
                            be.points[1][0] = 0.4 * (be.points[2][0] - be.points[0][0]);
                            be.points[1][1] = (be.points[2][1] - be.points[0][1]) * 0.8905;
                        }
                    }
                });
            }
        }
    });

    if (selectedElements.length === 1 && selectedElements[0]?.customData?.table) return true;
};

// ==========================================
// 5. 按键 Hook (Tab键在单元格间穿梭)
// ==========================================
const handleTableKeyDown = (context) => {
    const { App, event, ea, api } = context;
    if (!ea || !api || !event || !App) return false;

    // 当且仅当在表格单元格内编辑文本时，按下 Tab 键拦截跳跃
    if (event.code === "Tab" && App.state?.editingTextElement) {
        const currentEl = App.state.editingTextElement;
        const currentTableData = currentEl?.customData?.table;
        if (!currentTableData) return false;

        event.preventDefault(); // 阻止原生行为
        
        const elements = api.getSceneElements();
        const tableGroup = ea.getElementsInTheSameGroupWithElement(currentEl, elements).filter(el => el?.customData?.table);
        
        let nextRow = currentTableData.row;
        let nextCol = currentTableData.col + (event.shiftKey ? -1 : 1);

        // 自动换行或换列
        if (nextCol >= currentTableData.colNum) {
            nextCol = 0;
            nextRow = (nextRow + 1) % currentTableData.rowNum;
        } else if (nextCol < 0) {
            nextCol = currentTableData.colNum - 1;
            nextRow = (nextRow - 1 + currentTableData.rowNum) % currentTableData.rowNum;
        }

        const nextEl = tableGroup.find(el => el.customData.table.row === nextRow && el.customData.table.col === nextCol);
        
        if (nextEl) {
            // 退出当前编辑，焦点转移到下一个单元格
            const textEditorContainer = ea.targetView?.contentEl?.querySelector(".excalidraw-textEditorContainer");
            const editable = textEditorContainer?.firstChild;
            if (editable && typeof editable.onblur === 'function') editable.onblur();

            setTimeout(() => {
                ea.selectElementsInView([nextEl]);
                App.startTextEditing({ sceneX: 0, sceneY: 0, container: nextEl });
            }, 50);
            return true;
        }
    }
    return false;
};

// ==========================================
// 6. 生命周期注册
// ==========================================
async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core Engine Not Found");
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'handleTextWysiwyg', handleTextWysiwyg, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'afterTransformElements', handleAfterTransform, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'dragSelectedElements', handleDragSelected, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'onKeyDown', handleTableKeyDown, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();