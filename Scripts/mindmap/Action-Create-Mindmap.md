---
name: 初始化脑图配置
description: 将普通的连线节点组合转化为受引擎控制的脑图结构，并赋予默认样式。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中希望作为脑图根节点的元素（也可以只选中一个），运行脚本后在弹窗中配置排版方向与主题，即可一键生成结构化脑图。
features:
  - 自动递归遍历与根节点相连的元素，注入 mindmap 配置与层级结构
  - 提供可视化的脑图初始化配置面板
  - 基于所选主题自动应用节点颜色与连线样式
dependencies:
  - 依赖 Feature-Mindmap_Engine 引擎进行排版
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
    notice_select_root: "请先选中作为根节点的元素！",
    notice_cancelled_mindmap: "已取消元素的脑图状态。",
    ui_title: "初始化脑图配置",
    ui_theme: "主题配色",
    ui_direction: "排版方向",
    ui_dir_lr: "向右展开",
    ui_dir_rl: "向左展开",
    ui_dir_td: "向下展开",
    ui_dir_bu: "向上展开",
    ui_arrow_style: "连线样式",
    ui_arrow_normal: "平滑曲线",
    ui_arrow_elbow: "折线",
    ui_arrow_curve: "S型曲线",
    ui_fixed_center: "固定在中点",
    ui_auto_slide: "自动滑动",
    ui_fixed_point: "箭头固定中点",
    ui_node_gap: "节点间距",
    ui_confirm: "确认生成",
    notice_cancelled_init: "取消脑图初始化。",
    notice_success: "✨ 成功将元素初始化为脑图并赋予样式！",
    notice_no_engine: "⚠️ 脑图引擎未运行，无法自动排版，请开启 Engine！"
  },
  en: {
    theme_rainbow: "🌈 Rainbow",
    theme_morandi: "🎨 Morandi",
    theme_business: "💼 Business Blue",
    theme_custom: "⚙️ Custom",
    notice_select_root: "Please select elements to be the root node first!",
    notice_cancelled_mindmap: "Mindmap state removed from elements.",
    ui_title: "Initialize Mindmap Config",
    ui_theme: "Theme",
    ui_direction: "Direction",
    ui_dir_lr: "Expand Right",
    ui_dir_rl: "Expand Left",
    ui_dir_td: "Expand Down",
    ui_dir_bu: "Expand Up",
    ui_arrow_style: "Connector Style",
    ui_arrow_normal: "Normal Curve",
    ui_arrow_elbow: "Elbow Connector",
    ui_arrow_curve: "S-Curve",
    ui_fixed_center: "Fixed at Center",
    ui_auto_slide: "Auto Sliding",
    ui_fixed_point: "Fixed Point Arrow",
    ui_node_gap: "Node Gap",
    ui_confirm: "Confirm Generate",
    notice_cancelled_init: "Mindmap initialization cancelled.",
    notice_success: "✨ Mindmap initialized successfully!",
    notice_no_engine: "⚠️ Mindmap engine not running, layout skipped. Enable Engine!"
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
    "rainbow": { name: t("theme_rainbow"), rootBg: "#343a40", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419", "#3bc9db"], levels: DEFAULT_LEVELS },
    "morandi": { name: t("theme_morandi"), rootBg: "#495057", colors: ["#5c7a82", "#b38269", "#788560", "#a68894", "#7a6c5d"], levels: DEFAULT_LEVELS },
    "business": { name: t("theme_business"), rootBg: "#0b2545", colors: ["#1864ab", "#0b7285", "#087f5b", "#5f3dc4", "#c92a2a"], levels: DEFAULT_LEVELS },
    "custom": { name: t("theme_custom"), rootBg: "#1e1e1e", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419"], levels: DEFAULT_LEVELS }
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

const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length === 0) { new Notice(t("notice_select_root")); return; }
if (selectedEls[0]?.customData?.mindmap) {
    selectedEls.forEach((el) => { if (el?.customData?.mindmap) delete el.customData.mindmap; });
    new Notice(t("notice_cancelled_mindmap")); return;
}

function getMindmapSettingsViaUI() {
    return new Promise((resolve) => {
        if (document.getElementById("ea-mindmap-init-panel")) return resolve(null);
        const panel = document.createElement('div'); panel.id = "ea-mindmap-init-panel";
        panel.style.cssText = `position:fixed; top:150px; left:150px; width:300px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 4px 12px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; display:flex; flex-direction:column;`;

        const header = document.createElement('div'); header.style.cssText = `padding:10px 15px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; border-radius: 8px 8px 0 0;`;
        header.innerHTML = `<b>${t("ui_title")}</b><button style="background:none;border:none;cursor:pointer;color:var(--text-muted);">✕</button>`;
        header.querySelector('button').onclick = () => { panel.remove(); resolve(null); }; panel.appendChild(header);

        const content = document.createElement('div'); content.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:12px;`;
        const createRow = (label, element) => {
            const div = document.createElement('div'); div.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
            const lbl = document.createElement('label'); lbl.innerText = label; lbl.style.cssText = "font-size:12px; color:var(--text-muted);";
            div.appendChild(lbl); div.appendChild(element); return div;
        };

        const themeSelect = document.createElement('select'); themeSelect.style.width = "120px";
        Object.keys(THEMES).forEach(k => {
            const o = document.createElement('option'); o.value = k; o.innerText = THEMES[k].name;
            if (pluginSettings.theme === k) o.selected = true; themeSelect.appendChild(o);
        });
        content.appendChild(createRow(t("ui_theme"), themeSelect));

        const dirSelect = document.createElement('select'); dirSelect.style.width = "120px";
        dirSelect.innerHTML = `<option value="LR">${t("ui_dir_lr")}</option><option value="RL">${t("ui_dir_rl")}</option><option value="TD">${t("ui_dir_td")}</option><option value="BU">${t("ui_dir_bu")}</option>`;
        dirSelect.value = pluginSettings.direction; content.appendChild(createRow(t("ui_direction"), dirSelect));

        const arrowSelect = document.createElement('select'); arrowSelect.style.width = "120px";
        arrowSelect.innerHTML = `<option value="normal">${t("ui_arrow_normal")}</option><option value="elbow">${t("ui_arrow_elbow")}</option><option value="curve">${t("ui_arrow_curve")}</option>`;
        arrowSelect.value = pluginSettings.arrowType; content.appendChild(createRow(t("ui_arrow_style"), arrowSelect));

        const fixedPointSelect = document.createElement('select'); fixedPointSelect.style.width = "120px";
        fixedPointSelect.innerHTML = `<option value="true">${t("ui_fixed_center")}</option><option value="false">${t("ui_auto_slide")}</option>`;
        fixedPointSelect.value = pluginSettings.enableFixedPoint ? "true" : "false"; 
        content.appendChild(createRow(t("ui_fixed_point"), fixedPointSelect));

        const gapInput = document.createElement('input'); gapInput.type = "number"; gapInput.value = pluginSettings.defaultGap; gapInput.style.width = "80px";
        content.appendChild(createRow(t("ui_node_gap"), gapInput)); panel.appendChild(content);

        const footer = document.createElement('div'); footer.style.cssText = `padding:10px 15px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:flex-end;`;
        const confirmBtn = document.createElement('button'); confirmBtn.innerText = t("ui_confirm"); confirmBtn.className = "mod-cta";
        confirmBtn.onclick = () => {
            panel.remove();
            resolve({
                direction: dirSelect.value, arrowType: arrowSelect.value, defaultGap: Number(gapInput.value),
                curveLength: Number(pluginSettings.curveLength), lengthBetweenElAndLine: Number(pluginSettings.lengthBetweenElAndLine), 
                enableFixedPoint: fixedPointSelect.value === "true",
                theme: themeSelect.value, customTheme: pluginSettings.customTheme 
            });
        };
        footer.appendChild(confirmBtn); panel.appendChild(footer); document.body.appendChild(panel);

        let isDragging = false, startX, startY, initLeft, initTop;
        header.onmousedown = (e) => {
            if(e.target.tagName === 'BUTTON') return;
            isDragging = true; startX = e.clientX; startY = e.clientY; const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top; e.preventDefault();
            document.onmousemove = (e) => { if(!isDragging) return; panel.style.left = (initLeft + e.clientX - startX) + 'px'; panel.style.top = (initTop + e.clientY - startY) + 'px'; };
            document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
        };
    });
}

(async () => {
    const settings = await getMindmapSettingsViaUI();
    if (!settings) { new Notice(t("notice_cancelled_init")); return; }
    await ea.copyViewElementsToEAforEditing(selectedEls);

    function getRoot(element, recursion = true) {
        let arrowElements = selectedEls.filter((el) => el.type == "arrow" && el.endBinding && el.endBinding.elementId == element.id);
        if (arrowElements.length == 0) return ea.getElement(element.id);
        let parentElements = arrowElements.map((el) => ea.getElement(el.startBinding.elementId));
        if (recursion) return getRoot(parentElements[0], true);
    }
    let rootEl = getRoot(selectedEls[0]);

    let branchCounter = 0;
    function traverse(element, parentId, level, branchIndex = 0) {
        let arrowElements = selectedEls.filter((el) => el.type == "arrow" && el.startBinding && el.startBinding.elementId == element.id);
        let childrenElements = arrowElements.map((el) => ea.getElement(el.endBinding.elementId));

        if (level === 2) branchIndex = branchCounter++;
        element.customData = { ...element.customData, mindmap: { status: "open", root: rootEl.id, parent: parentId, level: level } };

        const targetStyle = resolveStyle(level, branchIndex, settings);
        if (targetStyle) {
            // 设置节点样式
            element.backgroundColor = targetStyle.backgroundColor; element.strokeColor = targetStyle.strokeColor || "black"; element.strokeWidth = targetStyle.strokeWidth || 1;
            if (element.type === "text") element.fontSize = targetStyle.fontSize;
            else if (element.boundElements) {
                element.boundElements.forEach(b => {
                    if (b.type === "text") { const textEl = ea.getElement(b.id); if (textEl) { textEl.strokeColor = targetStyle.textColor || "black"; textEl.fontSize = targetStyle.fontSize; } }
                });
            }

            // 同步修改连接到该节点的箭头样式
            const incomingArrow = selectedEls.find(a => a.type === "arrow" && a.endBinding && a.endBinding.elementId === element.id);
            if (incomingArrow) {
                incomingArrow.strokeColor = targetStyle.strokeColor || "black";
                incomingArrow.strokeWidth = targetStyle.strokeWidth || 1;
                incomingArrow.customData = incomingArrow.customData || {};
                if (settings.arrowType === "curve") {
                    incomingArrow.customData.curveArrow = true;
                } else {
                    delete incomingArrow.customData.curveArrow;
                }

                if (settings.enableFixedPoint) {
                    if (incomingArrow.startBinding) incomingArrow.startBinding.mode = "inside";
                    if (incomingArrow.endBinding) incomingArrow.endBinding.mode = "inside";
                } else {
                    if (incomingArrow.startBinding) { delete incomingArrow.startBinding.mode; delete incomingArrow.startBinding.fixedPoint; }
                    if (incomingArrow.endBinding) { delete incomingArrow.endBinding.mode; delete incomingArrow.endBinding.fixedPoint; }
                }
            }
        }
        childrenElements.forEach((el) => traverse(el, element.id, level + 1, branchIndex));
    }

    traverse(rootEl, null, 1);
    rootEl.customData.mindmap.settings = settings;
    await ea.addElementsToView();
    new Notice(t("notice_success"));

    if (window.MindmapAPI && window.MindmapAPI.runLayout) {
        setTimeout(async () => {
            const updatedEls = ea.getViewElements().filter(el => el.customData?.mindmap?.root === rootEl.id || (el.type === "arrow" && el.startBinding));
            await window.MindmapAPI.runLayout(updatedEls);
        }, 100);
    } else { new Notice(t("notice_no_engine")); }
})();