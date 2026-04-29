---
name: 插入垂直空间
description: 按需插入垂直空白空间。选中单一占位图形后运行此脚本，弹出美观的操作面板。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中单一元素（如矩形）作为占位符，运行此脚本。点击界面按钮即可推开下方元素并删除占位符。
features:
  - 纯净的 Action 触发模式，随用随调，不污染日常点选
  - 美观的 HTML/CSS 玻璃拟态悬浮 UI
  - 支持全局下推与选区下推
autorun: false
---
/*
```javascript
*/
var locales = {
    zh: {
        ui_title: "📐 空间排版助手",
        btn_global: "🔽 全局下移 (推开下方全部)",
        btn_column: "⏬ 选区下移 (仅推开宽度内)",
        btn_cancel: "✕ 取消",
        notice_select_one: "💡 请先选中单一元素作为空白占位符！",
        notice_success_global: "✨ 已全局插入垂直空间",
        notice_success_column: "✨ 已在选区内插入垂直空间"
    },
    en: {
        ui_title: "📐 Space Assistant",
        btn_global: "🔽 Push All Down",
        btn_column: "⏬ Push Column Down",
        btn_cancel: "✕ Cancel",
        notice_select_one: "💡 Please select a single element as a placeholder!",
        notice_success_global: "✨ Vertical space inserted globally",
        notice_success_column: "✨ Vertical space inserted in column"
    }
};

const SCRIPT_ID = "ymjr-action-insert-space-ui";

// 获取当前活跃的 API 和选中的元素
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (!selectedEls || selectedEls.length !== 1) {
    new Notice(t("notice_select_one"));
    return;
}

const selectedEl = selectedEls[0];

// 清理可能遗留的旧 UI
const existingUI = document.getElementById(SCRIPT_ID);
if (existingUI) {
    existingUI.remove();
}

// ------------------------------
// UI 渲染与样式模块 (友好美观的交互界面)
// ------------------------------
const container = document.createElement("div");
container.id = SCRIPT_ID;
container.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%) translateY(0);
    background: var(--background-primary, rgba(255, 255, 255, 0.8));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--background-modifier-border, rgba(0,0,0,0.1));
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.05);
    padding: 12px 16px;
    z-index: var(--layer-notice, 9999);
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: var(--font-interface);
    animation: ymjr-fade-in-up 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
`;

// 注入一次性的入场动画
const styleTag = document.createElement("style");
styleTag.innerHTML = `
    @keyframes ymjr-fade-in-up {
        from { opacity: 0; transform: translateX(-50%) translateY(15px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
container.appendChild(styleTag);

const header = document.createElement("div");
header.style.cssText = "display: flex; justify-content: space-between; align-items: center;";

const title = document.createElement("div");
title.innerText = t("ui_title");
title.style.cssText = `
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted, #666);
    letter-spacing: 0.5px;
`;

const closeBtn = document.createElement("button");
closeBtn.innerText = t("btn_cancel");
closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: var(--text-faint, #999);
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    transition: color 0.2s;
`;
closeBtn.onmouseenter = () => closeBtn.style.color = "var(--text-error, #ff4444)";
closeBtn.onmouseleave = () => closeBtn.style.color = "var(--text-faint, #999)";
closeBtn.onclick = () => container.remove();

header.appendChild(title);
header.appendChild(closeBtn);
container.appendChild(header);

const btnGroup = document.createElement("div");
btnGroup.style.cssText = "display: flex; gap: 8px;";

const btnStyle = `
    background: var(--interactive-normal);
    color: var(--text-normal);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
`;

// ------------------------------
// 核心逻辑绑定
// ------------------------------
const executeInsertSpace = async (mode) => {
    // 重新获取全量元素
    ea.clear();
    const elements = api.getSceneElements();
    let moveElements = [];

    if (mode === 'global') {
        moveElements = elements.filter(el => el.y > selectedEl.y && el.id !== selectedEl.id);
    } else if (mode === 'column') {
        moveElements = elements.filter(el => 
            el.y > selectedEl.y && 
            el.x >= selectedEl.x && 
            (el.x + el.width) <= (selectedEl.x + selectedEl.width) && 
            el.id !== selectedEl.id
        );
    }

    if (moveElements.length > 0) {
        ea.copyViewElementsToEAforEditing(moveElements);
        const eaElements = ea.getElements();
        for (const el of eaElements) {
            el.y += selectedEl.height;
        }
    }

    // 删除占位符本身
    ea.deleteViewElements([selectedEl]);
    await ea.addElementsToView();

    // 销毁 UI
    container.remove();
    new Notice(mode === 'global' ? t("notice_success_global") : t("notice_success_column"));
};

const btnGlobal = document.createElement("button");
btnGlobal.innerText = t("btn_global");
btnGlobal.style.cssText = btnStyle;
btnGlobal.onmouseenter = () => btnGlobal.style.background = "var(--interactive-hover)";
btnGlobal.onmouseleave = () => btnGlobal.style.background = "var(--interactive-normal)";
btnGlobal.onmousedown = () => btnGlobal.style.transform = "scale(0.96)";
btnGlobal.onmouseup = () => btnGlobal.style.transform = "scale(1)";
btnGlobal.onclick = () => executeInsertSpace('global');

const btnColumn = document.createElement("button");
btnColumn.innerText = t("btn_column");
btnColumn.style.cssText = btnStyle;
btnColumn.onmouseenter = () => btnColumn.style.background = "var(--interactive-hover)";
btnColumn.onmouseleave = () => btnColumn.style.background = "var(--interactive-normal)";
btnColumn.onmousedown = () => btnColumn.style.transform = "scale(0.96)";
btnColumn.onmouseup = () => btnColumn.style.transform = "scale(1)";
btnColumn.onclick = () => executeInsertSpace('column');

btnGroup.appendChild(btnGlobal);
btnGroup.appendChild(btnColumn);
container.appendChild(btnGroup);

document.body.appendChild(container);