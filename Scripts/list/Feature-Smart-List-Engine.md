---
name: 智能列表核心引擎 (实时渲染版)
description: 后台引擎：基于 renderStaticScene 实时在元素旁绘制列表序号，不产生多余实体元素。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，为 Action 提供运行环境与实时 Canvas 渲染能力。
features:
  - 拦截 renderStaticScene 实时绘制列表标号（支持跟随旋转）
  - 拦截 handleCanvasPointerUp 实现元素取消选中时自动销毁悬浮岛 UI
dependencies:
  - 无
autorun: true
---
/*
```javascript
*/
const locales = {
    zh: {
        btn_order: "有序",
        btn_unorder: "无序",
        btn_continue: "延续",
        btn_clear: "清除",
        notice_success: "✅ 列表已更新",
        log_unmounted: "[{id}] 🔌 已卸载",
        log_mounted: "[{id}] 🚀 挂载完毕"
    },
    en: {
        btn_order: "Order",
        btn_unorder: "Unorder",
        btn_continue: "Continue",
        btn_clear: "Clear",
        notice_success: "✅ List updated",
        log_unmounted: "[{id}] 🔌 Unmounted",
        log_mounted: "[{id}] 🚀 Mounted successfully"
    }
};

const SCRIPT_ID = "ymjr.feature.smart-list-engine";

// 初始化命名空间
if (!ExcalidrawAutomate.plugin._ymjr_smartList) {
    ExcalidrawAutomate.plugin._ymjr_smartList = {};
}

// 销毁 UI
ExcalidrawAutomate.plugin._ymjr_smartList.destroyUI = () => {
    const state = ExcalidrawAutomate.plugin._ymjr_smartList;
    if (state.container) {
        state.container.remove();
        state.container = null;
    }
    if (state.style) {
        state.style.remove();
        state.style = null;
    }
    state.currentContext = null;
};

// 列表数据处理：仅仅往选中元素的 customData 中注入元数据，不创建任何实体文本元素
ExcalidrawAutomate.plugin._ymjr_smartList.applyListAction = async (type) => {
    const context = ExcalidrawAutomate.plugin._ymjr_smartList.currentContext;
    if (!context) return;

    const { ea: currentEa, api } = context;
    const App = api?.App;
    if (!currentEa || !api || !App) return;

    let selectedEls = App.scene.getSelectedElements(App.state);
    if (!selectedEls || selectedEls.length === 0) return;

    selectedEls = [...selectedEls].sort((a, b) => a.y - b.y);
    const allElements = App.scene.getNonDeletedElements();

    // 清除逻辑
    if (type === "clear") {
        selectedEls.forEach(el => {
            if (el.customData?.list) {
                delete el.customData.list;
            }
        });
        currentEa.copyViewElementsToEAforEditing(selectedEls);
        await currentEa.addElementsToView();
        return;
    }

    let activeType = type;
    let lastIndex = 0;

    // 智能延续算法
    if (type === "continue") {
        const firstEl = selectedEls[0];
        const prevListElements = allElements
            .filter(el => el.customData?.list && el.y < firstEl.y)
            .sort((a, b) => b.y - a.y);

        if (prevListElements.length > 0) {
            const closest = prevListElements[0];
            activeType = closest.customData.list.type;
            if (activeType === "order") {
                lastIndex = closest.customData.list.index;
            }
        } else {
            activeType = "order";
        }
    }

    for (let i = 0; i < selectedEls.length; i++) {
        const el = selectedEls[i];
        if (activeType === "order") lastIndex += 1;

        el.customData = {
            ...el.customData,
            list: {
                type: activeType,
                index: activeType === "order" ? lastIndex : undefined
            }
        };
    }

    // 提交数据修改，触发 Excalidraw 重绘
    currentEa.copyViewElementsToEAforEditing(selectedEls);
    await currentEa.addElementsToView();
};

