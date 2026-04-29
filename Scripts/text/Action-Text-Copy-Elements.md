---
name: 提取并复制选中元素文字
description: 提取选中连线及其绑定节点的文字，或直接提取选中元素的文字，并以优美的UI反馈结果。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的连线或包含文字的节点，运行此脚本即可自动提取文字并复制到剪贴板。
features:
  - 智能解析连线的 起点、线段、终点 的文字并转换为CSV格式
  - 支持直接提取纯文本节点的内容
  - 注入美观且自动销毁的 HTML 毛玻璃浮动提示 UI
autorun: false
---
/*
```javascript
*/

var locales = {
  zh: {
    notice_empty: "请先选中需要提取文字的连线或文本元素！",
    copy_success: "✨ 提取并复制成功！",
    preview_title: "内容预览",
    close: "关闭"
  },
  en: {
    notice_empty: "Please select lines or text elements to extract first!",
    copy_success: "✨ Extracted & Copied Successfully!",
    preview_title: "Preview",
    close: "Close"
  }
};

const api = ea.getExcalidrawAPI();
// 兼容性获取 elementsMap
const elementsMap = typeof api.getSceneElementsMap === "function" 
    ? api.getSceneElementsMap() 
    : ea.getViewElements().reduce((acc, el) => acc.set(el.id, el), new Map());

const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_empty"));
    return;
}

// ---------------------------------------------------------
// 1. 数据提取逻辑
// ---------------------------------------------------------
function getBoundText(el) {
    let text = "";
    if (el && el.boundElements?.length > 0) {
        for (const bound of el.boundElements) {
            if (bound.type === "text") {
                const textEl = elementsMap?.get(bound.id);
                if (textEl && textEl.originalText) {
                    text = textEl.originalText;
                }
            }
        }
    }
    return text;
}

function getBindingText(id) {
    if (!id) return "";
    const el = elementsMap?.get(id);
    if (!el) return "";
    if (el.type === "text") return el.originalText || "";
    return getBoundText(el);
}

let resultText = "";
const arrowEls = selectedEls.filter(el => el.type === "arrow");

if (arrowEls.length > 0) {
    // 模式 A：连线模式 (提取 起点,连线,终点 文字)
    const rows = arrowEls.map(el => {
        const startStr = getBindingText(el?.startBinding?.elementId).replaceAll('"', '\\"');
        const arrowStr = getBoundText(el).replaceAll('"', '\\"');
        const endStr = getBindingText(el?.endBinding?.elementId).replaceAll('"', '\\"');
        return `"${startStr}","${arrowStr}","${endStr}"`;
    });
    resultText = rows.join("\n");
} else {
    // 模式 B：兜底模式 (选中了纯文本元素或其他带文本的图形)
    const texts = selectedEls.map(el => {
        if (el.type === "text") return el.originalText;
        return getBoundText(el);
    }).filter(t => t.trim() !== "");
    resultText = texts.join("\n");
}

if (!resultText) {
    new Notice(t("notice_empty"));
    return;
}

// 写入剪贴板
navigator.clipboard.writeText(resultText);


// ---------------------------------------------------------
// 2. 现代 HTML UI / UX 渲染逻辑
// ---------------------------------------------------------
function showBeautifulToast(content) {
    // 避免全局污染：利用 ExcalidrawAutomate.plugin 存储当前 UI 实例引用，若存在则先清理
    if (ExcalidrawAutomate.plugin._ymjr_copyToast && ExcalidrawAutomate.plugin._ymjr_copyToast.parentNode) {
        ExcalidrawAutomate.plugin._ymjr_copyToast.parentNode.removeChild(ExcalidrawAutomate.plugin._ymjr_copyToast);
    }

    const container = document.createElement("div");
    ExcalidrawAutomate.plugin._ymjr_copyToast = container;

    // 采用 CSS 变量与毛玻璃效果适配 Obsidian 深/浅色模式
    container.style.cssText = `
        position: fixed;
        bottom: 40px;
        right: 40px;
        width: 340px;
        background: var(--background-primary, rgba(30, 30, 30, 0.85));
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--background-modifier-border, rgba(150, 150, 150, 0.2));
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0,0,0,0.1);
        color: var(--text-normal, #eee);
        font-family: var(--font-interface);
        padding: 16px;
        z-index: 99999;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    // 防 XSS 简单处理，防止文本破坏 HTML 结构
    const safeContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--interactive-success, #4caf50); font-size: 18px; line-height: 1;">✓</span>
                <strong style="font-size: 14px; font-weight: 600;">${t("copy_success")}</strong>
            </div>
            <button id="ymjr-toast-close" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">${t("preview_title")}:</div>
        <pre style="background: var(--background-secondary, rgba(0,0,0,0.2)); padding: 10px; border-radius: 8px; font-size: 12px; line-height: 1.4; max-height: 120px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin: 0; border: 1px solid var(--background-modifier-border, transparent); scrollbar-width: thin;">${safeContent}</pre>
    `;

    // 挂载到 body (确保始终在最上层)
    document.body.appendChild(container);

    // 按钮交互样式
    const closeBtn = container.querySelector("#ymjr-toast-close");
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'var(--background-modifier-hover)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'transparent');

    // 触发入场动画
    requestAnimationFrame(() => {
        container.style.opacity = "1";
        container.style.transform = "translateY(0) scale(1)";
    });

    // 封装销毁逻辑
    const dismiss = () => {
        container.style.opacity = "0";
        container.style.transform = "translateY(15px) scale(0.95)";
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            if (ExcalidrawAutomate.plugin._ymjr_copyToast === container) {
                delete ExcalidrawAutomate.plugin._ymjr_copyToast;
            }
        }, 400); // 等待动画结束
    };

    closeBtn.onclick = dismiss;

    // 4.5秒后自动关闭
    setTimeout(dismiss, 4500);
}

showBeautifulToast(resultText);