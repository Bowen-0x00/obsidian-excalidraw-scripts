---
name: 渐变色高级配置面板
description: 悬浮面板：强大的渐变色编辑器，支持实时预览、多节点色标控制、径向渐变选择，并可从选中元素反向读取状态。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行此脚本呼出高级渐变色控制面板。支持可视化选择渐变方向、添加/删除/拖拽多个色标点。如果打开面板时已选中带有渐变的元素，面板会自动反向读取其渐变配置以供修改。
features:
  - 提供可视化的多节点颜色与进度百分比 (`offset`) 调节
  - 支持线性（水平、垂直、对角）及径向（中心发散）渐变
  - 支持将用户的配置转化为底层 Canvas 指令脚本存入元素的 `customData.gradient`
dependencies:
  - 必须依赖 [Feature-Gradient-Engine] 后台引擎进行最终的渲染与 SVG 导出拦截
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_select: "⚠️ 当前未选中任何元素，您可以先调整面板，随后选中元素将自动应用。",
    notice_cleared: "🧹 已清除所选元素的渐变色",
    ui_title: "🌈 渐变编辑器",
    ui_type: "渐变类型",
    ui_linear_h: "线性 - 水平",
    ui_linear_v: "线性 - 垂直",
    ui_linear_d: "线性 - 对角",
    ui_radial: "径向 - 中心发散",
    ui_stops_title: "色标节点 (0% - 100%)",
    ui_add_stop: "➕ 添加节点",
    ui_clear: "清除渐变",
    ui_done: "完成"
  },
  en: {
    notice_no_select: "⚠️ No element selected. You can adjust the panel first; it will apply to selected elements later.",
    notice_cleared: "🧹 Gradient cleared for selected elements",
    ui_title: "🌈 Gradient Editor",
    ui_type: "Gradient Type",
    ui_linear_h: "Linear - Horizontal",
    ui_linear_v: "Linear - Vertical",
    ui_linear_d: "Linear - Diagonal",
    ui_radial: "Radial - Center",
    ui_stops_title: "Stops (0% - 100%)",
    ui_add_stop: "➕ Add Stop",
    ui_clear: "Clear",
    ui_done: "Done"
  }
};
const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();

// ==========================================
// 1. 状态管理与初始化
// ==========================================
let uiState = {
    direction: "horizontal", // horizontal, vertical, diagonal, radial
    stops: [
        { offset: 0, color: "#5EFCE8" },
        { offset: 1, color: "#736EFE" }
    ]
};

