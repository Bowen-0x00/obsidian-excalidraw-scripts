---
name: 阴影与交互设置
description: UI 面板：强大的多图层视觉控制器。独立管理“静态长亮阴影”与“悬停交互效果”，支持无限叠加图层。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中任意图形或文本，运行此脚本唤起“阴影特效与交互编辑器”。你可以配置无限层的静态投影，或者设置鼠标 Hover 时的动态效果。面板参数将实时应用到选中元素上。
features:
  - 提供极其强大的 GUI 面板，支持添加/删除多级阴影图层，以及控制鼠标悬停时的缩放、偏移和替换样式
  - 将所有状态精确注入到元素的 `customData.shadow` 和 `customData.hoverInfo` 字段
dependencies:
  - 必须依赖 [Feature-Shadow-Engine] 进行底层 Canvas 渲染
  - 可选依赖 [Feature-Hover-Engine] 提供交互式悬停响应
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选择至少一个元素",
    ui_panel_title: "✨ 阴影图层管理器",
    ui_static_title: "🌙 静态长亮阴影",
    ui_hover_title: "🖱️ 鼠标悬停特效",
    ui_hover_pointer: "👆 悬停时显示手指光标",
    ui_layer: "图层",
    ui_add_layer: "+ 添加新图层",
    ui_done: "完成",
    ui_editor_add: "✨ 新增",
    ui_editor_edit: "✏️ 编辑",
    ui_editor_layer_type: "图层",
    ui_editor_static: "静态",
    ui_editor_hover: "Hover",
    ui_editor_color: "🎨 颜色/亮度差",
    ui_editor_blur: "🌫️ 模糊 (Blur)",
    ui_editor_x: "↔️ 水平偏移 (X)",
    ui_editor_y: "↕️ 垂直偏移 (Y)",
    ui_editor_tip: "<b>💡 格式提示：</b><br>• 负数(如 <code>-20</code>)表示基于原色加深。<br>• <code>0.1</code> 表示相对尺寸，<code>10px</code> 表示绝对像素。",
    ui_editor_cancel: "取消",
    ui_editor_save: "确认保存"
  },
  en: {
    notice_select: "Please select at least one element",
    ui_panel_title: "✨ Shadow Layer Manager",
    ui_static_title: "🌙 Static Shadow",
    ui_hover_title: "🖱️ Hover Effects",
    ui_hover_pointer: "👆 Pointer cursor on hover",
    ui_layer: "Layer",
    ui_add_layer: "+ Add New Layer",
    ui_done: "Done",
    ui_editor_add: "✨ Add",
    ui_editor_edit: "✏️ Edit",
    ui_editor_layer_type: "Layer",
    ui_editor_static: "Static",
    ui_editor_hover: "Hover",
    ui_editor_color: "🎨 Color/Brightness",
    ui_editor_blur: "🌫️ Blur",
    ui_editor_x: "↔️ Offset X",
    ui_editor_y: "↕️ Offset Y",
    ui_editor_tip: "<b>💡 Format Tips:</b><br>• Negative (e.g., <code>-20</code>) darkens base color.<br>• <code>0.1</code> for relative, <code>10px</code> for absolute.",
    ui_editor_cancel: "Cancel",
    ui_editor_save: "Save"
  }
};
const { Notice } = ea.obsidian;

// ====================== 1. 数据初始化与解析 ======================
const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

const target = selectedEls[0];
const DEFAULT_SHADOW = { shadowColor: "rgba(0,0,0,0.3)", shadowBlur: "0.1", shadowOffsetX: "0", shadowOffsetY: "0.1" };

// 内部状态管理器 (不污染全局 window)
let state = {
    staticEnabled: !!target.customData?.shadow,
    staticShadows: [],
    hoverEnabled: !!target.customData?.hover,
    hoverPointer: target.customData?.hover?.pointer !== false,
    hoverShadows: []
};

// 解析静态阴影
if (target.customData?.shadow) {
    state.staticShadows = Array.isArray(target.customData.shadow) 
        ? JSON.parse(JSON.stringify(target.customData.shadow)) 
        : [JSON.parse(JSON.stringify(target.customData.shadow))];
}
// 解析 Hover 阴影
if (target.customData?.hover?.shadow) {
    state.hoverShadows = Array.isArray(target.customData.hover.shadow) 
        ? JSON.parse(JSON.stringify(target.customData.hover.shadow)) 
        : [JSON.parse(JSON.stringify(target.customData.hover.shadow))];
}

