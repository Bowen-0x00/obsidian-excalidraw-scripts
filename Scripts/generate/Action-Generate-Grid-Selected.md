---
name: 选区阵列生成
description: 根据当前选中的元素群体，批量复制并生成网格阵列，支持带公式的智能间距。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的一个或多个元素，运行脚本后在面板中配置行列数和间距。被选中的元素将作为基础单元被克隆为二维阵列。
features:
  - 精确处理复制元素的内部嵌套关系与绑定ID
  - 自动将新生成的阵列进行合理的 Group 分组
  - 支持带 width/height 变量的间距公式
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "❌ 请先选中一些元素！",
    ui_title: "选区阵列生成",
    ui_rows: "行数",
    ui_cols: "列数",
    ui_spacing_x: "水平间距",
    ui_spacing_y: "垂直间距",
    ui_confirm: "确认生成",
    notice_success: "阵列已生成",
    notice_cancelled: "已取消"
  },
  en: {
    notice_select: "❌ Please select some elements first!",
    ui_title: "Selection Grid Array",
    ui_rows: "Rows",
    ui_cols: "Columns",
    ui_spacing_x: "Horizontal Spacing",
    ui_spacing_y: "Vertical Spacing",
    ui_confirm: "Confirm Generate",
    notice_success: "Array generated",
    notice_cancelled: "Cancelled"
  }
};
const { Notice } = ea.obsidian;

const selectedEls = ea.getViewSelectedElements();
if (!selectedEls || selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

const box = ea.getBoundingBox(selectedEls);
const baseX = box.topX;
const baseY = box.topY;
const baseWidth = box.width;
const baseHeight = box.height;

let settings = { rows: 4, cols: 4, spacingX: "width", spacingY: "height" };
let previewIDs = [];

function parseDimension(input, w, h) {
    if (typeof input === 'number') return input;
    if (!input) return 0;
    try {
        let expression = input.toString().toLowerCase().replace(/width/g, w).replace(/height/g, h);
        if (!/^[0-9+\-*/.() ]+$/.test(expression)) return 0;
        return new Function('return ' + expression)();
    } catch (e) { return 0; }
}

function generateId() { return Math.random().toString(36).substring(2, 10); }

async function runDraw(isPreview = true) {
    if (previewIDs.length > 0) {
        const api = ea.getExcalidrawAPI();
        const next = api.getSceneElements().filter(el => !previewIDs.includes(el.id));
        ea.targetView.updateScene({ elements: next, storeAction: "none" });
        previewIDs = [];
    }
    ea.clear();
    
    const { rows, cols, spacingX, spacingY } = settings;
    const realSpacingX = parseDimension(spacingX, baseWidth, baseHeight);
    const realSpacingY = parseDimension(spacingY, baseWidth, baseHeight);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (i === 0 && j === 0) continue;

            const offsetX = j * realSpacingX;
            const offsetY = i * realSpacingY;
            const newGroupId = generateId();

            let cellEls = [];
            let idMap = {};

            // 【第一遍遍历】：深拷贝并分配全新独立ID，建立新老ID映射表
            for (const el of selectedEls) {
                const safeClone = JSON.parse(JSON.stringify(el)); // 彻底切断引用
                const oldId = safeClone.id;
                const newId = generateId();
                idMap[oldId] = newId;

                safeClone.id = newId;
                safeClone.x += offsetX;
                safeClone.y += offsetY;
                safeClone.seed = Math.floor(Math.random() * 100000);
                safeClone.version = 1;
                safeClone.versionNonce = 0;

                // 隔离 GroupID：保持原有层级，但附加网格坐标后缀
                if (safeClone.groupIds && safeClone.groupIds.length > 0) {
                    safeClone.groupIds = safeClone.groupIds.map(gid => gid + `_r${i}c${j}`);
                } else {
                    safeClone.groupIds = [];
                }
                safeClone.groupIds.push(newGroupId); // 绑入当前网格格子的总 Group
                
                cellEls.push(safeClone);
            }

            // 【第二遍遍历】：利用映射表，重新修复绑定关系 (containerId 和 boundElements)
            for (const newEl of cellEls) {
                if (newEl.containerId && idMap[newEl.containerId]) {
                    newEl.containerId = idMap[newEl.containerId];
                }
                if (newEl.boundElements && Array.isArray(newEl.boundElements)) {
                    newEl.boundElements = newEl.boundElements.map(b => {
                        return { ...b, id: idMap[b.id] || b.id };
                    });
                }
                ea.elementsDict[newEl.id] = newEl;
                previewIDs.push(newEl.id);
            }
        }
    }
    await ea.addElementsToView(false, !isPreview, false);
}

function createFloatingPanel() {
    if (document.getElementById("ea-grid-sel-panel")) return;

    const panelWidth = 300;
    const panelHeight = 220;
    const startLeft = Math.max(0, (window.innerWidth - panelWidth) / 2);
    const startTop = Math.max(0, (window.innerHeight - panelHeight) / 2);

    const panel = document.createElement('div');
    panel.id = "ea-grid-sel-panel";
    panel.style.cssText = `position:fixed; top:${startTop}px; left:${startLeft}px; width:${panelWidth}px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 4px 12px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const header = document.createElement('div');
    header.style.cssText = `padding:10px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b>${t("ui_title")}</b><button style="background:none;border:none;cursor:pointer;color:var(--text-normal);">✕</button>`;
    header.querySelector('button').onclick = () => closePanel(false);
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;`;

    const createInput = (label, key, type="number") => {
        const div = document.createElement('div');
        div.innerHTML = `<label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:4px;">${label}</label>`;
        const input = document.createElement('input');
        input.type = type; input.value = settings[key]; input.style.width = "100%";
        input.onchange = (e) => { 
            settings[key] = type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value; 
            runDraw(true); 
        };
        div.appendChild(input);
        content.appendChild(div);
    };

    createInput(t("ui_rows"), "rows"); createInput(t("ui_cols"), "cols");
    createInput(t("ui_spacing_x"), "spacingX", "text"); createInput(t("ui_spacing_y"), "spacingY", "text");

    panel.appendChild(content);

    const footer = document.createElement('div');
    footer.style.cssText = `padding:10px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:flex-end;`;
    const btn = document.createElement('button');
    btn.innerText = t("ui_confirm"); btn.className = "mod-cta"; btn.onclick = () => closePanel(true);
    footer.appendChild(btn);
    panel.appendChild(footer);

    document.body.appendChild(panel);

    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (e) => {
            if(!isDragging) return;
            let newLeft = Math.max(0, Math.min(initLeft + e.clientX - startX, window.innerWidth - rect.width));
            let newTop = Math.max(0, Math.min(initTop + e.clientY - startY, window.innerHeight - rect.height));
            panel.style.left = newLeft + 'px'; panel.style.top = newTop + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };

    runDraw(true);
}

function closePanel(confirm) {
    const panel = document.getElementById("ea-grid-sel-panel");
    if (panel) panel.remove();
    if (confirm) {
        runDraw(false);
        new Notice(t("notice_success"));
    } else {
        if (previewIDs.length > 0) {
            const api = ea.getExcalidrawAPI();
            const next = api.getSceneElements().filter(el => !previewIDs.includes(el.id));
            ea.targetView.updateScene({ elements: next, storeAction: "none" });
            new Notice(t("notice_cancelled"));
        }
    }
}

createFloatingPanel();