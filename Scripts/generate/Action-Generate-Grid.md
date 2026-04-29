---
name: 生成图形网格
description: 批量生成矩形、圆形、菱形或多边形网格阵列，间距支持动态公式。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本，打开“万能网格生成器”面板，配置行列数、形状类型、尺寸与间距。支持拖拽面板预览生成的网格结果。
features:
  - 可视化 GUI 面板控制网格生成参数
  - 支持基础形状（矩形、圆形、菱形）以及自定义多边形生成
  - 间距支持利用 width / height 变量进行数学公式计算（如 "width * 0.5"）
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    ui_title: "万能网格生成器",
    ui_shape_type: "形状类型",
    ui_poly_sides: "多边形边数",
    ui_poly_rotation: "多边形旋转 (°)",
    ui_rows: "行数",
    ui_cols: "列数",
    ui_width: "宽度",
    ui_height: "高度",
    ui_spacing_x: "水平间距",
    ui_spacing_y: "垂直间距",
    ui_confirm: "确认生成",
    notice_success: "网格已生成",
    notice_cancelled: "已取消",
    type_rect: "矩形 (Rectangle)",
    type_diamond: "菱形 (Diamond)",
    type_ellipse: "椭圆 (Ellipse)",
    type_poly: "多边形 (Polygon)",
    type_star: "星形 (Star)"
  },
  en: {
    ui_title: "Universal Grid Generator",
    ui_shape_type: "Shape Type",
    ui_poly_sides: "Polygon Sides",
    ui_poly_rotation: "Polygon Rotation (°)",
    ui_rows: "Rows",
    ui_cols: "Columns",
    ui_width: "Width",
    ui_height: "Height",
    ui_spacing_x: "Horizontal Spacing",
    ui_spacing_y: "Vertical Spacing",
    ui_confirm: "Confirm Generate",
    notice_success: "Grid generated",
    notice_cancelled: "Cancelled",
    type_rect: "Rectangle",
    type_diamond: "Diamond",
    type_ellipse: "Ellipse",
    type_poly: "Polygon",
    type_star: "Star"
  }
};
const { Notice } = ea.obsidian;

const origin = ea.getViewLastPointerPosition(); 
const startX = origin.x;
const startY = origin.y;

let settings = {
    type: "rect",
    rows: 4, cols: 4,
    width: 100, height: 100,
    spacingX: "width", spacingY: "height",
    polySides: 3, polyRotation: 0
};

let previewIDs = []; 

// 【安全修复】拦截非法字符，防止利用 new Function 进行代码注入报错
function parseDimension(input, w, h) {
    if (typeof input === 'number') return input;
    if (!input) return 0;
    try {
        let expression = input.toString().toLowerCase()
            .replace(/width/g, w)
            .replace(/height/g, h);
        if (!/^[0-9+\-*/.() ]+$/.test(expression)) return 0;
        return new Function('return ' + expression)();
    } catch (e) { return 0; }
}

async function runDraw(isPreview = true) {
    if (previewIDs.length > 0) {
        const api = ea.getExcalidrawAPI();
        const next = api.getSceneElements().filter(el => !previewIDs.includes(el.id));
        ea.targetView.updateScene({ elements: next, storeAction: "none" });
        previewIDs = [];
    }

    ea.clear();
    ea.style.strokeWidth = 1;
    ea.style.strokeColor = "#1e1e1e"; 
    ea.style.strokeStyle = "solid";
    ea.style.fillStyle = "solid";
    ea.style.backgroundColor = "transparent"; 
    ea.style.roughness = 0;

    const { type, rows, cols, width, height, spacingX, spacingY, polySides, polyRotation } = settings;
    const realSpacingX = parseDimension(spacingX, width, height);
    const realSpacingY = parseDimension(spacingY, width, height);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let x = startX + j * (width + realSpacingX);
            let y = startY + i * (height + realSpacingY);
            let id;

            if (type === "polygon") {
                const cx = x + width / 2, cy = y + height / 2;
                const rx = width / 2, ry = height / 2;
                const points = [];
                const startAngle = -Math.PI / 2 + (polyRotation * Math.PI / 180);
                const step = (2 * Math.PI) / polySides;

                for (let k = 0; k < polySides; k++) {
                    const theta = startAngle + k * step;
                    points.push([cx + rx * Math.cos(theta), cy + ry * Math.sin(theta)]);
                }
                points.push(points[0]);

                id = ea.addLine(points);
                const el = ea.getElement(id);
                if (el) { el.polygon = true; el.type = "line"; }
            } else {
                switch (type) {
                    case "ellipse": id = ea.addEllipse(x, y, width, height); break;
                    case "diamond": id = ea.addDiamond(x, y, width, height); break;
                    case "rect":
                    default:        id = ea.addRect(x, y, width, height); break;
                }
            }
            if(id) previewIDs.push(id);
        }
    }
    await ea.addElementsToView(false, !isPreview, false); 
}

