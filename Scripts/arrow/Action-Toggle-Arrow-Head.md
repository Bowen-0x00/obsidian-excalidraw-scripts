---
name: 设置箭头局部拉伸
description: 开启或关闭箭头的局部拉伸功能（支持自定义固定点与拖拽点，带实时预览，可拖拽面板）。
author: ymjr
version: 1.0.0
license: MIT
usage: 当需要修改连线或箭头形状，但希望某些点保持固定（局部拉伸）时，运行该面板来定义固定点、拖拽点和中心点。
features:
  - 采用全闭包构建纯 HTML UI，零污染，支持自由拖拽
  - Canvas 点位实时解析预览
  - 允许自定义设置固定点索引与拖拽点索引
dependencies:
  - 依赖 Feature-ArrowHead-Resize-Engine 引擎进行拖拽拦截和形变计算
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_running: "🎯 拉伸节点配置面板已在运行中",
    notice_no_selection: "请先选中需要设置的连线或箭头！",
    notice_cancelled: "⭕ 已取消局部拉伸标记",
    panel_title: "🎯 配置局部拉伸节点",
    desc_text: "参考上方预览图设置点索引（逗号分隔，<code style=\"background:var(--background-modifier-form-field); padding:2px 4px; border-radius:4px;\">-1</code> 代表最后一点）。",
    label_fixed: "固定点索引 (Fixed Points)",
    placeholder_fixed: "例如: 0, 1",
    label_drag: "拖拽点索引 (Draggable Points)",
    placeholder_drag: "例如: -1",
    label_center: "中心基准点 (Center Points)",
    placeholder_center: "例如: -1 (留空默认为 0,0)",
    btn_cancel: "取消",
    btn_submit: "保存并应用",
    preview_empty: "请选中一条连线或箭头以预览",
    notice_applied: "✨ 已应用局部拉伸配置"
  },
  en: {
    notice_running: "🎯 Stretch Node Config Panel is already running",
    notice_no_selection: "Please select a line or arrow first!",
    notice_cancelled: "⭕ Local stretch mark cancelled",
    panel_title: "🎯 Configure Local Stretch Node",
    desc_text: "Set point index based on preview above (comma separated, <code style=\"background:var(--background-modifier-form-field); padding:2px 4px; border-radius:4px;\">-1</code> for last point).",
    label_fixed: "Fixed Points",
    placeholder_fixed: "e.g., 0, 1",
    label_drag: "Draggable Points",
    placeholder_drag: "e.g., -1",
    label_center: "Center Points",
    placeholder_center: "e.g., -1 (default is 0,0 if empty)",
    btn_cancel: "Cancel",
    btn_submit: "Save & Apply",
    preview_empty: "Please select a line or arrow to preview",
    notice_applied: "✨ Local stretch config applied"
  }
};
(async () => {
    const { Notice } = ea.obsidian;
    const PANEL_ID = "ea-arrow-config-panel";

    // 防重入锁：如果面板已经打开，不再重复创建
    if (document.getElementById(PANEL_ID)) {
        new Notice(t("notice_running"));
        return;
    }

    const initialEls = ea.getViewSelectedElements();
    if (initialEls.length === 0) {
        new Notice(t("notice_no_selection"));
        return;
    }

    // Toggle 逻辑：如果选中元素已经有高亮数据，则删除并退出 (仅当未打开面板时触发此逻辑)
    if (initialEls[0]?.customData?.fixedDragablePoints) {
        initialEls.forEach((el) => {
            if (el.customData) delete el.customData.fixedDragablePoints;
        });
        ea.copyViewElementsToEAforEditing(initialEls);
        await ea.addElementsToView();
        new Notice(t("notice_cancelled"));
        return;
    }

    // ==========================================
    // 1. 构建美观的悬浮 UI (支持拖拽)
    // ==========================================
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `
        position: fixed; top: 120px; left: calc(50% - 160px); width: 320px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        box-shadow: var(--shadow-l); border-radius: 10px;
        font-family: var(--font-interface); color: var(--text-normal);
        z-index: 99999; display: flex; flex-direction: column;
        overflow: hidden;
    `;

    // 头部 (可拖拽区域)
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 12px 16px; background: var(--background-secondary);
        cursor: grab; border-bottom: 1px solid var(--background-modifier-border);
        display: flex; justify-content: space-between; align-items: center; user-select: none;
    `;
    header.innerHTML = `
        <span style="font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            ${t("panel_title")}
        </span>
        <button id="ah-close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:4px; display:flex;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
    `;
    panel.appendChild(header);

    // 内容区
    const content = document.createElement('div');
    content.style.cssText = `padding: 16px; display: flex; flex-direction: column; gap: 14px;`;

    // 🌟 画布预览区
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
        width: 100%; height: 120px; background: var(--background-primary-alt);
        border: 1px dashed var(--background-modifier-border);
        border-radius: 6px; display: flex; justify-content: center; align-items: center;
        position: relative;
    `;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 280; 
    previewCanvas.height = 110;
    previewCanvas.style.cssText = "max-width: 100%; max-height: 100%;";
    canvasContainer.appendChild(previewCanvas);
    content.appendChild(canvasContainer);

    // 提示语
    const desc = document.createElement('p');
    desc.style.cssText = "margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.4;";
    desc.innerHTML = t("desc_text");
    content.appendChild(desc);

    // 输入框生成器
    const createInputGroup = (id, label, placeholder) => {
        const div = document.createElement('div');
        div.innerHTML = `
            <label style="font-size: 13px; font-weight: 500; display: block; margin-bottom: 6px; color: var(--text-normal);">${label}</label>
            <input id="${id}" type="text" placeholder="${placeholder}" style="width: 100%; box-sizing: border-box; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); color: var(--text-normal); padding: 8px 10px; border-radius: 6px; outline: none;" />
        `;
        return div;
    };

    content.appendChild(createInputGroup("ah-fixed", t("label_fixed"), t("placeholder_fixed")));
    content.appendChild(createInputGroup("ah-drag", t("label_drag"), t("placeholder_drag")));
    content.appendChild(createInputGroup("ah-center", t("label_center"), t("placeholder_center")));

    panel.appendChild(content);

    // 底部操作区
    const footer = document.createElement('div');
    footer.style.cssText = `padding: 12px 16px; background: var(--background-secondary); border-top: 1px solid var(--background-modifier-border); display: flex; justify-content: flex-end; gap: 10px;`;
    footer.innerHTML = `
        <button id="ah-cancel" style="padding: 6px 16px; border-radius: 6px; border: none; background: transparent; color: var(--text-normal); cursor: pointer; font-weight: 500;">${t("btn_cancel")}</button>
        <button id="ah-submit" class="mod-cta" style="padding: 6px 16px; border-radius: 6px; border: none; background: var(--interactive-accent); color: var(--text-on-accent); font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${t("btn_submit")}</button>
    `;
    panel.appendChild(footer);
    document.body.appendChild(panel);

    // ==========================================
    // 2. Canvas 实时预览绘制逻辑
    // ==========================================
    const drawPreview = (el) => {
        const ctx = previewCanvas.getContext('2d');
        const cWidth = previewCanvas.width;
        const cHeight = previewCanvas.height;
        ctx.clearRect(0, 0, cWidth, cHeight);

        if (!el || !["line", "arrow"].includes(el.type) || !el.points || el.points.length === 0) {
            ctx.font = "12px sans-serif";
            ctx.fillStyle = "#888";
            ctx.textAlign = "center";
            ctx.fillText(t("preview_empty"), cWidth / 2, cHeight / 2);
            return;
        }

        const points = el.points;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
            if (p[0] < minX) minX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] > maxY) maxY = p[1];
        });

        const pWidth = maxX - minX;
        const pHeight = maxY - minY;
        const padding = 20; // 边缘留白，防止点标记被截断

        const scaleX = (cWidth - padding * 2) / (pWidth || 1);
        const scaleY = (cHeight - padding * 2) / (pHeight || 1);
        const scale = Math.min(scaleX, scaleY);

        // 计算居中偏移量
        const offsetX = padding + (cWidth - padding * 2 - pWidth * scale) / 2 - minX * scale;
        const offsetY = padding + (cHeight - padding * 2 - pHeight * scale) / 2 - minY * scale;

        // 绘制连线轮廓
        ctx.beginPath();
        ctx.strokeStyle = "#888888";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        points.forEach((p, i) => {
            const x = p[0] * scale + offsetX;
            const y = p[1] * scale + offsetY;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 绘制标记点与序号
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        points.forEach((p, i) => {
            const x = p[0] * scale + offsetX;
            const y = p[1] * scale + offsetY;

            // 背景红点
            ctx.beginPath();
            ctx.fillStyle = "#ff4d4f"; 
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();

            // 内部白色数字
            ctx.fillStyle = "#ffffff";
            ctx.fillText(i.toString(), x, y + 1);
        });
    };

    // 挂载时立即渲染初始选中元素
    drawPreview(initialEls[0]);

    // ==========================================
    // 3. 事件绑定与拖拽逻辑
    // ==========================================
    const closePanel = () => {
        panel.remove();
        clearInterval(autoUpdateTimer); // 清理定时器以防内存泄漏
    };

    document.getElementById('ah-close-btn').onclick = closePanel;
    document.getElementById('ah-cancel').onclick = closePanel;

    const parseVals = (str) => str ? str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : undefined;

    document.getElementById('ah-submit').onclick = async () => {
        const fixedVal = document.getElementById("ah-fixed").value;
        const dragVal = document.getElementById("ah-drag").value;
        const centerVal = document.getElementById("ah-center").value;

        const config = {
            fixedPointsIndex: parseVals(fixedVal) || [],
            dragablePointIndex: parseVals(dragVal) || [],
            centerIndex: parseVals(centerVal)
        };

        const currentEls = ea.getViewSelectedElements();
        currentEls.forEach((el) => {
            if(["line", "arrow"].includes(el.type)) {
                el.customData = { ...el.customData, fixedDragablePoints: config };
            }
        });
        
        ea.copyViewElementsToEAforEditing(currentEls);
        await ea.addElementsToView();
        new Notice(t("notice_applied"));
        closePanel();
    };

    // 自由拖拽逻辑
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        // 忽略按钮点击引起的拖拽触发
        if(e.target.closest('button')) return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); 
        initLeft = rect.left; initTop = rect.top;
        header.style.cursor = "grabbing";
        
        document.onmousemove = (moveEvent) => {
            if(!isDragging) return;
            moveEvent.preventDefault(); // 阻止默认行为，防止选中外部文本
            let newX = initLeft + moveEvent.clientX - startX;
            let newY = initTop + moveEvent.clientY - startY;
            
            // 简单边界约束
            newX = Math.max(0, Math.min(newX, window.innerWidth - 320));
            newY = Math.max(0, Math.min(newY, window.innerHeight - panel.offsetHeight));
            
            panel.style.left = newX + 'px';
            panel.style.top = newY + 'px';
        };
        
        document.onmouseup = () => { 
            isDragging = false; 
            header.style.cursor = "grab";
            document.onmousemove = null; 
            document.onmouseup = null; 
        };
    };

    // ==========================================
    // 4. 监听选中元素变化，实时更新预览图
    // ==========================================
    let lastSelectedId = initialEls[0]?.id;
    const autoUpdateTimer = setInterval(() => {
        if (!document.getElementById(PANEL_ID)) {
            clearInterval(autoUpdateTimer);
            return;
        }
        const currentEls = ea.getViewSelectedElements();
        const currentId = currentEls[0]?.id;
        
        if (currentId !== lastSelectedId) {
            lastSelectedId = currentId;
            drawPreview(currentEls[0]);
        }
    }, 500);

})();