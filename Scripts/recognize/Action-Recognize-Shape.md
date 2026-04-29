---
name: 智能手绘工具箱 (整合版)
description: 提供自动识别画笔锁定开关，以及针对选中元素的手动强制转换面板。
author: ymjr
version: 1.0.0
license: MIT
usage: 呼出工具箱。点击顶部开关可锁定画笔，接下来画的手绘线延迟 0.5s 自动变规则图形；选中已有手绘也可手动转换。
dependencies:
  - 必须依赖 [Feature-Shape-Engine] 核心引擎常驻后台
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_engine: "⚠️ 找不到识别引擎，请先运行 Feature-Shape-Engine！",
    notice_select: "请先选中需要转换的线条！",
    ui_title: "✨ 图形转换工具箱",
    ui_auto_mode: "画笔锁定 (延迟0.5s自动识别)",
    ui_auto: "智能识别",
    ui_rect: "矩形",
    ui_ellipse: "椭圆",
    ui_diamond: "菱形",
    ui_line: "直线",
    ui_cancel: "关闭",
    ui_convert: "转换选中项",
    notice_success: "🎉 转换成功！"
  },
  en: {
    notice_no_engine: "⚠️ Engine not found! Run Feature-Shape-Engine first.",
    notice_select: "Please select elements first!",
    ui_title: "✨ Shape Toolbox",
    ui_auto_mode: "Pen Lock (Auto-detect after 0.5s)",
    ui_auto: "Auto Detect",
    ui_rect: "Rect",
    ui_ellipse: "Ellipse",
    ui_diamond: "Diamond",
    ui_line: "Line",
    ui_cancel: "Close",
    ui_convert: "Convert Selected",
    notice_success: "🎉 Converted!"
  }
};

const api = ea.getExcalidrawAPI();

if (!ea.plugin._ymjr_shape || !ea.plugin._ymjr_shape.convertElements) {
    new Notice(t("notice_no_engine"));
    return;
}

const ShapeCore = ea.plugin._ymjr_shape;

if (document.getElementById("ea-shape-toolbox-panel")) {
    document.getElementById("ea-shape-toolbox-panel").remove();
}

// ---------------------------
// 渲染 HTML 整合面板 UI
// ---------------------------
const panel = document.createElement('div');
panel.id = "ea-shape-toolbox-panel";
panel.style.cssText = `position:fixed; top:15vh; right:5vw; width:300px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 8px 24px rgba(0,0,0,0.2); border-radius:10px; z-index:9999; display:flex; flex-direction:column; overflow:hidden; font-family:var(--font-interface);`;

const header = document.createElement('div');
header.style.cssText = `padding:12px 16px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; font-weight:bold; color:var(--text-normal);`;
header.innerHTML = `<span>${t("ui_title")}</span><button id="st-close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:16px;">✕</button>`;
panel.appendChild(header);

let isDragging = false, startX, startY, initLeft, initTop;
header.onmousedown = (e) => {
    if(e.target.tagName === 'BUTTON') return;
    isDragging = true; startX = e.clientX; startY = e.clientY;
    const rect = panel.getBoundingClientRect(); initLeft = rect.left; initTop = rect.top;
    e.preventDefault();
    document.onmousemove = (e) => {
        if(!isDragging) return;
        panel.style.left = (initLeft + e.clientX - startX) + 'px';
        panel.style.top = (initTop + e.clientY - startY) + 'px';
        panel.style.right = "auto"; // 清除 right 避免冲突
    };
    document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
};

const content = document.createElement('div');
content.style.cssText = `padding:16px; display:flex; flex-direction:column; gap:16px;`;

// ---- 区块 1：自动模式锁定开关 ----
const autoCard = document.createElement('div');
autoCard.style.cssText = `padding:12px; border-radius:8px; border:1px solid var(--background-modifier-border); background:var(--background-primary-alt); display:flex; justify-content:space-between; align-items:center; cursor:pointer;`;

const autoLabel = document.createElement('span');
autoLabel.innerHTML = `🔒 <b>${t("ui_auto_mode")}</b>`;
autoLabel.style.fontSize = "13px";

const toggleInput = document.createElement('input');
toggleInput.type = "checkbox";
toggleInput.checked = ShapeCore.autoMode; // 初始化读取引擎状态
toggleInput.style.cssText = `cursor:pointer; width:16px; height:16px;`;

autoCard.onclick = (e) => {
    if (e.target !== toggleInput) toggleInput.checked = !toggleInput.checked;
    ShapeCore.autoMode = toggleInput.checked; // 实时写回引擎状态
    autoCard.style.borderColor = toggleInput.checked ? "var(--interactive-accent)" : "var(--background-modifier-border)";
};
autoCard.style.borderColor = toggleInput.checked ? "var(--interactive-accent)" : "var(--background-modifier-border)";

autoCard.appendChild(autoLabel);
autoCard.appendChild(toggleInput);
content.appendChild(autoCard);

// ---- 分割线 ----
const divider = document.createElement('div');
divider.style.cssText = `height:1px; background:var(--background-modifier-border); width:100%;`;
content.appendChild(divider);

// ---- 区块 2：手动转换选中项 ----
const manualSection = document.createElement('div');
manualSection.style.cssText = `display:flex; flex-direction:column; gap:8px;`;

const modes = [
    { id: "auto", label: t("ui_auto") },
    { id: "rectangle", label: t("ui_rect") },
    { id: "ellipse", label: t("ui_ellipse") },
    { id: "diamond", label: t("ui_diamond") },
    { id: "line", label: t("ui_line") }
];

let selectedMode = "auto";
const radioGroup = document.createElement('div');
radioGroup.style.cssText = `display:flex; flex-wrap:wrap; gap:8px;`;

modes.forEach(mode => {
    const label = document.createElement('label');
    label.style.cssText = `display:flex; align-items:center; gap:6px; cursor:pointer; padding:4px 8px; border-radius:4px; font-size:13px; background:var(--background-secondary); border:1px solid transparent; transition:all 0.2s;`;
    
    const radio = document.createElement('input');
    radio.type = "radio"; radio.name = "shapeMode"; radio.value = mode.id;
    if(mode.id === "auto") { radio.checked = true; label.style.borderColor = "var(--interactive-accent)"; }
    
    radio.onchange = (e) => {
        selectedMode = e.target.value;
        Array.from(radioGroup.children).forEach(l => l.style.borderColor = "transparent");
        label.style.borderColor = "var(--interactive-accent)";
    };
    
    label.appendChild(radio); label.appendChild(document.createTextNode(mode.label));
    radioGroup.appendChild(label);
});

manualSection.appendChild(radioGroup);

const convertBtn = document.createElement('button');
convertBtn.innerText = t("ui_convert"); 
convertBtn.style.cssText = `margin-top:8px; background:var(--interactive-accent); color:var(--text-on-accent); border:none; padding:8px 14px; border-radius:6px; font-weight:bold; cursor:pointer; width:100%;`;

convertBtn.onclick = async () => {
    const selectedEls = ea.getViewSelectedElements().filter(el => el.type === "freedraw");
    if (selectedEls.length === 0) {
        new Notice(t("notice_select"));
        return;
    }
    await ShapeCore.convertElements(selectedEls, ea, selectedMode);
    new Notice(t("notice_success"));
};

manualSection.appendChild(convertBtn);
content.appendChild(manualSection);

panel.appendChild(content);
document.body.appendChild(panel);

header.querySelector('#st-close-btn').onclick = () => panel.remove();