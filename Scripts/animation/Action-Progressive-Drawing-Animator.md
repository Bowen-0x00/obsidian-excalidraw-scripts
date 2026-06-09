---
name: 终极逐笔绘制动画
description: 完美模拟手绘与打字过程。提供可拖拽的悬浮面板，支持滑动条与输入框双向绑定，方便实时调试参数。
author: ymjr
version: 1.0.1
license: MIT
usage: 运行脚本弹出控制台。面板可任意拖拽，不遮挡画布。可反复点击“运行”进行调试。
features:
  - 可拖拽的悬浮 UI 控制台，沉浸式调试不打断工作流
  - 参数支持 Slider + Number Input 双向绑定同步
  - 支持后台反复重启运行，无需反复开关面板
  - 动态克隆元素强制绕过渲染缓存，实现完美打字机
  - 支持全局动画与仅选中元素动画切换
  - 修复文字动画重叠问题，打字机效果独立排期
dependencies:
  - EA_Core Hook 系统
autorun: false
---
/*
```javascript
*/

var locales = {
    zh: {
        ui_title: "🎬 逐笔动画控制台",
        ui_target: "动画目标",
        target_all: "全部元素",
        target_selected: "仅选中元素",
        ui_shape: "几何图形耗时",
        ui_freedraw: "自由画笔耗时",
        ui_text: "文字耗时",
        ui_text_mode_perchar: "单字",
        ui_text_mode_total: "总计",
        ui_gap: "出场间隔率",
        ui_hide_on_run: "🎥 录屏模式 (运行后自动隐藏面板)",
        ui_hide_hint: "提示：面板隐藏期间，再次点击工具栏的脚本图标即可强行停止动画。",
        btn_run: "▶️ 运行",
        btn_pause: "⏸️ 暂停",
        btn_resume: "▶️ 继续",
        btn_stop: "⏹️ 停止",
        btn_save: "💾 保存配置",
        btn_close: "❌ 关闭面板",
        notice_start: "🎬 开始播放逐笔绘制动画...",
        notice_hidden: "🎥 录屏模式已开启，面板已隐藏",
        notice_stop: "⏹️ 动画已手动停止",
        notice_finish: "✅ 绘制动画播放完成！",
        notice_no_elements: "⚠️ 没有找到可播放动画的元素",
        notice_saved: "💾 配置已固化到硬盘",
        log_no_core: "⚠️ 未检测到 EA_Core 核心引擎！"
    },
    en: {
        ui_title: "🎬 Animation Console",
        ui_target: "Animation Target",
        target_all: "All Elements",
        target_selected: "Selected Only",
        ui_shape: "Shape Duration",
        ui_freedraw: "Freedraw Duration",
        ui_text: "Text Time",
        ui_text_mode_perchar: "Per-char",
        ui_text_mode_total: "Total",
        ui_gap: "Gap Ratio",
        ui_hide_on_run: "🎥 Rec Mode (Auto-hide panel on run)",
        ui_hide_hint: "Hint: Click the script icon in the toolbar again to force stop.",
        btn_run: "▶️ Run",
        btn_pause: "⏸️ Pause",
        btn_resume: "▶️ Resume",
        btn_stop: "⏹️ Stop",
        btn_save: "💾 Save",
        btn_close: "❌ Close",
        notice_start: "🎬 Playing animation...",
        notice_hidden: "🎥 Panel hidden for recording",
        notice_stop: "⏹️ Animation stopped",
        notice_finish: "✅ Animation complete!",
        notice_no_elements: "⚠️ No elements found to animate",
        notice_saved: "💾 Settings saved to disk",
        log_no_core: "⚠️ EA_Core not detected!"
    }
};

const SCRIPT_ID = "ymjr.feature.progressive-drawing";
const PANEL_ID = "ymjr-animator-panel";
const api = ea.getExcalidrawAPI();
const core = window.EA_Core;

if (!core) {
    new Notice(t("log_no_core"));
    return;
}