// ====================== 2. 核心应用逻辑 ======================
async function applyToSelected() {
    if (selectedEls.length === 0) return;
    const api = ea.getExcalidrawAPI();

    selectedEls.forEach((el) => {
        api.ShapeCache?.cache?.delete(el); 
        let customData = { ...(el.customData || {}) };

        // 应用静态阴影
        if (state.staticEnabled && state.staticShadows.length > 0) {
            customData.shadow = JSON.parse(JSON.stringify(state.staticShadows));
        } else {
            delete customData.shadow;
        }

        // 应用 Hover 阴影
        if (state.hoverEnabled) {
            customData.hover = {
                ...(customData.hover || {}),
                id: customData.hover?.id || [el.id],
                pointer: state.hoverPointer
            };
            if (state.hoverShadows.length > 0) {
                customData.hover.shadow = JSON.parse(JSON.stringify(state.hoverShadows));
            } else {
                delete customData.hover.shadow;
            }
        } else {
            if (customData.hover) {
                delete customData.hover.shadow;
                delete customData.hover.pointer;
                if (Object.keys(customData.hover).filter(k => k !== 'id').length === 0) {
                    delete customData.hover;
                }
            }
        }

        el.customData = customData;
    });

    ea.copyViewElementsToEAforEditing(selectedEls);
    await ea.addElementsToView(false, false, true);


    api.updateScene({ appState: { zoom: { value: api.getAppState().zoom.value + 0.0001 } } });
}

