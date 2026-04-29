---
name: 逐个显示动画引擎
description: 后台引擎：拦截 [ 和 ] 快捷键，并提供美观的悬浮 UI，实现画布元素的按序隐藏与显示。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。按 [ 上一步，按 ] 下一步。
features:
  - 拦截 handleCanvasKeyDown 实现快捷键步进切换
  - 智能注入非破坏性、悬浮式 HTML 交互面板
  - 使用 customData.hide 原生控制可见性
  - 支持一键关闭并恢复所有元素可见性
dependencies:
  - 与 Action-Setup-StepAppear 配合使用
autorun: true
---
/*
```javascript
*/
const SCRIPT_ID = "ymjr.feature.step-appear-engine";

var locales = {
    zh: {
        log_unmounted: "[{id}] 🔌 动画引擎已卸载",
        log_mounted: "[{id}] 🚀 动画引擎挂载完毕",
        ui_prev: "上一步 [",
        ui_next: "下一步 ]",
        ui_reset: "重置",
        ui_close: "关闭"
    },
    en: {
        log_unmounted: "[{id}] 🔌 Engine unmounted",
        log_mounted: "[{id}] 🚀 Engine mounted",
        ui_prev: "Prev [",
        ui_next: "Next ]",
        ui_reset: "Reset",
        ui_close: "Close"
    }
};

// 状态管理：使用 ExcalidrawAutomate.plugin 避免污染 global window
const getEngineState = () => {
    if (!ExcalidrawAutomate.plugin._ymjr_stepAppearEngine) {
        ExcalidrawAutomate.plugin._ymjr_stepAppearEngine = {
            lastVisibleIndex: -1,
            maxIndex: 0,
            uiHidden: false // 新增：UI是否处于主动关闭(休眠)状态
        };
    }
    return ExcalidrawAutomate.plugin._ymjr_stepAppearEngine;
};

// 核心逻辑：更新元素的可见性 (基于 customData.hide)
const updateVisibility = async (ea, api) => {
    const state = getEngineState();
    const elements = api.getSceneElements();
    
    let maxIndex = 0;
    const elementsToUpdate = [];

    // 筛选出绑定了动画序列的元素，并计算所需状态
    elements.forEach(el => {
        if (el?.customData?.appear) {
            const appearIndex = el.customData.appear.index;
            if (appearIndex > maxIndex) {
                maxIndex = appearIndex;
            }
            
            const shouldHide = appearIndex > state.lastVisibleIndex;
            // 只有当状态不一致时才加入更新队列，提升性能
            if (!!el.customData.hide !== shouldHide) {
                elementsToUpdate.push(el);
            }
        }
    });

    state.maxIndex = maxIndex;
    state.lastVisibleIndex = Math.min(Math.max(state.lastVisibleIndex, -1), maxIndex);

    // 批量执行更新
    if (elementsToUpdate.length > 0) {
        ea.clear();
        ea.copyViewElementsToEAforEditing(elementsToUpdate);
        const eaElements = ea.getElements();
        eaElements.forEach(el => {
            el.customData = el.customData || {};
            el.customData.hide = el.customData.appear.index > state.lastVisibleIndex;
        });
        await ea.addElementsToView(false, false, false);
    }

    // 渲染或更新 UI 面板
    renderUI(ea, api);
};

