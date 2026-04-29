---
name: 连线测量与精控面板
description: 悬浮面板：开启/关闭测量标签、设置比例尺单位，以及精确设置连线长度。
author: ymjr
version: 1.0.0
license: MIT
usage: 用于精确测量和控制画板中的线条长度，并可随时添加或取消数值标注。
features:
  - 提供带有精美 SVG 图标的可拖拽面板
  - 支持自定义比例尺和单位（如 1px = 10mm），并应用测量标注
  - 支持输入具体数值，自动按当前角度伸缩选中连线的精确长度
dependencies:
  - 需要配合 Feature-Measure-Engine 连线实时测量引擎运行
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_engine: "⚠️ 测量引擎未运行，请先启动『连线实时测量引擎』",
    panel_title: "测量与长度设置",
    section_measure: "测量属性",
    label_ratio: "比例 (1px = ?)",
    label_unit: "单位",
    btn_toggle: "应用 / 取消标注",
    section_exact: "精确长度 (像素)",
    placeholder_read: "读取选中线段...",
    btn_apply_length: "设为该长度",
    notice_no_selection: "⚠️ 请先选中至少一根连线或箭头",
    notice_removed: "🧹 已取消测量标注",
    notice_added: "✨ 已添加测量标注",
    notice_no_line: "⚠️ 请先选中连线",
    notice_invalid_length: "请输入有效的长度值",
    notice_updated: "✅ 已更新连线长度"
  },
  en: {
    notice_no_engine: "⚠️ Measure engine not running, please start it first",
    panel_title: "Measurement & Length Settings",
    section_measure: "Measurement Properties",
    label_ratio: "Ratio (1px = ?)",
    label_unit: "Unit",
    btn_toggle: "Apply / Remove Annotation",
    section_exact: "Exact Length (px)",
    placeholder_read: "Reading selected line...",
    btn_apply_length: "Set to this length",
    notice_no_selection: "⚠️ Please select at least one line or arrow",
    notice_removed: "🧹 Measurement annotation removed",
    notice_added: "✨ Measurement annotation added",
    notice_no_line: "⚠️ Please select a line",
    notice_invalid_length: "Please enter a valid length value",
    notice_updated: "✅ Line length updated"
  }
};
const { Notice } = ea.obsidian;

if (!ExcalidrawAutomate.plugin.measureEngine) {
    new Notice(t("notice_no_engine"));
    return;
}

// 获取当前选中对象作为初始状态
const getValidSelection = () => ea.getViewSelectedElements().filter(el => ["line", "arrow"].includes(el.type));