// ====================== 3. UI 界面构建 ======================
function createFloatingPanel() {
    if (document.getElementById("ea-multi-shadow-panel")) return;

    // --- 主面板容器 ---
    const panel = document.createElement('div');
    panel.id = "ea-multi-shadow-panel";
    panel.style.cssText = `position:fixed; top:100px; right:80px; width:340px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 12px 32px rgba(0,0,0,0.3); border-radius:10px; z-index:9999; display:flex; flex-direction:column; max-height:80vh; overflow:hidden; font-family: var(--font-interface);`;

    // 头部
    const header = document.createElement('div');
    header.style.cssText = `padding:14px 16px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; font-weight:bold; color:var(--text-normal);`;
    header.innerHTML = `<span>${t("ui_panel_title")}</span><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:16px; padding:0;">✕</button>`;
    panel.appendChild(header);

    // 滚动内容区
    const content = document.createElement('div');
    content.style.cssText = `padding:16px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:20px; position:relative;`;
    panel.appendChild(content);

    // --- 动态渲染图层列表的工厂函数 ---
    const renderSection = (title, modeKey) => {
        const wrapper = document.createElement('div');
        wrapper.id = `section-${modeKey}`;
        wrapper.style.cssText = `border: 1px solid var(--background-modifier-border); border-radius: 8px; background:var(--background-primary-alt); overflow:hidden;`;

        const shadowsArray = modeKey === 'static' ? state.staticShadows : state.hoverShadows;
        const isEnabled = modeKey === 'static' ? state.staticEnabled : state.hoverEnabled;

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--background-secondary-alt); border-bottom: ${isEnabled ? '1px solid var(--background-modifier-border)' : 'none'};">
                <strong style="color:var(--text-accent); font-size:13px;">${title}</strong>
                <input type="checkbox" id="toggle-${modeKey}" ${isEnabled ? 'checked' : ''} style="cursor:pointer;">
            </div>
        `;

        if (isEnabled) {
            html += `<div style="padding:10px 12px; display:flex; flex-direction:column; gap:8px;">`;
            
            // Hover 专属的 Pointer 开关
            if (modeKey === 'hover') {
                html += `
                    <label style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted); background:var(--background-modifier-form-field); padding:6px 10px; border-radius:6px; cursor:pointer;">
                        <span>${t("ui_hover_pointer")}</span>
                        <input type="checkbox" id="toggle-pointer" ${state.hoverPointer ? 'checked' : ''}>
                    </label>
                `;
            }

            // 图层列表
            shadowsArray.forEach((sh, idx) => {
                const colorDisp = String(sh.shadowColor).startsWith('#') || String(sh.shadowColor).startsWith('rgb') 
                    ? `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${sh.shadowColor}; border:1px solid var(--background-modifier-border);"></span>`
                    : `⚙️`; // 动态亮度计算

                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--background-primary); border:1px solid var(--background-modifier-border); border-radius:6px; padding:6px 10px; font-size:12px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${colorDisp}
                            <span style="color:var(--text-normal);">${t("ui_layer")} ${idx + 1}</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button data-action="edit" data-mode="${modeKey}" data-idx="${idx}" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:2px;">✏️</button>
                            <button data-action="delete" data-mode="${modeKey}" data-idx="${idx}" style="background:none; border:none; cursor:pointer; color:var(--text-error); padding:2px;">🗑️</button>
                        </div>
                    </div>
                `;
            });

            // 添加按钮
            html += `
                <button data-action="add" data-mode="${modeKey}" style="width:100%; padding:6px; margin-top:4px; background:transparent; border:1px dashed var(--text-muted); color:var(--text-muted); border-radius:6px; cursor:pointer; font-size:12px; transition:all 0.2s;">
                    ${t("ui_add_layer")}
                </button>
            </div>`;
        }

        wrapper.innerHTML = html;
        return wrapper;
    };

    // --- 刷新内容区 ---
    const refreshUI = () => {
        content.innerHTML = '';
        content.appendChild(renderSection(t("ui_static_title"), "static"));
        content.appendChild(renderSection(t("ui_hover_title"), "hover"));

        // 绑定事件 (事件委托)
        content.onchange = (e) => {
            if (e.target.id === 'toggle-static') { state.staticEnabled = e.target.checked; refreshUI(); applyToSelected(); }
            if (e.target.id === 'toggle-hover') { state.hoverEnabled = e.target.checked; refreshUI(); applyToSelected(); }
            if (e.target.id === 'toggle-pointer') { state.hoverPointer = e.target.checked; applyToSelected(); }
        };

        content.onclick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const mode = btn.dataset.mode;
            const action = btn.dataset.action;
            const idx = parseInt(btn.dataset.idx);

            if (action === 'delete') {
                if (mode === 'static') state.staticShadows.splice(idx, 1);
                else state.hoverShadows.splice(idx, 1);
                refreshUI(); applyToSelected();
            } else if (action === 'edit') {
                showEditor(mode, idx);
            } else if (action === 'add') {
                showEditor(mode, -1);
            }
        };
    };

    // --- 弹出编辑器 UI ---
    const showEditor = (mode, index) => {
        const isNew = index === -1;
        let shadowData = isNew 
            ? { ...DEFAULT_SHADOW } 
            : (mode === 'static' ? { ...state.staticShadows[index] } : { ...state.hoverShadows[index] });

        const editorOverlay = document.createElement('div');
        editorOverlay.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background:var(--background-primary); z-index:20; padding:16px; display:flex; flex-direction:column; gap:15px; animation: slideIn 0.2s ease-out; box-sizing: border-box; border-top:1px solid var(--background-modifier-border);`;
        
        // 动态注入动画
        if (!document.getElementById('ea-shadow-anim')) {
            const style = document.createElement('style');
            style.id = 'ea-shadow-anim';
            style.innerHTML = `@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`;
            document.head.appendChild(style);
        }

        const buildInputRow = (label, key) => `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:12px; color:var(--text-muted);">${label}</label>
                <input type="text" id="edit-${key}" value="${shadowData[key]}" style="width:120px; background:var(--background-modifier-form-field); border:1px solid var(--background-modifier-border); border-radius:4px; padding:4px 8px; font-size:12px; color:var(--text-normal);">
            </div>
        `;

        editorOverlay.innerHTML = `
            <div style="font-weight:bold; color:var(--text-accent); border-bottom:1px dashed var(--background-modifier-border); padding-bottom:8px;">
                ${isNew ? t("ui_editor_add") : t("ui_editor_edit")}${t("ui_editor_layer_type")} (${mode === 'static' ? t("ui_editor_static") : t("ui_editor_hover")})
            </div>
            
            <div style="display:flex; flex-direction:column; gap:12px; flex:1;">
                ${buildInputRow(t("ui_editor_color"), "shadowColor")}
                ${buildInputRow(t("ui_editor_blur"), "shadowBlur")}
                ${buildInputRow(t("ui_editor_x"), "shadowOffsetX")}
                ${buildInputRow(t("ui_editor_y"), "shadowOffsetY")}
                
                <div style="padding:10px; background:var(--background-secondary-alt); border-radius:6px; font-size:11px; color:var(--text-muted); line-height:1.4; margin-top:auto;">
                    ${t("ui_editor_tip")}
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:10px;">
                <button id="edit-cancel" style="flex:1; padding:6px; background:var(--background-secondary); border:1px solid var(--background-modifier-border); border-radius:6px; cursor:pointer;">${t("ui_editor_cancel")}</button>
                <button id="edit-save" style="flex:1; padding:6px; background:var(--interactive-accent); color:var(--text-on-accent); border:none; border-radius:6px; cursor:pointer;">${t("ui_editor_save")}</button>
            </div>
        `;

        content.appendChild(editorOverlay);

        // 绑定编辑器按钮
        editorOverlay.querySelector('#edit-cancel').onclick = () => editorOverlay.remove();
        editorOverlay.querySelector('#edit-save').onclick = () => {
            shadowData.shadowColor = editorOverlay.querySelector('#edit-shadowColor').value;
            shadowData.shadowBlur = editorOverlay.querySelector('#edit-shadowBlur').value;
            shadowData.shadowOffsetX = editorOverlay.querySelector('#edit-shadowOffsetX').value;
            shadowData.shadowOffsetY = editorOverlay.querySelector('#edit-shadowOffsetY').value;

            const targetArray = mode === 'static' ? state.staticShadows : state.hoverShadows;
            if (isNew) targetArray.push(shadowData);
            else targetArray[index] = shadowData;

            editorOverlay.remove();
            refreshUI();
            applyToSelected();
        };
    };

    refreshUI();

    // 底部完成按钮
    const footer = document.createElement('div');
    footer.style.cssText = `padding:12px 16px; border-top:1px solid var(--background-modifier-border); display:flex; justify-content:flex-end; background:var(--background-secondary);`;
    const btnClose = document.createElement('button'); 
    btnClose.innerText = t("ui_done"); 
    btnClose.style.cssText = `background:var(--interactive-accent); color:var(--text-on-accent); border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:bold;`;
    btnClose.onclick = () => panel.remove();
    footer.appendChild(btnClose);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 拖拽逻辑
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
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
}

createFloatingPanel();