---
name: 序号标签控制面板
description: 呼出或关闭序号标签(Bullet)设置面板，控制开启/关闭及样式
author: ymjr
version: 1.0.0
license: MIT
usage: 点击运行，屏幕弹出悬浮控制面板。可在其中设置序号样式并保存至配置。
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    panel_title: "🎯 序号标签面板",
    btn_active: "🟢 开启中：请点击画布放置",
    btn_inactive: "🔴 已暂停：点击此处开启放置",
    lbl_index: "当前序号",
    lbl_fontsize: "字体大小",
    lbl_circlesize: "基础尺寸",
    lbl_colorlist: "循环背景色",
    lbl_fontcolor: "字体颜色",
    btn_save: "保存设置",
    btn_saved: "已保存!",
    notice_closed: "🔘 控制面板已关闭",
    notice_active: "✨ 已开启，请点击画布放置",
    notice_saved: "✅ 样式设置已保存",
    btn_add: "添加"
  },
  en: {
    panel_title: "🎯 Bullet Panel",
    btn_active: "🟢 Active: Click canvas to place",
    btn_inactive: "🔴 Paused: Click to activate",
    lbl_index: "Current Index",
    lbl_fontsize: "Font Size",
    lbl_circlesize: "Circle Size",
    lbl_colorlist: "Cyclic BG Colors",
    lbl_fontcolor: "Font Color",
    btn_save: "Save Settings",
    btn_saved: "Saved!",
    notice_closed: "🔘 Panel closed",
    notice_active: "✨ Active: Click canvas to place",
    notice_saved: "✅ Settings saved",
    btn_add: "Add"
  }
};

const NAMESPACE = "_ymjr_bullet";

// 确保引擎初始化了状态
if (!ExcalidrawAutomate.plugin[NAMESPACE]) {
    ExcalidrawAutomate.plugin[NAMESPACE] = { isActive: false, currentIndex: 1, uiElement: null, onIndexChange: null, tempSettings: null };
}
const state = ExcalidrawAutomate.plugin[NAMESPACE];

if (state.uiElement) {
    state.uiElement.remove();
    state.uiElement = null;
    state.isActive = false; 
    state.tempSettings = null; // 关闭UI时清理临时设置
    new Notice(t("notice_closed"));
    return;
}

// 读取系统设置并克隆到 tempSettings（即时修改不影响未保存的配置）
let savedSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["bullet_settings"] || {};
if (savedSettings.bgColor && !savedSettings.colorList) {
    savedSettings.colorList = [savedSettings.bgColor];
}
state.tempSettings = {
    fontSize: savedSettings.fontSize ?? 20,
    circleSize: savedSettings.circleSize ?? 36,
    colorList: savedSettings.colorList ? [...savedSettings.colorList] : ["#FFADAD", "#FFD6A5", "#FDFFB6", "#CAFFBF"],
    fontColor: savedSettings.fontColor ?? "#000000"
};

const panel = document.createElement("div");
panel.id = "ymjr-bullet-ui-panel";
panel.style.cssText = `
    position: fixed; top: 80px; right: 80px; width: 280px;
    background: var(--background-primary, #ffffff);
    border: 1px solid var(--background-modifier-border, #ccc);
    border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 99999; font-family: var(--font-interface);
    color: var(--text-normal, #333); overflow: hidden; user-select: none;
`;

panel.innerHTML = `
    <div id="ymjr-bullet-header" style="padding: 10px 15px; background: var(--background-secondary, #f5f5f5); border-bottom: 1px solid var(--background-modifier-border); cursor: grab; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; font-size: 14px;">${t("panel_title")}</span>
        <button id="ymjr-bullet-close" style="background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px;">&times;</button>
    </div>
    <div style="padding: 15px; display: flex; flex-direction: column; gap: 12px;">
        <button id="ymjr-bullet-toggle" style="padding: 12px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; transition: background 0.2s; color: white;">
        </button>
        <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px;">${t("lbl_index")}</span>
            <input type="number" id="ymjr-bullet-index" value="${state.currentIndex}" style="width: 60px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); color: var(--text-normal); border-radius: 4px; padding: 2px 5px; text-align: center;">
        </label>
        <div style="border-top: 1px solid var(--background-modifier-border); margin: 5px 0;"></div>
        
        <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px;">${t("lbl_fontsize")}</span>
            <input type="number" id="ymjr-bullet-fontsize" value="${state.tempSettings.fontSize}" style="width: 60px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); color: var(--text-normal); border-radius: 4px; padding: 2px 5px;">
        </label>
        <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px;">${t("lbl_circlesize")}</span>
            <input type="number" id="ymjr-bullet-circlesize" value="${state.tempSettings.circleSize}" style="width: 60px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); color: var(--text-normal); border-radius: 4px; padding: 2px 5px;">
        </label>
        <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px;">${t("lbl_fontcolor")}</span>
            <input type="color" id="ymjr-bullet-fontcolor" value="${state.tempSettings.fontColor}" style="cursor: pointer; border: none; padding: 0; width: 25px; height: 25px; border-radius: 4px; background: transparent;">
        </label>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px;">${t("lbl_colorlist")}</span>
                <button id="ymjr-bullet-add-color" style="font-size: 12px; cursor: pointer; padding: 2px 8px; border-radius: 4px; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal);">+ ${t("btn_add")}</button>
            </div>
            <div id="ymjr-bullet-color-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
        </div>

        <button id="ymjr-bullet-save" style="margin-top: 10px; padding: 8px; background: var(--interactive-accent, #7a6bff); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">${t("btn_save")}</button>
    </div>
`;

