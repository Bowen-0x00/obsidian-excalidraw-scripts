---
name: 切换 Checkbox 标记
description: 将选中的文本块转化为 Checkbox 控件（再次运行取消）。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的文本，运行此脚本将其转化为 Checkbox。
dependencies:
  - 必须依赖 [Feature-Checkbox-Engine] 核心引擎处理后台交互
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选中至少一个文本元素！",
    notice_removed: "⭕ 已移除 Checkbox 控件特性",
    notice_added: "✨ 转化成功！现在可以 Shift+点击 切换状态了"
  },
  en: {
    notice_select: "Please select at least one text element!",
    notice_removed: "⭕ Checkbox feature removed",
    notice_added: "✨ Converted! Shift+Click to toggle state"
  }
};

// ==========================================
// 美观的 HTML Toast 通知
// ==========================================
function showModernToast(plugin, message, isSuccess = true) {
    if (!plugin._ymjr_checkbox_state) {
        plugin._ymjr_checkbox_state = { ui: {} };
    }
    const state = plugin._ymjr_checkbox_state;
    
    if (state.ui.toast && state.ui.toast.parentNode) {
        state.ui.toast.parentNode.removeChild(state.ui.toast);
    }

    const toast = document.createElement("div");
    const bgColor = isSuccess ? 'rgba(46, 204, 113, 0.95)' : 'rgba(231, 76, 60, 0.95)';
    const icon = isSuccess ? '✅' : '⚠️';

    toast.style.cssText = `
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: ${bgColor};
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        backdrop-filter: blur(8px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 99999;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    document.body.appendChild(toast);
    state.ui.toast = toast;

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }, 2500);
}

// ==========================================
// 核心逻辑处理
// ==========================================
const selectedEls = ea.getViewSelectedElements();
const textElements = selectedEls.filter(el => el.type === "text");

if (textElements.length === 0) {
    showModernToast(ExcalidrawAutomate.plugin, t("notice_select"), false);
    return;
}

const isAlreadyCheckbox = textElements[0]?.customData?.isCheckbox;

ea.copyViewElementsToEAforEditing(textElements);
const elementsToUpdate = ea.getElements();

elementsToUpdate.forEach((el) => {
    if (isAlreadyCheckbox) {
        if (el.customData) {
            delete el.customData.isCheckbox;
        }
    } else {
        el.customData = {
            ...el.customData,
            isCheckbox: true
        };
        if (!el.text.startsWith("- [ ]") && !el.text.startsWith("- [x]")) {
            el.text = "- [ ] " + el.text;
            el.originalText = "- [ ] " + el.originalText;
        }
    }
});

await ea.addElementsToView(false, false, false);

const message = isAlreadyCheckbox ? t("notice_removed") : t("notice_added");
showModernToast(ExcalidrawAutomate.plugin, message, true);