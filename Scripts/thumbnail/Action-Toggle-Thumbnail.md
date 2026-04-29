---
name: 切换缩略图显示状态
description: 开启或关闭右侧的画布缩略图导航面板。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本将在画板右上角弹出一个带当前全局概览的缩略小地图。通过拖拽小地图中的红色取景框，可以快速且大范围地平移主画板视角。再次运行脚本可关闭小地图。
features:
  - 构建原生的悬浮 DOM 面板
  - 维持 `updateImage` 及状态位以通知后台引擎进行重绘
dependencies:
  - 必须依赖 [Feature-Thumbnail-Engine] 提供底层截图隔离与渲染
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_view: "请在 Excalidraw 视图中运行此脚本！",
    notice_closed: "⭕ 已关闭缩略图导航",
    notice_opened: "✨ 已开启缩略图导航",
    ui_title: "🗺️ 导航地图"
  },
  en: {
    notice_no_view: "Please run this script in an Excalidraw view!",
    notice_closed: "⭕ Thumbnail navigation closed",
    notice_opened: "✨ Thumbnail navigation opened",
    ui_title: "🗺️ Navigator"
  }
};
const targetView = ea.targetView;
if (!targetView) {
    new Notice(t("notice_no_view"));
    return;
}

const panelId = `ea-thumbnail-panel-${targetView.id}`;
const canvasId = `thumbnailCanvas-${targetView.id}`;

let panel = document.getElementById(panelId);

if (!panel) {
    const api = ea.getExcalidrawAPI();
    const state = api.getAppState();
    
    // 1. 创建容器面板
    panel = document.createElement('div');
    panel.id = panelId;
    panel.style.cssText = `position:absolute; top:30px; right:24px; background:var(--background-primary); border:1px solid var(--background-modifier-border); box-shadow:0 10px 30px rgba(0,0,0,0.25); border-radius:8px; z-index:999; display:flex; flex-direction:column; overflow:hidden;`;

    // 2. 创建可拖拽头部
    const header = document.createElement('div');
    header.style.cssText = `padding:6px 12px; background:var(--background-secondary); cursor:move; border-bottom:1px solid var(--background-modifier-border); display:flex; justify-content:space-between; align-items:center; user-select:none;`;
    header.innerHTML = `<b style="font-size:12px; color:var(--text-normal);">${t("ui_title")}</b><button id="close-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:12px;">✕</button>`;
    panel.appendChild(header);

    // 3. 创建内容区及 Canvas
    const content = document.createElement('div');
    content.style.cssText = `background:var(--color-base-00, #ffffff); display:flex; justify-content:center; align-items:center; padding: 4px;`;
    
    const thumbnailCanvas = document.createElement("canvas");
    thumbnailCanvas.id = canvasId;
    
    const canvasWidth = state.width / 6;
    const canvasHeight = state.height / 6;
    
    thumbnailCanvas.style.width = `${canvasWidth}px`;
    thumbnailCanvas.style.height = `${canvasHeight}px`;
    thumbnailCanvas.width = canvasWidth;
    thumbnailCanvas.height = canvasHeight;
    // 【修改点】鼠标设为 pointer
    thumbnailCanvas.style.cursor = "pointer";
    
    thumbnailCanvas.updateImage = true;

    content.appendChild(thumbnailCanvas);
    panel.appendChild(content);
    targetView.contentEl.appendChild(panel);

    // 4. 面板拖拽逻辑
    let isDraggingPanel = false, startX, startY, initLeft, initTop;
    header.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isDraggingPanel = true; 
        startX = e.clientX; 
        startY = e.clientY;
        const rect = panel.getBoundingClientRect(); 
        
        // 转换为相对父容器(targetView)的坐标
        const parentRect = targetView.contentEl.getBoundingClientRect();
        initLeft = rect.left - parentRect.left; 
        initTop = rect.top - parentRect.top;
        
        e.preventDefault();
        
        document.onmousemove = (e) => {
            if(!isDraggingPanel) return;
            panel.style.left = (initLeft + e.clientX - startX) + 'px';
            panel.style.top = (initTop + e.clientY - startY) + 'px';
            // 解除 right 的限制，防止冲突
            panel.style.right = 'auto'; 
        };
        document.onmouseup = () => { 
            isDraggingPanel = false; 
            document.onmousemove = null; 
            document.onmouseup = null; 
        };
    };

    // 关闭按钮逻辑
    header.querySelector('#close-btn').onclick = () => {
        panel.remove();
        new Notice(t("notice_closed"));
    };

    // 强制触发一次绘制渲染
    api.updateScene({ elements: api.getSceneElements().slice() });
    
    new Notice(t("notice_opened"));
} else {
    panel.remove();
    new Notice(t("notice_closed"));
}