document.body.appendChild(panel);
state.uiElement = panel;

const header = panel.querySelector("#ymjr-bullet-header");
const closeBtn = panel.querySelector("#ymjr-bullet-close");
const toggleBtn = panel.querySelector("#ymjr-bullet-toggle");
const indexInput = panel.querySelector("#ymjr-bullet-index");
const saveBtn = panel.querySelector("#ymjr-bullet-save");

const fontSizeInput = panel.querySelector("#ymjr-bullet-fontsize");
const circleSizeInput = panel.querySelector("#ymjr-bullet-circlesize");
const fontColorInput = panel.querySelector("#ymjr-bullet-fontcolor");
const colorListContainer = panel.querySelector("#ymjr-bullet-color-list");
const addColorBtn = panel.querySelector("#ymjr-bullet-add-color");

// --- 渲染循环颜色列表 ---
function renderColorList() {
    colorListContainer.innerHTML = "";
    state.tempSettings.colorList.forEach((col, idx) => {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display: flex; align-items: center; gap: 2px; background: var(--background-modifier-form-field); border-radius: 4px; border: 1px solid var(--background-modifier-border); padding: 2px;";
        wrapper.innerHTML = `
            <input type="color" value="${col}" data-idx="${idx}" class="ymjr-col-picker" style="cursor: pointer; border: none; padding: 0; width: 22px; height: 22px; border-radius: 4px; background: transparent;">
            ${state.tempSettings.colorList.length > 1 ? `<button data-idx="${idx}" class="ymjr-col-del" title="Remove" style="background: none; border: none; cursor: pointer; color: var(--text-error, #ff5555); font-weight: bold; padding: 0 4px; font-size: 14px; line-height: 1;">&times;</button>` : ''}
        `;
        colorListContainer.appendChild(wrapper);
    });

    // 绑定颜色列表元素的即时更新事件
    colorListContainer.querySelectorAll(".ymjr-col-picker").forEach(el => {
        el.addEventListener("input", (e) => {
            state.tempSettings.colorList[e.target.dataset.idx] = e.target.value;
        });
    });
    // 绑定删除颜色事件
    colorListContainer.querySelectorAll(".ymjr-col-del").forEach(el => {
        el.addEventListener("click", (e) => {
            state.tempSettings.colorList.splice(e.target.dataset.idx, 1);
            renderColorList();
        });
    });
}
renderColorList();

addColorBtn.addEventListener("click", () => {
    // 默认复制最后一个颜色
    const lastColor = state.tempSettings.colorList[state.tempSettings.colorList.length - 1] || "#FFD6A5";
    state.tempSettings.colorList.push(lastColor);
    renderColorList();
});

// --- 即时绑定区 ---
fontSizeInput.addEventListener("input", (e) => state.tempSettings.fontSize = Number(e.target.value));
circleSizeInput.addEventListener("input", (e) => state.tempSettings.circleSize = Number(e.target.value));
fontColorInput.addEventListener("input", (e) => state.tempSettings.fontColor = e.target.value);


// --- 核心状态控制 ---
function updateToggleUI() {
    if (state.isActive) {
        toggleBtn.innerText = t("btn_active");
        toggleBtn.style.background = "var(--interactive-success, #28a745)";
    } else {
        toggleBtn.innerText = t("btn_inactive");
        toggleBtn.style.background = "var(--interactive-normal, #6c757d)";
    }
}
updateToggleUI();

toggleBtn.addEventListener("click", () => {
    state.isActive = !state.isActive;
    updateToggleUI();
    if (state.isActive) {
        state.currentIndex = Number(indexInput.value) || 1;
        new Notice(t("notice_active"));
    }
});

indexInput.addEventListener("change", (e) => state.currentIndex = Number(e.target.value));
state.onIndexChange = (newIndex) => { if (indexInput) indexInput.value = newIndex; };

// --- 持久化保存 ---
saveBtn.addEventListener("click", async () => {
    // 将 tempSettings 深拷贝保存到磁盘
    ExcalidrawAutomate.plugin.settings.scriptEngineSettings["bullet_settings"] = JSON.parse(JSON.stringify(state.tempSettings));
    await ExcalidrawAutomate.plugin.saveSettings();
    
    state.currentIndex = Number(indexInput.value);
    new Notice(t("notice_saved"));
    
    saveBtn.innerText = t("btn_saved");
    setTimeout(() => saveBtn.innerText = t("btn_save"), 1500);
});

closeBtn.addEventListener("click", () => {
    panel.remove();
    state.uiElement = null;
    state.isActive = false;
    state.tempSettings = null; 
    new Notice(t("notice_closed"));
});

// 面板拖拽
let isDragging = false, startX, startY, initialLeft, initialTop;
header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return; // 防止点击关闭按钮时触发拖拽
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left; initialTop = rect.top;
    header.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', onStopDrag);
});
function onDrag(e) {
    if (!isDragging) return;
    panel.style.left = `${initialLeft + (e.clientX - startX)}px`;
    panel.style.top = `${initialTop + (e.clientY - startY)}px`;
    panel.style.bottom = 'auto'; panel.style.right = 'auto';
}
function onStopDrag() {
    isDragging = false;
    header.style.cursor = 'grab';
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onStopDrag);
}