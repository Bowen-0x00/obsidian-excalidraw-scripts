---
name: 生成长方体 (Floating UI)
description: 带有浮动面板和实时预览的长方体生成工具
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本后弹出浮动面板，调节参数实时预览，点击确认生成。
features:
  - 友好的原生风格浮动UI界面
  - 实时预览长方体效果（不污染撤销历史）
  - 支持透视虚线显示
  - 状态隔离，防止全局变量污染
---
/*
```javascript
*/
var locales = {
  zh: {
    title: "📦 生成长方体",
    width: "宽度 (Width)",
    height: "高度 (Height)",
    depth: "深度 (Depth)",
    angle: "角度 (Angle)",
    dotted: "显示透视虚线",
    confirm: "确认生成",
    cancel: "取消",
    notice_success: "✨ 长方体已生成",
    notice_cancel: "⭕ 已取消生成"
  },
  en: {
    title: "📦 Generate Cuboid",
    width: "Width",
    height: "Height",
    depth: "Depth",
    angle: "Angle",
    dotted: "Show Dotted Lines",
    confirm: "Confirm",
    cancel: "Cancel",
    notice_success: "✨ Cuboid generated",
    notice_cancel: "⭕ Cancelled"
  }
};

const plugin = ExcalidrawAutomate.plugin;
const { Notice } = ea.obsidian;

// 1. 清理旧实例 (防止重复运行产生多个面板)
if (plugin._ymjr_cuboid) {
    plugin._ymjr_cuboid.closePanel(false, true); 
}

// 2. 初始化独立状态
const origin = ea.getViewLastPointerPosition();
plugin._ymjr_cuboid = {
    settings: { width: 100, height: 100, depth: 50, angle: 45, dottedLine: false },
    previewIDs: [],
    startX: origin.x,
    startY: origin.y,
    panel: null
};
const state = plugin._ymjr_cuboid;

// 3. 核心绘图逻辑 (支持预览与最终生成)
state.runDraw = async (isPreview = true) => {
    const api = ea.getExcalidrawAPI();
    if (!api) return;

    // 清理旧的预览元素
    if (state.previewIDs.length > 0) {
        const currentElements = api.getSceneElements();
        const nextElements = currentElements.filter(el => !state.previewIDs.includes(el.id));
        ea.targetView.updateScene({ elements: nextElements, storeAction: "none" });
        state.previewIDs = [];
    }

    ea.clear();
    
    // 基础样式
    ea.style.strokeWidth = 1;
    ea.style.strokeColor = ea.style.strokeColor || "black";
    ea.style.roughness = 0;
    ea.style.backgroundColor = "transparent";
    ea.style.fillStyle = "solid";

    const { width, height, depth, angle, dottedLine } = state.settings;
    const rad = (angle / 180) * Math.PI;
    const depthHeight = depth * Math.sin(rad);
    const depthWidth = depth * Math.cos(rad);
    const sx = state.startX;
    const sy = state.startY;

    // 绘制正面
    state.previewIDs.push(ea.addRect(sx, sy, width, height));

    // 绘制顶部
    const topPoints = [
        [sx, sy], [sx + width, sy], 
        [sx + width + depthWidth, sy - depthHeight], 
        [sx + depthWidth, sy - depthHeight], [sx, sy]
    ];
    state.previewIDs.push(ea.addLine(topPoints));

    // 绘制右侧
    const rightPoints = [
        [sx + width, sy], [sx + width, sy + height], 
        [sx + width + depthWidth, sy + height - depthHeight], 
        [sx + width + depthWidth, sy - depthHeight], [sx + width, sy]
    ];
    state.previewIDs.push(ea.addLine(rightPoints));

    // 绘制虚线 (透视背部)
    if (dottedLine) {
        ea.style.strokeStyle = "dotted";
        const backCorner = [sx + depthWidth, sy + height - depthHeight];
        const backTop = [sx + depthWidth, sy - depthHeight];
        const backRight = [sx + width + depthWidth, sy + height - depthHeight];
        const frontLeftBottom = [sx, sy + height];

        state.previewIDs.push(ea.addLine([backTop, backCorner]));
        state.previewIDs.push(ea.addLine([backCorner, backRight]));
        state.previewIDs.push(ea.addLine([backCorner, frontLeftBottom]));
        ea.style.strokeStyle = "solid";
    }

    ea.addToGroup(state.previewIDs);

    // 获取新生成的元素并更新到画布
    const newElements = ea.getElements();
    state.previewIDs = newElements.map(el => el.id);
    
    const currentElements = api.getSceneElements();
    ea.targetView.updateScene({
        elements: [...currentElements, ...newElements],
        storeAction: isPreview ? "none" : "capture" // 预览时不污染撤销历史
    });
};