// 暴露 UI 接口
ExcalidrawAutomate.plugin._ymjr_smartList.showUI = (context) => {
    const { api, plugin } = context;
    const excalidrawNode = api?.App?.interactiveCanvas?.parentElement;
    if (!excalidrawNode) return;

    plugin._ymjr_smartList.destroyUI();
    plugin._ymjr_smartList.currentContext = context;

    const style = document.createElement("style");
    style.id = `style-${SCRIPT_ID}`;
    style.innerHTML = `
        .ymjr-smartlist-toolbar {
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 6px;
            padding: 6px 10px;
            background: var(--island-bg-color, var(--color-primary-alt, rgba(255, 255, 255, 0.9)));
            border: 1px solid var(--color-border, #e5e7eb);
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 99999;
            pointer-events: auto;
            animation: ymjr-fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ymjr-sl-btn {
            background: transparent;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            cursor: pointer;
            color: var(--text-color, var(--icon-fill-color, #333));
            font-weight: 500;
            font-size: 13px;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .ymjr-sl-btn:hover {
            background: var(--color-base-30, rgba(0, 0, 0, 0.08));
        }
        .ymjr-sl-btn.danger:hover {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }
        .ymjr-sl-btn span {
            font-weight: 700;
            opacity: 0.6;
        }
        @keyframes ymjr-fade-up {
            from { opacity: 0; transform: translate(-50%, 15px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
    `;

    const container = document.createElement("div");
    container.className = "ymjr-smartlist-toolbar";
    container.innerHTML = `
        <button id="ymjr-sl-order" class="ymjr-sl-btn" title="${t('btn_order')}">
            <span>1.</span> ${t('btn_order')}
        </button>
        <button id="ymjr-sl-unorder" class="ymjr-sl-btn" title="${t('btn_unorder')}">
            <span>●</span> ${t('btn_unorder')}
        </button>
        <button id="ymjr-sl-continue" class="ymjr-sl-btn" title="${t('btn_continue')}">
            <span>↵</span> ${t('btn_continue')}
        </button>
        <div style="width: 1px; background: var(--color-border); margin: 4px 2px;"></div>
        <button id="ymjr-sl-clear" class="ymjr-sl-btn danger" title="${t('btn_clear')}">
            ${t('btn_clear')}
        </button>
    `;

    document.head.appendChild(style);
    excalidrawNode.appendChild(container);

    plugin._ymjr_smartList.container = container;
    plugin._ymjr_smartList.style = style;

    container.querySelector('#ymjr-sl-order').onclick = () => plugin._ymjr_smartList.applyListAction("order");
    container.querySelector('#ymjr-sl-unorder').onclick = () => plugin._ymjr_smartList.applyListAction("unorder");
    container.querySelector('#ymjr-sl-continue').onclick = () => plugin._ymjr_smartList.applyListAction("continue");
    container.querySelector('#ymjr-sl-clear').onclick = () => plugin._ymjr_smartList.applyListAction("clear");
};

// ---------------- 渲染 Hook ---------------- //
const handleStaticSceneRender = (payload) => {
    const { context, visibleElements, appState } = payload;
    if (!context || !visibleElements || !appState) return false;

    context.save();

    visibleElements.forEach(el => {
        const listData = el.customData?.list;
        if (!listData) return;

        context.save();

        // 1. 获取 Excalidraw 内部经过缩放的坐标，必须叠加上滚动的偏移量
        const cx = el.x + appState.scrollX;
        const cy = el.y + appState.scrollY;

        context.translate(cx, cy);

        // 2. 处理元素的旋转 (完美跟随)
        if (el.angle) {
            const halfWidth = el.width / 2;
            const halfHeight = el.height / 2;
            context.translate(halfWidth, halfHeight);
            context.rotate(el.angle);
            context.translate(-halfWidth, -halfHeight);
        }

        // 3. 字体样式继承算法
        let fontFamilyName = "Virgil";
        if (el.fontFamily === 2) fontFamilyName = "Helvetica, Arial, sans-serif";
        if (el.fontFamily === 3) fontFamilyName = "Cascadia, monospace";

        const fontSize = el.fontSize || 20;
        context.font = `${fontSize}px ${fontFamilyName}`;
        context.fillStyle = el.strokeColor || "#000000";

        // 4. 渲染文字
        const text = listData.type === 'order' ? `${listData.index}.` : '●';
        const GAP = 12; // 距离元素的空隙
        context.textAlign = "right"; // 右对齐，保证所有序号（如9. 10.）右侧贴齐

        if (listData.type === 'unorder') {
            context.textBaseline = "middle";
            context.fillText(text, -GAP, el.height / 2);
        } else {
            context.textBaseline = "top";
            context.fillText(text, -GAP, 0);
        }

        context.restore();
    });

    context.restore();
    return false;
};

// ---------------- 交互 Hook ---------------- //
const handlePointerUp = (context) => {
    const { ea, api, App } = context;
    if (!ea || !api || !App) return;

    const selectedEls = App.scene.getSelectedElements(App.state);
    if (!selectedEls || selectedEls.length === 0) {
        if (ExcalidrawAutomate.plugin._ymjr_smartList) {
            ExcalidrawAutomate.plugin._ymjr_smartList.destroyUI();
        }
    }
    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core 未运行");
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    // 注册 Hook
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerUp', handlePointerUp, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'renderStaticScene', handleStaticSceneRender, 60);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
            if (ExcalidrawAutomate.plugin._ymjr_smartList) {
                ExcalidrawAutomate.plugin._ymjr_smartList.destroyUI();
                delete ExcalidrawAutomate.plugin._ymjr_smartList;
            }
            // 触发一次视图更新清空画布
            const view = app.workspace.getActiveFileView();
            view?.updateScene({ appState: { ...view.getScene().appState } });
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();