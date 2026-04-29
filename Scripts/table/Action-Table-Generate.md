---
name: 生成表格面板
description: 呼出悬浮美观的面板来实时生成并调整表格。
author: ymjr
version: 1.0.0
license: MIT
autorun: false
---
/*
```javascript
*/
var locales = {
    zh: {
        title: "⚡ 快速生成表格",
        btn_confirm: "确认并插入",
        notice_done: "✨ 表格已生成",
        notice_cancel: "⭕ 已取消"
    },
    en: {
        title: "⚡ Generate Table",
        btn_confirm: "Insert",
        notice_done: "✨ Table Generated",
        notice_cancel: "⭕ Cancelled"
    }
};

const plugin = ExcalidrawAutomate.plugin;
const PANEL_ID = "ea-table-generator-panel";

// 防止重复打开和污染
if (document.getElementById(PANEL_ID)) {
    document.getElementById(PANEL_ID).remove();
}
if (!plugin._ymjr_table_ui) plugin._ymjr_table_ui = {};

const origin = ea.getViewLastPointerPosition();
const startX = origin.x;
const startY = origin.y;

// 面板状态隔离存储
plugin._ymjr_table_ui.settings = {
    rows: 4,
    cols: 3,
    cellWidth: 120,
    cellHeight: 60
};
plugin._ymjr_table_ui.previewIDs = [];

async function runDraw(isPreview = true) {
    const state = plugin._ymjr_table_ui;
    
    if (state.previewIDs.length > 0) {
        const api = ea.getExcalidrawAPI();
        const next = api.getSceneElements().filter(el => !state.previewIDs.includes(el.id));
        ea.targetView.updateScene({ elements: next, storeAction: "none" });
        state.previewIDs = [];
    }

    ea.clear();
    ea.style.strokeWidth = 2;
    ea.style.roughness = 0;
    ea.style.backgroundColor = "transparent";

    const { rows, cols, cellWidth, cellHeight } = state.settings;
    let rootId = undefined;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let x = startX + j * cellWidth;
            let y = startY + i * cellHeight;
            
            let id = ea.addRect(x, y, cellWidth, cellHeight);
            if (!rootId) rootId = id;

            let element = ea.getElement(id);
            element.customData = {
                ...element.customData,
                table: { root: rootId, row: i, col: j, rowNum: rows, colNum: cols }
            };
            state.previewIDs.push(id);
        }
    }
    ea.addToGroup(state.previewIDs);
    await ea.addElementsToView(false, !isPreview, false);
}

function createFloatingPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    
    // 现代玻璃态拟物 UI
    panel.style.cssText = `
        position: fixed; top: 20%; left: 10%; width: 300px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        border-radius: 10px; z-index: 9999;
        display: flex; flex-direction: column; overflow: hidden;
        backdrop-filter: blur(12px); font-family: var(--font-interface);
    `;

    // 头部拖拽区
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 12px 16px; background: var(--background-secondary-alt);
        cursor: grab; border-bottom: 1px solid var(--background-modifier-border);
        display: flex; justify-content: space-between; align-items: center;
        user-select: none; font-weight: 600; font-size: 14px; color: var(--text-normal);
    `;
    header.innerHTML = `<span>${t("title")}</span><button class="clickable-icon" style="background:none;border:none;cursor:pointer;color:var(--text-muted);">✕</button>`;
    header.querySelector('button').onclick = () => closePanel(false);
    panel.appendChild(header);

    // 内容输入区
    const content = document.createElement('div');
    content.style.cssText = `padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;`;

    const createInput = (label, key) => {
        const div = document.createElement('div');
        div.innerHTML = `<label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:6px;">${label}</label>`;
        const input = document.createElement('input');
        input.type = "number"; input.value = plugin._ymjr_table_ui.settings[key];
        input.className = "search-input"; // 利用 Obsidian 原生类名
        input.style.width = "100%";
        input.onchange = (e) => { 
            plugin._ymjr_table_ui.settings[key] = Number(e.target.value); 
            runDraw(true); 
        };
        div.appendChild(input);
        content.appendChild(div);
    };

    createInput("行数 (Rows)", "rows");
    createInput("列数 (Cols)", "cols");
    createInput("宽度 (Width)", "cellWidth");
    createInput("高度 (Height)", "cellHeight");
    panel.appendChild(content);

    // 底部动作区
    const footer = document.createElement('div');
    footer.style.cssText = `padding: 12px 16px; border-top: 1px solid var(--background-modifier-border); display: flex; justify-content: flex-end; background: var(--background-secondary);`;
    const btn = document.createElement('button');
    btn.innerText = t("btn_confirm");
    btn.className = "mod-cta"; // Obsidian主按钮样式
    btn.onclick = () => closePanel(true);
    footer.appendChild(btn);
    panel.appendChild(footer);

    document.body.appendChild(panel);

    // 拖拽逻辑完善
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; header.style.cursor = 'grabbing';
        startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); 
        initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { 
            isDragging = false; header.style.cursor = 'grab';
            document.onmousemove = null; document.onmouseup = null; 
        };
    };

    runDraw(true);
}

function closePanel(confirm) {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();
    
    if (confirm) {
        runDraw(false);
        new Notice(t("notice_done"));
    } else {
        const state = plugin._ymjr_table_ui;
        if (state.previewIDs.length > 0) {
            const api = ea.getExcalidrawAPI();
            const next = api.getSceneElements().filter(el => !state.previewIDs.includes(el.id));
            ea.targetView.updateScene({ elements: next, storeAction: "none" });
            new Notice(t("notice_cancel"));
        }
    }
    delete plugin._ymjr_table_ui;
}

createFloatingPanel();