---
name: 修改脑图样式
description: 弹出脑图样式与排版配置面板，支持修改当前选中脑图或全局默认配置。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中脑图的根节点运行，修改当前脑图的样式；不选任何元素运行，则修改全局新建脑图的默认样式配置。
features:
  - 提供可视化的脑图主题与排版编辑器UI
  - 支持修改展开方向、连线样式、节点间距和连线长度
  - 提供多套预设主题并支持自定义颜色与层级样式
dependencies:
  - 依赖 Feature-Mindmap_Engine 提供后台渲染与自动排版支持
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
    ui_title_global: "🧠 脑图全局默认设置",
    ui_title_current: "🧠 修改当前脑图样式",
    ui_group_layout: "排版与连线",
    ui_dir_lr: "向右展开 (LR)",
    ui_dir_rl: "向左展开 (RL)",
    ui_dir_td: "向下展开 (TD)",
    ui_dir_bu: "向上展开 (BU)",
    ui_direction: "展开方向",
    ui_arrow_normal: "平滑曲线 (Normal)",
    ui_arrow_elbow: "折线 (Elbow)",
    ui_arrow_curve: "S型曲线 (Curve)",
    ui_arrow_style: "连线样式",
    ui_fixed_center: "固定在中点",
    ui_auto_slide: "自动滑动",
    ui_fixed_point: "箭头固定中点",
    ui_node_gap: "节点间距",
    ui_line_length: "连线长度",
    ui_group_theme: "主题配置",
    ui_new_theme_name: "新建主题",
    ui_prompt_theme_name: "请输入新主题名称：",
    ui_rename_title: "重命名",
    ui_delete_title: "删除",
    notice_at_least_one: "至少保留一个主题！",
    confirm_delete_theme: "确定删除主题 \"{name}\" 吗？",
    ui_root_bg: "<b>根节点背景色</b>",
    ui_branch_colors: "分支循环配色",
    ui_level_styles: "层级样式 (文字/边框/粗细/字号)",
    ui_text_color: "文字颜色",
    ui_stroke_color: "边框颜色",
    ui_stroke_width: "边框粗细",
    ui_font_size: "字号",
    ui_btn_save_global: "💾 保存为全局配置",
    setting_desc: "⚠️ 请不要在此直接修改 JSON 代码。请运行 'Change Mindmap Style' 样式脚本，通过可视化 UI 面板修改脑图全局默认设置。",
    notice_saved_global: "✅ 已保存脑图全局配置",
    ui_btn_apply: "✨ 应用并重排",
    notice_applied: "🎨 样式已应用，自动排版完成！",
    notice_no_engine: "⚠️ 设置已更新，但未检测到后台引擎，请开启 Engine 后调整排版。",
    notice_global_mode: "💡 当前未选中脑图节点，进入【全局设置模式】。您在这里所做的修改将作为以后新建脑图的默认值。"
  },
  en: {
    theme_rainbow: "🌈 Rainbow",
    theme_morandi: "🎨 Morandi",
    theme_business: "💼 Business Blue",
    theme_custom: "⚙️ Custom",
    ui_title_global: "🧠 Mindmap Global Settings",
    ui_title_current: "🧠 Change Mindmap Style",
    ui_group_layout: "Layout & Connectors",
    ui_dir_lr: "Expand Right (LR)",
    ui_dir_rl: "Expand Left (RL)",
    ui_dir_td: "Expand Down (TD)",
    ui_dir_bu: "Expand Up (BU)",
    ui_direction: "Direction",
    ui_arrow_normal: "Normal Curve",
    ui_arrow_elbow: "Elbow Connector",
    ui_arrow_curve: "S-Curve",
    ui_arrow_style: "Connector Style",
    ui_fixed_center: "Fixed at Center",
    ui_auto_slide: "Auto Sliding",
    ui_fixed_point: "Fixed Point Arrow",
    ui_node_gap: "Node Gap",
    ui_line_length: "Line Length",
    ui_group_theme: "Theme Configuration",
    ui_new_theme_name: "New Theme",
    ui_prompt_theme_name: "Enter new theme name:",
    ui_rename_title: "Rename",
    ui_delete_title: "Delete",
    notice_at_least_one: "At least one theme must be kept!",
    confirm_delete_theme: "Are you sure to delete theme \"{name}\"?",
    ui_root_bg: "<b>Root Background Color</b>",
    ui_branch_colors: "Branch Color Cycle",
    ui_level_styles: "Level Styles (Text/Stroke/Width/Size)",
    ui_text_color: "Text Color",
    ui_stroke_color: "Stroke Color",
    ui_stroke_width: "Stroke Width",
    ui_font_size: "Font Size",
    ui_btn_save_global: "💾 Save Global Config",
    setting_desc: "⚠️ Do not modify JSON directly. Use 'Change Mindmap Style' script UI to update global defaults.",
    notice_saved_global: "✅ Global configuration saved",
    ui_btn_apply: "✨ Apply and Re-layout",
    notice_applied: "🎨 Style applied and layout refreshed!",
    notice_no_engine: "⚠️ Settings updated, but engine not detected. Enable Engine to re-layout.",
    notice_global_mode: "💡 No mindmap node selected. Entering 【Global Settings Mode】. Changes here will be defaults for new mindmaps."
  }
};
const { Notice } = ea.obsidian;

