---
name: 高级连线引擎 (Advanced Connector)
description: 提供UI界面，支持多种模式（一对一、一对多、串联）、方向、折线形态与FixedPoint固定点绑定的高级连线工具。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的多个图形，运行此脚本，在弹出的UI中选择连接模式、方向和箭头样式。
features:
  - 现代化UI界面，自由选择连线模式、方向、线条类型与箭头样式
  - 完美支持 FixedPoint 内部固定点精准锚定
  - 支持智能折线 (Elbow)、曲线与直线的精确坐标计算
dependencies: []
autorun: false
---
/*
```javascript
*/
var locales = {
    zh: {
        notice_select: "请至少选择两个元素！",
        ui_title: "🔗 高级连线引擎",
        mode_label: "连线模式",
        mode_1to1: "一对一连接 (选定两个)",
        mode_1toMany: "一对多连接 (首个至其余)",
        mode_serial: "串联连接 (依次相连)",
        dir_label: "连接方向",
        dir_LR: "从左到右 (L → R)",
        dir_RL: "从右到左 (R → L)",
        dir_TD: "从上到下 (T → D)",
        dir_BU: "从下到上 (B → U)",
        type_label: "连线样式",
        type_straight: "直线 (Straight)",
        type_elbow: "折线 (Elbow)",
        type_curve: "曲线 (Curve)",
        fixed_label: "启用固定点精确绑定 (Fixed Point)",
        start_arrow: "起点箭头",
        end_arrow: "终点箭头",
        arrow_none: "无 (None)",
        arrow_arrow: "箭头 (Arrow)",
        arrow_triangle: "三角 (Triangle)",
        arrow_dot: "圆点 (Dot)",
        arrow_bar: "竖线 (Bar)",
        btn_apply: "应用连接",
        btn_cancel: "取消",
        success: "✅ 连线已生成"
    },
    en: {
        notice_select: "Please select at least two elements!",
        ui_title: "🔗 Advanced Connector",
        mode_label: "Connection Mode",
        mode_1to1: "1-to-1 (First two)",
        mode_1toMany: "1-to-Many (First to rest)",
        mode_serial: "Serial (Connect sequentially)",
        dir_label: "Direction",
        dir_LR: "Left to Right (L → R)",
        dir_RL: "Right to Left (R → L)",
        dir_TD: "Top to Bottom (T → D)",
        dir_BU: "Bottom to Top (B → U)",
        type_label: "Line Style",
        type_straight: "Straight",
        type_elbow: "Elbow",
        type_curve: "Curve",
        fixed_label: "Enable Fixed Point Binding",
        start_arrow: "Start Arrowhead",
        end_arrow: "End Arrowhead",
        arrow_none: "None",
        arrow_arrow: "Arrow",
        arrow_triangle: "Triangle",
        arrow_dot: "Dot",
        arrow_bar: "Bar",
        btn_apply: "Apply",
        btn_cancel: "Cancel",
        success: "✅ Connections generated"
    }
};

// 预处理选中元素
const api = ea.getExcalidrawAPI();
const rawElements = ea.getViewSelectedElements().filter(el => !(el.type === "text" && el.containerId));
if (rawElements.length < 2) {
    new Notice(t("notice_select"));
    return;
}

const groups = ea.getMaximumGroups(rawElements);
let els = groups.map(group => ea.getLargestElement(group));
if (els.length < 2) {
    new Notice(t("notice_select"));
    return;
}

// 确保 UI 唯一性
const uiId = 'ymjr-advanced-connector-ui';
if (document.getElementById(uiId)) {
    document.getElementById(uiId).remove();
}

/**
 * 构建现代化用户界面
 */
