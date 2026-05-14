---
name: 模拟表格核心引擎
description: 后台引擎：提供表格行列拖拽大小同步、边界约束、文本换行自适应及 Tab/方向键快速切换单元格功能。支持免编组(Group)全局识别。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，专门处理 customData.table 数据结构元素的交互行为。
features:
  - 拦截 handleTextWysiwyg 监听输入，实现单元格文本换行时整行高度自适应及下方行自动排版
  - 拦截 afterTransformElements 实现表格宽高联动
  - 拦截 dragSelectedElements 限制特定连线行为并支持绑定框拖拽
  - 拦截 onKeyDown 实现 Tab/Shift+Tab 以及 上下左右方向键 在表格单元格间光标穿梭
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
// 工具函数：全局获取同属一个表格的单元格
// ==========================================
const getGlobalTableElements = (elements, referenceData) => {
    return elements.filter(el => {
        const tData = el?.customData?.table;
        if (!tData) return false;
        if (referenceData.id && tData.id) {
            return tData.id === referenceData.id;
        }
        return true; 
    });
};

// ==========================================
// 工具函数：强制提升元素版本以打破 Excalidraw 缓存渲染机制 (核心修复点)
// ==========================================
const bumpVersion = (el) => {
    el.version = (el.version || 0) + 1;
    el.versionNonce = Math.floor(Math.random() * 1000000000);
    return el;
};

// ==========================================
// 工具函数：同步更新容器内绑定的文本位置
// ==========================================
const updateBoundTextElements = (container, elements, changedElsMapOrArray) => {
    if (!container.boundElements || container.boundElements.length === 0) return;
    
    container.boundElements.forEach(bound => {
        if (bound.type === "text") {
            let textEl = elements.find(e => e.id === bound.id);
            if (textEl) {
                textEl = JSON.parse(JSON.stringify(textEl));
                
                const padding = 5;

                // 1. 水平对齐计算
                if (textEl.textAlign === "left") {
                    textEl.x = container.x + padding;
                } else if (textEl.textAlign === "right") {
                    textEl.x = container.x + container.width - textEl.width - padding;
                } else { 
                    textEl.x = container.x + container.width / 2 - textEl.width / 2;
                }

                // 2. 垂直对齐计算
                if (textEl.verticalAlign === "top") {
                    textEl.y = container.y + padding;
                } else if (textEl.verticalAlign === "bottom") {
                    textEl.y = container.y + container.height - textEl.height - padding;
                } else { 
                    textEl.y = container.y + container.height / 2 - textEl.height / 2;
                }

                // ⭐️ 核心修复：更新坐标后必须提升版本，否则 Excalidraw 渲染引擎会无视更改
                bumpVersion(textEl);

                if (changedElsMapOrArray instanceof Map) {
                    changedElsMapOrArray.set(textEl.id, textEl);
                } else if (Array.isArray(changedElsMapOrArray)) {
                    changedElsMapOrArray.push(textEl);
                }
            }
        }
    });
};

// ==========================================
// 1. 核心布局算法：处理输入换行时的高度同步
// ==========================================
const syncTableLayout = (triggerContainerId, api, ea, captureHistory = false) => {
    const elements = api.getSceneElements();
    const triggerEl = elements.find(e => e.id === triggerContainerId);
    if (!triggerEl || !triggerEl.customData?.table) return;

    let tableEls = getGlobalTableElements(elements, triggerEl.customData.table);
    if (tableEls.length === 0) return;

    let changedEls = new Map();
    let rows = {};

    tableEls.forEach(el => {
        const r = el.customData.table.row;
        if (!rows[r]) rows[r] = [];
        rows[r].push(JSON.parse(JSON.stringify(el)));
    });

    const editedRowIndex = triggerEl.customData.table.row;
    if (!rows[editedRowIndex]) return;

    let maxHeight = 0;
    rows[editedRowIndex].forEach(el => {
        if (el.height > maxHeight) maxHeight = el.height;
    });

    rows[editedRowIndex].forEach(el => {
        if (Math.abs(el.height - maxHeight) > 0.5) {
            el.height = maxHeight;
            bumpVersion(el); // 提升容器版本
            changedEls.set(el.id, el);
            updateBoundTextElements(el, elements, changedEls);
        }
    });

    const totalRows = triggerEl.customData.table.rowNum;
    for (let r = editedRowIndex + 1; r < totalRows; r++) {
        if (!rows[r] || !rows[r - 1]) continue;
        
        const refCell = rows[r - 1][0];
        const expectedY = refCell.y + refCell.height;

        rows[r].forEach(el => {
            if (Math.abs(el.y - expectedY) > 0.5) {
                el.y = expectedY;
                bumpVersion(el); // 提升容器版本
                changedEls.set(el.id, el);
                updateBoundTextElements(el, elements, changedEls);
            }
        });
    }

    if (changedEls.size > 0) {
        const newElements = elements.map(el => changedEls.has(el.id) ? changedEls.get(el.id) : el);
        api.updateScene({ elements: newElements, storeAction: captureHistory ? "capture" : "none" });
    }
};

