---
name: 使用默认应用打开附件
description: 提取选中元素中的附件文件，并使用系统默认应用程序独立打开，配备高颜值 HTML UI。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中带有附件的图形（如图片、嵌入的MD等），运行此脚本即可在外部默认应用中打开。
features:
  - 采用 Obsidian 原生 openWithDefaultApp 接口，完美兼容 Win/Mac/Linux
  - 自动过滤无效元素，支持批量打开，提供友好的异常捕获
  - 采用独立无污染的 HTML 悬浮窗(Toast)进行美观的 UI 交互
dependencies:
  - 无
autorun: false
---
/*
```javascript
*/
const locales = {
    zh: {
        warn_no_selection: "未选中任何有效附件",
        warn_no_selection_desc: "请先选中画板中的图片或嵌入文件节点。",
        warn_file_not_found: "找不到源文件",
        success_open: "已在外部打开",
        success_open_desc: "正在唤起系统默认应用打开: ",
        err_open: "打开失败",
    },
    en: {
        warn_no_selection: "No valid attachment selected",
        warn_no_selection_desc: "Please select images or embedded files first.",
        warn_file_not_found: "Source file not found",
        success_open: "Opened externally",
        success_open_desc: "Launching system default app for: ",
        err_open: "Failed to open",
    }
};

/**
 * ==========================================
 * [UI 模块] 悬浮通知管理器 (不污染 window)
 * ==========================================
 */
class YMJR_UIManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.containerId = "ymjr-toast-container";
        this.initContainer();
    }

    initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement("div");
            container.id = this.containerId;
            // 使用 Obsidian 的 CSS 变量以保证和主题完美融合
            Object.assign(container.style, {
                position: "fixed",
                top: "30px",
                right: "30px",
                zIndex: "99999",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                pointerEvents: "none" // 不阻挡鼠标事件
            });
            document.body.appendChild(container);
        }
        this.container = document.getElementById(this.containerId);
    }

    /**
     * @param {string} title 标题
     * @param {string} message 描述信息
     * @param {"success"|"warning"|"error"} type 状态类型
     */
    showToast(title, message, type = "success") {
        const toast = document.createElement("div");
        
        // 状态颜色配置
        const colors = {
            success: "var(--interactive-success)",
            warning: "var(--color-orange)",
            error: "var(--color-red)"
        };
        const iconColor = colors[type] || colors.success;

        // 构建高颜值 HTML UI (毛玻璃效果、圆角、阴影)
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 8px; height: 100%; position: absolute; left: 0; top: 0; background-color: ${iconColor};"></div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 14px; color: var(--text-normal); margin-bottom: 4px;">${title}</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">${message}</div>
                </div>
            </div>
        `;

        Object.assign(toast.style, {
            position: "relative",
            minWidth: "280px",
            maxWidth: "350px",
            padding: "12px 16px 12px 24px",
            backgroundColor: "var(--background-secondary-alt)",
            border: "1px solid var(--background-modifier-border)",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transform: "translateX(120%)",
            opacity: "0",
            transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            overflow: "hidden"
        });

        this.container.appendChild(toast);

        // 触发进入动画
        requestAnimationFrame(() => {
            toast.style.transform = "translateX(0)";
            toast.style.opacity = "1";
        });

        // 定时移除动画
        setTimeout(() => {
            toast.style.transform = "translateX(120%)";
            toast.style.opacity = "0";
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400); // 等待动画结束
        }, 3500);
    }
}

// 单例模式挂载到 ExcalidrawAutomate.plugin，避免全局污染和重复创建
if (!ExcalidrawAutomate.plugin._ymjr_ui_manager) {
    ExcalidrawAutomate.plugin._ymjr_ui_manager = new YMJR_UIManager(ExcalidrawAutomate.plugin);
}
const ui = ExcalidrawAutomate.plugin._ymjr_ui_manager;

/**
 * ==========================================
 * [核心逻辑] 处理附件打开
 * ==========================================
 */
async function handleOpenAttachments() {
    // 确保画布元素已同步
    await ea.addElementsToView(); 
    
    // 获取当前选中的所有元素
    const selectedEls = ea.getViewSelectedElements();
    
    // 过滤出真正含有 fileId 的附件/图片元素
    const attachmentEls = selectedEls.filter(el => el.fileId);

    if (attachmentEls.length === 0) {
        ui.showToast(t("warn_no_selection"), t("warn_no_selection_desc"), "warning");
        return;
    }

    // 遍历打开
    for (const el of attachmentEls) {
        try {
            const embeddedFile = ea.targetView.excalidrawData.getFile(el.fileId);
            
            if (!embeddedFile || !embeddedFile.file) {
                ui.showToast(t("warn_file_not_found"), `FileID: ${el.fileId}`, "warning");
                continue;
            }

            const tfile = embeddedFile.file;

            // [优化] 使用 Obsidian 原生的 openWithDefaultApp 代替 child_process
            // 这种方式天然支持跨平台 (Win/Mac/Linux)，容错率极高
            app.openWithDefaultApp(tfile.path);
            
            ui.showToast(t("success_open"), `${t("success_open_desc")} <b>${tfile.name}</b>`, "success");

        } catch (error) {
            console.error("[YMJR Open Attachment Error]: ", error);
            ui.showToast(t("err_open"), error.message || String(error), "error");
        }
    }
}

// 执行核心功能
handleOpenAttachments();