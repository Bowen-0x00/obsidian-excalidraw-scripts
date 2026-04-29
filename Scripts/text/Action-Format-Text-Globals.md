---
name: 文本全局样式设置
description: 悬浮面板：批量管理选中文字元素的全局字重与加粗状态。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中一个或多个文本元素（或包含绑定文本的图形），运行此脚本将唤起“全局样式”悬浮控制面板。通过面板的开关和输入框可以批量设置选中文字的字重 (Weight) 和加粗状态 (Bold)。
features:
  - 构建原生的悬浮 DOM 控制面板
  - 智能穿透 `boundElements` 获取绑定的文本内容并批量写入样式 `customData`
dependencies:
  - 需要依赖 [Feature-Text-Render-Engine] 常驻底层进行渲染
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选中包含文本的元素！",
    ui_title: "🅰️ 文本全局样式",
    ui_bold: "全局加粗 (Bold)",
    ui_weight: "字重 (Weight)"
  },
  en: {
    notice_select: "Please select elements containing text first!",
    ui_title: "🅰️ Global Text Style",
    ui_bold: "Global Bold",
    ui_weight: "Font Weight"
  }
};

const { Notice } = ea.obsidian;

function getSelectedTextElements() {
    const api = ea.getExcalidrawAPI();
    const elementsMap = api?.App?.scene?.getNonDeletedElementsMap?.() || new Map();
    const selectedEls = ea.getViewSelectedElements();
    const textEls = [];

    for (const el of selectedEls) {
        if (el.type === "text") {
            textEls.push(el);
        } else if (el.boundElements) {
            for (const bound of el.boundElements) {
                if (bound.type === "text") {
                    const textEl = elementsMap.get(bound.id);
                    if (textEl) textEls.push(textEl);
                }
            }
        }
    }
    return textEls;
}

function applyStyle(type, value) {
    const textEls = getSelectedTextElements();
    if (textEls.length === 0) {
        new Notice(t("notice_select"));
        return;
    }

    textEls.forEach((el) => {
        el.customData = el.customData || {};
        if (type === 'bold') {
            el.customData.bold = value;
            if (!value) delete el.customData.bold;
        } else if (type === 'weight') {
            el.customData.font = el.customData.font || {};
            el.customData.font.weight = value;
            if (!value) delete el.customData.font.weight;
        }
    });

    ea.copyViewElementsToEAforEditing(textEls);
    ea.addElementsToView();
}

function createPanel() {
    if (document.getElementById("ea-text-globals-panel")) return;

    const panel = document.createElement('div');
    panel.id = "ea-text-globals-panel";
    panel.style.cssText = `position:fixed; top:120px; right:80px; width:240px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 8px 24px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const header = document.createElement('div');
    header.style.cssText = `padding:10px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b>${t("ui_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer;">✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;

    // 粗体开关
    const rowBold = document.createElement('div');
    rowBold.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    rowBold.innerHTML = `<label style="font-size:13px;">${t("ui_bold")}</label>`;
    const boldCheck = document.createElement('input');
    boldCheck.type = "checkbox";
    boldCheck.onchange = (e) => applyStyle('bold', e.target.checked);
    rowBold.appendChild(boldCheck);
    content.appendChild(rowBold);

    // 字重输入
    const rowWeight = document.createElement('div');
    rowWeight.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    rowWeight.innerHTML = `<label style="font-size:13px;">${t("ui_weight")}</label>`;
    const weightInput = document.createElement('input');
    weightInput.type = "text";
    weightInput.placeholder = "e.g. 800";
    weightInput.style.cssText = "width:80px; text-align:center; background:var(--background-modifier-form-field); border-radius:4px;";
    weightInput.onchange = (e) => applyStyle('weight', e.target.value);
    rowWeight.appendChild(weightInput);
    content.appendChild(rowWeight);

    panel.appendChild(content);
    document.body.appendChild(panel);

    header.querySelector('#close-btn').onclick = () => panel.remove();

    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
}

createPanel();