function createFloatingPanel() {
    if (document.getElementById("ea-grid-v3-panel")) return;

    const panelWidth = 320;
    const panelHeight = 350;
    const startLeft = Math.max(0, (window.innerWidth - panelWidth) / 2);
    const startTop = Math.max(0, (window.innerHeight - panelHeight) / 2);

    const panel = document.createElement('div');
    panel.id = "ea-grid-v3-panel";
    panel.style.cssText = `position:fixed; top:${startTop}px; left:${startLeft}px; width:${panelWidth}px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 4px 12px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

    const header = document.createElement('div');
    header.style.cssText = `padding:10px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b>${t("ui_title")}</b><button style="background:none;border:none;cursor:pointer;color:var(--text-normal);">✕</button>`;
    header.querySelector('button').onclick = () => closePanel(false);
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; align-items: center;`;

    const createInput = (label, key, type="number", extraOptions=[]) => {
        const wrapper = document.createElement('div');
        if (key === "polySides" || key === "polyRotation") wrapper.className = "poly-only";
        
        wrapper.innerHTML = `<label style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:4px;">${label}</label>`;

        let input;
        if (type === "select") {
            input = document.createElement('select');
            input.style.cssText = "width:100%; background:var(--background-primary); color:var(--text-normal); border:1px solid var(--background-modifier-border); padding:2px;";
            extraOptions.forEach(opt => {
                const o = document.createElement('option');
                o.text = opt.text; o.value = opt.value;
                if(settings[key] === opt.value) o.selected = true;
                input.appendChild(o);
            });
        } else {
            input = document.createElement('input');
            input.type = type; input.value = settings[key]; input.style.width = "100%";
        }

        input.onchange = (e) => {
            settings[key] = type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value;
            if (key === "type") updateVisibility();
            runDraw(true); 
        };

        wrapper.appendChild(input);
        content.appendChild(wrapper);
        return wrapper;
    };

    const typeWrapper = createInput(t("ui_shape_type"), "type", "select", [
        {text: t("type_rect"), value: "rect"}, {text: t("type_ellipse"), value: "ellipse"},
        {text: t("type_diamond"), value: "diamond"}, {text: t("type_poly"), value: "polygon"}
    ]);
    typeWrapper.style.gridColumn = "1 / -1";

    createInput(t("ui_poly_sides"), "polySides");
    createInput(t("ui_poly_rotation"), "polyRotation");
    createInput(t("ui_rows"), "rows"); createInput(t("ui_cols"), "cols");
    createInput(t("ui_width"), "width"); createInput(t("ui_height"), "height");
    createInput(t("ui_spacing_x"), "spacingX", "text"); createInput(t("ui_spacing_y"), "spacingY", "text");

    panel.appendChild(content);

    const updateVisibility = () => {
        const isPoly = settings.type === "polygon";
        panel.querySelectorAll('.poly-only').forEach(el => el.style.display = isPoly ? "block" : "none");
    };
    updateVisibility();

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
    const panel = document.getElementById("ea-grid-v3-panel");
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