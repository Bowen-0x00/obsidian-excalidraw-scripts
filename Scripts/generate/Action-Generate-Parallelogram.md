---
name: 生成平行四边形
description: 在鼠标位置生成可调节角度和边长的平行四边形，支持整体旋转。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本，打开“平行四边形生成器”面板，调整两条相邻边的长度、内角大小以及形状整体旋转角度。
features:
  - 实时更新的悬浮 UI 面板
  - 基于三角函数精确定位顶点并转换为闭合线段(line polygon)
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/

var locales = {
  zh: {
    ui_title: "平行四边形生成器",
    ui_side_a: "底边长度",
    ui_side_b: "斜边长度",
    ui_angle: "形状夹角 (°)",
    ui_rotation: "整体旋转 (°)",
    ui_confirm: "确认生成",
    notice_success: "平行四边形已生成",
    notice_cancelled: "已取消"
  },
  en: {
    ui_title: "Parallelogram Generator",
    ui_side_a: "Side A",
    ui_side_b: "Side B",
    ui_angle: "Angle (°)",
    ui_rotation: "Global Rotation (°)",
    ui_confirm: "Confirm Generate",
    notice_success: "Parallelogram generated",
    notice_cancelled: "Cancelled"
  }
};
const { Notice } = ea.obsidian;

// --- 1. 锁定锚点 ---
const origin = ea.getViewLastPointerPosition();
const centerX = origin.x;
const centerY = origin.y;

// --- 2. 配置与状态 ---
let settings = {
    sideA: 150,
    sideB: 100,
    angle: 60,
    globalRotation: 0
};

let previewIDs = [];

// --- 3. 核心绘图逻辑 ---
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

    const { sideA, sideB, angle, globalRotation } = settings;
    
    const rad = (angle * Math.PI) / 180;
    const p0 = [0, 0];
    const p1 = [sideA, 0];
    const p2 = [sideA + sideB * Math.cos(rad), -sideB * Math.sin(rad)];
    const p3 = [sideB * Math.cos(rad), -sideB * Math.sin(rad)];
    let rawPoints = [p0, p1, p2, p3, p0]; 

    let sumX = 0, sumY = 0;
    for(let i = 0; i < 4; i++) {
        sumX += rawPoints[i][0];
        sumY += rawPoints[i][1];
    }
    const centroidX = sumX / 4;
    const centroidY = sumY / 4;

    const globalRad = (globalRotation * Math.PI) / 180;
    const cosRot = Math.cos(globalRad);
    const sinRot = Math.sin(globalRad);

    const absolutePoints = rawPoints.map(p => {
        const dx = p[0] - centroidX;
        const dy = p[1] - centroidY;
        const rx = dx * cosRot - dy * sinRot;
        const ry = dx * sinRot + dy * cosRot;
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

// --- 4. 统一 UI 构建 ---
function createFloatingPanel() {
    if (document.getElementById("ea-parallelogram-panel")) return;

    const panelWidth = 280;
    const panelHeight = 260;
    const startLeft = Math.max(0, (window.innerWidth - panelWidth) / 2);
    const startTop = Math.max(0, (window.innerHeight - panelHeight) / 2);

    const panel = document.createElement('div');
    panel.id = "ea-parallelogram-panel";
    panel.style.cssText = `position:fixed; top:${startTop}px; left:${startLeft}px; width:${panelWidth}px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 4px 12px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const header = document.createElement('div');
    header.style.cssText = `padding:10px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b>${t("ui_title")}</b><button style="background:none;border:none;cursor:pointer;color:var(--text-normal);">✕</button>`;
    header.querySelector('button').onclick = () => closePanel(false);
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;

    const createRow = (label, key, min, max, step = 1) => {
        const div = document.createElement('div');
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
        
        const lbl = document.createElement('label');
        lbl.innerText = label;
        lbl.style.cssText = "font-size:12px; color:var(--text-muted);";
        
        const input = document.createElement('input');
        input.type = "number";
        input.value = settings[key];
        input.style.width = "80px";
        input.step = step;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        
        input.onchange = (e) => {
            let val = parseFloat(e.target.value) || 0;
            settings[key] = val;
            runDraw(true);
        };
        
        div.appendChild(lbl);
        div.appendChild(input);
        return div;
    };

    content.appendChild(createRow(t("ui_side_a"), "sideA", 1));
    content.appendChild(createRow(t("ui_side_b"), "sideB", 1));
    content.appendChild(createRow(t("ui_angle"), "angle", -360, 360));
    content.appendChild(createRow(t("ui_rotation"), "globalRotation", -360, 360, 15));

    panel.appendChild(content);

    const footer = document.createElement('div');
    footer.style.cssText = `padding:10px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:flex-end;`;
    const btn = document.createElement('button');
    btn.innerText = t("ui_confirm");
    btn.className = "mod-cta";
    btn.onclick = () => closePanel(true);
    footer.appendChild(btn);
    panel.appendChild(footer);

    document.body.appendChild(panel);

    // --- 防越界拖拽逻辑 ---
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (e) => {
            if(!isDragging) return;
            let newLeft = initLeft + e.clientX - startX;
            let newTop = initTop + e.clientY - startY;
            // 边界约束
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };

    runDraw(true);
}

function closePanel(confirm) {
    const panel = document.getElementById("ea-parallelogram-panel");
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