// ==========================================
// 1. 状态管理 & 动画引擎隔离
// ==========================================
if (!ea.plugin._ymjr_animator) {
    ea.plugin._ymjr_animator = {
        active: false,
        paused: false,
        startTime: 0,
        pauseStartTime: 0,
        totalPausedDuration: 0,
        elements: [],
        progressMap: new Map(),
        reqId: null
    };
}
const state = ea.plugin._ymjr_animator;

// ==========================================
// 2. UI 按钮更新与清理逻辑
// ==========================================
const updatePlaybackUI = () => {
    const panelNode = document.getElementById(PANEL_ID);
    if (!panelNode) return;
    const btnPause = panelNode.querySelector("#btn-pause");
    const btnStop = panelNode.querySelector("#btn-stop");
    
    if (state.active) {
        btnStop.disabled = false;
        btnStop.style.opacity = "1";
        btnPause.disabled = false;
        btnPause.style.opacity = "1";
        if (state.paused) {
            btnPause.innerHTML = t("btn_resume");
            btnPause.style.background = "var(--interactive-accent, #007aff)";
            btnPause.style.color = "white";
        } else {
            btnPause.innerHTML = t("btn_pause");
            btnPause.style.background = "var(--background-secondary, #eee)";
            btnPause.style.color = "var(--text-normal, #333)";
        }
    } else {
        btnStop.disabled = true;
        btnStop.style.opacity = "0.5";
        btnPause.disabled = true;
        btnPause.style.opacity = "0.5";
        btnPause.innerHTML = t("btn_pause");
        btnPause.style.background = "var(--background-secondary, #eee)";
        btnPause.style.color = "var(--text-normal, #333)";
    }
};

const stopAnimation = (msg, silent = false) => {
    state.active = false;
    state.paused = false;
    if (state.reqId) cancelAnimationFrame(state.reqId);
    core.unregisterHook(SCRIPT_ID + '_render');
    
    if (state.elements && state.elements.length > 0) {
        state.elements.forEach(el => el.version++);
        api.updateScene({ elements: api.getSceneElements() });
    }
    
    const panelNode = document.getElementById(PANEL_ID);
    if (panelNode) {
        // 核心逻辑：如果面板被“录屏模式”隐藏，停止时顺便将其彻底销毁
        // 这样用户下一次点击脚本图标就能直接呼出面板，体验丝滑
        if (panelNode.dataset.hiddenMode === "true") {
            panelNode.remove();
        } else {
            updatePlaybackUI();
        }
    }
    
    if (!silent && msg) new Notice(t(msg));
};

// ==========================================
// 3. 动画执行逻辑
// ==========================================
const startAnimation = (config) => {
    const elements = config.targetMode === 'selected' 
        ? ea.getViewSelectedElements() 
        : ea.getViewElements();

    if (elements.length === 0) {
        new Notice(t("notice_no_elements"));
        return;
    }

    if (state.active) stopAnimation(null, true);

    state.active = true;
    state.paused = false;
    state.totalPausedDuration = 0;
    state.elements = elements;
    state.progressMap.clear();

    let currentTime = 0;
    state.elements.forEach(el => {
        let dur = config.shapeDuration;
        if (el.type === 'freedraw') dur = config.freedrawDuration;
        
        if (el.type === 'text') {
            if (config.textDurationMode === 'perChar') {
                const charCount = el.text ? el.text.length : 1;
                dur = config.textDuration * charCount;
            } else {
                dur = config.textDuration; 
            }
        }
        
        el._animStart = currentTime;
        el._animEnd = currentTime + dur;
        
        if (el.type === 'text') {
            currentTime += dur; 
        } else {
            currentTime += dur * config.gapRatio; 
        }
    });

    state.totalDuration = state.elements[state.elements.length - 1]._animEnd;
    state.startTime = performance.now();

    core.registerHook(SCRIPT_ID + '_render', 'renderElementBefore', handleRenderBefore, 99);
    new Notice(t("notice_start"));
    updatePlaybackUI();
    state.reqId = requestAnimationFrame(loop);
};

