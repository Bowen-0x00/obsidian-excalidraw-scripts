---
name: 生成多边形
description: 强大的多边形生成工具，支持等边模式或自定义各边长度。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本，通过多边形生成器 UI 面板配置边数和边长。可以选择“等边模式”或者手动输入以逗号分隔的各条边长度。
features:
  - 实时可视化预览生成任意多边形
  - 支持开启和关闭“等边模式”
  - 生成的结果为闭合线段，支持 Excalidraw 原生编辑
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    ui_title: "多边形生成器",
    ui_sides: "边数",
    ui_rotation: "旋转 (°)",
    ui_regular_mode: "等边模式",
    ui_side_length: "边长:",
    ui_custom_lengths: "各边长度 (逗号分隔):",
    ui_custom_placeholder: "例如: 100, 120, 80",
    ui_confirm: "确认生成",
    notice_success: "多边形已生成",
    notice_cancelled: "已取消"
  },
  en: {
    ui_title: "Polygon Generator",
    ui_sides: "Sides",
    ui_rotation: "Rotation (°)",
    ui_regular_mode: "Equal Sides",
    ui_side_length: "Side Length:",
    ui_custom_lengths: "Side Lengths (CSV):",
    ui_custom_placeholder: "e.g. 100, 120, 80",
    ui_confirm: "Confirm Generate",
    notice_success: "Polygon generated",
    notice_cancelled: "Cancelled"
  }
};
const { Notice } = ea.obsidian;

const origin = ea.getViewLastPointerPosition();
const centerX = origin.x;
const centerY = origin.y;

let settings = {
    sides: 3,
    isRegular: true,
    sideLength: 100,
    customLengths: "100, 120, 80",
    rotation: 0
};

let previewIDs = [];

async function runDraw(isPreview = true) {
    if (previewIDs.length > 0) {
        const api = ea.getExcalidrawAPI();
        const next = api.getSceneElements().filter(el => !previewIDs.includes(el.id));
        ea.targetView.updateScene({ elements: next, storeAction: "none" });
        previewIDs = [];
    }

    ea.clear();
    ea.style.strokeWidth = 2;
    ea.style.roughness = 0; 
    ea.style.backgroundColor = "transparent";
    ea.style.fillStyle = "solid";

    const { sides, isRegular, sideLength, customLengths, rotation } = settings;

    let lengths = [];
    if (isRegular) {
        lengths = Array(sides).fill(sideLength);
    } else {
        const raw = customLengths.split(/[,，\s]+/);
        lengths = raw.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (lengths.length === 0) lengths = [100];
        while (lengths.length < sides) {
            lengths.push(lengths[lengths.length % lengths.length] || 100);
        }
    }

    let rawPoints = [[0, 0]];
    let cx = 0, cy = 0;
    let currentAngle = 0; 
    const turnAngle = (2 * Math.PI) / sides;

    for (let i = 0; i < sides - 1; i++) {
        const len = lengths[i];
        cx += len * Math.cos(currentAngle);
        cy += len * Math.sin(currentAngle);
        rawPoints.push([cx, cy]);
        currentAngle += turnAngle;
    }
    rawPoints.push([0, 0]);

    let sumX = 0, sumY = 0;
    for(let i=0; i<sides; i++) {
        sumX += rawPoints[i][0];
        sumY += rawPoints[i][1];
    }
    const centroidX = sumX / sides;
    const centroidY = sumY / sides;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const absolutePoints = rawPoints.map(p => {
        const dx = p[0] - centroidX;
        const dy = p[1] - centroidY;
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        return [centerX + rx, centerY + ry];
    });

    const polyId = ea.addLine(absolutePoints);
    const el = ea.getElement(polyId);
    
    if (el) {
        el.polygon = true; 
        el.type = "line"; 
    }

    previewIDs.push(polyId);
    await ea.addElementsToView(false, !isPreview, false);
}

function createFloatingPanel() {
    if (document.getElementById("ea-polygon-v3-panel")) return;

    const panelWidth = 300;
    const panelHeight = 280;
    const startLeft = Math.max(0, (window.innerWidth - panelWidth) / 2);
    const startTop = Math.max(0, (window.innerHeight - panelHeight) / 2);

    const panel = document.createElement('div');
    panel.id = "ea-polygon-v3-panel";
    panel.style.cssText = `position:fixed; top:${startTop}px; left:${startLeft}px; width:${panelWidth}px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 4px 12px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const header = document.createElement('div');
    header.style.cssText = `padding:10px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b>${t("ui_title")}</b><button style="background:none;border:none;cursor:pointer;color:var(--text-normal);">✕</button>`;
    header.querySelector('button').onclick = () => closePanel(false);
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;

    const createRow = (label, element) => {
        const div = document.createElement('div');
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
        const lbl = document.createElement('label');
        lbl.innerText = label;
        lbl.style.cssText = "font-size:12px; color:var(--text-muted);";
        div.appendChild(lbl);
        div.appendChild(element);
        return div;
    };

    const sidesInput = document.createElement('input');
    sidesInput.type = "number"; sidesInput.min = "3"; sidesInput.value = settings.sides; sidesInput.style.width = "80px";
    sidesInput.onchange = (e) => {
        let val = parseInt(e.target.value) || 3;
        settings.sides = Math.max(3, val);
        runDraw(true);
    };
    content.appendChild(createRow(t("ui_sides"), sidesInput));

    const rotInput = document.createElement('input');
    rotInput.type = "number"; rotInput.value = settings.rotation; rotInput.style.width = "80px"; rotInput.step = "15";
    rotInput.onchange = (e) => {
        settings.rotation = parseFloat(e.target.value) || 0;
        runDraw(true);
    };
    content.appendChild(createRow(t("ui_rotation"), rotInput));

    const regularCheck = document.createElement('input');
    regularCheck.type = "checkbox"; regularCheck.checked = settings.isRegular;
    regularCheck.onchange = (e) => {
        settings.isRegular = e.target.checked;
        updateVisibility();
        runDraw(true);
    };
    content.appendChild(createRow(t("ui_regular_mode"), regularCheck));

    const lengthInputWrapper = document.createElement('div');
    const lengthInput = document.createElement('input');
    lengthInput.type = "number"; lengthInput.value = settings.sideLength; lengthInput.style.width = "100%";
    lengthInput.onchange = (e) => { settings.sideLength = parseFloat(e.target.value) || 0; runDraw(true); };
    lengthInputWrapper.innerHTML = `<label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:4px;">${t("ui_side_length")}</label>`;
    lengthInputWrapper.appendChild(lengthInput);
    content.appendChild(lengthInputWrapper);

    const customInputWrapper = document.createElement('div');
    const customInput = document.createElement('input');
    customInput.type = "text"; customInput.value = settings.customLengths; customInput.placeholder = t("ui_custom_placeholder"); customInput.style.width = "100%";
    customInput.onchange = (e) => { settings.customLengths = e.target.value; runDraw(true); };
    customInputWrapper.innerHTML = `<label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:4px;">${t("ui_custom_lengths")}</label>`;
    customInputWrapper.appendChild(customInput);
    content.appendChild(customInputWrapper);

    const updateVisibility = () => {
        lengthInputWrapper.style.display = settings.isRegular ? "block" : "none";
        customInputWrapper.style.display = settings.isRegular ? "none" : "block";
    };
    updateVisibility();

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
    const panel = document.getElementById("ea-polygon-v3-panel");
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