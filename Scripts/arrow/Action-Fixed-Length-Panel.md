---
name: 连线定长配置面板
description: 悬浮面板：开启或关闭所选连线的定长旋转模式。
author: ymjr
version: 1.0.0
license: MIT
usage: 当需要将连线或箭头的长度锁定（如绘制圆规效果），只允许旋转而不改变长度时使用。
features:
  - 提供可拖拽的定长控制悬浮面板
  - 支持一键开启或解除选中连线的定长锁定状态
dependencies:
  - 需要配合 Feature-Fixed-Length-Engine 引擎使用以实现拦截和控制
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_arrow: "⚠️ 请先选中至少一根连线或箭头",
    notice_locked: "📏 已开启定长锁定",
    notice_unlocked: "🔓 已解除定长限制",
    panel_title: "📏 定长旋转控制",
    panel_desc: "开启后，拖拽连线端点时将固定其长度，仅允许改变旋转角度 (圆规模式)。",
    btn_enable: "开启锁定",
    btn_disable: "解除锁定"
  },
  en: {
    notice_no_arrow: "⚠️ Please select at least one line or arrow",
    notice_locked: "📏 Fixed length locked",
    notice_unlocked: "🔓 Fixed length unlocked",
    panel_title: "📏 Fixed Length Control",
    panel_desc: "When enabled, dragging line endpoints will fix their length, allowing only rotation (compass mode).",
    btn_enable: "Enable Lock",
    btn_disable: "Disable Lock"
  }
};
const { Notice } = ea.obsidian;
const api = ea.getExcalidrawAPI();

// ==========================================
// 1. 核心业务逻辑
// ==========================================
function toggleFixedLength(enable) {
    const selectedEls = ea.getViewSelectedElements().filter(el => ["arrow", "line"].includes(el.type));
    
    if (selectedEls.length === 0) {
        new Notice(t("notice_no_arrow"));
        return;
    }

    selectedEls.forEach((el) => {
        if (enable) {
            el.customData = { ...el.customData, fixedLength: true };
        } else {
            if (el.customData && el.customData.fixedLength) {
                delete el.customData.fixedLength;
            }
        }
    });

    ea.copyViewElementsToEAforEditing(selectedEls);
    ea.addElementsToView(false, false, false);
    new Notice(enable ? t("notice_locked") : t("notice_unlocked"));
}

// 检查当前选中元素的状态，用于初始化 UI
function checkCurrentState() {
    const selectedEls = ea.getViewSelectedElements().filter(el => ["arrow", "line"].includes(el.type));
    if (selectedEls.length === 0) return false;
    return selectedEls.some(el => el.customData?.fixedLength);
}

// ==========================================
// 2. UI 构建与交互逻辑
// ==========================================
function createFixedLengthPanel() {
    const PANEL_ID = "ea-fixed-length-adv-panel";
    if (document.getElementById(PANEL_ID)) return;

    // 主体容器
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `position:fixed; top:150px; left:80px; width:240px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.25); border-radius:8px; z-index:9999; display:flex; flex-direction:column; font-family: var(--font-interface);`;

    // 头部区域 (支持拖拽)
    const header = document.createElement('div');
    header.style.cssText = `padding:10px 14px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none; border-radius:8px 8px 0 0;`;
    header.innerHTML = `<b style="font-size:13px; color:var(--text-normal); display:flex; align-items:center; gap:6px;">${t("panel_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0; line-height:1;">✕</button>`;
    panel.appendChild(header);

    // 内容区域
    const content = document.createElement('div');
    content.style.cssText = `padding:16px 14px; display:flex; flex-direction:column; gap:12px;`;

    const description = document.createElement('div');
    description.style.cssText = `font-size: 12px; color: var(--text-muted); line-height: 1.4;`;
    description.innerText = t("panel_desc");
    content.appendChild(description);

    // 状态与按钮区
    const actionArea = document.createElement('div');
    actionArea.style.cssText = "display:flex; justify-content:space-between; gap: 8px; margin-top: 4px;";
    
    // 初始化状态判定
    const isCurrentlyActive = checkCurrentState();

    const btnEnable = document.createElement('button');
    btnEnable.innerText = t("btn_enable");
    btnEnable.style.cssText = `flex: 1; padding: 6px; cursor: pointer; border-radius: 4px; font-size: 13px; ${isCurrentlyActive ? 'background: var(--interactive-accent); color: var(--text-on-accent); border: none;' : ''}`;
    
    const btnDisable = document.createElement('button');
    btnDisable.innerText = t("btn_disable");
    btnDisable.style.cssText = `flex: 1; padding: 6px; cursor: pointer; border-radius: 4px; font-size: 13px; ${!isCurrentlyActive ? 'background: var(--background-modifier-error); color: var(--text-on-accent); border: none;' : ''}`;

    // 点击事件处理
    btnEnable.onclick = () => {
        toggleFixedLength(true);
        btnEnable.style.cssText = "flex: 1; padding: 6px; cursor: pointer; border-radius: 4px; font-size: 13px; background: var(--interactive-accent); color: var(--text-on-accent); border: none;";
        btnDisable.style.cssText = "flex: 1; padding: 6px; cursor: pointer; border-radius: 4px; font-size: 13px;";
    };

    btnDisable.onclick = () => {
        toggleFixedLength(false);
        btnDisable.style.cssText = "flex: 1; padding: 6px; cursor: pointer; border-radius: 4px; font-size: 13px; background: var(--background-modifier-error); color: var(--text-on-accent); border: none;";
        btnEnable.style.cssText = "flex: 1; padding: 6px; cursor: pointer; border-radius: 4px; font-size: 13px;";
    };

    actionArea.appendChild(btnEnable);
    actionArea.appendChild(btnDisable);
    content.appendChild(actionArea);
    panel.appendChild(content);

    // 挂载到 DOM
    document.body.appendChild(panel);

    // 关闭逻辑
    header.querySelector('#close-btn').onclick = () => panel.remove();

    // 拖拽逻辑 (无全局变量污染，使用闭包变量)
    let isDragging = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = panel.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;
        e.preventDefault();
        
        document.onmousemove = (moveEvent) => {
            if(!isDragging) return;
            panel.style.left = (initLeft + moveEvent.clientX - startX) + 'px';
            panel.style.top = (initTop + moveEvent.clientY - startY) + 'px';
        };
        
        document.onmouseup = () => {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

createFixedLengthPanel();