// ==========================================
// 4. 悬浮控制台 UI 构建与交互
// ==========================================
// 若面板已存在，再次点击脚本图标则将其移除并强制停止动画（支持隐藏时的紧急制动）
if (document.getElementById(PANEL_ID)) {
    document.getElementById(PANEL_ID).remove();
    stopAnimation("notice_stop");
    return; 
}

let settings = ea.getScriptSettings();
if(!settings["shapeDuration"]) {
    settings = {
        "shapeDuration": { value: "600" },
        "freedrawDuration": { value: "800" },
        "textDuration": { value: "50" }, 
        "textDurationMode": { value: "perChar" }, 
        "gapRatio": { value: "0.8" },
        "hideOnRun": { value: false },
        "targetMode": { value: "all" }
    };
    ea.setScriptSettings(settings);
} else if (settings["hideOnRun"] === undefined) {
    settings["hideOnRun"] = { value: false }; 
}

const isPerChar = settings.textDurationMode?.value !== 'total';
const txtMin = isPerChar ? 10 : 100;
const txtMax = isPerChar ? 500 : 5000;
const txtStep = isPerChar ? 10 : 100;

const buildControlRow = (id, label, val, min, max, step) => `
    <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-muted, #666);">${label}</label>
            <input type="number" id="inp-${id}" value="${val}" min="${min}" max="${max}" step="${step}" 
                   style="width: 60px; padding: 2px 4px; border-radius: 4px; border: 1px solid var(--background-modifier-border, #ccc); 
                          background: var(--background-secondary, #f9f9f9); color: var(--text-normal, #333); 
                          font-family: monospace; font-size: 12px; text-align: right;">
        </div>
        <input type="range" id="slider-${id}" value="${val}" min="${min}" max="${max}" step="${step}" 
               style="width: 100%; accent-color: var(--interactive-accent, #007aff); cursor: ew-resize;">
    </div>
`;

const panel = document.createElement("div");
panel.id = PANEL_ID;
panel.style.cssText = `
    position: fixed; top: 60px; right: 40px; width: 300px;
    background: var(--background-primary, #ffffff);
    border: 1px solid var(--background-modifier-border, #e3e3e3);
    border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 99999; font-family: var(--font-interface, sans-serif);
    display: flex; flex-direction: column; overflow: hidden;
    opacity: 0; transform: scale(0.95); transition: opacity 0.2s, transform 0.2s;
`;

