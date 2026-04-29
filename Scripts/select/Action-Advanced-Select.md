---
name: 高级元素筛选器 (Table Builder版)
description: 带有实时感知和多级联动的表格化条件筛选器。
author: ymjr
version: 1.0.0
license: MIT
usage: 开启后常驻，支持多级联动条件。当鼠标在画布上重新选择范围时，会自动更新基准范围。
dependencies:
  - 依赖 EA_Core 的 handleCanvasPointerUp 钩子来感知手动选择。
---
/*
```javascript
*/

const SCRIPT_ID = "ymjr.feature.table-selector";
const UI_ID = "ymjr-table-selector-ui";

if (ExcalidrawAutomate.plugin._ymjr_advancedSelect) {
    ExcalidrawAutomate.plugin._ymjr_advancedSelect.close();
}

// 1. 多国语言
var locales = {
    zh: {
        title: "⚡ 高级筛选构建器",
        add_filter: "+ 添加条件",
        reset_scope: "重置为全画板",
        scope_status: "当前基准范围：{n} 个元素",
        logic_and: "并且 (AND)",
        logic_or: "或者 (OR)",
        logic_not: "排除 (NOT)",
        op_eq: "等于 (==)",
        op_neq: "不等于 (!=)",
        op_gt: "大于 (>)",
        op_lt: "小于 (<)",
        op_gte: "大于等于 (>=)",
        op_lte: "小于等于 (<=)",
        op_contains: "包含",
        del: "✕",
        no_filters: "暂无筛选条件，添加一行开始筛选。"
    },
    en: {
        title: "⚡ Query Builder",
        add_filter: "+ Add Condition",
        reset_scope: "Reset Scope (All)",
        scope_status: "Base Scope: {n} elements",
        logic_and: "AND",
        logic_or: "OR",
        logic_not: "NOT",
        op_eq: "Equals (==)",
        op_neq: "Not Eq (!=)",
        op_gt: "Greater (>)",
        op_lt: "Less (<)",
        op_gte: ">= ",
        op_lte: "<=",
        op_contains: "Contains",
        del: "✕",
        no_filters: "No filters. Add one to start."
    }
};

// 2. 属性字典（定义联动规则）
const PROP_CONFIG = {
    type: { 
        name: "元素类型 (Type)", 
        type: "select", 
        ops: ["op_eq", "op_neq"], 
        options: ["text", "rectangle", "ellipse", "diamond", "arrow", "line", "freedraw", "image"] 
    },
    width: { name: "宽度 (Width)", type: "number", ops: ["op_gt", "op_lt", "op_eq", "op_gte", "op_lte"] },
    height: { name: "高度 (Height)", type: "number", ops: ["op_gt", "op_lt", "op_eq", "op_gte", "op_lte"] },
    strokeColor: { name: "边框颜色 (Stroke)", type: "text", ops: ["op_eq", "op_neq", "op_contains"] },
    backgroundColor: { name: "背景颜色 (BgColor)", type: "text", ops: ["op_eq", "op_neq", "op_contains"] },
    strokeWidth: { name: "边框粗细", type: "number", ops: ["op_eq", "op_gt", "op_lt"] },
    opacity: { name: "不透明度 (0-100)", type: "number", ops: ["op_eq", "op_gt", "op_lt"] },
    fontSize: { name: "字号 (FontSize)", type: "number", ops: ["op_eq", "op_gt", "op_lt"] }
};

// 3. 核心状态管理
const state = {
    // 默认基准池：如果打开时有选中，基准就是选中；如果没有，基准是全部
    baseElements: ea.getViewSelectedElements().length > 0 
        ? ea.getViewSelectedElements() 
        : ea.getViewElements(),
    // 筛选条件列表
    filters: [], 
    // 防止代码触发的选中改变被当做用户的鼠标操作
    isScriptApplying: false 
};

