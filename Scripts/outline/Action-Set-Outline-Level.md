---
name: 设置大纲层级标记 (Action)
description: 使用友好的现代面板为选中的元素设置或移除大纲标记。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中元素后运行此脚本，弹出专属设置面板。
autorun: false
---
/*
```javascript
*/
const selectedEls = ea.getViewSelectedElements();
if (selectedEls.length === 0) {
    new Notice("⚠️ 请先选中需要作为大纲节点的元素！");
    return;
}

const CONTAINER_ID = "ymjr-set-outline-modal";
const isAlreadyOutlined = selectedEls.some(el => el.customData?.titleLevel || el.customData?.outlineLevel || el.customData?.outlineText);

// ==== React 组件：可视化设置面板 ====
const SetOutlineUI = ({ onClose }) => {
    const [customText, setCustomText] = React.useState("1.1");

    // 处理：保存到元素并关闭
    const applyToElements = async (dataKey, value) => {
        selectedEls.forEach((el) => {
            el.customData = { ...el.customData, [dataKey]: value };
            // 清理互斥数据
            if (dataKey === "titleLevel") delete el.customData.outlineText;
            if (dataKey === "outlineText") delete el.customData.titleLevel;
        });
        ea.copyViewElementsToEAforEditing(selectedEls);
        await ea.addElementsToView();
        new Notice(`✅ 成功设为: ${value}`);
        onClose();
    };

    // 处理：移除标记并关闭
    const removeOutline = async () => {
        selectedEls.forEach((el) => {
            if (el.customData) {
                delete el.customData.titleLevel;
                delete el.customData.outlineLevel;
                delete el.customData.outlineText;
            }
        });
        ea.copyViewElementsToEAforEditing(selectedEls);
        await ea.addElementsToView();
        new Notice("🗑️ 已取消大纲节点标记");
        onClose();
    };

    // 背景遮罩
    return React.createElement("div", {
        style: {
            position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(2px)"
        },
        onClick: (e) => { if(e.target === e.currentTarget) onClose(); } // 点击背景关闭
    },
        // 面板卡片
        React.createElement("div", {
            style: {
                backgroundColor: "var(--background-primary)", padding: "24px", borderRadius: "12px", width: "420px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)", border: "1px solid var(--background-modifier-border)",
                display: "flex", flexDirection: "column", gap: "20px"
            }
        },
            // 头部
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--background-modifier-border)", paddingBottom: "12px" } },
                React.createElement("h2", { style: { margin: 0, fontSize: "18px", color: "var(--text-normal)" } }, "设置大纲标记"),
                React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-muted)" } }, "✕")
            ),

            // 模式 1：智能空间层级
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
                React.createElement("div", { style: { fontWeight: "bold", color: "var(--text-accent)", fontSize: "15px" } }, "🎯 模式 1：智能数字层级 (Level)"),
                React.createElement("div", { style: { fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 } }, 
                    "只需指定该元素是第几级。引擎会根据元素在画布上的", React.createElement("strong", {style:{color:"var(--text-normal)"}}, "排版位置(上下左右)"), "自动计算出最终编号 (例如 1, 1.1, 2.1)。", 
                    React.createElement("br"), "💡 适用场景：自由连线的思维导图、白板结构化整理。"
                ),
                React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } },
                    [1, 2, 3, 4, 5].map(lvl => React.createElement("button", {
                        key: lvl,
                        onClick: () => applyToElements("titleLevel", lvl),
                        style: { flex: 1, padding: "8px", cursor: "pointer", borderRadius: "6px", border: "1px solid var(--background-modifier-border)", backgroundColor: "var(--background-secondary)", color: "var(--text-normal)" }
                    }, `${lvl} 级`))
                )
            ),

            // 分割线
            React.createElement("hr", { style: { border: "none", borderTop: "1px dashed var(--background-modifier-border)", margin: "0" } }),

            // 模式 2：自定义绝对编号
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
                React.createElement("div", { style: { fontWeight: "bold", color: "var(--color-purple)", fontSize: "15px" } }, "✍️ 模式 2：强制自定义编号 (Text)"),
                React.createElement("div", { style: { fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 } }, 
                    "无视元素在画布中的位置，强制把该元素固定为您输入的具体编号。", 
                    React.createElement("br"), "💡 适用场景：有严格章节要求的文档流排版。"
                ),
                React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } },
                    React.createElement("input", {
                        type: "text", value: customText, onChange: (e) => setCustomText(e.target.value), placeholder: "例如: 1.2.1",
                        style: { flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--background-modifier-border)", backgroundColor: "var(--background-modifier-form-field)", color: "var(--text-normal)" }
                    }),
                    React.createElement("button", {
                        onClick: () => { if(customText.trim()) applyToElements("outlineText", customText.trim()); },
                        style: { padding: "8px 16px", cursor: "pointer", borderRadius: "6px", border: "none", backgroundColor: "var(--interactive-accent)", color: "var(--text-on-accent)", fontWeight: "bold" }
                    }, "确定应用")
                )
            ),

            // 移除按钮 (仅在已有大纲时显示)
            isAlreadyOutlined && React.createElement("div", { style: { marginTop: "12px", textAlign: "right" } },
                React.createElement("button", {
                    onClick: removeOutline,
                    style: { padding: "8px 16px", cursor: "pointer", borderRadius: "6px", border: "1px solid var(--color-red)", backgroundColor: "transparent", color: "var(--color-red)" }
                }, "🗑️ 移除大纲标记")
            )
        )
    );
};

// ==== 挂载逻辑 (React 18) ====
const targetDOM = ea.targetView.contentEl.querySelector(".excalidraw.excalidraw-container");
let container = targetDOM.querySelector(`#${CONTAINER_ID}`);

if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    targetDOM.appendChild(container);
}

// 确保清理旧实例
if (container._reactRoot) {
    container._reactRoot.unmount();
}

const root = ReactDOM.createRoot(container);
container._reactRoot = root;

root.render(React.createElement(SetOutlineUI, { 
    onClose: () => { 
        root.unmount(); 
        container.remove(); 
    } 
}));