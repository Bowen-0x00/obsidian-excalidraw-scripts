---
name: 批量分配文本到容器
description: 将输入的文本按换行/逗号/Tab分割后，批量分配到选中的多个图形容器中。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中多个目标容器（排除已有的纯文本元素），运行脚本，在弹出的优雅面板中输入文本。
features:
  - 自定义 HTML UI，支持暗色/亮色模式自适应
  - 实时校验输入的文本片段数量与选中容器数量是否匹配
dependencies:
  - 独立运行
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选中至少一个非文本的图形容器！",
    ui_title: "批量分配文本",
    ui_placeholder: "请在此粘贴或输入文本\n支持通过 换行、逗号、Tab 分割...",
    ui_status_waiting: "等待输入...",
    ui_status_match: "✅ 数量匹配 ({count}个)",
    ui_status_mismatch: "❌ 数量不匹配 (片段: {textCount} / 容器: {elCount})",
    ui_btn_cancel: "取消",
    ui_btn_apply: "分配"
  },
  en: {
    notice_select: "Please select at least one non-text container element!",
    ui_title: "Distribute Text",
    ui_placeholder: "Paste or type text here\nSplit by newline, comma, or tab...",
    ui_status_waiting: "Waiting for input...",
    ui_status_match: "✅ Matched ({count})",
    ui_status_mismatch: "❌ Mismatch (Text: {textCount} / Elements: {elCount})",
    ui_btn_cancel: "Cancel",
    ui_btn_apply: "Apply"
  }
};

const api = ea.getExcalidrawAPI();
const state = api.getAppState();
const selectedEls = ea.getViewSelectedElements().filter(el => el.type !== "text");
const elCount = selectedEls.length;

if (elCount === 0) {
    new Notice(t("notice_select"));
    return;
}

// 清理可能遗留的旧 UI 实例，防止重复创建
if (ExcalidrawAutomate.plugin._ymjr_distribute_ui) {
    ExcalidrawAutomate.plugin._ymjr_distribute_ui.remove();
    ExcalidrawAutomate.plugin._ymjr_distribute_ui = null;
}

// ------------------------------------------
// 1. 构建现代化 UI (HTML/CSS)
// ------------------------------------------
const overlay = document.createElement("div");
overlay.id = "ymjr-distribute-overlay";
// 判断当前 Obsidian/Excalidraw 是否为暗黑模式
const isDark = document.body.classList.contains("theme-dark");

overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center;
    z-index: 99999; font-family: var(--font-interface);
`;

const modal = document.createElement("div");
modal.style.cssText = `
    width: 400px; padding: 20px; border-radius: 12px;
    background: ${isDark ? '#242424' : '#ffffff'};
    color: ${isDark ? '#e3e3e3' : '#333333'};
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    display: flex; flex-direction: column; gap: 15px;
    border: 1px solid ${isDark ? '#333' : '#e0e0e0'};
`;

modal.innerHTML = `
    <div style="font-size: 1.1em; font-weight: 600; margin-bottom: 5px;">${t("ui_title")}</div>
    <textarea id="ymjr-text-input" placeholder="${t("ui_placeholder")}" 
        style="width: 100%; height: 120px; resize: none; padding: 10px; border-radius: 8px;
        background: ${isDark ? '#1a1a1a' : '#f5f5f5'}; color: inherit; 
        border: 1px solid ${isDark ? '#444' : '#ccc'}; outline: none; font-size: 14px; box-sizing: border-box;"></textarea>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
        <span id="ymjr-status-text" style="color: ${isDark ? '#aaa' : '#666'};">${t("ui_status_waiting")}</span>
        <div style="display: flex; gap: 10px;">
            <button id="ymjr-btn-cancel" style="padding: 6px 14px; border-radius: 6px; cursor: pointer;
                background: transparent; border: 1px solid ${isDark ? '#555' : '#ccc'}; color: inherit;">
                ${t("ui_btn_cancel")}
            </button>
            <button id="ymjr-btn-apply" disabled style="padding: 6px 14px; border-radius: 6px; cursor: not-allowed;
                background: var(--interactive-accent); border: none; color: white; font-weight: bold; opacity: 0.5;">
                ${t("ui_btn_apply")}
            </button>
        </div>
    </div>
`;

overlay.appendChild(modal);
document.body.appendChild(overlay);
ExcalidrawAutomate.plugin._ymjr_distribute_ui = overlay;

// ------------------------------------------
// 2. 交互与逻辑绑定
// ------------------------------------------
const inputEl = overlay.querySelector("#ymjr-text-input");
const statusEl = overlay.querySelector("#ymjr-status-text");
const btnCancel = overlay.querySelector("#ymjr-btn-cancel");
const btnApply = overlay.querySelector("#ymjr-btn-apply");

let parsedData = [];

// 实时监听输入，校验分段数量
inputEl.addEventListener("input", (e) => {
    const rawText = e.target.value.trim();
    if (!rawText) {
        parsedData = [];
        statusEl.textContent = t("ui_status_waiting");
        statusEl.style.color = isDark ? '#aaa' : '#666';
        btnApply.disabled = true;
        btnApply.style.opacity = '0.5';
        btnApply.style.cursor = 'not-allowed';
        return;
    }

    parsedData = rawText.split(/,|\t|\n/).filter(element => element && element.trim() !== '');
    const textCount = parsedData.length;

    if (textCount === elCount) {
        statusEl.textContent = t("ui_status_match").replace("{count}", elCount);
        statusEl.style.color = "var(--text-success)";
        btnApply.disabled = false;
        btnApply.style.opacity = '1';
        btnApply.style.cursor = 'pointer';
    } else {
        statusEl.textContent = t("ui_status_mismatch").replace("{textCount}", textCount).replace("{elCount}", elCount);
        statusEl.style.color = "var(--text-error)";
        btnApply.disabled = true;
        btnApply.style.opacity = '0.5';
        btnApply.style.cursor = 'not-allowed';
    }
});

// 关闭与销毁逻辑
const closeUI = () => {
    if (ExcalidrawAutomate.plugin._ymjr_distribute_ui) {
        ExcalidrawAutomate.plugin._ymjr_distribute_ui.remove();
        ExcalidrawAutomate.plugin._ymjr_distribute_ui = null;
    }
};

btnCancel.addEventListener("click", closeUI);
overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeUI(); // 点击遮罩层关闭
});

// 执行分配逻辑
btnApply.addEventListener("click", async () => {
    if (parsedData.length !== elCount) return;
    
    ea.copyViewElementsToEAforEditing(selectedEls); 
    for (let i = 0; i < elCount; i++) {
        ea.style.strokeColor = state.currentItemStrokeColor;
        ea.style.fontSize    = state.currentItemFontSize;
        ea.style.fontFamily  = state.currentItemFontFamily;
        
        const textId = ea.addText(0, 0, `${parsedData[i].trim()}`, {
            textAlign: "center",
            textVerticalAlign: "middle"
        });
        
        const textEl = ea.getElement(textId);
        const containerEl = ea.getElement(selectedEls[i].id);
        
        // 绑定文本到容器并计算绝对中心点
        textEl.containerId = containerEl.id;
        textEl.x = containerEl.x + containerEl.width / 2 - textEl.width / 2;
        textEl.y = containerEl.y + containerEl.height / 2 - textEl.height / 2;
        containerEl.boundElements = [...(containerEl.boundElements || []), { type: "text", id: textId }];
    }
    
    await ea.addElementsToView(false, false);
    closeUI();
});

// 自动聚焦
setTimeout(() => inputEl.focus(), 100);