// 防抖
const debounce = (fn, delay = 150) => {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

const createUI = () => {
    document.getElementById(UI_ID)?.remove();
    const container = document.createElement("div");
    container.id = UI_ID;
    
    // UI 样式
    const style = document.createElement("style");
    style.textContent = `
        #${UI_ID} { position: absolute; top: 15%; left: 55%; width: 560px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.25); font-family: var(--font-interface); color: var(--text-normal); z-index: 9999; backdrop-filter: blur(12px); display: flex; flex-direction: column; }
        .ym-header { padding: 12px 16px; background: var(--background-secondary); border-bottom: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; align-items: center; cursor: grab; border-radius: 12px 12px 0 0; font-weight: 600; }
        .ym-header:active { cursor: grabbing; }
        .ym-close-btn { cursor: pointer; color: var(--text-muted); }
        .ym-close-btn:hover { color: var(--text-error); }
        .ym-body { padding: 16px; max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .ym-row { display: flex; gap: 8px; align-items: center; animation: ym-slide-in 0.2s ease-out; }
        @keyframes ym-slide-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .ym-select, .ym-input { flex: 1; padding: 6px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); border-radius: 6px; color: var(--text-normal); font-size: 0.85em; outline: none; }
        .ym-select:focus, .ym-input:focus { border-color: var(--interactive-accent); }
        .ym-logic-box { width: 85px; }
        .ym-op-box { width: 100px; }
        .ym-del-btn { background: transparent; border: none; color: var(--text-error); cursor: pointer; padding: 4px 8px; border-radius: 4px; opacity: 0.6; }
        .ym-del-btn:hover { opacity: 1; background: var(--background-modifier-error-hover); }
        .ym-footer { padding: 12px 16px; border-top: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; align-items: center; background: var(--background-primary-alt); border-radius: 0 0 12px 12px; }
        .ym-btn { padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em; font-weight: 500; }
        .ym-btn-primary { background: var(--interactive-accent); color: var(--text-on-accent); }
        .ym-btn-text { background: transparent; color: var(--text-muted); text-decoration: underline; }
        .ym-btn-text:hover { color: var(--text-normal); }
        .ym-status { font-size: 0.8em; color: var(--text-success); font-weight: bold; }
        .ym-empty { text-align: center; font-size: 0.85em; color: var(--text-muted); padding: 20px 0; }
    `;
    container.appendChild(style);

    container.innerHTML += `
        <div class="ym-header" id="${UI_ID}-header">
            <span>${t("title")}</span>
            <span class="ym-close-btn" id="${UI_ID}-close">✕</span>
        </div>
        <div class="ym-body" id="${UI_ID}-list"></div>
        <div class="ym-footer">
            <span class="ym-status" id="${UI_ID}-status"></span>
            <div style="display: flex; gap: 12px;">
                <button class="ym-btn ym-btn-text" id="${UI_ID}-reset">${t("reset_scope")}</button>
                <button class="ym-btn ym-btn-primary" id="${UI_ID}-add">${t("add_filter")}</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // 4. 渲染循环引擎
    const renderList = () => {
        const listDiv = document.getElementById(`${UI_ID}-list`);
        document.getElementById(`${UI_ID}-status`).innerText = t("scope_status").replace("{n}", state.baseElements.length);
        
        if (state.filters.length === 0) {
            listDiv.innerHTML = `<div class="ym-empty">${t("no_filters")}</div>`;
            return;
        }

        listDiv.innerHTML = '';
        state.filters.forEach((filter, index) => {
            const row = document.createElement("div");
            row.className = "ym-row";
            
            // A. 逻辑关系下拉框 (第一行隐藏此框或显示为"Where")
            let logicHTML = '';
            if (index > 0) {
                logicHTML = `
                    <select class="ym-select ym-logic-box" data-idx="${index}" data-key="logic">
                        <option value="AND" ${filter.logic === 'AND' ? 'selected' : ''}>${t("logic_and")}</option>
                        <option value="OR" ${filter.logic === 'OR' ? 'selected' : ''}>${t("logic_or")}</option>
                        <option value="NOT" ${filter.logic === 'NOT' ? 'selected' : ''}>${t("logic_not")}</option>
                    </select>
                `;
            } else {
                logicHTML = `<div class="ym-logic-box" style="font-size: 0.85em; text-align: right; padding-right: 8px; color: var(--text-muted)">Where</div>`;
            }

            // B. 属性下拉框
            let propOptions = Object.keys(PROP_CONFIG).map(k => `<option value="${k}" ${filter.prop === k ? 'selected' : ''}>${PROP_CONFIG[k].name}</option>`).join('');
            
            // C. 操作符下拉框 (动态联动)
            const currentPropDef = PROP_CONFIG[filter.prop];
            let opOptions = currentPropDef.ops.map(opKey => `<option value="${opKey}" ${filter.op === opKey ? 'selected' : ''}>${t(opKey)}</option>`).join('');

            // D. 值输入框 (动态联动类型)
            let valHTML = '';
            if (currentPropDef.type === 'select') {
                let valOpts = currentPropDef.options.map(o => `<option value="${o}" ${filter.val === o ? 'selected' : ''}>${o}</option>`).join('');
                valHTML = `<select class="ym-select" data-idx="${index}" data-key="val">${valOpts}</select>`;
            } else {
                let inputType = currentPropDef.type === 'number' ? 'number' : 'text';
                valHTML = `<input type="${inputType}" class="ym-input" data-idx="${index}" data-key="val" value="${filter.val}">`;
            }

            row.innerHTML = `
                ${logicHTML}
                <select class="ym-select" style="flex: 1.2" data-idx="${index}" data-key="prop">${propOptions}</select>
                <select class="ym-select ym-op-box" data-idx="${index}" data-key="op">${opOptions}</select>
                <div style="flex: 1.5; display: flex">${valHTML}</div>
                <button class="ym-del-btn" data-idx="${index}">${t("del")}</button>
            `;
            listDiv.appendChild(row);
        });

        // 绑定事件：所有的 select 和 input 更改
        listDiv.querySelectorAll('select, input').forEach(el => {
            const eventType = el.tagName === 'INPUT' ? 'input' : 'change';
            el.addEventListener(eventType, debounce((e) => {
                const target = e.target;
                const idx = parseInt(target.dataset.idx);
                const key = target.dataset.key;
                
                state.filters[idx][key] = target.value;
                
                // 联动重置：如果修改了属性，必须重置操作符和默认值
                if (key === 'prop') {
                    const newDef = PROP_CONFIG[target.value];
                    state.filters[idx].op = newDef.ops[0];
                    state.filters[idx].val = newDef.type === 'select' ? newDef.options[0] : '';
                    renderList(); // 重绘 UI 显示联动框
                }
                
                applyFilters(); // 触发画板更新
            }));
        });

        // 绑定删除按钮
        listDiv.querySelectorAll('.ym-del-btn').forEach(btn => {
            btn.onclick = (e) => {
                state.filters.splice(parseInt(e.target.dataset.idx), 1);
                renderList();
                applyFilters();
            };
        });
    };

    // 5. 引擎执行逻辑
    const applyFilters = () => {
        // 如果没有条件，恢复为基准全选
        if (state.filters.length === 0) {
            state.isScriptApplying = true;
            ea.selectElementsInView(state.baseElements);
            setTimeout(() => state.isScriptApplying = false, 100);
            return;
        }

        const results = state.baseElements.filter(el => {
            let finalPassed = true;

            state.filters.forEach((f, idx) => {
                let elVal = el[f.prop];
                let condVal = f.val;
                
                if (PROP_CONFIG[f.prop].type === 'number') {
                    condVal = Number(condVal) || 0;
                    elVal = Number(elVal) || 0;
                }

                let isMatch = false;
                switch(f.op) {
                    case 'op_eq': isMatch = elVal === condVal; break;
                    case 'op_neq': isMatch = elVal !== condVal; break;
                    case 'op_gt': isMatch = elVal > condVal; break;
                    case 'op_lt': isMatch = elVal < condVal; break;
                    case 'op_gte': isMatch = elVal >= condVal; break;
                    case 'op_lte': isMatch = elVal <= condVal; break;
                    case 'op_contains': isMatch = String(elVal).toLowerCase().includes(String(condVal).toLowerCase()); break;
                }

                if (idx === 0) {
                    finalPassed = isMatch;
                } else {
                    if (f.logic === 'AND') finalPassed = finalPassed && isMatch;
                    if (f.logic === 'OR') finalPassed = finalPassed || isMatch;
                    if (f.logic === 'NOT') finalPassed = finalPassed && !isMatch; // 这里的 NOT 代表 AND NOT
                }
            });

            return finalPassed;
        });

        // 标记本次更新是由脚本驱动的，防止 Hook 误判
        state.isScriptApplying = true;
        ea.selectElementsInView(results);
        // 短暂延迟后解除标记
        setTimeout(() => state.isScriptApplying = false, 100);
    };

    // 6. 按钮事件
    document.getElementById(`${UI_ID}-add`).onclick = () => {
        state.filters.push({ logic: 'AND', prop: 'type', op: 'op_eq', val: 'text' });
        renderList();
        applyFilters();
    };

    document.getElementById(`${UI_ID}-reset`).onclick = () => {
        state.baseElements = ea.getViewElements();
        renderList();
        applyFilters();
    };

    // 7. 拦截手动鼠标操作 (Hook 注入)
    const handlePointerUpHook = (contextPayload) => {
        const { App } = contextPayload;
        // 如果是由脚本计算触发的选中变化，忽略
        if (state.isScriptApplying) return false;
        
        // 当鼠标抬起时，获取当前用户的物理实际选中，将其重置为新的基准范围！
        const userSelection = App.scene.getSelectedElements(App.state);
        
        // 更新基准范围
        state.baseElements = userSelection.length > 0 ? userSelection : ea.getViewElements();
        
        // 范围变了，立即用当前条件再次过滤新范围
        renderList();
        if (state.filters.length > 0) {
            applyFilters();
        }
        return false;
    };

    if (window.EA_Core) {
        window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerUp', handlePointerUpHook, 80);
    }

    // 初始化渲染
    renderList();
    if(state.filters.length > 0) applyFilters();

    // UI 拖拽
    const header = document.getElementById(`${UI_ID}-header`);
    let isDragging = false, startX, startY, initialX, initialY;
    header.onmousedown = (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; const rect = container.getBoundingClientRect(); initialX = rect.left; initialY = rect.top; container.style.left = `${initialX}px`; container.style.top = `${initialY}px`; };
    document.onmousemove = (e) => { if (isDragging) { container.style.left = `${initialX + (e.clientX - startX)}px`; container.style.top = `${initialY + (e.clientY - startY)}px`; } };
    document.onmouseup = () => { isDragging = false; };

    const closeUI = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        container.remove();
        delete ExcalidrawAutomate.plugin._ymjr_advancedSelect;
    };
    document.getElementById(`${UI_ID}-close`).onclick = closeUI;

    return { close: closeUI };
};

ExcalidrawAutomate.plugin._ymjr_advancedSelect = createUI();