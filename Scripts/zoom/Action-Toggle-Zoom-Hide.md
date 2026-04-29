---
name: 设置缩放隐藏规则
description: 悬浮面板：为选中的元素设置缩放可见区间，超出此范围将自动隐藏。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的一个或多个元素，运行此脚本将唤起“可见范围配置”面板。通过拖动滑块可以设置元素在画板的缩放百分比处于什么范围时才显示（例如仅在放大到 150% 以上时显示细节文本）。
features:
  - 提供原生的悬浮控制面板进行滑动式阈值输入
  - 自动向选中元素注入 `customData.zoomHide` 的 `[min, max]` 区间
  - 兼容读取老版本单阈值 ( `<100` 或 `>200`) 的数据结构
dependencies:
  - 必须依赖 [Feature-ZoomHide-Engine] 进行底层可见性渲染的拦截控制
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "⚠️ 请先选中需要设置缩放隐藏的元素！",
    notice_cleared: "🧹 已清除所选元素的可见范围限制",
    notice_applied: "✨ 可见范围已设定为 {min}% ~ {max}%",
    ui_title: "🔍 可见范围配置",
    ui_desc: "设置元素的可见缩放区间，当前缩放超出此范围时将自动隐藏。",
    ui_min: "最小显示比例",
    ui_max: "最大显示比例",
    ui_clear: "清除配置",
    ui_done: "完成配置"
  },
  en: {
    notice_select: "⚠️ Please select elements to set zoom hide rules first!",
    notice_cleared: "🧹 Zoom visibility limits cleared for selected elements",
    notice_applied: "✨ Visibility range set to {min}% ~ {max}%",
    ui_title: "🔍 Visibility Range Config",
    ui_desc: "Set the visible zoom interval. Elements will be hidden when outside this range.",
    ui_min: "Min Zoom Ratio",
    ui_max: "Max Zoom Ratio",
    ui_clear: "Clear Config",
    ui_done: "Done"
  }
};
const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}


changeElementsVisiable = function (elements, visiable) {
    elements.forEach((el) => {
        el.customData = el.customData || {};
        el.customData.hide = !visiable;
    });
};


// ==========================================
// 1. 状态初始化 (反向读取)
// ==========================================
// 默认区间: 10% 到 500% (即几乎全可见)
let uiState = { min: 0.1, max: 5.0 };

if (Array.isArray(selectedEls[0].customData?.zoomHide)) {
    uiState.min = selectedEls[0].customData.zoomHide[0];
    uiState.max = selectedEls[0].customData.zoomHide[1];
} else if (selectedEls[0].customData?.zoomHide?.threshold) {
    // 兼容老版本数据的平滑过渡
    const oldStr = selectedEls[0].customData.zoomHide.threshold;
    const oldVal = parseFloat(oldStr.substring(1));
    if (oldStr.startsWith("<")) { uiState.max = oldVal; } 
    else { uiState.min = oldVal; }
}

// ==========================================
// 2. 核心数据应用逻辑
// ==========================================
function applyZoomHide() {
    const els = ea.getViewSelectedElements();
    if (els.length === 0) return;

    els.forEach((el) => {
        el.customData = {
            ...el.customData,
            zoomHide: [uiState.min, uiState.max]
        };
    });

    ea.copyViewElementsToEAforEditing(els);
    ea.addElementsToView(false, false, false);
}

function removeZoomHide() {
    const els = ea.getViewSelectedElements();
    if (els.length === 0) return;

    els.forEach((el) => {
        if (el.customData?.zoomHide) {
            delete el.customData.zoomHide;
            changeElementsVisiable([el], true);
        }
    });

    ea.copyViewElementsToEAforEditing(els);
    ea.addElementsToView(false, false, false);
    new Notice(t("notice_cleared"));
}

// ==========================================
// 3. 构建 UI 面板
// ==========================================
function createZoomHidePanel() {
    if (document.getElementById("ea-zoomhide-adv-panel")) {
        document.getElementById("ea-zoomhide-adv-panel").remove();
    }

    const panel = document.createElement('div');
    panel.id = "ea-zoomhide-adv-panel";
    panel.style.cssText = `position:fixed; top:150px; right:100px; width:280px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.25); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    // 头部拖拽区
    const header = document.createElement('div');
    header.style.cssText = `padding:12px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b style="font-size:14px;">${t("ui_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;

    // 提示文案
    const desc = document.createElement('div');
    desc.style.cssText = "font-size:12px; color:var(--text-muted); line-height:1.4;";
    desc.innerText = t("ui_desc");
    content.appendChild(desc);

    // 通用创建滑块行的函数
    const createSliderRow = (title, initValue, isMin) => {
        const row = document.createElement('div');
        row.style.cssText = `background:var(--background-secondary-alt); border:1px solid var(--background-modifier-border); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:8px;`;
        
        const rowHeader = document.createElement('div');
        rowHeader.style.cssText = "display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-normal); font-weight:bold;";
        rowHeader.innerHTML = `<span>${title}</span>`;
        
        const valLabel = document.createElement('span');
        valLabel.style.cssText = "color:var(--text-accent);";
        valLabel.innerText = `${Math.round(initValue * 100)}%`;
        rowHeader.appendChild(valLabel);
        row.appendChild(rowHeader);

        const slider = document.createElement('input');
        slider.type = "range"; slider.min = "10"; slider.max = "500"; slider.step = "5"; 
        slider.value = Math.round(initValue * 100);
        slider.style.cssText = "width:100%; cursor:pointer;";
        
        slider.oninput = (e) => {
            let percent = parseInt(e.target.value);
            
            // 交叉验证防呆逻辑：Min 不能大于 Max
            if (isMin && percent > Math.round(uiState.max * 100)) {
                percent = Math.round(uiState.max * 100);
                slider.value = percent;
            } else if (!isMin && percent < Math.round(uiState.min * 100)) {
                percent = Math.round(uiState.min * 100);
                slider.value = percent;
            }

            valLabel.innerText = `${percent}%`;
            if (isMin) uiState.min = percent / 100;
            else uiState.max = percent / 100;
            
            applyZoomHide();
        };
        row.appendChild(slider);
        return row;
    };

    content.appendChild(createSliderRow(t("ui_min"), uiState.min, true));
    content.appendChild(createSliderRow(t("ui_max"), uiState.max, false));
    panel.appendChild(content);

    // 底部操作区
    const footer = document.createElement('div');
    footer.style.cssText = `padding:12px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; background:var(--background-secondary); border-radius: 0 0 8px 8px;`;
    
    const btnClear = document.createElement('button');
    btnClear.innerText = t("ui_clear"); 
    btnClear.onclick = () => { removeZoomHide(); panel.remove(); };
    
    const btnDone = document.createElement('button');
    btnDone.innerText = t("ui_done"); btnDone.className = "mod-cta";
    btnDone.onclick = () => { applyZoomHide(); panel.remove(); new Notice(t("notice_applied", { min: Math.round(uiState.min*100), max: Math.round(uiState.max*100) })); };
    
    footer.appendChild(btnClear); footer.appendChild(btnDone);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 拖拽支持
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (ev) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + ev.clientX - startX) + 'px';
            panel.style.top = (initTop + ev.clientY - startY) + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };

    // 初始化时套用一次配置
    applyZoomHide();
}

createZoomHidePanel();