// ==========================================
// 1. 常量与默认数据结构
// ==========================================
const DEFAULT_LEVELS = [
    { level: 1, strokeColor: "black", textColor: "#ffffff", fontSize: 24, strokeWidth: 2 },
    { level: 2, strokeColor: "black", textColor: "black", fontSize: 20, strokeWidth: 1 },
    { level: 3, strokeColor: "black", textColor: "black", fontSize: 16, strokeWidth: 1 },
    { level: 4, strokeColor: "black", textColor: "black", fontSize: 14, strokeWidth: 1 }
];

const FALLBACK_THEMES = {
    "rainbow": { name: t("theme_rainbow"), rootBg: "#343a40", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419", "#3bc9db"], levels: JSON.parse(JSON.stringify(DEFAULT_LEVELS)) },
    "morandi": { name: t("theme_morandi"), rootBg: "#495057", colors: ["#5c7a82", "#b38269", "#788560", "#a68894", "#7a6c5d"], levels: JSON.parse(JSON.stringify(DEFAULT_LEVELS)) },
    "business": { name: t("theme_business"), rootBg: "#0b2545", colors: ["#1864ab", "#0b7285", "#087f5b", "#5f3dc4", "#c92a2a"], levels: JSON.parse(JSON.stringify(DEFAULT_LEVELS)) },
    "custom": { name: t("theme_custom"), rootBg: "#1e1e1e", colors: ["#e03131", "#1971c2", "#099268", "#e8590c", "#9c36b5", "#fcc419"], levels: JSON.parse(JSON.stringify(DEFAULT_LEVELS)) }
};

const FALLBACK_SETTINGS = {
    direction: "LR", arrowType: "normal", defaultGap: 15, curveLength: 40, lengthBetweenElAndLine: 100, enableFixedPoint: true, theme: "rainbow"
};

// ==========================================
// 2. 数据读取与状态管理
// ==========================================
let engineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["Mindmap_Engine"] || {};
let mindmapConfig;
try {
    if (engineSettings["Mindmap Configuration"] && engineSettings["Mindmap Configuration"].value) {
        mindmapConfig = JSON.parse(engineSettings["Mindmap Configuration"].value);
    } else { mindmapConfig = { themes: FALLBACK_THEMES, defaultSettings: FALLBACK_SETTINGS }; }
} catch (e) { mindmapConfig = { themes: FALLBACK_THEMES, defaultSettings: FALLBACK_SETTINGS }; }

// 深拷贝一份用于 UI 编辑，防止未保存直接污染全局
let localConfig = JSON.parse(JSON.stringify(mindmapConfig));
if (!localConfig.themes) localConfig.themes = JSON.parse(JSON.stringify(FALLBACK_THEMES));
if (!localConfig.defaultSettings) localConfig.defaultSettings = JSON.parse(JSON.stringify(FALLBACK_SETTINGS));

// ==========================================
// 3. 样式解析工具函数
// ==========================================
function lightenHex(hex, percent) {
    if (!hex || hex === "transparent") return hex;
    let num = parseInt(hex.replace("#",""), 16); if (isNaN(num)) return hex;
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt; let G = (num >> 8 & 0x00FF) + amt; let B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

function resolveStyle(level, branchIndex, settings, themesObj) {
    const themeKey = settings?.theme || "rainbow";
    let theme = themesObj[themeKey] || themesObj["rainbow"];
    const levels = theme.levels || DEFAULT_LEVELS;
    const lvlConfig = level <= levels.length ? levels[level - 1] : levels[levels.length - 1];

    let bg = "transparent";
    if (level === 1) { bg = theme.rootBg; } 
    else {
        const colors = theme.colors && theme.colors.length > 0 ? theme.colors : ["#cccccc"];
        const baseColor = colors[branchIndex % colors.length];
        bg = level > 2 ? lightenHex(baseColor, Math.min((level - 2) * 15, 60)) : baseColor;
    }
    return { backgroundColor: bg, textColor: lvlConfig.textColor, strokeColor: lvlConfig.strokeColor, fontSize: lvlConfig.fontSize, strokeWidth: lvlConfig.strokeWidth };
}

// ==========================================
// 4. 环境上下文判断 (选中了元素 vs 全局设置)
// ==========================================
const selectedEls = ea.getViewSelectedElements();
let targetRoot = null;
if (selectedEls.length > 0 && selectedEls[0]?.customData?.mindmap) {
    const elements = ea.getViewElements();
    const rootId = selectedEls[0].customData.mindmap.root;
    targetRoot = elements.find(e => e.id === rootId);
}

const isGlobalMode = !targetRoot;
let activeThemeKey = isGlobalMode ? localConfig.defaultSettings.theme : (targetRoot.customData.mindmap.settings?.theme || "rainbow");
let activeLayoutSettings = isGlobalMode ? localConfig.defaultSettings : JSON.parse(JSON.stringify(targetRoot.customData.mindmap.settings || localConfig.defaultSettings));

if (typeof activeLayoutSettings.enableFixedPoint === 'undefined') {
    activeLayoutSettings.enableFixedPoint = true;
}

// ==========================================
// 5. UI 组件生成器与主面板
// ==========================================
function createInput(type, value, onChange, width="auto", title="") {
    const inp = document.createElement('input'); inp.type = type; inp.value = value; inp.title = title;
    if (type === "color") {
        inp.style.cssText = `width:24px; height:24px; padding:0; border:1px solid var(--background-modifier-border); border-radius:4px; cursor:pointer; flex-shrink:0;`;
    } else if (type === "number") {
        inp.style.cssText = `width:${width}; text-align:center; padding:2px; background:var(--background-modifier-form-field); border:1px solid var(--background-modifier-border); border-radius:4px; font-size:12px;`;
    } else {
        inp.style.cssText = `width:${width}; padding:4px 8px; background:var(--background-modifier-form-field); border:1px solid var(--background-modifier-border); border-radius:4px; font-size:12px; color:var(--text-normal);`;
    }
    inp.onchange = e => onChange(type === "number" ? Number(e.target.value) : e.target.value);
    return inp;
}

function createIconButton(text, onClick, title="") {
    const btn = document.createElement('button'); btn.innerHTML = text; btn.title = title;
    btn.style.cssText = `background:var(--interactive-normal); border:1px solid var(--background-modifier-border); color:var(--text-normal); border-radius:4px; cursor:pointer; padding:2px 8px; font-size:12px; display:flex; align-items:center; justify-content:center;`;
    btn.onmouseover = () => btn.style.background = "var(--interactive-hover)";
    btn.onmouseout = () => btn.style.background = "var(--interactive-normal)";
    btn.onclick = onClick; return btn;
}

function createStylePanel() {
    if (document.getElementById("ea-mindmap-style-panel")) return;

    const panel = document.createElement('div');
    panel.id = "ea-mindmap-style-panel";
    panel.style.cssText = `position:fixed; top:100px; right:80px; width:380px; max-height:85vh; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.3); border-radius:8px; z-index:9999; display:flex; flex-direction:column; overflow:hidden;`;

    // --- Header ---
    const header = document.createElement('div');
    header.style.cssText = `padding:12px 16px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b>${isGlobalMode ? t("ui_title_global") : t("ui_title_current")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">✕</button>`;
    panel.appendChild(header);

    // --- Content Container (Scrollable) ---
    const content = document.createElement('div');
    content.style.cssText = `padding:16px; display:flex; flex-direction:column; gap:20px; overflow-y:auto;`;

    const createRow = (label, element) => {
        const div = document.createElement('div'); div.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        const lbl = document.createElement('label'); lbl.innerText = label; lbl.style.cssText = "font-size:13px; color:var(--text-normal);";
        div.appendChild(lbl); div.appendChild(element); return div;
    };

    // 动态渲染区域容器
    const layoutContainer = document.createElement('div');
    const themeSelectorContainer = document.createElement('div');
    const themeEditorContainer = document.createElement('div');
    content.appendChild(layoutContainer);
    content.appendChild(themeSelectorContainer);
    if (isGlobalMode) content.appendChild(themeEditorContainer);

    // 渲染排版设置
    const renderLayout = () => {
        layoutContainer.innerHTML = `<div style="font-size:12px; font-weight:bold; color:var(--text-muted); margin-bottom:10px; border-bottom:1px solid var(--background-modifier-border); padding-bottom:4px;">${t("ui_group_layout")}</div>`;
        
        // 展开方向
        const dirSelect = document.createElement('select'); dirSelect.style.cssText = "width:120px; background:var(--background-modifier-form-field); border-radius:4px; padding:4px; color:var(--text-normal); border:1px solid var(--background-modifier-border);";
        const dirs = { "LR": t("ui_dir_lr"), "RL": t("ui_dir_rl"), "TD": t("ui_dir_td"), "BU": t("ui_dir_bu") };
        Object.entries(dirs).forEach(([val, text]) => {
            const o = document.createElement('option'); o.value = val; o.innerText = text;
            if(activeLayoutSettings.direction === val) o.selected = true; dirSelect.appendChild(o);
        });
        dirSelect.onchange = e => activeLayoutSettings.direction = e.target.value;
        layoutContainer.appendChild(createRow(t("ui_direction"), dirSelect));

        // 连线样式选择器
        const arrowSelect = document.createElement('select'); arrowSelect.style.cssText = dirSelect.style.cssText;
        const arrowOptions = { "normal": t("ui_arrow_normal"), "elbow": t("ui_arrow_elbow"), "curve": t("ui_arrow_curve") };
        Object.entries(arrowOptions).forEach(([val, text]) => {
            const o = document.createElement('option'); o.value = val; o.innerText = text;
            if(activeLayoutSettings.arrowType === val) o.selected = true; arrowSelect.appendChild(o);
        });
        arrowSelect.onchange = e => activeLayoutSettings.arrowType = e.target.value;
        layoutContainer.appendChild(createRow(t("ui_arrow_style"), arrowSelect));

        const fixedPointSelect = document.createElement('select'); fixedPointSelect.style.cssText = dirSelect.style.cssText;
        fixedPointSelect.innerHTML = `<option value="true">${t("ui_fixed_center")}</option><option value="false">${t("ui_auto_slide")}</option>`;
        fixedPointSelect.value = activeLayoutSettings.enableFixedPoint ? "true" : "false";
        fixedPointSelect.onchange = e => activeLayoutSettings.enableFixedPoint = (e.target.value === "true");
        layoutContainer.appendChild(createRow(t("ui_fixed_point"), fixedPointSelect));

        layoutContainer.appendChild(createRow(t("ui_node_gap"), createInput("number", activeLayoutSettings.defaultGap, val => activeLayoutSettings.defaultGap = val, "60px")));
        layoutContainer.appendChild(createRow(t("ui_line_length"), createInput("number", activeLayoutSettings.lengthBetweenElAndLine, val => activeLayoutSettings.lengthBetweenElAndLine = val, "60px")));
    };

    // 渲染主题下拉选择区
    const renderThemeSelector = () => {
        themeSelectorContainer.innerHTML = `<div style="font-size:12px; font-weight:bold; color:var(--text-muted); margin-bottom:10px; border-bottom:1px solid var(--background-modifier-border); padding-bottom:4px;">${t("ui_group_theme")}</div>`;
        
        const topRow = document.createElement('div'); topRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        const themeSelect = document.createElement('select'); themeSelect.style.cssText = "flex-grow:1; background:var(--background-modifier-form-field); border-radius:4px; padding:6px; color:var(--text-normal); border:1px solid var(--background-modifier-border);";
        
        Object.keys(localConfig.themes).forEach(k => {
            const o = document.createElement('option'); o.value = k; o.innerText = localConfig.themes[k].name;
            if (activeThemeKey === k) o.selected = true; themeSelect.appendChild(o);
        });
        themeSelect.onchange = (e) => { activeThemeKey = e.target.value; activeLayoutSettings.theme = activeThemeKey; if(isGlobalMode) renderThemeEditor(); };
        topRow.appendChild(themeSelect);

        if (isGlobalMode) {
            const tools = document.createElement('div'); tools.style.cssText = "display:flex; gap:6px; margin-left:10px;";
            tools.appendChild(createIconButton("➕", () => {
                const newId = 'theme_' + Date.now();
                localConfig.themes[newId] = { name: t("ui_new_theme_name"), rootBg: "#343a40", colors: ["#1971c2", "#e03131", "#099268"], levels: JSON.parse(JSON.stringify(DEFAULT_LEVELS)) };
                activeThemeKey = newId; activeLayoutSettings.theme = activeThemeKey; renderThemeSelector(); renderThemeEditor();
            }, t("ui_new_theme_name")));
            tools.appendChild(createIconButton("✏️", () => {
                const newName = prompt(t("ui_prompt_theme_name"), localConfig.themes[activeThemeKey].name);
                if (newName && newName.trim()) { localConfig.themes[activeThemeKey].name = newName.trim(); renderThemeSelector(); }
            }, t("ui_rename_title")));
            tools.appendChild(createIconButton("🗑️", () => {
                if (Object.keys(localConfig.themes).length <= 1) return new Notice(t("notice_at_least_one"));
                if (confirm(t("confirm_delete_theme", { name: localConfig.themes[activeThemeKey].name }))) {
                    delete localConfig.themes[activeThemeKey]; activeThemeKey = Object.keys(localConfig.themes)[0]; activeLayoutSettings.theme = activeThemeKey;
                    renderThemeSelector(); renderThemeEditor();
                }
            }, t("ui_delete_title")));
            topRow.appendChild(tools);
        }
        themeSelectorContainer.appendChild(topRow);
    };

    // 渲染主题细节编辑器（仅全局模式）
    const renderThemeEditor = () => {
        themeEditorContainer.innerHTML = "";
        if (!isGlobalMode || !localConfig.themes[activeThemeKey]) return;
        const currentTheme = localConfig.themes[activeThemeKey];

        const panelWrap = document.createElement('div'); panelWrap.style.cssText = `background:var(--background-secondary-alt); padding:12px; border-radius:6px; border:1px solid var(--background-modifier-border); display:flex; flex-direction:column; gap:12px;`;
        
        // 根节点背景
        panelWrap.appendChild(createRow(t("ui_root_bg"), createInput("color", currentTheme.rootBg, val => currentTheme.rootBg = val)));

        // 分支颜色管理
        const branchDiv = document.createElement('div');
        const branchHeader = document.createElement('div'); branchHeader.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;";
        branchHeader.innerHTML = `<span style="font-size:13px; font-weight:bold; color:var(--text-normal);">${t("ui_branch_colors")}</span>`;
        
        const branchTools = document.createElement('div'); branchTools.style.cssText = "display:flex; gap:4px;";
        branchTools.appendChild(createIconButton("+", () => { currentTheme.colors.push("#cccccc"); renderThemeEditor(); }, t("ui_add_color")));
        branchTools.appendChild(createIconButton("-", () => { if(currentTheme.colors.length > 1) { currentTheme.colors.pop(); renderThemeEditor(); } }, t("ui_remove_last")));
        branchHeader.appendChild(branchTools); branchDiv.appendChild(branchHeader);

        const branchColorsWrap = document.createElement('div'); branchColorsWrap.style.cssText = "display:flex; flex-wrap:wrap; gap:6px;";
        currentTheme.colors.forEach((c, i) => { branchColorsWrap.appendChild(createInput("color", c, val => currentTheme.colors[i] = val)); });
        branchDiv.appendChild(branchColorsWrap); panelWrap.appendChild(branchDiv);

        // 层级管理
        const lvlDiv = document.createElement('div');
        lvlDiv.innerHTML = `<div style="font-size:13px; font-weight:bold; color:var(--text-normal); margin-bottom:8px; margin-top:8px;">${t("ui_level_styles")}</div>`;
        currentTheme.levels.forEach((lvl) => {
            const row = document.createElement('div'); row.style.cssText = `display:flex; justify-content:space-between; align-items:center; background:var(--background-primary); padding:6px 8px; border-radius:6px; border:1px solid var(--background-modifier-border); margin-bottom:6px;`;
            row.innerHTML = `<span style="font-size:12px; font-weight:bold; width:20px;">L${lvl.level}</span>`;
            const wrap = document.createElement('div'); wrap.style.cssText = `display:flex; gap: 6px; align-items:center;`;
            wrap.appendChild(createInput("color", lvl.textColor, val => lvl.textColor = val, "auto", t("ui_text_color")));
            wrap.appendChild(createInput("color", lvl.strokeColor, val => lvl.strokeColor = val, "auto", t("ui_stroke_color")));
            wrap.appendChild(createInput("number", lvl.strokeWidth, val => lvl.strokeWidth = val, "35px", t("ui_stroke_width")));
            wrap.appendChild(createInput("number", lvl.fontSize, val => lvl.fontSize = val, "40px", t("ui_font_size")));
            row.appendChild(wrap); lvlDiv.appendChild(row);
        });
        panelWrap.appendChild(lvlDiv);
        themeEditorContainer.appendChild(panelWrap);
    };

    // 初始化渲染
    renderLayout(); renderThemeSelector(); if(isGlobalMode) renderThemeEditor();
    panel.appendChild(content);

    // --- Footer ---
    const footer = document.createElement('div');
    footer.style.cssText = `padding:12px 16px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:flex-end; gap:10px; background:var(--background-secondary); border-radius: 0 0 8px 8px;`;
    
    if (isGlobalMode) {
        const btnSave = document.createElement('button'); btnSave.innerText = t("ui_btn_save_global"); btnSave.className = "mod-cta";
        btnSave.onclick = async () => {
            localConfig.defaultSettings = activeLayoutSettings;
            let targetEngineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["Mindmap_Engine"] || {};
            targetEngineSettings["Mindmap Configuration"] = {
                value: JSON.stringify(localConfig, null, 2),
                description: t("setting_desc")
            };
            ExcalidrawAutomate.plugin.settings.scriptEngineSettings["Mindmap_Engine"] = targetEngineSettings;
            await ExcalidrawAutomate.plugin.saveSettings();
            new Notice(t("notice_saved_global")); panel.remove();
        };
        footer.appendChild(btnSave);
    } else {
        const btnApply = document.createElement('button'); btnApply.innerText = t("ui_btn_apply"); btnApply.className = "mod-cta";
        btnApply.onclick = async () => {
            ea.copyViewElementsToEAforEditing([targetRoot]);
            const rootForSetting = ea.getElement(targetRoot.id);
            if (rootForSetting) rootForSetting.customData.mindmap.settings = JSON.parse(JSON.stringify(activeLayoutSettings));
            await ea.addElementsToView(false, false, false);

            if (window.MindmapAPI && window.MindmapAPI.runLayout) {
                const sceneElements = ea.getViewElements();
                const treeElements = sceneElements.filter(el => {
                    if (el.customData?.mindmap?.root === targetRoot.id) return true;
                    if (el.type === "arrow" && el.startBinding) {
                        const startEl = sceneElements.find(e => e.id === el.startBinding.elementId);
                        return startEl?.customData?.mindmap?.root === targetRoot.id;
                    } return false;
                });
                
                const elementsToLoad = [...treeElements];
                treeElements.forEach(el => {
                    if (el.boundElements) {
                        el.boundElements.forEach(b => {
                            if (b.type === "text") { const textEl = sceneElements.find(e => e.id === b.id); if (textEl) elementsToLoad.push(textEl); }
                        });
                    }
                });

                ea.clear(); ea.copyViewElementsToEAforEditing(elementsToLoad);

                const rootStyle = resolveStyle(1, 0, activeLayoutSettings, localConfig.themes);
                const rEl = ea.getElement(targetRoot.id);
                if (rEl && rootStyle) {
                    rEl.backgroundColor = rootStyle.backgroundColor; rEl.strokeColor = rootStyle.strokeColor || "black"; rEl.strokeWidth = rootStyle.strokeWidth || 1;
                    if (rEl.type === "text") rEl.fontSize = rootStyle.fontSize;
                    if (rEl.boundElements) {
                        rEl.boundElements.forEach(b => { if (b.type === "text") { const t = ea.getElement(b.id); if (t) { t.strokeColor = rootStyle.textColor || "black"; t.fontSize = rootStyle.fontSize; } } });
                    }
                }

                const level2Nodes = treeElements.filter(el => el.customData?.mindmap?.parent === targetRoot.id && el.id !== targetRoot.id);
                level2Nodes.sort((a,b) => a.y - b.y);

                level2Nodes.forEach((l2Node, index) => {
                    const queue = [{ el: l2Node, branchIndex: index }];
                    while(queue.length > 0) {
                        const { el, branchIndex } = queue.shift();
                        const level = el.customData.mindmap.level;
                        const style = resolveStyle(level, branchIndex, activeLayoutSettings, localConfig.themes);
                        
                        const eEl = ea.getElement(el.id);
                        if (eEl && style) {
                            // 更新节点自身样式
                            eEl.backgroundColor = style.backgroundColor; eEl.strokeColor = style.strokeColor || "black"; eEl.strokeWidth = style.strokeWidth || 1;
                            if (eEl.type === "text") eEl.fontSize = style.fontSize;
                            if (eEl.boundElements) {
                                eEl.boundElements.forEach(b => { if (b.type === "text") { const t = ea.getElement(b.id); if (t) { t.strokeColor = style.textColor || "black"; t.fontSize = style.fontSize; } } });
                            }
                            
                            // 更新连入该节点的箭头线条样式 & 加入 curveArrow 属性
                            const incomingArrowId = treeElements.find(a => a.type === "arrow" && a.endBinding && a.endBinding.elementId === el.id)?.id;
                            if(incomingArrowId) {
                                const arrEl = ea.getElement(incomingArrowId);
                                if(arrEl) {
                                    arrEl.strokeColor = style.strokeColor || "black";
                                    arrEl.strokeWidth = style.strokeWidth || 1;
                                    arrEl.customData = arrEl.customData || {};
                                    if (activeLayoutSettings.arrowType === "curve") {
                                        arrEl.customData.curveArrow = true;
                                    } else {
                                        delete arrEl.customData.curveArrow;
                                    }

                                    if (activeLayoutSettings.enableFixedPoint) {
                                        if (arrEl.startBinding) arrEl.startBinding.mode = "inside";
                                        if (arrEl.endBinding) arrEl.endBinding.mode = "inside";
                                    } else {
                                        if (arrEl.startBinding) { delete arrEl.startBinding.mode; delete arrEl.startBinding.fixedPoint; }
                                        if (arrEl.endBinding) { delete arrEl.endBinding.mode; delete arrEl.endBinding.fixedPoint; }
                                    }
                                }
                            }
                        }
                        const children = treeElements.filter(c => c.customData?.mindmap?.parent === el.id && c.id !== el.id);
                        children.forEach(c => queue.push({ el: c, branchIndex }));
                    }
                });

                await ea.addElementsToView(false, false, false);
                setTimeout(async () => {
                    const currentSceneElements = ea.getViewElements();
                    const updatedElementsMap = new Map(currentSceneElements.map(el => [el.id, el]));
                    const updatedTreeElements = elementsToLoad.map(el => updatedElementsMap.get(el.id)).filter(Boolean);
                    await window.MindmapAPI.runLayout(updatedTreeElements, true);
                    new Notice(t("notice_applied"));
                }, 150);
            } else { new Notice(t("notice_no_engine")); }
            panel.remove();
        };
        footer.appendChild(btnApply);
    }

    panel.appendChild(footer); document.body.appendChild(panel);
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 拖拽逻辑
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        isDragging = true; startX = e.clientX; startY = e.clientY; const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top; e.preventDefault();
        document.onmousemove = (e) => { if(!isDragging) return; panel.style.left = (initLeft + e.clientX - startX) + 'px'; panel.style.top = (initTop + e.clientY - startY) + 'px'; };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
}

createStylePanel();
if (isGlobalMode) { new Notice(t("notice_global_mode")); }