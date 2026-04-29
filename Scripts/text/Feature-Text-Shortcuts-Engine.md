---
name: 文本快捷键增强引擎
description: 后台引擎：提供 Shift+Enter 换行、Tab 缩进、Shift+方向键空间跳转，以及 Space 键快速编辑功能。全部功能支持在设置中开关。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。在画板进行文本编辑时，极大地增强了键盘交互体验。各项快捷键功能均可在 EA 脚本设置中独立开启或关闭。
features:
  - 全面劫持和强化原生的 Excalidraw `keydown` 事件
  - 支持按下 Space 键快速进入选中元素的文本编辑状态
  - 支持 Tab / Shift+Tab 快速调整文本元素的 X 轴缩进
  - 支持 Shift+Enter 快速向下换行新建文本
  - 支持 Shift+方向键 快速在文本节点间跳转
dependencies:
  - 独立运行，无外部依赖
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_no_core: "EA_Core 未运行，无法挂载文本快捷键引擎",
    log_unmounted: "🛑 [Feature] {id} 已卸载.",
    log_mounted: "🚀 [Feature] {id} (Text Shortcuts) 引擎挂载完毕.",
    log_insert_error: "[TextShortcuts] 插入新行时发生错误:",
    log_indent_error: "[TextShortcuts] 缩进计算错误:",
    set_tab_indent: "是否启用 Tab 键缩进文本元素",
    set_space_edit: "是否启用 Space 键快速编辑文本",
    set_shift_enter: "是否启用 Shift+Enter 快速换行",
    set_shift_arrows: "是否启用 Shift+方向键 空间跳转"
  },
  en: {
    log_no_core: "EA_Core not running, cannot mount text shortcuts engine",
    log_unmounted: "🛑 [Feature] {id} unmounted.",
    log_mounted: "🚀 [Feature] {id} (Text Shortcuts) engine mounted successfully.",
    log_insert_error: "[TextShortcuts] Error inserting next line:",
    log_indent_error: "[TextShortcuts] Error calculating indent:",
    set_tab_indent: "Enable Tab key to indent text elements",
    set_space_edit: "Enable Space key to edit text elements",
    set_shift_enter: "Enable Shift+Enter to insert next line",
    set_shift_arrows: "Enable Shift+Arrows to jump between texts"
  }
};

const SCRIPT_ID = "ymjr.feature.text-shortcuts-engine";