panel.innerHTML = `
    <div id="drag-header" style="padding: 12px 16px; background: var(--background-secondary, #f0f0f0); 
         border-bottom: 1px solid var(--background-modifier-border, #e3e3e3); 
         cursor: grab; display: flex; align-items: center; user-select: none;">
        <span style="font-size: 14px; font-weight: bold; color: var(--text-normal, #333); pointer-events: none;">
            ${t("ui_title")}
        </span>
    </div>
    <div style="padding: 16px;">
        <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-muted, #666);">${t("ui_target")}</label>
            <select id="sel-target" style="width: 120px; padding: 4px; border-radius: 4px; border: 1px solid var(--background-modifier-border, #ccc); background: var(--background-secondary, #f9f9f9); color: var(--text-normal, #333); font-size: 12px; cursor: pointer;">
                <option value="all" ${settings.targetMode?.value === 'all' ? 'selected' : ''}>${t("target_all")}</option>
                <option value="selected" ${settings.targetMode?.value === 'selected' ? 'selected' : ''}>${t("target_selected")}</option>
            </select>
        </div>
        
        ${buildControlRow("shape", t("ui_shape") + " (ms)", settings.shapeDuration.value, 100, 5000, 100)}
        ${buildControlRow("freedraw", t("ui_freedraw") + " (ms)", settings.freedrawDuration.value, 100, 5000, 100)}
        
        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-muted, #666); display: flex; align-items: center; gap: 6px;">
                    ${t("ui_text")} (ms)
                    <label style="display: flex; align-items: center; cursor: pointer; font-weight: normal; font-size: 10px; background: var(--background-secondary, #f0f0f0); padding: 2px 4px; border-radius: 4px; border: 1px solid var(--background-modifier-border, #ccc); user-select: none;">
                        <input type="checkbox" id="chk-text-mode" ${isPerChar ? 'checked' : ''} style="margin: 0 4px 0 0; width: auto; cursor: pointer;">
                        <span id="lbl-text-mode">${isPerChar ? t("ui_text_mode_perchar") : t("ui_text_mode_total")}</span>
                    </label>
                </label>
                <input type="number" id="inp-text" value="${settings.textDuration.value}" min="${txtMin}" max="${txtMax}" step="${txtStep}" 
                       style="width: 60px; padding: 2px 4px; border-radius: 4px; border: 1px solid var(--background-modifier-border, #ccc); 
                              background: var(--background-secondary, #f9f9f9); color: var(--text-normal, #333); 
                              font-family: monospace; font-size: 12px; text-align: right;">
            </div>
            <input type="range" id="slider-text" value="${settings.textDuration.value}" min="${txtMin}" max="${txtMax}" step="${txtStep}" 
                   style="width: 100%; accent-color: var(--interactive-accent, #007aff); cursor: ew-resize;">
        </div>
        
        ${buildControlRow("gap", t("ui_gap") + " (0-1)", settings.gapRatio.value, 0, 1, 0.05)}
        
        <div style="margin-top: 16px; margin-bottom: 12px;">
            <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px; font-weight: bold; color: var(--text-normal, #333);">
                <input type="checkbox" id="chk-hide" ${settings.hideOnRun?.value ? 'checked' : ''} style="margin-right: 6px; cursor: pointer; accent-color: var(--interactive-accent, #007aff);">
                ${t("ui_hide_on_run")}
            </label>
            <div style="font-size: 10px; color: var(--text-muted, #999); margin-left: 20px; margin-top: 2px;">
                ${t("ui_hide_hint")}
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px;">
                <button id="btn-run" style="flex: 2; padding: 8px; border-radius: 6px; border: none; background: var(--interactive-accent, #007aff); color: white; font-weight: bold; cursor: pointer;">${t("btn_run")}</button>
                <button id="btn-pause" disabled style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--background-modifier-border, #ccc); background: var(--background-secondary, #eee); color: var(--text-normal, #333); font-weight: bold; cursor: pointer; opacity: 0.5;">${t("btn_pause")}</button>
                <button id="btn-stop" disabled style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--background-modifier-border, #ccc); background: var(--background-secondary, #eee); color: var(--text-error, #cc0000); font-weight: bold; cursor: pointer; opacity: 0.5;">${t("btn_stop")}</button>
            </div>
            <div style="display: flex; gap: 8px;">
                <button id="btn-save" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--background-modifier-border, #ccc); background: var(--interactive-normal, #f0f0f0); color: var(--text-normal, #333); cursor: pointer;">${t("btn_save")}</button>
                <button id="btn-close" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--background-modifier-border, #ccc); background: var(--background-secondary, #eee); color: var(--text-error, #cc0000); cursor: pointer;">${t("btn_close")}</button>
            </div>
        </div>
    </div>
`;

document.body.appendChild(panel);
updatePlaybackUI(); 

setTimeout(() => {
    panel.style.opacity = "1";
    panel.style.transform = "scale(1)";
}, 10);

const header = panel.querySelector("#drag-header");
let isDragging = false, startX, startY, initialLeft, initialTop;