// 悬浮 UI 渲染机制
const renderUI = (ea, api) => {
    const state = getEngineState();
    const containerId = "ymjr-step-appear-ui-container";
    const contentEl = ea.targetView.contentEl; // 绑定到当前具体的视图面板
    let uiContainer = contentEl.querySelector(`#${containerId}`);

    // 如果画布没有动画序列，或者用户主动关闭了UI，则销毁面板
    if (state.maxIndex === 0 || state.uiHidden) {
        if (uiContainer) uiContainer.remove();
        return;
    }

    if (!uiContainer) {
        uiContainer = document.createElement("div");
        uiContainer.id = containerId;
        
        // 使用 Obsidian 变量以兼容深色/浅色模式，采用玻璃拟物态 CSS
        Object.assign(uiContainer.style, {
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "100",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 16px",
            borderRadius: "20px",
            background: "var(--background-primary-alt)",
            border: "1px solid var(--background-modifier-border)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            backdropFilter: "blur(8px)",
            fontFamily: "var(--font-interface)",
            fontSize: "13px",
            color: "var(--text-normal)",
            userSelect: "none"
        });

        // HTML 结构
        uiContainer.innerHTML = `
            <div class="ymjr-btn ymjr-prev" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.2s;">⬅️ ${t("ui_prev")}</div>
            <div class="ymjr-status" style="font-weight: bold; min-width: 60px; text-align: center; color: var(--interactive-accent);"></div>
            <div class="ymjr-btn ymjr-next" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.2s;">${t("ui_next")} ➡️</div>
            <div style="width: 1px; height: 16px; background: var(--background-modifier-border); margin: 0 4px;"></div>
            <div class="ymjr-btn ymjr-reset" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; color: var(--text-muted); transition: background 0.2s;">🔄 ${t("ui_reset")}</div>
            <div class="ymjr-btn ymjr-close" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; color: var(--text-error); transition: background 0.2s;">❌ ${t("ui_close")}</div>
        `;

        // 按钮悬停特效 (注入简易 CSS)
        const style = document.createElement("style");
        style.innerHTML = `
            #${containerId} .ymjr-btn:hover { background: var(--background-modifier-hover); color: var(--text-accent); }
            #${containerId} .ymjr-close:hover { background: var(--background-modifier-error-hover); color: var(--text-error); }
            #${containerId} .ymjr-btn:active { transform: scale(0.96); }
        `;
        uiContainer.appendChild(style);

        // 绑定鼠标点击事件
        uiContainer.querySelector(".ymjr-prev").onclick = () => {
            state.lastVisibleIndex--;
            updateVisibility(ea, api);
        };
        uiContainer.querySelector(".ymjr-next").onclick = () => {
            state.lastVisibleIndex++;
            updateVisibility(ea, api);
        };
        uiContainer.querySelector(".ymjr-reset").onclick = () => {
            state.lastVisibleIndex = -1;
            updateVisibility(ea, api);
        };
        // 新增关闭事件
        uiContainer.querySelector(".ymjr-close").onclick = () => {
            state.uiHidden = true;               // 标记UI已关闭
            state.lastVisibleIndex = state.maxIndex; // 强制将进度调至最大（显示所有元素）
            updateVisibility(ea, api);           // 触发更新，UI也会在此次更新中被销毁
        };

        contentEl.appendChild(uiContainer);
    }

    // 更新状态文本
    const currentStep = state.lastVisibleIndex + 1;
    const totalSteps = state.maxIndex + 1;
    uiContainer.querySelector(".ymjr-status").innerText = `${currentStep} / ${totalSteps}`;
};

// 键盘按键拦截 Hook
const handleKeyDown = (contextPayload) => {
    const { ea, api, event } = contextPayload;
    if (!ea || !api || !event) return;

    // 防止在打字时触发
    if (event.ctrlKey || event.altKey || event.shiftKey) return;
    
    // 检查是否处于文字编辑状态
    const appState = api.getAppState();
    if (appState.editingTextElement) return;

    if (["BracketLeft", "BracketRight"].includes(event.code)) {
        const state = getEngineState();
        
        // 只要按下了快捷键，就立刻唤醒 UI
        state.uiHidden = false;

        if (event.code === "BracketLeft") {
            state.lastVisibleIndex--;
        } else if (event.code === "BracketRight") {
            state.lastVisibleIndex++;
        }
        
        updateVisibility(ea, api);
        
        event.preventDefault();
        event.stopPropagation();
        return false; 
    }
};

// 挂载引擎
async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core 未运行");
    
    // 清理旧实例
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    // 注册键盘拦截 Hook
    window.EA_Core.registerHook(SCRIPT_ID, 'onKeyDown', handleKeyDown, 60);
    
    // 定义卸载逻辑
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        
        // 销毁所有视图中的悬浮面板
        document.querySelectorAll("#ymjr-step-appear-ui-container").forEach(el => el.remove());
        
        // 清理缓存
        delete ExcalidrawAutomate.plugin._ymjr_stepAppearEngine;
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();