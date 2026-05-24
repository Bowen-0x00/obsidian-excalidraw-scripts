---
name: 管理自定义调色板 (i18n 增强版)
description: 弹出一个可视化的色彩管理面板，支持创建色组、添加/修改/删除颜色，并将配置自动保存为标准的国际化 JSON 格式。
author: ymjr
version: 2.1.0
license: MIT
usage: 直接运行此脚本以呼出调色板管理器悬浮窗口。
features:
  - 完美支持多分组，每组可容纳任意数量的颜色
  - 支持中英双语自适应显示与编辑，不破坏异国语言数据
  - 组内支持颜色名即时输入、可视化颜色拾取器更改 Hex、单色删除
  - 自动序列化为标准的国际化 JSON 结构保存至插件后台
dependencies:
  - 依赖 扩展调色板核心引擎 提供底层解析支持
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    ui_title: "🎨 自定义调色板管理器",
    ui_btn_add_group: "➕ 新建色组",
    ui_btn_save: "💾 保存调色板配置",
    ui_prompt_group_name: "请输入新色组的名称：",
    ui_prompt_rename: "请输入色组的新名称：",
    ui_confirm_delete_group: "确定要删除整个色组 \"{name}\" 及其内部的所有颜色吗？",
    ui_default_group_name: "未命名色组",
    ui_default_color_name: "新颜色",
    ui_add_color: "✨ 添加颜色",
    ui_empty_tip: "暂无自定义色组，请点击下方按钮创建",
    ui_tooltip_rename: "重命名色组",
    ui_tooltip_delete: "删除色组",
    notice_saved: "✅ 调色板配置已成功保存！重启或刷新画板即可看到最新效果。",
    setting_desc: "⚠️ 请不要在此处直接修改 JSON 代码。请运行 '管理自定义调色板' 脚本通过可视化面板进行增删改查。"
  },
  en: {
    ui_title: "🎨 Custom Palette Manager",
    ui_btn_add_group: "➕ New Group",
    ui_btn_save: "💾 Save Configuration",
    ui_prompt_group_name: "Enter new group name:",
    ui_prompt_rename: "Enter new name for the group:",
    ui_confirm_delete_group: "Are you sure you want to delete group \"{name}\" and all its colors?",
    ui_default_group_name: "Unnamed Group",
    ui_default_color_name: "New Color",
    ui_add_color: "✨ Add Color",
    ui_empty_tip: "No custom color groups found. Click the button below to create one.",
    ui_tooltip_rename: "Rename Group",
    ui_tooltip_delete: "Delete Group",
    notice_saved: "✅ Palette saved successfully! Refresh Excalidraw to apply.",
    setting_desc: "⚠️ Do not modify JSON directly. Use 'Manage Custom Palette' script UI to update."
  }
};

const { Notice } = ea.obsidian;

// 🌐 动态获取当前 Obsidian 系统的语言环境
function getCurrentLanguage() {
    let lang = "en";
    if (typeof window !== "undefined") {
        const obsidianLang = window.localStorage.getItem("language");
        lang = obsidianLang || (navigator.language && navigator.language.startsWith("zh") ? "zh" : "en");
    }
    return lang.startsWith("zh") ? "zh" : "en";
}

// 🗺️ 国际化文本提取工具
function getLocalizedText(field, currentLang) {
    if (!field) return "";
    if (typeof field === "string") return field; 
    if (typeof field === "object") {
        return field[currentLang] || field["en"] || Object.values(field)[0] || "";
    }
    return String(field);
}

// ✍️ 国际化文本安全写入/转换工具
function updateLocalizedField(field, text, currentLang) {
    if (typeof field === "object" && field !== null) {
        field[currentLang] = text;
        return field;
    } else {
        // 如果原本是纯字符串老数据，平滑升级为多语言对象
        const obj = { zh: String(field || text), en: String(field || text) };
        obj[currentLang] = text;
        return obj;
    }
}

// 1. 读取并解析现有的配置状态
let engineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"] || {};
let paletteData = [];

try {
    if (engineSettings["Palette JSON Config"] && engineSettings["Palette JSON Config"].value) {
        paletteData = JSON.parse(engineSettings["Palette JSON Config"].value);
    } else {
        // 向下兼容读取老版本的配置串
        const oldStr = engineSettings["Palette List"]?.value;
        if(oldStr) {
            paletteData = [{ 
                "groupName": { "zh": "默认色组", "en": "Default Group" }, 
                "colors": oldStr.split(",").map(i => {
                    const p = i.split(":");
                    return p.length >= 2 ? { name: p[0].trim(), value: p[1].trim() } : null;
                }).filter(Boolean)
            }];
        } else {
            paletteData = [];
        }
    }
} catch (e) {
    paletteData = [];
}