function createMeasurePanel() {
    const PANEL_ID = "ea-measure-adv-panel";
    if (document.getElementById(PANEL_ID)) return;

    // --- 计算居中位置 ---
    const panelWidth = 280;
    const panelHeight = 260; // 预估高度
    const startLeft = Math.max(10, (window.innerWidth - panelWidth) / 2);
    const startTop = Math.max(10, (window.innerHeight - panelHeight) / 2);

    // 统一的输入框与按钮样式 (解决溢出问题的关键：box-sizing: border-box 和 min-width: 0)
    const inputStyle = `width: 100%; box-sizing: border-box; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 6px 8px; color: var(--text-normal); font-size: 13px; outline: none;`;
    const btnStyle = `width: 100%; box-sizing: border-box; padding: 6px 12px; font-size: 13px; cursor: pointer; border-radius: 4px; background: var(--interactive-normal); border: 1px solid var(--background-modifier-border); color: var(--text-normal); transition: background 0.2s;`;
    const ctaBtnStyle = `width: 100%; box-sizing: border-box; padding: 8px 12px; font-size: 13px; cursor: pointer; border-radius: 4px; background: var(--interactive-accent); color: var(--text-on-accent); border: none; transition: opacity 0.2s;`;

    // 1. 主容器
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `position: fixed; top: ${startTop}px; left: ${startLeft}px; width: ${panelWidth}px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-radius: 8px; z-index: 9999; display: flex; flex-direction: column; font-family: var(--font-interface); box-sizing: border-box;`;

    // 2. 头部区域
    const header = document.createElement('div');
    header.style.cssText = `padding: 12px 16px; background: var(--background-secondary); cursor: move; border-bottom: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; align-items: center; user-select: none; border-radius: 8px 8px 0 0; box-sizing: border-box;`;
    
    // 使用 SVG 图标提升质感
    const titleHtml = `
        <div style="display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <b style="font-size: 13px; color: var(--text-normal); font-weight: 600;">${t("panel_title")}</b>
        </div>
    `;
    header.innerHTML = `${titleHtml}<button id="close-btn" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; line-height: 1; border-radius: 4px;">✕</button>`;
    panel.appendChild(header);

    // 3. 内容容器
    const content = document.createElement('div');
    content.style.cssText = `padding: 16px; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box; width: 100%;`;

    // --- 测量标签配置区 ---
    const measureSection = document.createElement('div');
    measureSection.style.cssText = `display: flex; flex-direction: column; gap: 12px; border-bottom: 1px dashed var(--background-modifier-border); padding-bottom: 20px;`;
    
    measureSection.innerHTML = `
        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted);">${t("section_measure")}</div>
        <div style="display: flex; gap: 12px; width: 100%;">
            <label style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-normal);">
                ${t("label_ratio")}
                <input id="msr-ratio" type="number" value="10" style="${inputStyle}">
            </label>
            <label style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-normal);">
                ${t("label_unit")}
                <input id="msr-unit" type="text" value="mm" style="${inputStyle}">
            </label>
        </div>
        <div style="margin-top: 4px;">
            <button id="btn-toggle-measure" style="${ctaBtnStyle}">${t("btn_toggle")}</button>
        </div>
    `;
    content.appendChild(measureSection);

    // --- 精确长度控制区 ---
    const exactSection = document.createElement('div');
    exactSection.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;
    exactSection.innerHTML = `
        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted);">${t("section_exact")}</div>
        <div style="display: flex; gap: 8px; align-items: flex-end; width: 100%;">
            <label style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-normal);">
                <input id="exact-length" type="number" placeholder="${t("placeholder_read")}" style="${inputStyle}">
            </label>
            <div style="flex-shrink: 0;">
                <button id="btn-apply-length" style="${btnStyle}">${t("btn_apply_length")}</button>
            </div>
        </div>
    `;
    content.appendChild(exactSection);
    panel.appendChild(content);
    document.body.appendChild(panel);

    // ================= 绑定事件 =================

    // 悬浮样式增强
    panel.querySelector('#close-btn').onmouseover = (e) => e.target.style.background = 'var(--background-modifier-hover)';
    panel.querySelector('#close-btn').onmouseout = (e) => e.target.style.background = 'none';
    panel.querySelector('#btn-apply-length').onmouseover = (e) => e.target.style.background = 'var(--background-modifier-hover)';
    panel.querySelector('#btn-apply-length').onmouseout = (e) => e.target.style.background = 'var(--interactive-normal)';
    panel.querySelector('#btn-toggle-measure').onmouseover = (e) => e.target.style.opacity = '0.9';
    panel.querySelector('#btn-toggle-measure').onmouseout = (e) => e.target.style.opacity = '1';

    // 关闭按钮
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 绑定【应用/取消标注】
    panel.querySelector('#btn-toggle-measure').onclick = () => {
        const els = getValidSelection();
        if (!els.length) return new Notice(t("notice_no_selection"));

        const ratioInput = parseFloat(panel.querySelector('#msr-ratio').value) || 10;
        const unitInput = panel.querySelector('#msr-unit').value || "mm";
        const isAlreadyMeasured = els[0].customData?.measure;

        els.forEach(el => {
            if (isAlreadyMeasured) {
                delete el.customData.measure;
            } else {
                el.customData = { ...el.customData, measure: { ratio: ratioInput, unit: unitInput } };
            }
        });

        if (!isAlreadyMeasured) {
            ExcalidrawAutomate.plugin.measureEngine.updateMeasureText(els);
        } else {
            ea.copyViewElementsToEAforEditing(els);
            ea.addElementsToView(false, false, false);
        }
        new Notice(isAlreadyMeasured ? t("notice_removed") : t("notice_added"));
    };

    // 绑定【设置精确长度】
    panel.querySelector('#btn-apply-length').onclick = () => {
        const els = getValidSelection();
        if (!els.length) return new Notice(t("notice_no_line"));
        
        const targetLength = parseFloat(panel.querySelector('#exact-length').value);
        if (isNaN(targetLength) || targetLength <= 0) return new Notice(t("notice_invalid_length"));

        els.forEach(el => {
            const pts = el.points;
            if (!pts || pts.length < 2) return;
            const p1 = pts[0];
            const p2 = pts[pts.length - 1]; // 控制终点
            
            const currentAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
            const new_x = p1[0] + targetLength * Math.cos(currentAngle);
            const new_y = p1[1] + targetLength * Math.sin(currentAngle);
            
            pts[pts.length - 1] = [new_x, new_y];
        });

        // 统一提交更新，并联动刷新文本
        ExcalidrawAutomate.plugin.measureEngine.updateMeasureText(els);
        new Notice(t("notice_updated"));
    };

    // 初始读取长度逻辑
    const initEls = getValidSelection();
    if (initEls.length > 0 && initEls[0].points?.length >= 2) {
        const pts = initEls[0].points;
        const currentLength = Math.hypot(pts[pts.length-1][0] - pts[0][0], pts[pts.length-1][1] - pts[0][1]);
        panel.querySelector('#exact-length').value = currentLength.toFixed(2);
    }

    // 面板拖拽逻辑 (无全局污染)
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        
        document.onmousemove = (moveEvent) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + moveEvent.clientX - startX) + 'px';
            panel.style.top = (initTop + moveEvent.clientY - startY) + 'px';
        };
        document.onmouseup = () => {
            isDragging = false; document.onmousemove = null; document.onmouseup = null;
        };
    };
}

createMeasurePanel();