// ==========================================
// 1. 设置项管理 (全部默认开启)
// ==========================================
async function ensureSettings() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["text shortcuts"] ?? {};
    let updated = false;

    const defaultSettings = {
        "tab indent switch": { value: true, description: t("set_tab_indent") },
        "space edit switch": { value: true, description: t("set_space_edit") },
        "shift enter switch": { value: true, description: t("set_shift_enter") },
        "shift arrows switch": { value: true, description: t("set_shift_arrows") }
    };

    for (const [key, def] of Object.entries(defaultSettings)) {
        if (typeof settings[key] === "undefined") {
            settings[key] = def;
            updated = true;
        }
    }

    if (updated) {
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["text shortcuts"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
}

// 获取当前设置状态的辅助函数
const getSettings = () => {
    return ExcalidrawAutomate.plugin.settings.scriptEngineSettings["text shortcuts"] || {};
};

// ==========================================
// 2. 核心功能：换行插入新文本
// ==========================================
const insertNextLine = async (App, isCtrlPressed, sourceElement = null) => {
    const api = ea.getExcalidrawAPI();
    if (!api) return;
    
    const state = api.getAppState();
    const targetElement = sourceElement || state.editingTextElement || ea.getViewSelectedElements()[0];

    if (!targetElement || (targetElement.type !== "text" && !targetElement.boundElements)) {
        return;
    }

    const textEditorContainer = ea.targetView?.contentEl?.querySelector(".excalidraw-textEditorContainer");
    const editable = textEditorContainer?.firstChild;
    if (editable && typeof editable.onblur === 'function') {
        editable.onblur();
    }

    setTimeout(() => {
        try {
            const activeApp = App || window.ExcalidrawApp || api.App;
            if (!activeApp || typeof activeApp.startTextEditing !== 'function') return;

            const latestElements = api.getSceneElements();
            const latestTarget = latestElements.find(el => el.id === targetElement.id) || targetElement;
            const fontSize = latestTarget.fontSize || state.currentItemFontSize || 20;

            if (!isCtrlPressed) {
                const nextState = {
                    currentItemStrokeColor: latestTarget.strokeColor || state.currentItemStrokeColor,
                    currentItemFontSize: latestTarget.fontSize || state.currentItemFontSize,
                    currentItemFontFamily: latestTarget.fontFamily || state.currentItemFontFamily,
                    currentItemTextAlign: latestTarget.textAlign || state.currentItemTextAlign,
                    currentItemOpacity: latestTarget.opacity || state.currentItemOpacity
                };
                
                if (activeApp.setState) {
                    activeApp.setState(nextState);
                } else {
                    api.updateScene({ appState: nextState });
                }
            }

            const expectedY = latestTarget.y + latestTarget.height + (fontSize / 4);
            const sceneX = latestTarget.x;

            ea.clear();
            const newElId = ea.addText(sceneX, expectedY, "");
            const newEl = ea.getElement(newElId);
            
            ea.addElementsToView(false, false, false).then(() => {
                ea.clear();
                ea.selectElementsInView([newEl]);
                activeApp.startTextEditing({
                    sceneX: 0,
                    sceneY: 0,
                    container: newEl
                });
            });

        } catch (e) {
            console.error(t("log_insert_error"), e);
        }
    }, 50); 
};

// ==========================================
// 3. 核心功能：Tab 缩进处理
// ==========================================
const handleTabIndent = async (selectedEls, event, App) => {
    if (App?.state?.editingTextElement) return false; 

    try {
        ea.clear();
        const canvas = ea.targetView?.contentEl?.querySelector('canvas.excalidraw__canvas.interactive');
        if (!canvas) return false;

        const ctx = canvas.getContext("2d");
        ctx.save();
        
        const ratio = event.shiftKey ? -1 : 1; 
        
        selectedEls.forEach(el => {
            const fontSize = el.fontSize || 20;
            const fontFamily = ea.getFontFamily(el.fontFamily || 1);
            ctx.font = `${fontSize}px ${fontFamily}`;
            const width = ctx.measureText("的的").width || 40; 
            el.x += width * ratio;
        });
        ctx.restore();

        ea.copyViewElementsToEAforEditing(selectedEls);
        await ea.addElementsToView(false, false, true);
        return true;
    } catch (e) {
        console.error(t("log_indent_error"), e);
        return false;
    }
};

// ==========================================
// 4. 核心功能：Shift + 方向键空间跳转
// ==========================================
const jumpToNextTextElement = (currentEl, direction, ea, api) => {
    if (!api) return false;

    const elements = api.getSceneElements().filter(el => 
        !el.isDeleted && 
        (el.type === "text" || (el.boundElements && el.boundElements.some(b => b.type === "text")))
    );

    const cx = currentEl.x + currentEl.width / 2;
    const cy = currentEl.y + currentEl.height / 2;

    let bestMatch = null;
    let minDistance = Infinity;

    for (const el of elements) {
        if (el.id === currentEl.id) continue;

        const ecx = el.x + el.width / 2;
        const ecy = el.y + el.height / 2;

        let isValidDirection = false;
        if (direction === "ArrowUp" && ecy < cy) isValidDirection = true;
        if (direction === "ArrowDown" && ecy > cy) isValidDirection = true;
        if (direction === "ArrowLeft" && ecx < cx) isValidDirection = true;
        if (direction === "ArrowRight" && ecx > cx) isValidDirection = true;

        if (isValidDirection) {
            const dx = Math.abs(ecx - cx);
            const dy = Math.abs(ecy - cy);
            let dist = 0;

            if (direction === "ArrowUp" || direction === "ArrowDown") {
                dist = dy * dy + dx * dx * 6; 
            } else {
                dist = dx * dx + dy * dy * 6; 
            }

            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = el;
            }
        }
    }

    if (bestMatch) {
        ea.selectElementsInView([bestMatch]);
        return true;
    }
    
    return false;
};

