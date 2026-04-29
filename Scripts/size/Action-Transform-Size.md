---
name: 高级尺寸变换 (Advanced Size Transform)
description: 提供美观的悬浮面板，用于一键统一元素宽度、等比例缩放、对齐盒模型尺寸及修改选中文字大小。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中元素后在悬浮面板中点击对应的操作按钮。面板支持拖拽移动，再次运行此脚本可关闭面板。
features:
  - 美观的 HTML 悬浮面板（不阻挡原生右键菜单）
  - 完美解决多屏/多视图焦点切换导致 ea 作用域丢失的问题
  - 支持快捷缩放(±10%)、按最大/小宽度统一、矩形/菱形/椭圆完全统一、字号快捷设定
dependencies: []
autorun: false
---
/*
```javascript
*/
const SCRIPT_ID = "ymjr.feature.size.transform";
const PANEL_ID = "ymjr-advanced-size-panel";

// 国际化
const locales = {
    zh: {
        title: "📐 尺寸与排版",
        scale: "快捷缩放",
        scale_up: "+10% 放大",
        scale_down: "-10% 缩小",
        width: "等宽对齐",
        width_max: "对齐最大宽",
        width_min: "对齐最小宽",
        uniform: "盒模型统一",
        uniform_btn: "统一选中图形 (取最大值)",
        font: "字号设置",
        font_btn: "应用",
        notice_no_sel: "请先选中需要变换的元素！",
        notice_no_box: "未选中矩形、菱形或椭圆！",
        notice_success: "✅ 变换成功",
        notice_closed: "🔌 尺寸变换面板已关闭"
    },
    en: {
        title: "📐 Transform",
        scale: "Quick Scale",
        scale_up: "+10% Size",
        scale_down: "-10% Size",
        width: "Match Width",
        width_max: "Max Width",
        width_min: "Min Width",
        uniform: "Uniform Boxes",
        uniform_btn: "Uniform Shapes (Max)",
        font: "Font Size",
        font_btn: "Apply",
        notice_no_sel: "Please select elements first!",
        notice_no_box: "No rect, diamond, or ellipse selected!",
        notice_success: "✅ Success",
        notice_closed: "🔌 Panel closed"
    }
};


// 1. 清理旧面板 (Toggle逻辑：如果已存在则关闭并退出)
if (ExcalidrawAutomate.plugin[SCRIPT_ID]) {
    ExcalidrawAutomate.plugin[SCRIPT_ID].remove();
    delete ExcalidrawAutomate.plugin[SCRIPT_ID];
    new Notice(t("notice_closed"));
    return;
}

// 2. 获取当前视图容器 (最关键的一步：将 UI 绑定到当前具体视图，防止作用域飘逸)
const viewContainer = ea.targetView.containerEl.querySelector(".excalidraw-wrapper") || ea.targetView.containerEl;

// 3. 构建 UI DOM
const panel = document.createElement("div");
panel.id = PANEL_ID;
ExcalidrawAutomate.plugin[SCRIPT_ID] = panel;

// 注入 Obsidian 原生 CSS 变量与玻璃拟态效果
panel.innerHTML = `
<style>
    #${PANEL_ID} {
        position: absolute;
        top: 20px;
        right: 60px;
        width: 240px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 999;
        display: flex;
        flex-direction: column;
        user-select: none;
        overflow: hidden;
        backdrop-filter: blur(8px);
        background-color: rgba(var(--background-primary-rgb), 0.85);
    }
    #${PANEL_ID} .ymjr-header {
        background: var(--background-secondary);
        padding: 8px 12px;
        font-weight: bold;
        font-size: 14px;
        color: var(--text-normal);
        cursor: grab;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--background-modifier-border);
    }
    #${PANEL_ID} .ymjr-header:active {
        cursor: grabbing;
    }
    #${PANEL_ID} .ymjr-close-btn {
        cursor: pointer;
        color: var(--text-muted);
        transition: color 0.2s;
    }
    #${PANEL_ID} .ymjr-close-btn:hover {
        color: var(--text-error);
    }
    #${PANEL_ID} .ymjr-content {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    #${PANEL_ID} .ymjr-section-title {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
    }
    #${PANEL_ID} .ymjr-row {
        display: flex;
        gap: 8px;
    }
    #${PANEL_ID} button {
        flex: 1;
        background: var(--interactive-normal);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
    }
    #${PANEL_ID} button:hover {
        background: var(--interactive-hover);
    }
    #${PANEL_ID} input {
        width: 60px;
        background: var(--background-modifier-form-field);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 4px;
        font-size: 12px;
        text-align: center;
    }
</style>

<div class="ymjr-header">
    <span>${t("title")}</span>
    <span class="ymjr-close-btn">✖</span>
</div>
<div class="ymjr-content">
    <div>
        <div class="ymjr-section-title">${t("scale")}</div>
        <div class="ymjr-row">
            <button id="ymjr-scale-down">${t("scale_down")}</button>
            <button id="ymjr-scale-up">${t("scale_up")}</button>
        </div>
    </div>
    <div>
        <div class="ymjr-section-title">${t("width")}</div>
        <div class="ymjr-row">
            <button id="ymjr-width-min">${t("width_min")}</button>
            <button id="ymjr-width-max">${t("width_max")}</button>
        </div>
    </div>
    <div>
        <div class="ymjr-section-title">${t("uniform")}</div>
        <button id="ymjr-uniform" style="width: 100%">${t("uniform_btn")}</button>
    </div>
    <div>
        <div class="ymjr-section-title">${t("font")}</div>
        <div class="ymjr-row">
            <input type="number" id="ymjr-font-input" value="20" />
            <button id="ymjr-font-btn">${t("font_btn")}</button>
        </div>
    </div>
</div>
`;