// ==========================================
// 2. 文本编辑 Hook
// ==========================================
const handleTextWysiwyg = (context) => {
    const { ea, api, element } = context;
    if (!ea || !api) return;

    const textarea = ea.targetView?.contentEl?.querySelector('textarea.excalidraw-wysiwyg');
    if (!textarea) return;

    const containerId = element?.containerId;
    if (!containerId) return;

    const elements = api.getSceneElements();
    const container = elements.find(e => e.id === containerId);
    if (!container?.customData?.table) return;

    if (!textarea._hasTableSyncListener) {
        const syncFn = (capture) => {
            setTimeout(() => {
                syncTableLayout(containerId, api, ea, capture);
            }, 50);
        };

        textarea.addEventListener('input', () => syncFn(false));
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

    if (selectedElement?.customData?.table && ['n', 's', 'w', 'e'].includes(transformHandleType)) {
        const elements = api.getSceneElements();
        let tableEls = getGlobalTableElements(elements, selectedElement.customData.table);
        
        let changedEls = [];
        let elsToModify = tableEls.map(el => JSON.parse(JSON.stringify(el)));

        elsToModify.forEach((el) => {
            let isModified = false;
            switch(transformHandleType) {
                case "n":
                case "s": {
                    if (el.customData.table.row === selectedElement.customData.table.row) {
                        el.y = selectedElement.y;
                        el.height = selectedElement.height;
                        isModified = true;
                    }
                    if (transformHandleType === "n") {
                        if (selectedElement.customData.table.row > 0 && el.customData.table.row === selectedElement.customData.table.row - 1) {
                            el.height = selectedElement.y - el.y;
                            isModified = true;
                        }
                    } else {
                        if (selectedElement.customData.table.row < selectedElement.customData.table.rowNum - 1 && el.customData.table.row === selectedElement.customData.table.row + 1) {
                            el.height = el.y + el.height - (selectedElement.y + selectedElement.height);
                            el.y = selectedElement.y + selectedElement.height;
                            isModified = true;
                        }
                    }
                    break;
                }
                case "e":
                case "w": {
                    if (el.customData.table.col === selectedElement.customData.table.col) { 
                        el.x = selectedElement.x;
                        el.width = selectedElement.width;
                        isModified = true;
                    }
                    if (transformHandleType === "e") {
                        if (selectedElement.customData.table.col < selectedElement.customData.table.colNum - 1 && el.customData.table.col === selectedElement.customData.table.col + 1) {
                            el.width = el.x + el.width - (selectedElement.x + selectedElement.width);
                            el.x = selectedElement.x + selectedElement.width;
                            isModified = true;
                        }
                    } else {
                        if (selectedElement.customData.table.col > 0 && el.customData.table.col === selectedElement.customData.table.col - 1) {
                            el.width = selectedElement.x - el.x;
                            isModified = true;
                        }
                    }
                    break;
                }
            }

            // ⭐️ 如果容器被改变了尺寸/坐标，推入数组前先提升版本
            if (isModified) {
                bumpVersion(el);
                changedEls.push(el);
            }
        });

        if (changedEls.length > 0) {
            const textUpdates = [];
            changedEls.forEach(container => {
                updateBoundTextElements(container, elements, textUpdates);
            });
            changedEls.push(...textUpdates);
            
            const idsMap = Object.fromEntries(changedEls.map(el => [el.id, el]));
            const newElements = elements.map(el => idsMap[el.id] ? idsMap[el.id] : el);
            await api.updateScene({ elements: newElements, storeAction: "capture" });
        }
    }

    // 边界框 (Bound) 调整逻辑略 (保持不变)
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
        
        bumpVersion(containerEl); // ⭐️ 边界框也顺手升个级

        const newElements = elements.map(el => el.id === containerEl.id ? containerEl : el);
        await api.updateScene({ elements: newElements });
    }
};