// 2. UI 辅助函数
function createIconButton(text, onClick, title="", isCritical=false) {
    const btn = document.createElement('button'); 
    btn.innerHTML = text; 
    btn.title = title;
    const activeColor = isCritical ? "var(--text-error)" : "var(--text-normal)";
    btn.style.cssText = `background:var(--interactive-normal); border:1px solid var(--background-modifier-border); color:${activeColor}; border-radius:4px; cursor:pointer; padding:2px 6px; font-size:12px; display:inline-flex; align-items:center; justify-content:center;`;
    btn.onmouseover = () => btn.style.background = "var(--interactive-hover)";
    btn.onmouseout = () => btn.style.background = "var(--interactive-normal)";
    btn.onclick = onClick; 
    return btn;
}

// 3. 主控制面板创建
function createPaletteManagerPanel() {
    if (document.getElementById("ea-palette-manager-adv-panel")) return;

    const currentLang = getCurrentLanguage(); // 获取当前环境语言

    const panel = document.createElement('div');
    panel.id = "ea-palette-manager-adv-panel";
    panel.style.cssText = `position:fixed; top:120px; right:80px; width:380px; max-height:80vh; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.3); border-radius:8px; z-index:9999; display:flex; flex-direction:column; overflow:hidden; color:var(--text-normal);`;

    // 头部区域与拖拽
    const header = document.createElement('div');
    header.style.cssText = `padding:12px 16px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b>${t("ui_title")}</b><button id='close-btn' style='background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:14px;'>✕</button>`;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `padding:16px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; flex:1;`;
    panel.appendChild(content);

    // 渲染色组核心区域
    const renderGroups = () => {
        content.innerHTML = "";

        if (paletteData.length === 0) {
            const emptyTip = document.createElement('div');
            emptyTip.style.cssText = "text-align:center; color:var(--text-muted); font-size:12px; padding:20px 0;";
            emptyTip.innerText = t("ui_empty_tip");
            content.appendChild(emptyTip);
        }

        paletteData.forEach((group, gIndex) => {
            const groupWrap = document.createElement('div');
            groupWrap.style.cssText = `background:var(--background-secondary-alt); border:1px solid var(--background-modifier-border); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:10px;`;

            // 组标题及工具栏
            const titleRow = document.createElement('div');
            titleRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--background-modifier-border); padding-bottom:6px;";
            
            const titleText = document.createElement('span');
            const currentGroupName = getLocalizedText(group.groupName, currentLang); // 🚀 I18n 读取组名
            titleText.innerText = currentGroupName;
            titleText.style.cssText = "font-weight:bold; font-size:13px; color:var(--text-accent);";
            titleRow.appendChild(titleText);

            const groupTools = document.createElement('div');
            groupTools.style.cssText = "display:flex; gap:4px;";
            
            // 重命名组
            groupTools.appendChild(createIconButton("✏️", () => {
                const currentName = getLocalizedText(group.groupName, currentLang);
                const newName = prompt(t("ui_prompt_rename"), currentName);
                if (newName && newName.trim()) {
                    // 🚀 I18n 安全写入组名
                    group.groupName = updateLocalizedField(group.groupName, newName.trim(), currentLang);
                    renderGroups();
                }
            }, t("ui_tooltip_rename")));

            // 删除组
            groupTools.appendChild(createIconButton("🗑️", () => {
                const currentName = getLocalizedText(group.groupName, currentLang);
                if (confirm(t("ui_confirm_delete_group", { name: currentName }))) {
                    paletteData.splice(gIndex, 1);
                    renderGroups();
                }
            }, t("ui_tooltip_delete"), true));

            titleRow.appendChild(groupTools);
            groupWrap.appendChild(titleRow);

            // 颜色项列表
            const colorsContainer = document.createElement('div');
            colorsContainer.style.cssText = "display:flex; flex-direction:column; gap:6px;";

            group.colors.forEach((colorItem, cIndex) => {
                const colorRow = document.createElement('div');
                colorRow.style.cssText = "display:flex; align-items:center; gap:8px; background:var(--background-primary); padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border);";

                // 颜色选择器
                const picker = document.createElement('input');
                picker.type = "color";
                picker.value = colorItem.value.startsWith("#") ? colorItem.value : "#ffffff";
                picker.style.cssText = "width:24px; height:24px; padding:0; border:none; background:none; cursor:pointer; flex-shrink:0;";
                picker.onchange = (e) => {
                    group.colors[cIndex].value = e.target.value.toUpperCase();
                };
                colorRow.appendChild(picker);

                // 颜色名称输入框
                const nameInput = document.createElement('input');
                nameInput.type = "text";
                nameInput.value = getLocalizedText(colorItem.name, currentLang); // 🚀 I18n 读取颜色名
                nameInput.style.cssText = "flex:1; background:transparent; border:none; color:var(--text-normal); font-size:12px; padding:2px 4px;";
                nameInput.onchange = (e) => {
                    const targetVal = e.target.value.trim() || t("ui_default_color_name");
                    // 🚀 I18n 安全写入颜色名
                    group.colors[cIndex].name = updateLocalizedField(group.colors[cIndex].name, targetVal, currentLang);
                };
                colorRow.appendChild(nameInput);

                // 单色删除按钮
                const delColorBtn = document.createElement('button');
                delColorBtn.innerHTML = "✕";
                delColorBtn.style.cssText = "background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:11px; padding:2px 4px;";
                delColorBtn.onmouseover = () => delColorBtn.style.color = "var(--text-error)";
                delColorBtn.onmouseout = () => delColorBtn.style.color = "var(--text-muted)";
                delColorBtn.onclick = () => {
                    group.colors.splice(cIndex, 1);
                    renderGroups();
                };
                colorRow.appendChild(delColorBtn);

                colorsContainer.appendChild(colorRow);
            });
            groupWrap.appendChild(colorsContainer);

            // 组内添加颜色按钮
            const btnAddColor = document.createElement('button');
            btnAddColor.innerText = t("ui_add_color");
            btnAddColor.style.cssText = "align-self:flex-start; background:none; border:1px dashed var(--background-modifier-border); color:var(--text-muted); font-size:11px; padding:2px 8px; border-radius:4px; cursor:pointer;";
            btnAddColor.onclick = () => {
                // 🚀 创建标准的双语颜色对象
                group.colors.push({ 
                    name: { zh: locales.zh.ui_default_color_name, en: locales.en.ui_default_color_name }, 
                    value: "#3B82F6" 
                });
                renderGroups();
            };
            groupWrap.appendChild(btnAddColor);

            content.appendChild(groupWrap);
        });
    };

    // 底部控制按钮
    const footer = document.createElement('div');
    footer.style.cssText = `padding:12px 16px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; background:var(--background-secondary); border-radius: 0 0 8px 8px;`;
    
    const btnAddGroup = document.createElement('button');
    btnAddGroup.innerText = t("ui_btn_add_group");
    btnAddGroup.onclick = () => {
        const gName = prompt(t("ui_prompt_group_name"), t("ui_default_group_name"));
        if(gName && gName.trim()) {
            // 🚀 创建标准的双语色组对象
            const newGroup = {
                groupName: { zh: gName.trim(), en: gName.trim() },
                colors: [{ 
                    name: { zh: locales.zh.ui_default_color_name, en: locales.en.ui_default_color_name }, 
                    value: "#EF4444" 
                }]
            };
            newGroup.groupName[currentLang] = gName.trim();
            paletteData.push(newGroup);
            renderGroups();
        }
    };
    footer.appendChild(btnAddGroup);

    const btnSave = document.createElement('button');
    btnSave.innerText = t("ui_btn_save");
    btnSave.className = "mod-cta";
    btnSave.onclick = async () => {
        let targetEngineSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"] || {};
        targetEngineSettings["Palette JSON Config"] = {
            value: JSON.stringify(paletteData, null, 2),
            description: t("setting_desc")
        };
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"] = targetEngineSettings;
        await ExcalidrawAutomate.plugin.saveSettings();
        
        new Notice(t("notice_saved"));
        panel.remove();
    };
    footer.appendChild(btnSave);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    renderGroups();

    // 关闭及拖拽事件绑定
    header.querySelector('#close-btn').onclick = () => panel.remove();
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
        e.preventDefault();
        document.onmousemove = (e) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
}

createPaletteManagerPanel();