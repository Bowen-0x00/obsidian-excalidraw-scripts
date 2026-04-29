---
name: 防吸附管理面板 (No-Bind UI)
description: 提供一个美观的悬浮面板，用于管理和实时追踪选中元素的 nobind (禁止连线吸附) 状态。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行此脚本将唤起/关闭防吸附设置悬浮面板。选中元素后可通过面板的开关快捷切换 nobind 属性。
features:
  - 美观的 HTML/CSS 悬浮面板交互 (避开 Modal 限制)
  - 拦截 handleCanvasPointerUp 实现选中状态的实时动态追踪
  - 状态隔离，严格挂载至 ExcalidrawAutomate.plugin._ymjr_nobind 防止污染 window
dependencies:
  - 需配合 EA_Core 核心引擎运行
autorun: false
---
/*
```javascript
*/

var locales = {
  zh: {
    panel_title: "防吸附设置 (No-Bind)",
    toggle_on: "已开启防吸附",
    toggle_off: "未开启防吸附",
    no_selection: "请先选中元素",
    close: "关闭",
    notice_opened: "✨ 已开启防吸附管理面板",
    notice_closed: "🔌 已关闭防吸附管理面板"
  },
  en: {
    panel_title: "No-Bind Settings",
    toggle_on: "No-Bind Enabled",
    toggle_off: "No-Bind Disabled",
    no_selection: "No element selected",
    close: "Close",
    notice_opened: "✨ No-Bind panel opened",
    notice_closed: "🔌 No-Bind panel closed"
  }
};

const SCRIPT_ID = "ymjr.feature.nobind";
const NAMESPACE = "_ymjr_nobind";

// 1. 初始化命名空间与状态管理，防止污染 window
if (!ExcalidrawAutomate.plugin[NAMESPACE]) {
    ExcalidrawAutomate.plugin[NAMESPACE] = {
        uiContainer: null,
        isActive: false,
        lastContext: null, // 缓存 Hook 传来的最新上下文
        selectedEls: []
    };
}
const state = ExcalidrawAutomate.plugin[NAMESPACE];

// 2. 核心逻辑：执行 nobind 状态切换
const applyNobindState = (isNobind) => {
    // 优先使用 Hook 传来的 EA，如果为空则兜底使用运行脚本时的当前 EA
    const activeEa = state.lastContext?.ea || ea; 
    if (!activeEa) return;

    const selectedEls = state.selectedEls;
    if (!selectedEls || selectedEls.length === 0) return;

    selectedEls.forEach((el) => {
        if (isNobind) {
            el.customData = { ...el.customData, nobind: true };
        } else {
            if (el.customData && el.customData.nobind) {
                delete el.customData.nobind;
            }
        }
    });

    activeEa.copyViewElementsToEAforEditing(selectedEls);
    activeEa.addElementsToView();
};

// 3. UI 状态更新逻辑 (供 Hook 调用)
const updateUIState = () => {
    if (!state.uiContainer || !state.isActive) return;

    const toggleInput = state.uiContainer.querySelector("#ymjr-nobind-toggle");
    const statusText = state.uiContainer.querySelector("#ymjr-nobind-status");

    if (state.selectedEls.length === 0) {
        toggleInput.disabled = true;
        toggleInput.checked = false;
        statusText.innerText = t("no_selection");
        statusText.style.color = "var(--text-muted)";
    } else {
        toggleInput.disabled = false;
        // 检查第一个元素是否具有 nobind 标识
        const isNobind = !!state.selectedEls[0]?.customData?.nobind;
        toggleInput.checked = isNobind;
        statusText.innerText = isNobind ? t("toggle_on") : t("toggle_off");
        statusText.style.color = isNobind ? "var(--color-green)" : "var(--text-normal)";
    }
};

// 4. Hook：监听画布选中元素的变更
const handlePointerUp = (context) => {
    const { ea, api, App } = context;
    if (!ea || !api || !App) return false;

    // 缓存最新上下文供点击事件使用
    state.lastContext = context;
    
    // 提取当前选中元素
    state.selectedEls = App.scene.getSelectedElements(App.state) || [];
    
    // 实时更新 UI 面板
    updateUIState();
    return false;
};

