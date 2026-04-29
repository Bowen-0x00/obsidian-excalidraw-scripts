---
name: 设置连线动画
description: 为选中的连线或箭头添加动态效果（流光、穿梭、飞行箭头）。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的连线或箭头后运行，在弹出的美观 UI 面板中配置动画。
features:
  - 纯 HTML/CSS 绘制的现代化 UI，完美融入 Obsidian 主题
  - 包含 Flow (流光)、Dash (穿梭)、Arrow (飞行箭头)
dependencies:
  - 必须依赖 [Feature-Animation-Engine] 后台常驻引擎渲染
autorun: false
---
/*
```javascript
*/
var locales = {
    zh: {
        notice_select: "请先选中需要添加动画的连线或箭头！",
        title: "✨ 连线动画",
        enable: "启用动画",
        type: "动画类型",
        type_flow: "🌊 流光 (Flow)",
        type_dash: "💨 穿梭 (Dash)",
        type_arrow: "🏹 飞行箭头 (Arrow)",
        speed: "运动速度",
        color: "特效颜色",
        btn_apply: "应用 (Apply)",
        btn_cancel: "取消 (Cancel)"
    },
    en: {
        notice_select: "Please select lines or arrows to animate first!",
        title: "✨ Animation",
        enable: "Enable Animation",
        type: "Animation Type",
        type_flow: "🌊 Flow",
        type_dash: "💨 Dash",
        type_arrow: "🏹 Flying Arrow",
        speed: "Speed",
        color: "Effect Color",
        btn_apply: "Apply",
        btn_cancel: "Cancel"
    }
};

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements().filter(el => ['line', 'arrow'].includes(el.type));

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

// 读取当前状态
const currentAnim = selectedEls[0]?.customData?.animation;
const hasAnim = !!currentAnim; // 判断当前是否有动画
const currentType = currentAnim?.type || "flow";
const currentSpeed = currentAnim?.speed || 40;
const currentColor = currentAnim?.color || selectedEls[0].strokeColor;

const containerId = "ymjr-animation-ui-container";
let oldContainer = document.getElementById(containerId);
if (oldContainer) oldContainer.remove();

const uiBackdrop = document.createElement("div");
uiBackdrop.id = containerId;
Object.assign(uiBackdrop.style, {
    position: "absolute", inset: "0", zIndex: "9999",
    display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)", backdropFilter: "blur(2px)"
});

const panel = document.createElement("div");
Object.assign(panel.style, {
    background: "var(--background-primary)",
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "12px", padding: "24px", width: "320px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
    fontFamily: "var(--font-interface)", color: "var(--text-normal)",
    display: "flex", flexDirection: "column", gap: "16px"
});

// 注入 Toggle 开关的 CSS 和 UI 结构
panel.innerHTML = `
    <style>
        .ymjr-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
        .ymjr-toggle input { opacity: 0; width: 0; height: 0; }
        .ymjr-toggle .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--background-modifier-border); transition: .3s; border-radius: 24px; }
        .ymjr-toggle .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .ymjr-toggle input:checked + .slider { background-color: var(--interactive-accent); }
        .ymjr-toggle input:checked + .slider:before { transform: translateX(20px); }
    </style>

    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 12px;">
        <h3 style="margin:0; font-size: 1.2em; color: var(--text-normal); font-weight: 600;">${t("title")}</h3>
        <label class="ymjr-toggle" title="${t("enable")}">
            <input type="checkbox" id="anim-enable" ${hasAnim ? 'checked' : ''}>
            <span class="slider"></span>
        </label>
    </div>
    
    <div id="anim-settings-group" style="display: flex; flex-direction: column; gap: 16px; transition: opacity 0.3s; opacity: ${hasAnim ? '1' : '0.4'}; pointer-events: ${hasAnim ? 'auto' : 'none'};">
        <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.9em; color: var(--text-muted);">${t("type")}</label>
            <select id="anim-type" style="padding: 8px; border-radius: 6px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); color: var(--text-normal); outline: none; cursor: pointer;">
                <option value="flow" ${currentType === 'flow' ? 'selected' : ''}>${t("type_flow")}</option>
                <option value="dash" ${currentType === 'dash' ? 'selected' : ''}>${t("type_dash")}</option>
                <option value="arrow" ${currentType === 'arrow' ? 'selected' : ''}>${t("type_arrow")}</option>
            </select>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.9em; color: var(--text-muted); display: flex; justify-content: space-between;">
                <span>${t("speed")}</span><span id="anim-speed-val">${currentSpeed}</span>
            </label>
            <input type="range" id="anim-speed" min="10" max="150" value="${currentSpeed}" style="width: 100%; cursor: pointer;">
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.9em; color: var(--text-muted);">${t("color")}</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="anim-color" value="${currentColor}" style="cursor: pointer; width: 40px; height: 30px; padding: 0; border: none; border-radius: 4px; background: none;">
                <span style="font-size: 0.85em; color: var(--text-muted);">HEX Color</span>
            </div>
        </div>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
        <button id="anim-cancel" style="padding: 8px 16px; border-radius: 6px; background: var(--background-modifier-error); border: none; color: white; cursor: pointer; font-weight: 500;">${t("btn_cancel")}</button>
        <button id="anim-apply" style="padding: 8px 16px; border-radius: 6px; background: var(--interactive-accent); border: none; color: var(--text-on-accent); cursor: pointer; font-weight: 500;">${t("btn_apply")}</button>
    </div>
`;

uiBackdrop.appendChild(panel);

const activeView = app.workspace.getActiveFileView();
if (activeView && activeView.getViewType() === "excalidraw") {
    activeView.containerEl.appendChild(uiBackdrop);
}

// 联动逻辑：开关切换时，控制下方设置区域的可用状态
document.getElementById("anim-enable").addEventListener("change", (e) => {
    const isEnabled = e.target.checked;
    const settingsGroup = document.getElementById("anim-settings-group");
    settingsGroup.style.opacity = isEnabled ? "1" : "0.4";
    settingsGroup.style.pointerEvents = isEnabled ? "auto" : "none";
});

document.getElementById("anim-speed").addEventListener("input", (e) => {
    document.getElementById("anim-speed-val").innerText = e.target.value;
});

document.getElementById("anim-cancel").addEventListener("click", () => {
    uiBackdrop.remove();
});

uiBackdrop.addEventListener("click", (e) => {
    if (e.target === uiBackdrop) uiBackdrop.remove();
});

document.getElementById("anim-apply").addEventListener("click", async () => {
    const isEnabled = document.getElementById("anim-enable").checked;
    const type = document.getElementById("anim-type").value;
    const speed = parseInt(document.getElementById("anim-speed").value);
    const color = document.getElementById("anim-color").value;

    selectedEls.forEach((el) => {
        if (!isEnabled) {
            // 如果开关关闭，直接删除动画数据
            if (el.customData?.animation) {
                delete el.customData.animation;
            }
        } else {
            // 如果开关打开，写入/更新动画数据
            el.customData = {
                ...el.customData,
                animation: { type, speed, color }
            };
        }
    });

    ea.copyViewElementsToEAforEditing(selectedEls);
    await ea.addElementsToView(false, true, true);
    if (api && api.updateScene) {
        ea.viewUpdateScene({ appState: { zoom: { value: api.getAppState().zoom.value + 0.00001 } } });
    }
    
    uiBackdrop.remove();
});