header.addEventListener("mousedown", (e) => {
    isDragging = true;
    header.style.cursor = "grabbing";
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = initialLeft + "px";
    panel.style.top = initialTop + "px";
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${initialLeft + dx}px`;
    panel.style.top = `${initialTop + dy}px`;
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    header.style.cursor = "grab";
});

const bindControls = (id) => {
    const inp = panel.querySelector(`#inp-${id}`);
    const slider = panel.querySelector(`#slider-${id}`);
    inp.addEventListener('input', () => { slider.value = inp.value; });
    slider.addEventListener('input', () => { inp.value = slider.value; });
};
["shape", "freedraw", "text", "gap"].forEach(bindControls);

const textModeChk = panel.querySelector("#chk-text-mode");
const textModeLbl = panel.querySelector("#lbl-text-mode");
const inpText = panel.querySelector("#inp-text");
const sliderText = panel.querySelector("#slider-text");

const applyTextModeBounds = (perChar) => {
    if (perChar) {
        textModeLbl.innerText = t("ui_text_mode_perchar");
        inpText.min = 10; inpText.max = 500; inpText.step = 10;
        sliderText.min = 10; sliderText.max = 500; sliderText.step = 10;
    } else {
        textModeLbl.innerText = t("ui_text_mode_total");
        inpText.min = 100; inpText.max = 5000; inpText.step = 100;
        sliderText.min = 100; sliderText.max = 5000; sliderText.step = 100;
    }
};

textModeChk.onchange = (e) => {
    const perChar = e.target.checked;
    applyTextModeBounds(perChar);
    let val = Number(inpText.value);
    if (perChar) {
        val = Math.max(10, Math.min(500, Math.floor(val / 10)));
    } else {
        val = Math.max(100, Math.min(5000, val * 10));
    }
    inpText.value = val;
    sliderText.value = val;
};

const getCurrentConfig = () => ({
    shapeDuration: Number(panel.querySelector("#inp-shape").value),
    freedrawDuration: Number(panel.querySelector("#inp-freedraw").value),
    textDuration: Number(panel.querySelector("#inp-text").value),
    textDurationMode: panel.querySelector("#chk-text-mode").checked ? 'perChar' : 'total',
    hideOnRun: panel.querySelector("#chk-hide").checked,
    gapRatio: Number(panel.querySelector("#inp-gap").value),
    targetMode: panel.querySelector("#sel-target").value
});

panel.querySelector("#btn-run").onclick = () => {
    const config = getCurrentConfig();
    
    if (config.hideOnRun) {
        panel.dataset.hiddenMode = "true";
        panel.style.opacity = "0";
        panel.style.transform = "scale(0.95)";
        panel.style.pointerEvents = "none";
        setTimeout(() => { panel.style.display = "none"; }, 200);
        new Notice(t("notice_hidden"));
    } else {
        panel.dataset.hiddenMode = "false";
    }
    
    startAnimation(config);
};

panel.querySelector("#btn-pause").onclick = () => {
    if (!state.active) return;
    if (state.paused) {
        state.paused = false;
        state.totalPausedDuration += performance.now() - state.pauseStartTime;
    } else {
        state.paused = true;
        state.pauseStartTime = performance.now();
    }
    updatePlaybackUI();
};

panel.querySelector("#btn-stop").onclick = () => stopAnimation("notice_stop");

panel.querySelector("#btn-save").onclick = () => {
    const config = getCurrentConfig();
    settings["shapeDuration"].value = String(config.shapeDuration);
    settings["freedrawDuration"].value = String(config.freedrawDuration);
    settings["textDuration"].value = String(config.textDuration);
    settings["textDurationMode"] = { value: config.textDurationMode };
    settings["hideOnRun"] = { value: config.hideOnRun };
    settings["gapRatio"].value = String(config.gapRatio);
    settings["targetMode"] = { value: config.targetMode };
    ea.setScriptSettings(settings);
    new Notice(t("notice_saved"));
};

const closePanel = (doStop = true) => {
    panel.style.opacity = "0";
    panel.style.transform = "scale(0.95)";
    panel.style.pointerEvents = "none";
    setTimeout(() => { if(panel.parentNode) panel.remove(); }, 200);
    if(doStop && state.active) stopAnimation("notice_stop");
};

panel.querySelector("#btn-close").onclick = () => closePanel(true);


// ==========================================
// 5. 渲染核心工具集
// ==========================================

const drawProgressiveCode = (element, context, progress, payload) => {
    const codeMap = window.ExcalidrawAutomate?.plugin?._ymjr_codeMap;
    if (!codeMap) return false;
    const cache = codeMap.get(element.id);
    if (!cache || !cache.image || !cache.image.complete) return false;

    const { appState, getElementAbsoluteCoords, allElementsMap } = payload;
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, allElementsMap);
    const cx = (x1 + x2) / 2 + appState.scrollX;
    const cy = (y1 + y2) / 2 + appState.scrollY;
    let shiftX = (x2 - x1) / 2 - (element.x - x1);
    let shiftY = (y2 - y1) / 2 - (element.y - y1);

    context.save();
    context.translate(cx, cy);
    context.rotate(element.angle);
    context.translate(-shiftX, -shiftY);

    const styleTheme = element.customData?.codeHighlight?.style || 'atom-one-dark';
    context.fillStyle = styleTheme.includes('light') ? '#fafafa' : '#282c34';
    context.fillRect(-10, -10, element.width + 20, element.height + 20);

    const textLength = element.text.length;
    const visibleChars = Math.floor(textLength * progress);
    const lines = element.text.split('\n');
    
    let charsPassed = 0;
    let currentLineIdx = 0;
    let charsInCurrentLine = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1;
        if (charsPassed + lineLen > visibleChars) {
            currentLineIdx = i;
            charsInCurrentLine = Math.max(0, visibleChars - charsPassed);
            break;
        }
        charsPassed += lineLen;
        if (i === lines.length - 1) {
            currentLineIdx = i;
            charsInCurrentLine = lines[i].length;
        }
    }

    const getVisualLen = (str) => {
        let len = 0;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code === 9) len += 4; 
            else if (code > 255) len += 2; 
            else len += 1; 
        }
        return len;
    };

    const visualMaxLineLen = Math.max(1, ...lines.map(getVisualLen));
    const visualCurrentLen = getVisualLen(lines[currentLineIdx].substring(0, charsInCurrentLine));
    const currentLineRatio = visualCurrentLen / visualMaxLineLen;
    const lineHeight = element.height / lines.length;
    
    context.beginPath();
    
    const currentY = currentLineIdx * lineHeight;

    if (currentLineIdx > 0) {
        context.rect(-10, -10, element.width + 20, 10 + currentY + 1);
    }
    
    const currentMaskWidth = 10 + (element.width * currentLineRatio) + 15; 
    const currentH = currentLineIdx === 0 ? (lineHeight + 10) : (lineHeight + 2);
    const startY = currentLineIdx === 0 ? -10 : (currentY - 1); 
    
    context.rect(-10, startY, currentMaskWidth, currentH);
    context.clip();

    context.drawImage(cache.image, -10, -10, element.width + 20, element.height + 20);
    
    context.restore();
    return true;
};

