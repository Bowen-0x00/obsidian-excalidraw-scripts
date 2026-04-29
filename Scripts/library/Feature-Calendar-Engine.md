---
name: 日历与组件库解析引擎
description: 后台引擎：拦截组件库粘贴事件，提供精美的日期选择 UI 并自动解析日历占位符及图片水合。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻，当从素材库拖入带有 customData.calendar 的元素时触发。
features:
  - 拦截 addElementsFromPasteOrLibrary 钩子
  - 提供现代化的 HTML 悬浮日期选择器
  - 自动计算文本宽度并重新对齐日历元素
dependencies:
  - 依赖 EA_Core 核心引擎运行
autorun: true
---
/*
```javascript
*/
var locales = {
    zh: {
        ui_title: "📅 选择日期",
        ui_today: "今天",
        ui_confirm: "确认",
        ui_cancel: "取消",
        log_unmounted: "[{id}] 🔌 已卸载",
        log_mounted: "[{id}] 🚀 挂载完毕"
    },
    en: {
        ui_title: "📅 Select Date",
        ui_today: "Today",
        ui_confirm: "Confirm",
        ui_cancel: "Cancel",
        log_unmounted: "[{id}] 🔌 Unmounted",
        log_mounted: "[{id}] 🚀 Mounted successfully"
    }
};

const SCRIPT_ID = "ymjr.feature.calendar-engine";

// ==========================================
// 🎨 现代化 UI 渲染模块 (Promise 封装)
// ==========================================
function showDateSelectorUI() {
    return new Promise((resolve) => {
        // 防止重复渲染，清理残留
        const existingModal = document.getElementById("ymjr-calendar-modal");
        if (existingModal) existingModal.remove();

        // 创建遮罩层
        const overlay = document.createElement("div");
        overlay.id = "ymjr-calendar-modal";
        Object.assign(overlay.style, {
            position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.4)", zIndex: "99999",
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(4px)", transition: "opacity 0.2s ease"
        });

        // 创建主面板 (适配 Obsidian CSS 变量)
        const modal = document.createElement("div");
        Object.assign(modal.style, {
            background: "var(--background-primary, #ffffff)",
            border: "1px solid var(--background-modifier-border, #e3e3e3)",
            padding: "24px", borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column", gap: "16px",
            width: "320px", color: "var(--text-normal, #333)",
            fontFamily: "var(--font-interface, sans-serif)"
        });

        // 标题
        const title = document.createElement("div");
        title.innerText = t("ui_title");
        Object.assign(title.style, { fontSize: "18px", fontWeight: "600", textAlign: "center" });

        // 日期输入框
        const input = document.createElement("input");
        input.type = "date";
        // 默认填充今天
        const todayStr = new Date().toISOString().split('T')[0];
        input.value = todayStr;
        Object.assign(input.style, {
            padding: "10px", borderRadius: "6px", border: "1px solid var(--background-modifier-border, #ccc)",
            background: "var(--background-secondary, #f9f9f9)", color: "var(--text-normal, #333)",
            fontSize: "16px", outline: "none", width: "100%", boxSizing: "border-box"
        });

        // 按钮容器
        const btnContainer = document.createElement("div");
        Object.assign(btnContainer.style, { display: "flex", gap: "10px", marginTop: "8px" });

        // 按钮通用样式生成器
        const createBtn = (text, primary = false) => {
            const btn = document.createElement("button");
            btn.innerText = text;
            Object.assign(btn.style, {
                flex: "1", padding: "10px", borderRadius: "6px", border: "none", cursor: "pointer",
                fontWeight: "500", fontSize: "14px", transition: "all 0.2s",
                background: primary ? "var(--interactive-accent, #4a90e2)" : "var(--background-secondary-alt, #e0e0e0)",
                color: primary ? "var(--text-on-accent, #fff)" : "var(--text-normal, #333)"
            });
            btn.onmouseover = () => btn.style.opacity = "0.8";
            btn.onmouseout = () => btn.style.opacity = "1";
            return btn;
        };

        const btnToday = createBtn(t("ui_today"));
        const btnCancel = createBtn(t("ui_cancel"));
        const btnConfirm = createBtn(t("ui_confirm"), true);

        btnContainer.append(btnCancel, btnToday, btnConfirm);
        modal.append(title, input, btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 事件绑定
        const closeModal = (selectedValue) => {
            overlay.style.opacity = "0";
            setTimeout(() => {
                overlay.remove();
                resolve(selectedValue);
            }, 200);
        };

        btnToday.onclick = () => { input.value = todayStr; };
        btnCancel.onclick = () => closeModal(null); // 取消则返回 null
        btnConfirm.onclick = () => closeModal(new Date(input.value));
    });
}

// ==========================================
// ⚙️ 核心处理逻辑 (Hook Handler)
// ==========================================
const handlePasteOrLibrary = async (contextPayload) => {
    // 严格从 contextPayload 获取 ea 和 api，避免全局污染和分屏错乱
    const { ea, api, App, duplicatedElements } = contextPayload;
    if (!ea || !api || !duplicatedElements || duplicatedElements.length === 0) return;

    let isPromptShow = false;
    let currentDate = null;

    for (const element of duplicatedElements) {
        // 1. 处理日历占位符
        if (element?.customData?.calendar) {
            if (!isPromptShow) {
                isPromptShow = true;
                const userSelectedDate = await showDateSelectorUI();
                // 如果用户取消，默认回退到当前日期
                currentDate = userSelectedDate || new Date(); 
            }

            const year = currentDate.getFullYear();
            const month = currentDate.toLocaleString('en', { month: 'long' });
            const day = currentDate.getDate();
            const centerX = element.x + element.width / 2;

            if (element.customData.calendar === 'year') {
                element.originalText = element.rawText = element.text = `${year}`;
            } else if (element.customData.calendar === 'month') {
                element.originalText = element.rawText = element.text = `${month}`;
            } else if (element.customData.calendar === 'day') {
                element.originalText = element.rawText = element.text = `${day}`;
            }

            // 重新测量文本宽度以保持居中对齐
            const prevFontSize = ea.style.fontSize;
            const prevFontFamily = ea.style.fontFamily;
            ea.style.fontSize = element.fontSize;
            ea.style.fontFamily = element.fontFamily;
            
            const { width } = ea.measureText(element.originalText);
            
            ea.style.fontSize = prevFontSize;
            ea.style.fontFamily = prevFontFamily;
            
            element.width = width;
            element.x = centerX - width / 2;
        }
    }
};

// ==========================================
// 🚀 引擎挂载与卸载
// ==========================================
async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core 未运行");
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    // 注册 Hook (假设引擎支持 addElementsFromPasteOrLibrary 钩子)
    window.EA_Core.registerHook(SCRIPT_ID, 'addElementsFromPasteOrLibrary', handlePasteOrLibrary, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        // 清理可能残留的 UI
        const existingModal = document.getElementById("ymjr-calendar-modal");
        if (existingModal) existingModal.remove();
        
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();