// 5. 绘制优雅的 HTML UI
const createOrToggleUI = () => {
    // 如果已经激活，则关闭并卸载
    if (state.isActive) {
        if (state.uiContainer) {
            state.uiContainer.remove();
            state.uiContainer = null;
        }
        state.isActive = false;
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        new Notice(t("notice_closed"));
        return;
    }

    // 绘制 UI
    const container = document.createElement("div");
    container.id = "ymjr-nobind-panel";
    
    // 采用现代化玻璃拟物 CSS 样式
    container.innerHTML = `
        <style>
            #ymjr-nobind-panel {
                position: absolute;
                bottom: 30px;
                right: 30px;
                width: 240px;
                padding: 16px;
                background: var(--background-primary-alt);
                border: 1px solid var(--background-modifier-border);
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
                z-index: 1000;
                font-family: var(--font-interface);
                transition: all 0.3s ease;
            }
            .ymjr-nobind-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                font-weight: 600;
                color: var(--text-normal);
            }
            .ymjr-nobind-close {
                cursor: pointer;
                color: var(--text-muted);
                transition: color 0.2s;
            }
            .ymjr-nobind-close:hover { color: var(--text-error); }
            .ymjr-nobind-body {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: var(--background-primary);
                padding: 10px 12px;
                border-radius: 8px;
            }
            .ymjr-nobind-status {
                font-size: 0.9em;
                color: var(--text-muted);
            }
            /* iOS 风格的 Switch 开关 */
            .ymjr-switch {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
            }
            .ymjr-switch input { opacity: 0; width: 0; height: 0; }
            .ymjr-slider {
                position: absolute; cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: var(--background-modifier-border);
                transition: .3s; border-radius: 20px;
            }
            .ymjr-slider:before {
                position: absolute; content: "";
                height: 14px; width: 14px;
                left: 3px; bottom: 3px;
                background-color: white; transition: .3s;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            input:checked + .ymjr-slider { background-color: var(--interactive-accent); }
            input:checked + .ymjr-slider:before { transform: translateX(16px); }
            input:disabled + .ymjr-slider { opacity: 0.5; cursor: not-allowed; }
        </style>
        <div class="ymjr-nobind-header">
            <span>${t("panel_title")}</span>
            <span class="ymjr-nobind-close" title="${t("close")}">✖</span>
        </div>
        <div class="ymjr-nobind-body">
            <span id="ymjr-nobind-status" class="ymjr-nobind-status">${t("no_selection")}</span>
            <label class="ymjr-switch">
                <input type="checkbox" id="ymjr-nobind-toggle" disabled>
                <span class="ymjr-slider"></span>
            </label>
        </div>
    `;

    // 挂载到当前工作区，避免跨文件切换时悬浮窗丢失
    document.body.appendChild(container);
    state.uiContainer = container;
    state.isActive = true;

    // 事件绑定
    const closeBtn = container.querySelector(".ymjr-nobind-close");
    const toggleInput = container.querySelector("#ymjr-nobind-toggle");

    closeBtn.addEventListener("click", () => {
        createOrToggleUI(); // 触发关闭逻辑
    });

    toggleInput.addEventListener("change", (e) => {
        applyNobindState(e.target.checked);
        // 状态应用后刷新UI文字表现
        const statusText = container.querySelector("#ymjr-nobind-status");
        statusText.innerText = e.target.checked ? t("toggle_on") : t("toggle_off");
        statusText.style.color = e.target.checked ? "var(--color-green)" : "var(--text-normal)";
    });

    // 注册 Hook 以保持后续选中的状态同步
    if (window.EA_Core) {
        window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerUp', handlePointerUp, 50);
    } else {
        console.warn("EA_Core 未运行，面板无法实时追踪选中状态。");
    }

    // 初始化时主动抓取一次当前选中元素
    state.selectedEls = ea.getViewSelectedElements();
    updateUIState();

    new Notice(t("notice_opened"));
};

// 执行入口
createOrToggleUI();