const drawProgressiveRoughShape = (element, rc, renderConfig, progress) => {
    let shapeOrShapes = api.ShapeCache.generateElementShape(element, renderConfig);
    if (!shapeOrShapes) return;
    const shapes = Array.isArray(shapeOrShapes) ? shapeOrShapes : [shapeOrShapes];
    shapes.forEach(drawable => {
        if (!drawable || !drawable.sets) { rc.draw(drawable); return; }
        const slicedSets = drawable.sets.map(set => {
            if (set.type === 'path') {
                let p = Math.min(1, progress / 0.7);
                return { ...set, ops: set.ops.slice(0, Math.max(1, Math.floor(set.ops.length * p))) };
            } else {
                let p = Math.max(0, (progress - 0.7) / 0.3);
                return { ...set, ops: set.ops.slice(0, Math.max(0, Math.floor(set.ops.length * p))) };
            }
        });
        rc.draw({ ...drawable, sets: slicedSets });
    });
};

const drawProgressiveFreedraw = (element, context, renderConfig, progress, payload) => {
    const { allElementsMap, appState, getElementAbsoluteCoords } = payload;
    const keepPoints = Math.max(2, Math.floor(element.points.length * progress));
    const fakeElement = { 
        ...element, id: element.id + "_f", 
        points: element.points.slice(0, keepPoints), 
        pressures: element.pressures ? element.pressures.slice(0, keepPoints) : [] 
    };

    const shapes = api.ShapeCache.generateElementShape(fakeElement, renderConfig) || [];
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, allElementsMap);
    const cx = (x1 + x2) / 2 + appState.scrollX;
    const cy = (y1 + y2) / 2 + appState.scrollY;
    let shiftX = (x2 - x1) / 2 - (element.x - x1);
    let shiftY = (y2 - y1) / 2 - (element.y - y1);
    
    context.save();
    context.translate(cx, cy);
    context.rotate(element.angle);
    context.translate(-shiftX, -shiftY);
    
    for (const shape of shapes) {
        if (typeof shape === "string") {
            const path = new Path2D(shape);
            const hasOutline = element.customData?.strokeOptions?.hasOutline;
            context.fillStyle = hasOutline ? element.backgroundColor : element.strokeColor;
            context.fill(path);
            if (hasOutline) {
                context.lineWidth = element.strokeWidth * (element.customData?.strokeOptions?.outlineWidth ?? 1);
                context.strokeStyle = element.strokeColor;
                context.stroke(path);
            }
        } else if (payload.rc) payload.rc.draw(shape);
    }
    context.restore();
};