// ==========================================
// 5. 事件总线分发 (Canvas 层面)
// ==========================================
const handleKeyDown = (context) => {
    const { App, event, ea, api } = context;
    if (!ea || !api || !event || !App) return false;

    const selectedEls = ea.getViewSelectedElements();
    if (selectedEls.length === 0) return false;

    if (App?.state?.editingTextElement) return false;

    const settings = getSettings();
    const isSpaceEditEnabled = settings["space edit switch"]?.value ?? true;
    const isShiftEnterEnabled = settings["shift enter switch"]?.value ?? true;
    const isTabIndentEnabled = settings["tab indent switch"]?.value ?? true;
    const isShiftArrowsEnabled = settings["shift arrows switch"]?.value ?? true;

    // 拦截：Space 快速进入编辑
    if (isSpaceEditEnabled && event.code === "Space" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const selectedEl = selectedEls[0];
        if (selectedEl && (selectedEl.type === "text" || selectedEl.type !== "freedraw")) {
            event.preventDefault(); 
            setTimeout(() => {
                App.startTextEditing({
                    sceneX: 0,
                    sceneY: 0,
                    container: selectedEl,
                });
            }, 10);
            return true;
        }
    }

    // 拦截：Shift+Enter 换行
    if (isShiftEnterEnabled && event.code === "Enter" && event.shiftKey) {
        insertNextLine(App, event.ctrlKey, selectedEls[0]);
        return true; 
    }

    // 拦截：Tab / Shift+Tab 缩进
    if (isTabIndentEnabled && event.code === "Tab") {
        handleTabIndent(selectedEls, event, App);
        event.preventDefault(); 
        return true;
    }

    // 拦截：Shift + 方向键跳转
    const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (isShiftArrowsEnabled && event.shiftKey && arrowKeys.includes(event.code) && selectedEls[0].type === "text" && !event.ctrlKey) {
        const hasJumped = jumpToNextTextElement(selectedEls[0], event.code, ea, api);
        if (hasJumped) {
            event.preventDefault(); 
            event.stopPropagation();
            return true;
        }
    }

    return false;
};

// ==========================================
// 6. 事件总线分发 (WYSIWYG 编辑器层面)
// ==========================================
const handleTextWysiwygInit = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { element } = contextPayload;
    const textarea = ea.targetView?.contentEl?.querySelector('textarea.excalidraw-wysiwyg');
    
    if (!textarea) return false;

    if (!textarea._hasShiftEnterListener) {
        textarea.addEventListener('keydown', (e) => {
            const settings = getSettings();
            const isShiftEnterEnabled = settings["shift enter switch"]?.value ?? true;

            if (isShiftEnterEnabled && e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                
                const App = api?.App || window.ExcalidrawApp;
                const state = api?.getAppState();
                const currentEl = element || state?.editingTextElement;
                
                setTimeout(() => insertNextLine(App, e.ctrlKey, currentEl), 0);
            }
        });
        textarea._hasShiftEnterListener = true;
    }

    return false;
};

// ==========================================
// 7. 生命周期管理
// ==========================================
async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    await ensureSettings();

    window.EA_Core.registerHook(SCRIPT_ID, 'onKeyDown', handleKeyDown, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'handleTextWysiwyg', handleTextWysiwygInit, 50);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
            
            const textarea = ea.targetView?.contentEl?.querySelector('textarea.excalidraw-wysiwyg');
            if (textarea && textarea._hasShiftEnterListener) {
                delete textarea._hasShiftEnterListener;
            }
            console.log(t("log_unmounted", { id: SCRIPT_ID }));
        }
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();