// 反向读取当前选中元素的渐变状态
const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length > 0 && selectedEls[0].customData?.gradient) {
    const script = selectedEls[0].customData.gradient;
    if (script.includes("createRadialGradient")) uiState.direction = "radial";
    else if (script.includes("0, 0, 0, el.height")) uiState.direction = "vertical";
    else if (script.includes("0, 0, el.width, el.height")) uiState.direction = "diagonal";
    else uiState.direction = "horizontal";

    const stopMatches = [...script.matchAll(/addColorStop\(([\d.]+),\s*["']([^"']+)["']/g)];
    if (stopMatches.length > 0) {
        uiState.stops = stopMatches.map(m => ({ offset: parseFloat(m[1]), color: m[2] }));
        // 确保按 offset 排序
        uiState.stops.sort((a, b) => a.offset - b.offset);
    }
} else if (selectedEls.length === 0) {
    new Notice(t("notice_no_select"));
}

// ==========================================
// 2. 核心渲染逻辑 (实时应用)
// ==========================================
function applyGradient() {
    const els = ea.getViewSelectedElements();
    if (els.length === 0) return;

    let coords = "0, 0, el.width, 0"; 
    let typeFn = "createLinearGradient";

    if (uiState.direction === "radial") {
        typeFn = "createRadialGradient";
        coords = "el.width/2, el.height/2, 0, el.width/2, el.height/2, Math.max(el.width, el.height)/2";
    } else if (uiState.direction === "vertical") {
        coords = "0, 0, 0, el.height";
    } else if (uiState.direction === "diagonal") {
        coords = "0, 0, el.width, el.height";
    }

    let script = `var gradient = ctx.${typeFn}(${coords});\n`;
    // 强制按 offset 从小到大排序后生成脚本
    const sortedStops = [...uiState.stops].sort((a, b) => a.offset - b.offset);
    sortedStops.forEach(s => {
        script += `gradient.addColorStop(${s.offset}, "${s.color}");\n`;
    });

    els.forEach((el) => {
        el.customData = { ...el.customData, gradient: script };
        api.ShapeCache?.cache?.delete(el); 
    });

    ea.copyViewElementsToEAforEditing(els);
    ea.addElementsToView(false, false, false);
}

function removeGradient() {
    const els = ea.getViewSelectedElements();
    if (els.length === 0) return;

    els.forEach((el) => {
        if (el.customData?.gradient) {
            delete el.customData.gradient;
            api.ShapeCache?.cache?.delete(el);
        }
    });
    ea.copyViewElementsToEAforEditing(els);
    ea.addElementsToView(false, false, false);
    new Notice(t("notice_cleared"));
}

// ==========================================
// 3. UI 构建与交互
// ==========================================
function createGradientPanel() {
    if (document.getElementById("ea-gradient-adv-panel")) return;

    const panel = document.createElement('div');
    panel.id = "ea-gradient-adv-panel";
    panel.style.cssText = `position:fixed; top:120px; right:80px; width:280px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.25); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    // 头部
    const header = document.createElement('div');
    header.style.cssText = `padding:12px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b style="font-size:14px;">${t("ui_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:15px;`;

    // 类型选择
    const typeDiv = document.createElement('div');
    typeDiv.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    typeDiv.innerHTML = `<label style="font-size:13px; color:var(--text-normal);">${t("ui_type")}</label>`;
    
    const dirSelect = document.createElement('select');
    dirSelect.style.cssText = "width:150px; background:var(--background-modifier-form-field); border-radius:4px; padding:4px;";
    const dirs = { "horizontal": t("ui_linear_h"), "vertical": t("ui_linear_v"), "diagonal": t("ui_linear_d"), "radial": t("ui_radial") };
    Object.entries(dirs).forEach(([val, text]) => {
        const o = document.createElement('option'); o.value = val; o.innerText = text;
        if(uiState.direction === val) o.selected = true; dirSelect.appendChild(o);
    });
    dirSelect.onchange = (e) => { uiState.direction = e.target.value; applyGradient(); };
    typeDiv.appendChild(dirSelect);
    content.appendChild(typeDiv);

    // 节点控制器列表
    const stopsContainerWrapper = document.createElement('div');
    stopsContainerWrapper.style.cssText = `background:var(--background-secondary-alt); border:1px solid var(--background-modifier-border); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:10px;`;
    
    const stopsTitle = document.createElement('div');
    stopsTitle.style.cssText = "font-size:12px; font-weight:bold; color:var(--text-muted); display:flex; justify-content:space-between;";
    stopsTitle.innerHTML = `<span>${t("ui_stops_title")}</span>`;
    stopsContainerWrapper.appendChild(stopsTitle);

    const stopsList = document.createElement('div');
    stopsList.style.cssText = "display:flex; flex-direction:column; gap:8px;";
    stopsContainerWrapper.appendChild(stopsList);

    // 渲染色标节点的函数
    const renderStops = () => {
        stopsList.innerHTML = "";
        uiState.stops.forEach((stop, index) => {
            const row = document.createElement('div');
            row.style.cssText = "display:flex; align-items:center; gap:8px;";

            const cPicker = document.createElement('input');
            cPicker.type = "color"; cPicker.value = stop.color;
            cPicker.style.cssText = "width:28px; height:28px; padding:0; border:none; background:none; cursor:pointer;";
            cPicker.oninput = (e) => { uiState.stops[index].color = e.target.value; applyGradient(); };

            const slider = document.createElement('input');
            slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.value = Math.round(stop.offset * 100);
            slider.style.cssText = "flex:1; cursor:pointer;";
            
            const valLabel = document.createElement('span');
            valLabel.style.cssText = "font-size:11px; width:30px; text-align:right; color:var(--text-muted); font-family:monospace;";
            valLabel.innerText = `${slider.value}%`;

            slider.oninput = (e) => {
                const val = e.target.value;
                valLabel.innerText = `${val}%`;
                uiState.stops[index].offset = val / 100;
                applyGradient();
            };

            const delBtn = document.createElement('button');
            delBtn.innerHTML = "✕";
            delBtn.style.cssText = "background:none; border:none; cursor:pointer; color:var(--text-error); padding:2px 6px; font-size:10px;";
            delBtn.disabled = uiState.stops.length <= 2;
            if(uiState.stops.length <= 2) delBtn.style.opacity = "0.3";
            delBtn.onclick = () => {
                if(uiState.stops.length > 2) {
                    uiState.stops.splice(index, 1);
                    renderStops(); applyGradient();
                }
            };

            row.appendChild(cPicker); row.appendChild(slider); row.appendChild(valLabel); row.appendChild(delBtn);
            stopsList.appendChild(row);
        });
    };
    renderStops();

    // 添加节点按钮
    const btnAddStop = document.createElement('button');
    btnAddStop.innerText = t("ui_add_stop");
    btnAddStop.style.cssText = "width:100%; padding:4px; font-size:12px; background:var(--interactive-normal); border:1px dashed var(--background-modifier-border); border-radius:4px; cursor:pointer; color:var(--text-muted);";
    btnAddStop.onclick = () => {
        uiState.stops.push({ offset: 0.5, color: "#ffffff" });
        renderStops(); applyGradient();
    };
    stopsContainerWrapper.appendChild(btnAddStop);

    content.appendChild(stopsContainerWrapper);
    panel.appendChild(content);

    // 底部操作区
    const footer = document.createElement('div');
    footer.style.cssText = `padding:12px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; background:var(--background-secondary); border-radius: 0 0 8px 8px;`;
    
    const btnClear = document.createElement('button');
    btnClear.innerText = t("ui_clear"); btnClear.onclick = removeGradient;
    
    const btnDone = document.createElement('button');
    btnDone.innerText = t("ui_done"); btnDone.className = "mod-cta";
    btnDone.onclick = () => panel.remove();
    
    footer.appendChild(btnClear); footer.appendChild(btnDone);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 拖拽逻辑
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

    // 初始如果选中了元素，立刻渲染一遍预览
    if (selectedEls.length > 0 && !selectedEls[0].customData?.gradient) {
        applyGradient();
    }
}

createGradientPanel();