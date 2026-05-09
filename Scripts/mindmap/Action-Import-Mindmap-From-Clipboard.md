---
name: 从剪贴板导入脑图
description: 将剪贴板中的 Markdown 列表文本解析为层级树结构，并在当前画布生成带样式的脑图。
author: ymjr
version: 1.0.0
license: MIT
usage: 复制任意 Markdown 列表文本，运行此脚本。在弹出的面板中选择需要的排版方向、连线样式和主题配色，确认后脚本将在画布中心自动生成完整的脑图。
features:
  - 自动解析剪贴板内的 Markdown 缩进结构为 JSON Tree
  - 支持调用 Feature-Mindmap_Engine 引擎进行完美的脑图渲染和布局
  - 提供可视化的生成前配置面板
dependencies:
  - 必须依赖 Feature-Mindmap_Engine 提供后台渲染与自动排版支持
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    theme_rainbow: "🌈 彩虹分枝",
    theme_morandi: "🎨 莫兰迪色",
    theme_business: "💼 商务蓝调",
    theme_custom: "⚙️ 自定义色",
    notice_empty: "⚠️ 剪贴板为空或没有文本内容！",
    notice_parse_fail: "⚠️ 无法将剪贴板文本解析为有效的层级结构！",
    ui_title: "导入剪贴板脑图设置",
    ui_theme: "主题配色",
    ui_direction: "排版方向",
    ui_dir_lr: "向右展开 (LR)",
    ui_dir_rl: "向左展开 (RL)",
    ui_dir_td: "向下展开 (TD)",
    ui_dir_bu: "向上展开 (BU)",
    ui_arrow_style: "连线样式",
    ui_arrow_normal: "平滑曲线",
    ui_arrow_elbow: "折线",
    ui_arrow_curve: "S型曲线",
    ui_fixed_center: "固定在中点",
    ui_auto_slide: "自动滑动",
    ui_fixed_point: "箭头固定中点",
    ui_cancel: "取消",
    ui_confirm: "生成",
    notice_success: "✨ 解析生成完成，正在自动排版...",
    notice_no_engine: "⚠️ 脑图核心引擎未运行，无法自动排版，请手动开启 Engine 脚本！"
  },
  en: {
    theme_rainbow: "🌈 Rainbow",
    theme_morandi: "🎨 Morandi",
    theme_business: "💼 Business Blue",
    theme_custom: "⚙️ Custom",
    notice_empty: "⚠️ Clipboard is empty or contains no text!",
    notice_parse_fail: "⚠️ Failed to parse clipboard text into a valid hierarchy!",
    ui_title: "Import Mindmap from Clipboard",
    ui_theme: "Theme",
    ui_direction: "Direction",
    ui_dir_lr: "Expand Right (LR)",
    ui_dir_rl: "Expand Left (RL)",
    ui_dir_td: "Expand Down (TD)",
    ui_dir_bu: "Expand Up (BU)",
    ui_arrow_style: "Connector Style",
    ui_arrow_normal: "Normal Curve",
    ui_arrow_elbow: "Elbow Connector",
    ui_arrow_curve: "S-Curve",
    ui_fixed_center: "Fixed at Center",
    ui_auto_slide: "Auto Sliding",
    ui_fixed_point: "Fixed Point Arrow",
    ui_cancel: "Cancel",
    ui_confirm: "Generate",
    notice_success: "✨ Parse complete, re-layout in progress...",
    notice_no_engine: "⚠️ Mindmap engine not running, layout skipped. Enable Engine script!"
  }
};
const { Notice } = ea.obsidian;

const DEFAULT_LEVELS = [
    { level: 1, strokeColor: "black", textColor: "#ffffff", fontSize: 24, strokeWidth: 2 },
    { level: 2, strokeColor: "black", textColor: "black", fontSize: 20, strokeWidth: 1 },
    { level: 3, strokeColor: "black", textColor: "black", fontSize: 16, strokeWidth: 1 },
    { level: 4, strokeColor: "black", textColor: "black", fontSize: 14, strokeWidth: 1 }
];

