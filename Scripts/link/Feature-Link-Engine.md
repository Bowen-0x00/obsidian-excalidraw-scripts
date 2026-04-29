---
name: 链接跳转增强引擎
description: 后台引擎：接管链接点击事件，支持同文件内锚点平滑跳转、跨文件智能打开，并带有去重防抖与历史记录功能。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，彻底接管并改造 Excalidraw 原生的链接点击行为。支持同文件内的元素锚点平滑导航（带选中效果），以及更智能的跨文件链接打开逻辑（规避 HoverEditor 干扰）。
features:
  - 拦截 onLinkClick 事件进行二次路由重定向
  - 独创的 500ms 时空防抖，完美屏蔽底层插件导致的多次重复触发 bug
  - 跳转前自动向全局栈 (`ExcalidrawAutomate.plugin._ymjr_linkOrigin`) 压入跳转历史，实现后退功能
  - 智能感知同文件内的块/组引用跳转 (`#^group=xxx`) 并执行平滑缩放 `viewZoomToElements`
dependencies:
  - 作为 Action-Return-Link-Origin (后退) 动作的强依赖环境
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_not_found: "⚠️ 未能在当前画布中找到目标元素",
    log_no_core: "EA_Core 未运行，无法挂载链接增强引擎",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    notice_not_found: "⚠️ Target element not found on current canvas",
    log_no_core: "EA_Core not running, cannot mount link handler engine",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.link-handler";

const handleLinkClick = async (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { element, link: linkText, event, view, subpath, file } = contextPayload;

    // ==========================================
    // 1. 放行解析阶段
    // ==========================================
    // 如果 file 为空，说明当前是第一次拦截（还在获取链接指向的真实文件）。
    // 必须放行 (return false)，让底层去把链接解析出真正的 target file。
    if (!file) {
        return false;
    }

    if (!api) return false;

    // ==========================================
    // 2. 核心防抖 (Debounce)
    // ==========================================
    // Excalidraw 底层可能会因为原生事件 + 插件合成事件在 100ms 内连续触发 2~3 次。
    // 我们在这里做 500 毫秒的时空防抖，直接拦截掉多余的重复调用。
    const now = Date.now();
    const targetId = file.path + (subpath || "");
    const lastClick = ExcalidrawAutomate.plugin._ymjr_lastLinkClick;
    
    if (lastClick && (now - lastClick.time < 500) && lastClick.target === targetId) {
        // 发现是短时间内的重复调用！
        // 💡 关键：返回 true 告诉底层“我已经处理过了，请立刻停止默认打开文件的行为！”
        return true; 
    }
    // 记录本次有效的点击
    ExcalidrawAutomate.plugin._ymjr_lastLinkClick = { time: now, target: targetId };


    // ==========================================
    // 3. 历史记录系统
    // ==========================================
    if (!ExcalidrawAutomate.plugin._ymjr_linkOrigin) {
        ExcalidrawAutomate.plugin._ymjr_linkOrigin = [];
    }
    ExcalidrawAutomate.plugin._ymjr_linkOrigin.push({
        element: element,
        zoom: api.getAppState().zoom.value
    });


    // ==========================================
    // 4. 场景 A：同文件内的块/组引用跳转
    // ==========================================
    if (view.file.path === file.path) {
        if (!subpath) return true; // 如果同文件但没有 subpath，就停在原地拦截

        // 优化正则：使用非捕获组 (?:) 提取真正的 ID
        const match = subpath.match(/#\^(?:group=)*([\w-]+)/);
        if (!match) return true;

        const targetElementId = match[1];
        const elements = api.getSceneElements();
        const targetElement = elements.find(el => el.id === targetElementId);

        if (targetElement) {
            const groupElements = ea.getElementsInTheSameGroupWithElement(targetElement, elements);
            const elementsToZoom = groupElements.length > 0 ? groupElements : [targetElement];
            
            // 执行平滑缩放
            ea.viewZoomToElements(false, elementsToZoom);
        } else {
            new Notice(t("notice_not_found"));
        }
        
        return true; // 返回 true 成功熔断拦截底层的打开动作！
    }


    // ==========================================
    // 5. 场景 B：跨文件跳转
    // ==========================================
    const hoverEditorPlugin = app.plugins.plugins['obsidian-hover-editor'];
    const hasHoverEditor = hoverEditorPlugin?.activePopovers?.length > 0;

    if (hasHoverEditor) {
        app.workspace.activeLeaf = null; 
    }

    let location = "tab";
    let targetLeaf = null;

    app.workspace.iterateAllLeaves(leaf => {
        const viewState = leaf.getViewState();
        if (viewState.state?.file === file.path) {
            targetLeaf = leaf;
        }
    });

    if (hasHoverEditor) {
        location = false;
    }

    if (!targetLeaf) {
        targetLeaf = app.workspace.getLeaf(location);
    }

    if (targetLeaf) {
        app.workspace.setActiveLeaf(targetLeaf, { focus: true });
        await targetLeaf.openFile(file, { active: true, eState: { subpath } });
    }

    return true; // 返回 true 成功熔断！
};

// ==========================================
// 生命周期挂载与卸载
// ==========================================
async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'onLinkClick', handleLinkClick, 50);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}



mountFeature();

