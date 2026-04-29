---
name: Checkbox 核心引擎
description: 后台引擎：提供 Shift+悬停 时的手型指针、浮动提示，以及 Shift+点击 的状态切换。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，负责寻找并操作带有 customData.isCheckbox 标记的文本元素。
features:
  - 拦截 handleCanvasPointerMove 实现 Shift+鼠标悬停 自动变手型并展示 HTML 浮动提示
  - 拦截 handleCanvasPointerDown (基于 move 缓存的元素) 实现 Shift+点击 自动切换
dependencies:
  - 配合 Action-Toggle-Checkbox 动作脚本使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    tooltip_tip: "✨ <b>Shift + 点击</b> 切换状态",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    tooltip_tip: "✨ <b>Shift + Click</b> to toggle state",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.checkbox-engine";

// 安全获取或初始化插件级别的状态空间 (不污染 window)
const getState = (plugin) => {
    if (!plugin._ymjr_checkbox_state) {
        plugin._ymjr_checkbox_state = { 
            hoveredElement: null, 
            ui: {} 
        };
    }
    return plugin._ymjr_checkbox_state;
};

// 动态创建并管理现代化的鼠标跟随 Tooltip
const getOrCreateTooltip = (state) => {
    if (!state.ui.tooltip) {
        const tooltip = document.createElement("div");
        tooltip.style.cssText = `
            position: fixed;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.75);
            color: #fff;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            backdrop-filter: blur(4px);
            z-index: 99999;
            opacity: 0;
            transition: opacity 0.2s ease;
            white-space: nowrap;
        `;
        document.body.appendChild(tooltip);
        state.ui.tooltip = tooltip;
    }
    return state.ui.tooltip;
};

// Hook：处理鼠标悬停 UX (改变光标、浮动提示，并缓存命中元素)
const handlePointerMove = (context) => {
    const { ea, api, App, hitElement, event } = context;
    if (!ea || !api || !App) return false;

    const state = getState(ExcalidrawAutomate.plugin);
    // 关键修复：将 move 时捕获的元素缓存起来，供 pointerDown 使用
    state.hoveredElement = hitElement; 

    const tooltip = getOrCreateTooltip(state);

    if (event.shiftKey && hitElement?.type === "text" && hitElement.customData?.isCheckbox) {
        if (App.interactiveCanvas) {
            App.interactiveCanvas.style.cursor = "pointer";
        }
        tooltip.innerHTML = t("tooltip_tip");
        tooltip.style.left = `${event.clientX + 15}px`;
        tooltip.style.top = `${event.clientY + 15}px`;
        tooltip.style.opacity = "1";
    } else {
        tooltip.style.opacity = "0";
    }
    return false;
};

// Hook：处理 Shift+点击 的状态切换逻辑
const handlePointerDown = (context) => {
    const { ea, api, event } = context;
    if (!ea || !api) return false;

    const state = getState(ExcalidrawAutomate.plugin);
    // 关键修复：从 state 缓存中拿 hitElement
    const hitElement = state.hoveredElement; 

    if (event.shiftKey && hitElement?.type === "text" && hitElement.customData?.isCheckbox) {
        let text = hitElement.rawText;
        let newText = text;

        if (text.startsWith("- [ ]")) {
            newText = text.replace("- [ ]", "- [x]");
        } else if (text.startsWith("- [x]")) {
            newText = text.replace("- [x]", "- [ ]");
        } else {
            return false;
        }

        ea.copyViewElementsToEAforEditing([hitElement]);
        const editedEl = ea.getElements()[0];
        editedEl.text = newText;
        editedEl.rawText = newText;
        ea.addElementsToView(false, false, false);
        
        return false;
    }
    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn("[Checkbox Engine] EA_Core 未运行");
    
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerMove', handlePointerMove, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerDown', handlePointerDown, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        const state = ExcalidrawAutomate.plugin._ymjr_checkbox_state;
        if (state && state.ui && state.ui.tooltip && state.ui.tooltip.parentNode) {
            state.ui.tooltip.parentNode.removeChild(state.ui.tooltip);
            delete state.ui.tooltip;
        }
        // 清理缓存以防内存泄露
        ExcalidrawAutomate.plugin._ymjr_checkbox_state = null; 
        
        // 替换字符串变量模拟模板语法
        console.log(t("log_unmounted").replace("{id}", SCRIPT_ID));
    };

    console.log(t("log_mounted").replace("{id}", SCRIPT_ID));
}

mountFeature();