const drawProgressiveText = (element, context, renderConfig, progress, payload) => {
    const { allElementsMap, appState, generateElementWithCanvas, drawElementFromCanvas } = payload;
    const visibleChars = Math.floor(element.text.length * progress);
    const visibleString = element.text.substring(0, visibleChars);
    
    const fakeElement = { ...element, id: element.id + "_t", text: visibleString, originalText: visibleString };
    
    if (generateElementWithCanvas && drawElementFromCanvas) {
        const elementWithCanvas = generateElementWithCanvas(fakeElement, allElementsMap, renderConfig, appState);
        if (elementWithCanvas) drawElementFromCanvas(elementWithCanvas, context, renderConfig, appState, allElementsMap);
    }
};

const handleRenderBefore = (payload) => {
    if (!state.active) return false;
    const { element, rc, context, renderConfig, appState, getElementAbsoluteCoords, allElementsMap } = payload;
    const progress = state.progressMap.get(element.id);

    if (progress === undefined) return true; 

    if (progress <= 0) {
        return true; 
    }

    if (progress >= 1) return false; 

    if (element.type === "image") { context.globalAlpha = progress; return false; }
    
    if (element.type === "text" && element.customData?.codeHighlight) { 
        const isDrawn = drawProgressiveCode(element, context, progress, payload); 
        if (isDrawn) return true; 
    }

    if (element.type === "text") { drawProgressiveText(element, context, renderConfig, progress, payload); return true; }
    if (element.type === "freedraw") { drawProgressiveFreedraw(element, context, renderConfig, progress, payload); return true; }

    const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, allElementsMap);
    const cx = (x1 + x2) / 2 + appState.scrollX;
    const cy = (y1 + y2) / 2 + appState.scrollY;
    let shiftX = (x2 - x1) / 2 - (element.x - x1);
    let shiftY = (y2 - y1) / 2 - (element.y - y1);

    context.save();
    context.translate(cx, cy);
    context.rotate(element.angle);
    context.translate(-shiftX, -shiftY);

    drawProgressiveRoughShape(element, rc, renderConfig, progress);

    context.restore();
    return true; 
};

// ==========================================
// 6. 动画核心循环
// ==========================================
const loop = () => {
    if (!state.active) return;
    
    if (state.paused) {
        state.reqId = requestAnimationFrame(loop);
        return;
    }

    const elapsed = performance.now() - state.startTime - state.totalPausedDuration;
    let needsUpdate = false;

    state.elements.forEach(el => {
        let progress = 0;
        if (elapsed >= el._animEnd) progress = 1;
        else if (elapsed > el._animStart) progress = (elapsed - el._animStart) / (el._animEnd - el._animStart);

        if (state.progressMap.get(el.id) !== progress) {
            state.progressMap.set(el.id, progress);
            needsUpdate = true;
        }
    });

    if (needsUpdate) api.updateScene({ elements: api.getSceneElements() });

    if (elapsed < state.totalDuration + 100) {
        state.reqId = requestAnimationFrame(loop);
    } else {
        stopAnimation("notice_finish");
    }
};