// 4. 关闭与清理逻辑
state.closePanel = (confirm, isRestart = false) => {
    if (state.panel) state.panel.remove();
    
    if (confirm) {
        state.runDraw(false); // 最终写入历史记录
        new Notice(t("notice_success"));
    } else {
        // 撤销预览
        if (state.previewIDs.length > 0) {
            const api = ea.getExcalidrawAPI();
            if (api) {
                const next = api.getSceneElements().filter(el => !state.previewIDs.includes(el.id));
                ea.targetView.updateScene({ elements: next, storeAction: "none" });
            }
        }
        if (!isRestart) new Notice(t("notice_cancel"));
    }
    
    if (!isRestart) delete plugin._ymjr_cuboid;
};

// 5. 构建原生风格的浮动 UI
function createFloatingPanel() {
    const panel = document.createElement('div');
    state.panel = panel;
    
    // 使用 Obsidian 原生 CSS 变量以适配主题
    panel.style.cssText = `
        position: absolute; top: 80px; left: 80px; width: 260px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        border-radius: 8px; z-index: 9999;
        display: flex; flex-direction: column;
        font-family: var(--font-interface);
        color: var(--text-normal);
        user-select: none;
    `;

    // 标题栏 (可拖拽)
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 12px 16px; background: var(--background-secondary);
        cursor: grab; border-bottom: 1px solid var(--background-modifier-border);
        display: flex; justify-content: space-between; align-items: center;
        border-radius: 8px 8px 0 0; font-weight: 600; font-size: 14px;
    `;
    header.innerHTML = `<span>${t("title")}</span>`;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = "background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0;";
    closeBtn.onclick = () => state.closePanel(false);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // 拖拽逻辑
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; header.style.cursor = 'grabbing';
        startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect();
        initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
    };
    document.addEventListener('mousemove', (e) => {
        if(!isDragging) return;
        panel.style.left = (initLeft + e.clientX - startX) + 'px';
        panel.style.top = (initTop + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        isDragging = false; header.style.cursor = 'grab';
    });

    // 内容区
    const content = document.createElement('div');
    content.style.cssText = `padding: 16px; display: flex; flex-direction: column; gap: 12px;`;

    const createInput = (label, key, type="number") => {
        const row = document.createElement('div');
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center;";
        row.innerHTML = `<label style="font-size: 13px; color: var(--text-muted);">${label}</label>`;
        
        const input = document.createElement('input');
        input.type = type;
        if (type === "checkbox") {
            input.checked = state.settings[key];
            input.onchange = (e) => { state.settings[key] = e.target.checked; state.runDraw(true); };
            input.style.cursor = "pointer";
        } else {
            input.value = state.settings[key];
            input.style.cssText = "width: 70px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); color: var(--text-normal); border-radius: 4px; padding: 4px 8px; font-size: 13px;";
            input.oninput = (e) => { state.settings[key] = Number(e.target.value); state.runDraw(true); };
        }
        row.appendChild(input);
        content.appendChild(row);
    };

    createInput(t("width"), "width");
    createInput(t("height"), "height");
    createInput(t("depth"), "depth");
    createInput(t("angle"), "angle");
    createInput(t("dotted"), "dottedLine", "checkbox");

    panel.appendChild(content);

    // 底部按钮区
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 12px 16px; border-top: 1px solid var(--background-modifier-border);
        display: flex; justify-content: flex-end; gap: 8px; background: var(--background-primary-alt);
        border-radius: 0 0 8px 8px;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = t("cancel");
    cancelBtn.onclick = () => state.closePanel(false);
    
    const confirmBtn = document.createElement('button');
    confirmBtn.innerText = t("confirm");
    confirmBtn.className = "mod-cta"; // 使用 Obsidian 的强调按钮样式
    confirmBtn.onclick = () => state.closePanel(true);

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    panel.appendChild(footer);

    // 挂载到 Excalidraw 容器内以确保层级正确
    const container = ea.targetView.containerEl.querySelector('.excalidraw-wrapper') || document.body;
    container.appendChild(panel);

    // 初始渲染预览
    state.runDraw(true);
}

createFloatingPanel();
