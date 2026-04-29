---
name: GIF 逐帧控制引擎
description: 后台引擎：拦截逗号和句号快捷键，并提供悬浮 UI，实现被标记元素的 GIF 逐帧播放与控制。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。选中带有 GIF 标记的元素后，按 , (逗号) 上一帧，按 . (句号) 下一帧。
features:
  - 增加 try-catch 生命周期保护，避免热重载崩溃
  - 拦截 handleCanvasPointerUp 识别选中状态并挂载交互面板
  - 拦截 onKeyDown 实现快捷键步进切换
dependencies:
  - 与 Action-Toggle-GIF 配合使用
autorun: true
---
/*
```javascript
*/
const SCRIPT_ID = "ymjr.feature.gif-engine";

var locales = {
    zh: {
        log_unmounted: "[{id}] 🔌 动画引擎已卸载",
        log_mounted: "[{id}] 🚀 动画引擎挂载完毕",
        ui_prev: "上一帧 <",
        ui_next: "下一帧 >",
        ui_reset: "重置",
        ui_close: "关闭"
    },
    en: {
        log_unmounted: "[{id}] 🔌 Engine unmounted",
        log_mounted: "[{id}] 🚀 Engine mounted",
        ui_prev: "Prev <",
        ui_next: "Next >",
        ui_reset: "Reset",
        ui_close: "Close"
    }
};

// 状态管理
const getEngineState = () => {
    if (!ea?.plugin?._ymjr_gifEngine) {
        ExcalidrawAutomate.plugin._ymjr_gifEngine = {
            selectedGifEls: [],
            lastSelectedId: null,
            uiHidden: false
        };
    }
    return ExcalidrawAutomate.plugin._ymjr_gifEngine;
};

// 更新 GIF 帧索引
const updateGifFrame = async (ea, api, action) => {
    const state = getEngineState();
    if (!state.selectedGifEls || state.selectedGifEls.length === 0) return;

    ea.clear();
    ea.copyViewElementsToEAforEditing(state.selectedGifEls);
    const eaElements = ea.getElements();
    let isChanged = false;

    eaElements.forEach(el => {
        if (el.customData?.gif) {
            const currentIdx = el.customData.gif.index || 0;
            const maxIdx = el.customData.gif.frameCount > 0 ? el.customData.gif.frameCount - 1 : 9999; 
            let newIdx = currentIdx;

            if (action === "prev") {
                newIdx = Math.max(currentIdx - 1, 0);
            } else if (action === "next") {
                newIdx = Math.min(currentIdx + 1, maxIdx);
            } else if (action === "reset") {
                newIdx = 0;
            }

            if (newIdx !== currentIdx) {
                el.customData.gif.index = newIdx; // 只更新索引
                isChanged = true;
            }
        }
    });

    if (isChanged) {
        // addElementsToView 会自增元素 version，天然触发 canvas 同步重绘，且复用内存中的 frames
        await ea.addElementsToView(false, false, false);
        renderUI(ea, api);
    }
};

// 销毁 UI (加入保护机制)
const destroyUI = () => {
    try {
        document.querySelectorAll("#ymjr-gif-engine-ui-container").forEach(el => el.remove());
    } catch (e) {
        console.warn(`[${SCRIPT_ID}] UI清理失败:`, e);
    }
};