function buildUI() {
    return new Promise((resolve) => {
        const container = document.createElement('div');
        container.id = uiId;
        
        // 使用 Obsidian 原生变量保持深浅色模式一致性
        container.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.4); z-index: 99999;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.2s ease-in-out;
        `;

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: var(--background-primary); border: 1px solid var(--background-modifier-border);
            border-radius: 12px; padding: 24px; width: 420px; max-width: 90vw;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: var(--font-interface);
            display: flex; flex-direction: column; gap: 16px; transform: translateY(10px);
            transition: transform 0.2s ease-out;
        `;

        const title = `<h2 style="margin: 0 0 8px; font-size: 1.2em; color: var(--text-normal); text-align: center;">${t("ui_title")}</h2>`;

        const createSelect = (id, label, options) => `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 0.9em; color: var(--text-muted);">${label}</label>
                <select id="${id}" style="background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); color: var(--text-normal); padding: 8px; border-radius: 6px; outline: none;">
                    ${Object.entries(options).map(([val, text]) => `<option value="${val}">${text}</option>`).join('')}
                </select>
            </div>
        `;

        const formHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                ${createSelect("ac-mode", t("mode_label"), {
                    "one2one": t("mode_1to1"), "one2many": t("mode_1toMany"), "serial": t("mode_serial")
                })}
                ${createSelect("ac-dir", t("dir_label"), {
                    "LR": t("dir_LR"), "RL": t("dir_RL"), "TD": t("dir_TD"), "BU": t("dir_BU")
                })}
                ${createSelect("ac-type", t("type_label"), {
                    "straight": t("type_straight"), "elbow": t("type_elbow"), "curve": t("type_curve")
                })}
                ${createSelect("ac-start-arrow", t("start_arrow"), {
                    "none": t("arrow_none"), "arrow": t("arrow_arrow"), "triangle": t("arrow_triangle"), "dot": t("arrow_dot"), "bar": t("arrow_bar")
                })}
                ${createSelect("ac-end-arrow", t("end_arrow"), {
                    "triangle": t("arrow_triangle"), "arrow": t("arrow_arrow"), "none": t("arrow_none"), "dot": t("arrow_dot"), "bar": t("arrow_bar")
                })}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <input type="checkbox" id="ac-fixed" checked style="cursor: pointer; width: 16px; height: 16px;">
                <label for="ac-fixed" style="font-size: 0.9em; color: var(--text-normal); cursor: pointer;">${t("fixed_label")}</label>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
                <button id="ac-cancel" style="padding: 8px 16px; border-radius: 6px; border: none; background: var(--background-modifier-error); color: white; cursor: pointer; font-weight: 500;">${t("btn_cancel")}</button>
                <button id="ac-apply" style="padding: 8px 16px; border-radius: 6px; border: none; background: var(--interactive-accent); color: white; cursor: pointer; font-weight: 500;">${t("btn_apply")}</button>
            </div>
        `;

        panel.innerHTML = title + formHtml;
        container.appendChild(panel);
        document.body.appendChild(container);

        // 动画显示
        requestAnimationFrame(() => {
            container.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });

        const closeUI = (config = null) => {
            container.style.opacity = '0';
            panel.style.transform = 'translateY(10px)';
            setTimeout(() => {
                container.remove();
                resolve(config);
            }, 200);
        };

        document.getElementById('ac-cancel').onclick = () => closeUI(null);
        container.onclick = (e) => { if (e.target === container) closeUI(null); };

        document.getElementById('ac-apply').onclick = () => {
            closeUI({
                mode: document.getElementById('ac-mode').value,
                direction: document.getElementById('ac-dir').value,
                arrowType: document.getElementById('ac-type').value,
                enableFixedPoint: document.getElementById('ac-fixed').checked,
                startArrowHead: document.getElementById('ac-start-arrow').value,
                endArrowHead: document.getElementById('ac-end-arrow').value
            });
        };
    });
}

/**
 * 核心坐标与连线样式更新逻辑（移植自参考代码）
 */
function applyLineStyle(line, sourceEl, targetEl, config) {
    const isHorizontal = config.direction === "LR" || config.direction === "RL";
    
    // 基础起点
    line.x = sourceEl.x + sourceEl.width; 
    line.y = sourceEl.y + sourceEl.height / 2;
    if (config.direction === "RL") { line.x = sourceEl.x; } 
    else if (config.direction === "TD") { line.x = sourceEl.x + sourceEl.width / 2; line.y = sourceEl.y + sourceEl.height; } 
    else if (config.direction === "BU") { line.x = sourceEl.x + sourceEl.width / 2; line.y = sourceEl.y; }

    line.startBinding = { elementId: sourceEl.id, focus: 0, gap: 1 };
    line.endBinding = { elementId: targetEl.id, focus: 0, gap: 1 };

    // 固定点逻辑
    if (config.enableFixedPoint) {
        line.startBinding.mode = "inside";
        line.endBinding.mode = "inside";
        if (config.direction === "LR") { line.startBinding.fixedPoint = [1.0, 0.5]; line.endBinding.fixedPoint = [0.0, 0.5]; } 
        else if (config.direction === "RL") { line.startBinding.fixedPoint = [0.0, 0.5]; line.endBinding.fixedPoint = [1.0, 0.5]; } 
        else if (config.direction === "TD") { line.startBinding.fixedPoint = [0.5, 1.0]; line.endBinding.fixedPoint = [0.5, 0.0]; } 
        else if (config.direction === "BU") { line.startBinding.fixedPoint = [0.5, 0.0]; line.endBinding.fixedPoint = [0.5, 1.0]; }
    } else {
        delete line.startBinding.fixedPoint; delete line.startBinding.mode;
        delete line.endBinding.fixedPoint; delete line.endBinding.mode;
    }

    // 计算终点相对坐标
    let childConnX = targetEl.x; 
    let childConnY = targetEl.y + targetEl.height / 2;
    if (config.direction === "RL") { childConnX = targetEl.x + targetEl.width; }
    else if (config.direction === "TD") { childConnX = targetEl.x + targetEl.width / 2; childConnY = targetEl.y; }
    else if (config.direction === "BU") { childConnX = targetEl.x + targetEl.width / 2; childConnY = targetEl.y + targetEl.height; }

    const dx = childConnX - line.x; 
    const dy = childConnY - line.y;

    // 路径点渲染逻辑
    if (config.arrowType === "elbow") {
        line.elbowed = true;
        line.roundness = { type: 2 }; // 折线风格
        if (isHorizontal) { line.points = [[0, 0], [dx / 2, 0], [dx / 2, dy], [dx, dy]]; } 
        else { line.points = [[0, 0], [0, dy / 2], [dx, dy / 2], [dx, dy]]; }
    } else {
        line.elbowed = false; 
        line.roundness = config.arrowType === "curve" ? { type: 3 } : null; // 曲线风格
        const isAligned = isHorizontal ? Math.abs(dy) < 1 : Math.abs(dx) < 1;
        
        if (config.arrowType === "curve" && !isAligned) {
            if (isHorizontal) { line.points = [ [0, 0], [dx * 0.4, dy * 0.8905], [dx, dy] ]; } 
            else { line.points = [ [0, 0], [dx * 0.8905, dy * 0.4], [dx, dy] ]; }
        } else {
            line.points = [ [0, 0], [dx, dy] ]; // 直线
        }
    }
}

// 主干执行环境
(async () => {
    const config = await buildUI();
    if (!config) return; // 用户点击取消

    // 根据选择的方向重新排序元素数组，确保逻辑合理
    if (["LR", "RL"].includes(config.direction)) {
        els.sort((a, b) => config.direction === "LR" ? a.x - b.x : b.x - a.x);
    } else {
        els.sort((a, b) => config.direction === "TD" ? a.y - b.y : b.y - a.y);
    }

    // 统一连线样式
    const refEl = els[0];
    ea.style.strokeColor = refEl.strokeColor;
    ea.style.strokeWidth = refEl.strokeWidth || 2;
    ea.style.strokeStyle = refEl.strokeStyle;
    ea.style.strokeSharpness = "round";
    ea.style.roughness = refEl.roughness ?? 0;

    ea.copyViewElementsToEAforEditing(els);

    const sArrow = config.startArrowHead === "none" ? null : config.startArrowHead;
    const eArrow = config.endArrowHead === "none" ? null : config.endArrowHead;

    const generateLine = (source, target) => {
        // 先借用底层工具生成骨架
        const arrowId = ea.connectObjects(source.id, null, target.id, null, {
            startArrowHead: sArrow, endArrowHead: eArrow, numberOfPoints: 2
        });
        const line = ea.elementsDict[arrowId];
        // 应用你的高级数学重绘规则
        applyLineStyle(line, source, target, config);
        return arrowId;
    };

    let generatedArrows = [];

    // 根据模式分配连线拓扑
    if (config.mode === "one2one") {
        generatedArrows.push(generateLine(els[0], els[1]));
    } else if (config.mode === "one2many") {
        const root = els[0];
        for (let i = 1; i < els.length; i++) {
            generatedArrows.push(generateLine(root, els[i]));
        }
    } else if (config.mode === "serial") {
        for (let i = 0; i < els.length - 1; i++) {
            generatedArrows.push(generateLine(els[i], els[i+1]));
        }
    }

    // 将内容渲染回画板并保持当前所有元素的选中状态
    await ea.addElementsToView(false, false, false);
    
    const elementsToSelect = els.concat(generatedArrows.map(id => ea.getElement(id)));
    ea.selectElementsInView(elementsToSelect);

    new Notice(t("success"));
})();