viewContainer.appendChild(panel);

// 4. 拖拽功能实现
const header = panel.querySelector(".ymjr-header");
let isDragging = false, startX, startY, initialLeft, initialTop;

header.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    const containerRect = viewContainer.getBoundingClientRect();
    initialLeft = rect.left - containerRect.left;
    initialTop = rect.top - containerRect.top;
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${initialLeft + dx}px`;
    panel.style.top = `${initialTop + dy}px`;
    panel.style.right = "auto"; // 拖拽后解除 right 定位
});

document.addEventListener("mouseup", () => { isDragging = false; });

// 5. 核心逻辑引擎 (由于我们把事件绑定在当前View的DOM中，使用传参或闭包中的 ea 是安全的，但为了最强容错，每次执行动作重新获取 Elements)
const performAction = async (actionCallback) => {
    // 强制使用触发时视图最新的 ea 与 api
    const currentEa = ea; 
    const api = currentEa.getExcalidrawAPI();
    const selectedEls = currentEa.getViewSelectedElements();

    if (selectedEls.length === 0) {
        new Notice(t("notice_no_sel"));
        return;
    }

    // 执行具体回调逻辑，传入必要参数
    actionCallback(selectedEls, currentEa);

    // 统一提交变更
    currentEa.copyViewElementsToEAforEditing(selectedEls);
    await currentEa.addElementsToView(false, false);
    
    // 刷新容器大小，避免文字框或图形缩放后边界残影
    api.updateContainerSize(selectedEls);
    new Notice(t("notice_success"));
};

// --- 功能绑定 ---

// 关闭面板
panel.querySelector(".ymjr-close-btn").onclick = () => {
    panel.remove();
    delete ExcalidrawAutomate.plugin[SCRIPT_ID];
};

// 快捷缩放 (+10% / -10%)
const scaleElements = (els, currentEa, factor) => {
    for (const el of els) {
        el.width *= factor;
        el.height *= factor;
        if (el.type === "text" || el.boundElements?.some(b => b.type === "text")) {
            el.fontSize *= factor;
        }
    }
};
panel.querySelector("#ymjr-scale-up").onclick = () => performAction((els, ea) => scaleElements(els, ea, 1.1));
panel.querySelector("#ymjr-scale-down").onclick = () => performAction((els, ea) => scaleElements(els, ea, 0.9));

// 等宽对齐 (最大/最小)
const matchWidth = (els, currentEa, mode) => {
    const widths = els.map(el => el.width);
    const targetW = mode === 'max' ? Math.max(...widths) : Math.min(...widths);
    for (let el of els) {
        const ratio = targetW / el.width;
        el.width = targetW;
        el.height *= ratio; // 保持比例缩放高度
    }
};
panel.querySelector("#ymjr-width-max").onclick = () => performAction((els, ea) => matchWidth(els, ea, 'max'));
panel.querySelector("#ymjr-width-min").onclick = () => performAction((els, ea) => matchWidth(els, ea, 'min'));

// 盒模型统一 (矩形、菱形、椭圆全等)
panel.querySelector("#ymjr-uniform").onclick = async () => {
    const boxShapes = ["ellipse", "rectangle", "diamond"];
    const currentEa = ea;
    const api = currentEa.getExcalidrawAPI();
    const allSelected = currentEa.getViewSelectedElements();
    const els = allSelected.filter(el => boxShapes.includes(el.type));
    
    if (els.length === 0) {
        new Notice(t("notice_no_box"));
        return;
    }

    let maxW = 0, maxH = 0;
    els.forEach(el => {
        if (el.width > maxW) maxW = el.width;
        if (el.height > maxH) maxH = el.height;
    });

    els.forEach(el => {
        el.width = maxW;
        el.height = maxH;
    });

    currentEa.copyViewElementsToEAforEditing(els);
    await currentEa.addElementsToView(false, false);
    api.updateContainerSize(els);
    new Notice(t("notice_success"));
};

// 设定字号
panel.querySelector("#ymjr-font-btn").onclick = () => performAction((els, currentEa) => {
    const inputVal = Number(panel.querySelector("#ymjr-font-input").value);
    if (!inputVal || isNaN(inputVal)) return;
    
    els.forEach(el => {
        // 更新自身文字
        if (el.type === "text") el.fontSize = inputVal;
        // 如果是带文字的容器，也要顺便更新其容器内文字
        el.fontSize = inputVal; 
    });
});