const FALLBACK_THEMES = {
    "rainbow": { name: "🌈 彩虹分枝", rootBg: "#343a40", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419", "#3bc9db"], levels: DEFAULT_LEVELS },
    "morandi": { name: "🎨 莫兰迪色", rootBg: "#495057", colors: ["#5c7a82", "#b38269", "#788560", "#a68894", "#7a6c5d"], levels: DEFAULT_LEVELS },
    "business": { name: "💼 商务蓝调", rootBg: "#0b2545", colors: ["#1864ab", "#0b7285", "#087f5b", "#5f3dc4", "#c92a2a"], levels: DEFAULT_LEVELS },
    "custom": { name: "⚙️ 自定义色", rootBg: "#1e1e1e", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419"], levels: DEFAULT_LEVELS }
};

const FALLBACK_SETTINGS = {
    direction: "LR", arrowType: "normal", defaultGap: 15, curveLength: 40, lengthBetweenElAndLine: 100, enableFixedPoint: true,
    theme: "rainbow",
    customTheme: { rootBg: FALLBACK_THEMES["custom"].rootBg, colors: [...FALLBACK_THEMES["custom"].colors], levels: JSON.parse(JSON.stringify(DEFAULT_LEVELS)) }
};

// --- Settings Initial Load (跨脚本共享读取) ---
let engineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["Mindmap_Engine"] || {};
let mindmapConfig;
try {
    if (engineSettings["Mindmap Configuration"] && engineSettings["Mindmap Configuration"].value) {
        mindmapConfig = JSON.parse(engineSettings["Mindmap Configuration"].value);
    } else {
        mindmapConfig = { themes: FALLBACK_THEMES, defaultSettings: FALLBACK_SETTINGS };
    }
} catch (e) {
    mindmapConfig = { themes: FALLBACK_THEMES, defaultSettings: FALLBACK_SETTINGS };
}

const THEMES = mindmapConfig.themes || FALLBACK_THEMES;
let pluginSettings = mindmapConfig.defaultSettings || FALLBACK_SETTINGS;
// --------------------------------

function lightenHex(hex, percent) {
    if (!hex || hex === "transparent") return hex;
    let num = parseInt(hex.replace("#",""), 16);
    if (isNaN(num)) return hex;
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt; let G = (num >> 8 & 0x00FF) + amt; let B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

function resolveStyle(level, branchIndex, settings) {
    const themeKey = settings?.theme || "rainbow";
    let theme = THEMES[themeKey] || THEMES["rainbow"];
    if (themeKey === "custom" && settings?.customTheme) theme = { ...theme, ...settings.customTheme };
    
    const levels = theme.levels || DEFAULT_LEVELS;
    const lvlConfig = level <= levels.length ? levels[level - 1] : levels[levels.length - 1];

    let bg = "transparent";
    if (level === 1) bg = theme.rootBg;
    else {
        const colors = theme.colors && theme.colors.length > 0 ? theme.colors : THEMES["rainbow"].colors;
        const baseColor = colors[branchIndex % colors.length];
        bg = level > 2 ? lightenHex(baseColor, Math.min((level - 2) * 15, 60)) : baseColor;
    }

    return { backgroundColor: bg, textColor: lvlConfig.textColor, strokeColor: lvlConfig.strokeColor, fontSize: lvlConfig.fontSize, strokeWidth: lvlConfig.strokeWidth };
}

const clipboardText = await navigator.clipboard.readText();
if (!clipboardText || !clipboardText.trim()) { new Notice(t("notice_empty")); return; }

function parseOutline(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const nodes = []; const parentStack = []; 
    lines.forEach((line, index) => {
        let depth = 1; let textContent = line.trim();
        const headingMatch = line.match(/^(#+)\s+(.*)/);
        if (headingMatch) { depth = 0; textContent = headingMatch[2].trim(); } 
        else {
            const match = line.match(/^([ \t]*)(?:[-*+]|\d+\.)?\s*(.*)/);
            if (match) {
                const indent = match[1]; const tabs = (indent.match(/\t/g) || []).length; const spaces = (indent.match(/ /g) || []).length;
                depth = tabs + Math.floor(spaces / 2) + 1; textContent = match[2].trim() || "空白节点";
            }
        }
        const node = { id: `temp_${index}`, depth: depth, text: textContent, children: [], eaId: null, parentId: null };
        if (depth === 0) { parentStack[0] = node; nodes.push(node); } 
        else {
            let parentDepth = depth - 1; while (parentDepth >= 0 && !parentStack[parentDepth]) parentDepth--;
            const parent = parentStack[parentDepth];
            if (parent) { node.parentId = parent.id; parent.children.push(node); } else { nodes.push(node); }
            parentStack[depth] = node; parentStack.splice(depth + 1);
        }
    });
    return nodes;
}

const parsedTrees = parseOutline(clipboardText);
if (parsedTrees.length === 0) { new Notice(t("notice_parse_fail")); return; }

const config = await (async () => {
    return new Promise((resolve) => {
        if (document.getElementById("ea-mindmap-import-panel")) return resolve(null);
        const panel = document.createElement('div'); panel.id = "ea-mindmap-import-panel";
        panel.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:300px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 4px 12px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

        const header = document.createElement('div'); header.style.cssText = `padding:10px 15px; background:var(--background-secondary); border-bottom:1px solid var(--background-modifier-border); border-radius: 8px 8px 0 0; font-weight:bold;`;
        header.innerText = t("ui_title"); panel.appendChild(header);

        const content = document.createElement('div'); content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;
        const createRow = (label, el) => {
            const div = document.createElement('div'); div.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
            const lbl = document.createElement('label'); lbl.innerText = label; lbl.style.cssText = "font-size:12px; color:var(--text-muted);";
            div.appendChild(lbl); div.appendChild(el); return div;
        };

        const themeSelect = document.createElement('select'); themeSelect.style.width = "120px";
        Object.keys(THEMES).forEach(k => {
            const o = document.createElement('option'); o.value = k; o.innerText = THEMES[k].name;
            if (pluginSettings.theme === k) o.selected = true; themeSelect.appendChild(o);
        });
        
        const dirSelect = document.createElement('select'); dirSelect.style.width = "120px";
        dirSelect.innerHTML = `<option value="LR">${t("ui_dir_lr")}</option><option value="RL">${t("ui_dir_rl")}</option><option value="TD">${t("ui_dir_td")}</option><option value="BU">${t("ui_dir_bu")}</option>`; dirSelect.value = pluginSettings.direction;
        const arrowSelect = document.createElement('select'); arrowSelect.style.width = "120px";
        arrowSelect.innerHTML = `<option value="normal">${t("ui_arrow_normal")}</option><option value="elbow">${t("ui_arrow_elbow")}</option><option value="curve">${t("ui_arrow_curve")}</option>`; arrowSelect.value = pluginSettings.arrowType;

        const fixedPointSelect = document.createElement('select'); fixedPointSelect.style.width = "120px";
        fixedPointSelect.innerHTML = `<option value="true">${t("ui_fixed_center")}</option><option value="false">${t("ui_auto_slide")}</option>`;
        fixedPointSelect.value = pluginSettings.enableFixedPoint ? "true" : "false"; 
        
        content.appendChild(createRow(t("ui_theme"), themeSelect));
        content.appendChild(createRow(t("ui_direction"), dirSelect));
        content.appendChild(createRow(t("ui_arrow_style"), arrowSelect));
        content.appendChild(createRow(t("ui_fixed_point"), fixedPointSelect));
        panel.appendChild(content);

        const footer = document.createElement('div'); footer.style.cssText = `padding:10px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:flex-end; gap:10px;`;
        const cancelBtn = document.createElement('button'); cancelBtn.innerText = t("ui_cancel"); cancelBtn.onclick = () => { panel.remove(); resolve(null); };
        const confirmBtn = document.createElement('button'); confirmBtn.innerText = t("ui_confirm"); confirmBtn.className = "mod-cta";
        confirmBtn.onclick = () => {
            panel.remove();
            resolve({ 
                direction: dirSelect.value, arrowType: arrowSelect.value, 
                theme: themeSelect.value, customTheme: pluginSettings.customTheme,
                enableFixedPoint: fixedPointSelect.value === "true"
            });
        };
        footer.appendChild(cancelBtn); footer.appendChild(confirmBtn); panel.appendChild(footer); document.body.appendChild(panel);
    });
})();

if (!config) return;

ea.clear();
const pointerPos = ea.targetView.currentPosition || { x: 0, y: 0 };
let currentYOffset = pointerPos.y; 
const createdElementsData = [];
let globalBranchIndex = 0;

function buildElements(node, rootId, parentEaId, level, branchIndex = 0) {
    if (level === 2) branchIndex = globalBranchIndex++;
    ea.style.roundness = { type: 3 }; ea.style.fillStyle = "solid"; ea.style.roughness = 0;
    
    const style = resolveStyle(level, branchIndex, config);
    ea.style.backgroundColor = style.backgroundColor;
    ea.style.strokeColor = style.strokeColor || "black";
    ea.style.strokeWidth = style.strokeWidth || 1;
    ea.style.fontSize = style.fontSize;

    currentYOffset += 20; 
    const boxId = ea.addText(pointerPos.x + level * 200, currentYOffset, node.text, {
        box: true, textAlign: "center", textVerticalAlign: "middle", boxStrokeColor: ea.style.strokeColor
    });
    
    node.eaId = boxId; const el = ea.getElement(boxId); const currentRootId = rootId || boxId;
    el.customData = { mindmap: { status: "open", root: currentRootId, parent: parentEaId || currentRootId, level: level } };

    if (level === 1) {
        el.customData.mindmap.settings = {
            direction: config.direction, arrowType: config.arrowType, theme: config.theme, customTheme: config.customTheme,
            defaultGap: pluginSettings.defaultGap || 15, curveLength: 40, lengthBetweenElAndLine: 100, enableFixedPoint: config.enableFixedPoint
        };
    }
    createdElementsData.push(el);

    if (parentEaId) {
        const arrowId = ea.connectObjects(parentEaId, "right", boxId, "left", { startArrowHead: null });
        const arrowEl = ea.getElement(arrowId);
        
        if(arrowEl) {
            arrowEl.strokeColor = style.strokeColor || "black";
            arrowEl.strokeWidth = style.strokeWidth || 1;
            arrowEl.customData = arrowEl.customData || {};
            // 根据配置注入 curveArrow 属性
            if (config.arrowType === "curve") {
                arrowEl.customData.curveArrow = true;
            } else {
                delete arrowEl.customData.curveArrow;
            }

            if (config.enableFixedPoint) {
                if (arrowEl.startBinding) arrowEl.startBinding.mode = "inside";
                if (arrowEl.endBinding) arrowEl.endBinding.mode = "inside";
            } else {
                if (arrowEl.startBinding) { delete arrowEl.startBinding.mode; delete arrowEl.startBinding.fixedPoint; }
                if (arrowEl.endBinding) { delete arrowEl.endBinding.mode; delete arrowEl.endBinding.fixedPoint; }
            }
        }
        createdElementsData.push(arrowEl);
    }
    node.children.forEach(child => buildElements(child, currentRootId, boxId, level + 1, branchIndex));
}

parsedTrees.forEach(treeRoot => buildElements(treeRoot, null, null, 1));

await ea.addElementsToView(false, false, true);
new Notice(t("notice_success"));

if (window.MindmapAPI && window.MindmapAPI.runLayout) {
    setTimeout(async () => {
        const elementsMap = new Map(); ea.getViewElements().forEach(el => elementsMap.set(el.id, el));
        const allTreeEls = [];
        createdElementsData.forEach(ce => {
            const freshEl = elementsMap.get(ce.id);
            if (freshEl) {
                allTreeEls.push(freshEl);
                if (freshEl.boundElements) {
                    freshEl.boundElements.forEach(b => {
                        if (b.type !== "arrow") { const textEl = elementsMap.get(b.id); if (textEl) allTreeEls.push(textEl); }
                    });
                }
            }
        });
        await window.MindmapAPI.runLayout(allTreeEls, true, ea);
    }, 150);
} else {
    new Notice(t("notice_no_engine"));
}