// ==========================================
// 4. 拖拽 Hook 和 5. 按键 Hook 保持原样
// ==========================================
const handleDragSelected = (context) => {
    const { ea, api, selectedElements, elementsToUpdate, scene } = context;
    if (!ea || !api) return;

    elementsToUpdate.forEach(el => {
        if (el?.customData?.connectionShape) elementsToUpdate.delete(el);
    });

    if (selectedElements.length === 1 && selectedElements[0]?.customData?.table) return true;
};

const handleTableKeyDown = (context) => {
    const { App, event, ea, api } = context;
    if (!ea || !api || !event || !App) return false;

    const isEditing = !!App.state?.editingTextElement;
    const elements = api.getSceneElements();

    let tableContainer = null;
    
    if (isEditing) {
        const editingEl = App.state.editingTextElement;
        tableContainer = editingEl.containerId ? elements.find(e => e.id === editingEl.containerId) : editingEl;
    } else {
        const selectedEls = ea.getViewSelectedElements();
        if (selectedEls.length > 0) {
            tableContainer = selectedEls.find(el => el?.customData?.table);
            
            if (!tableContainer) {
                const boundEl = selectedEls.find(el => el.containerId);
                if (boundEl) {
                    tableContainer = elements.find(e => e.id === boundEl.containerId && e?.customData?.table);
                }
            }
            
            if (!tableContainer) {
                const groupIds = selectedEls.flatMap(el => el.groupIds || []);
                if (groupIds.length > 0) {
                    tableContainer = elements.find(el => el?.customData?.table && (el.groupIds || []).some(id => groupIds.includes(id)));
                }
            }
        }
    }

    if (!tableContainer || !tableContainer.customData?.table) return false;
    const currentTableData = tableContainer.customData.table;

    const tableGroup = getGlobalTableElements(elements, currentTableData);

    if (event.code === "Tab") {
        event.preventDefault(); 
        event.stopPropagation();
        
        let nextRow = currentTableData.row;
        let nextCol = currentTableData.col + (event.shiftKey ? -1 : 1);

        if (nextCol >= currentTableData.colNum) {
            nextCol = 0;
            nextRow = (nextRow + 1) % currentTableData.rowNum;
        } else if (nextCol < 0) {
            nextCol = currentTableData.colNum - 1;
            nextRow = (nextRow - 1 + currentTableData.rowNum) % currentTableData.rowNum;
        }

        const nextEl = tableGroup.find(el => el.customData.table.row === nextRow && el.customData.table.col === nextCol);
        
        if (nextEl) {
            if (isEditing) {
                const textEditorContainer = ea.targetView?.contentEl?.querySelector(".excalidraw-textEditorContainer");
                const editable = textEditorContainer?.firstChild;
                if (editable && typeof editable.onblur === 'function') editable.onblur();

                setTimeout(() => {
                    ea.selectElementsInView([nextEl]);
                    App.startTextEditing({ sceneX: 0, sceneY: 0, container: nextEl });
                }, 50);
            } else {
                ea.viewUpdateScene({ appState: { selectedElementIds: { [nextEl.id]: true } } });
            }
            return true;
        }
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code) && !isEditing) {
        event.preventDefault();  
        event.stopPropagation();
        
        let nextRow = currentTableData.row;
        let nextCol = currentTableData.col;

        if (event.code === "ArrowUp") nextRow -= 1;
        else if (event.code === "ArrowDown") nextRow += 1;
        else if (event.code === "ArrowLeft") nextCol -= 1;
        else if (event.code === "ArrowRight") nextCol += 1;

        if (nextRow >= 0 && nextRow < currentTableData.rowNum && nextCol >= 0 && nextCol < currentTableData.colNum) {
            const nextEl = tableGroup.find(el => el.customData.table.row === nextRow && el.customData.table.col === nextCol);
            if (nextEl) {
                ea.viewUpdateScene({ appState: { selectedElementIds: { [nextEl.id]: true } } });
                return true;
            }
        }
        return true;
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