// 渲染 UI
const renderUI = (ea, api) => {
    const state = getEngineState();
    const containerId = "ymjr-gif-engine-ui-container";
    const contentEl = ea.targetView?.contentEl || document.body; 
    let uiContainer = contentEl.querySelector(`#${containerId}`);

    if (state.selectedGifEls.length === 0 || state.uiHidden) {
        destroyUI();
        return;
    }

    if (!uiContainer) {
        uiContainer = document.createElement("div");
        uiContainer.id = containerId;
        
        Object.assign(uiContainer.style, {
            position: "absolute",
            bottom: "80px", 
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

        uiContainer.innerHTML = `
            <div class="ymjr-btn ymjr-prev" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.2s;">⏪ ${t("ui_prev")}</div>
            <div class="ymjr-status" style="font-weight: bold; min-width: 60px; text-align: center; color: var(--interactive-accent);"></div>
            <div class="ymjr-btn ymjr-next" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.2s;">${t("ui_next")} ⏩</div>
            <div style="width: 1px; height: 16px; background: var(--background-modifier-border); margin: 0 4px;"></div>
            <div class="ymjr-btn ymjr-reset" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; color: var(--text-muted); transition: background 0.2s;">🔄 ${t("ui_reset")}</div>
            <div class="ymjr-btn ymjr-close" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; color: var(--text-error); transition: background 0.2s;">❌ ${t("ui_close")}</div>
        `;

        const style = document.createElement("style");
        style.innerHTML = `
            #${containerId} .ymjr-btn:hover { background: var(--background-modifier-hover); color: var(--text-accent); }
            #${containerId} .ymjr-close:hover { background: var(--background-modifier-error-hover); color: var(--text-error); }
            #${containerId} .ymjr-btn:active { transform: scale(0.96); }
        `;
        uiContainer.appendChild(style);

        uiContainer.querySelector(".ymjr-prev").onclick = () => updateGifFrame(ea, api, "prev");
        uiContainer.querySelector(".ymjr-next").onclick = () => updateGifFrame(ea, api, "next");
        uiContainer.querySelector(".ymjr-reset").onclick = () => updateGifFrame(ea, api, "reset");
        uiContainer.querySelector(".ymjr-close").onclick = () => {
            state.uiHidden = true;
            destroyUI();
        };

        contentEl.appendChild(uiContainer);
    }

    const primaryEl = state.selectedGifEls[0];
    if (primaryEl && primaryEl.customData?.gif) {
        const currentFrame = (primaryEl.customData.gif.index || 0) + 1;
        const totalFrames = primaryEl.customData.gif.frameCount > 0 ? primaryEl.customData.gif.frameCount : "∞";
        uiContainer.querySelector(".ymjr-status").innerText = `${currentFrame} / ${totalFrames}`;
    }
};

const handlePointerUp = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const appState = api.getAppState();
    const selectedEls = api.getSceneElements().filter(el => appState.selectedElementIds[el.id]);
    const gifEls = selectedEls.filter(el => el.customData?.gif);

    const state = getEngineState();

    if (gifEls.length > 0) {
        state.selectedGifEls = gifEls;
        if (state.lastSelectedId !== gifEls[0].id) {
            state.uiHidden = false;
        }
        state.lastSelectedId = gifEls[0].id;
        renderUI(ea, api);
    } else {
        state.selectedGifEls = [];
        state.lastSelectedId = null;
        destroyUI();
    }
    return false;
};

const handleKeyDown = (contextPayload) => {
    const { ea, api, event } = contextPayload;
    if (!ea || !api || !event) return;

    if (event.ctrlKey || event.altKey || event.shiftKey) return;
    
    const appState = api.getAppState();
    if (appState.editingTextElement) return;

    if (["Comma", "Period"].includes(event.code)) {
        const selectedEls = api.getSceneElements().filter(el => appState.selectedElementIds[el.id]);
        const gifEls = selectedEls.filter(el => el.customData?.gif);
        
        if (gifEls.length > 0) {
            const state = getEngineState();
            state.selectedGifEls = gifEls;
            state.uiHidden = false;

            if (event.code === "Comma") {
                updateGifFrame(ea, api, "prev");
            } else if (event.code === "Period") {
                updateGifFrame(ea, api, "next");
            }
            
            event.preventDefault();
            event.stopPropagation();
            return false; 
        }
    }
};

// --- 核心挂载逻辑 ---
async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core 未运行");
    
    // 【关键修复点】：使用 try-catch 包裹旧实例的卸载逻辑
    // 即使上一次运行的脚本有 bug 导致卸载报错，也不会中断本次新引擎的挂载
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        try {
            ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
        } catch (error) {
            console.warn(`[${SCRIPT_ID}] 尝试卸载旧引擎时遇到错误 (可能是幽灵钩子遗留)，已强制放行:`, error);
        }
    }

    // 重新注册 Hooks
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerUp', handlePointerUp, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'onKeyDown', handleKeyDown, 60);
    
    // 定义安全的卸载函数
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        
        try {
            destroyUI();
        } catch(e) {} // 静默处理由于 DOM 变动导致的卸载报错
        
        delete ea?.plugin?._ymjr_gifEngine;
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();