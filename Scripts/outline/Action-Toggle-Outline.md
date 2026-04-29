---
name: 切换大纲视图 (UI)
description: 开启或关闭大纲悬浮面板，支持彩虹缩进引导线。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行开启/关闭。基于 React 18 驱动。
autorun: false
---
/*
```javascript
*/
const locales = {
    zh: { 
        err_engine: "⚠️ 缺少核心依赖：请先确保 Outline-Engine 已挂载运行！", 
        title: "📚 文档大纲", empty: "暂无匹配元素，请添加 Frame 或使用 Action 脚本标记元素",
        type_level: "数字层级 (Level)", type_text: "自定义文本 (Text)", type_frame: "画板 (Frame)",
        sort_y: "↕️ 垂直排序", sort_x: "↔️ 水平排序"
    },
    en: { 
        err_engine: "⚠️ Missing dependency: Ensure Outline-Engine is running!", 
        title: "📚 Outline", empty: "No elements found. Add Frames or use the Action script.",
        type_level: "Numeric Level", type_text: "Custom Text", type_frame: "Frames",
        sort_y: "↕️ Vertical Sort", sort_x: "↔️ Horizontal Sort"
    }
};

if (!ExcalidrawAutomate.plugin._ymjr_outline) {
    new Notice(t("err_engine"));
    return;
}

const CONTAINER_ID = "ymjr-outline-container";
// 定义彩虹色系
const RAINBOW_COLORS = ["#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2"];

// ==== React 组件 ====
const OutlineViewer = ({ onClose }) => {
    const api = ea.getExcalidrawAPI();
    const modifyEventRef = React.useRef(null);
    
    const [config, setConfig] = React.useState(ExcalidrawAutomate.plugin._ymjr_outline.config || { titleType: 'frame', sortAxis: 'y' });
    const [availableModes, setAvailableModes] = React.useState([]);
    const [elements, setElements] = React.useState([]);

    const updateView = React.useCallback((currentConfig) => {
        const allElements = ea.getViewElements();
        const modes = ExcalidrawAutomate.plugin._ymjr_outline.detectAvailableModes(allElements);
        setAvailableModes(modes);

        let activeType = currentConfig.titleType;
        if (!modes.includes(activeType) && modes.length > 0) activeType = modes[0];
        
        const newCfg = { ...currentConfig, titleType: activeType };
        setConfig(newCfg);
        ExcalidrawAutomate.plugin._ymjr_outline.config = newCfg;

        const processed = ExcalidrawAutomate.plugin._ymjr_outline.getProcessedElements(allElements, newCfg);
        setElements(processed || []);
    }, []);

    React.useEffect(() => {
        updateView(config);
        if (app?.vault?.on) {
            modifyEventRef.current = app.vault.on("modify", (file) => {
                if (file?.path === ea.targetView.file.path) updateView(ExcalidrawAutomate.plugin._ymjr_outline.config);
            });
        }
        return () => modifyEventRef.current && app?.vault?.off("modify", modifyEventRef.current);
    }, []);

    // 交互与拖拽
    const [hoveredItemId, setHoveredItemId] = React.useState(null);
    const [position, setPosition] = React.useState({ left: api.getAppState().width - 340, top: 20 });
    const isDraggingRef = React.useRef(false);
    const dragOffsetRef = React.useRef({ x: 0, y: 0 });

    React.useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDraggingRef.current) return;
            setPosition({ left: e.clientX - dragOffsetRef.current.x, top: e.clientY - dragOffsetRef.current.y });
        };
        const handleMouseUp = () => isDraggingRef.current = false;
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }, []);

    const typeLabels = { 'text - level': t("type_level"), 'text - text': t("type_text"), 'frame': t("type_frame") };

    return React.createElement("div", {
        onMouseDown: (e) => {
            if (["button", "select", "option"].includes(e.target.tagName.toLowerCase()) || e.target.dataset?.role === "close-btn") return;
            isDraggingRef.current = true;
            dragOffsetRef.current = { x: e.clientX - position.left, y: e.clientY - position.top };
        },
        style: {
            position: "absolute", left: position.left, top: position.top, width: "320px",
            backgroundColor: "var(--background-primary)", border: "1px solid var(--background-modifier-border)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)", padding: "16px", borderRadius: "12px", 
            cursor: "move", zIndex: 100, backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", gap: "8px"
        }
    },
        React.createElement("button", {
            "data-role": "close-btn", onClick: (e) => { e.stopPropagation(); onClose?.(); },
            style: {
                position: "absolute", top: "12px", right: "12px", background: "var(--background-modifier-hover)",
                border: "none", cursor: "pointer", width: "24px", height: "24px",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)"
            }
        }, "✕"),
        
        React.createElement("h3", { style: { margin: "0", fontSize: "16px", color: "var(--text-normal)", userSelect: "none" } }, t("title")),
        
        React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "4px" } },
            availableModes.length > 1 ? React.createElement("select", {
                value: config.titleType,
                onChange: (e) => {
                    const newCfg = { ...config, titleType: e.target.value };
                    setConfig(newCfg); ExcalidrawAutomate.plugin._ymjr_outline.config = newCfg; updateView(newCfg);
                },
                style: { flex: 1, padding: "4px", borderRadius: "4px", background: "var(--background-modifier-form-field)", border: "1px solid var(--background-modifier-border)", color: "var(--text-normal)", fontSize: "12px" }
            }, availableModes.map(m => React.createElement("option", { key: m, value: m }, typeLabels[m]))) : null,
            
            config.titleType !== 'text - text' ? React.createElement("button", {
                onClick: () => {
                    const newCfg = { ...config, sortAxis: config.sortAxis === 'y' ? 'x' : 'y' };
                    setConfig(newCfg); ExcalidrawAutomate.plugin._ymjr_outline.config = newCfg; updateView(newCfg);
                },
                style: { padding: "4px 8px", borderRadius: "4px", background: "var(--background-modifier-form-field)", border: "1px solid var(--background-modifier-border)", color: "var(--text-normal)", fontSize: "12px", cursor: "pointer" }
            }, config.sortAxis === 'y' ? t("sort_y") : t("sort_x")) : null
        ),

        React.createElement("div", { style: { maxHeight: "400px", overflowY: "auto", cursor: "default", paddingRight: "4px", position: "relative" } }, 
            elements.length === 0 ? 
            React.createElement("div", { style: { color: "var(--text-faint)", fontSize: "13px", textAlign: "center", padding: "20px 0" } }, t("empty")) :
            elements.map(item => {
                const isHovered = hoveredItemId === item.id;
                const nodeColor = RAINBOW_COLORS[(item.level - 1) % RAINBOW_COLORS.length];
                const indentWidth = 20;

                return React.createElement("div", {
                    key: item.id,
                    style: {
                        position: "relative", padding: "4px 8px 4px 0", margin: "2px 0",
                        backgroundColor: isHovered ? "var(--background-modifier-hover)" : "transparent",
                        cursor: "pointer", borderRadius: "6px", fontSize: "13px", color: "var(--text-normal)",
                        transition: "background 0.1s ease", display: "flex", alignItems: "stretch", minHeight: "28px"
                    },
                    onMouseEnter: () => setHoveredItemId(item.id), onMouseLeave: () => setHoveredItemId(null),
                    onClick: () => app?.workspace?.openLinkText(`${ea.targetView.file.path}#^group=${item.el.id}`, ea.targetView.file.path)
                }, 
                // 渲染缩进参考线 (彩虹线)
                Array.from({ length: item.level - 1 }).map((_, i) => React.createElement("div", {
                    key: `line-${i}`,
                    style: {
                        position: "absolute", left: `${i * indentWidth + 10}px`, top: 0, bottom: 0, width: "1px",
                        backgroundColor: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
                        opacity: isHovered ? 0.8 : 0.4
                    }
                })),
                // 内容容器 (带有缩进)
                React.createElement("div", {
                    style: {
                        display: "flex", alignItems: "center", paddingLeft: `${(item.level - 1) * indentWidth + 4}px`, gap: "8px", width: "100%"
                    }
                },
                    // 节点圆点 (与当前层级线条同色)
                    React.createElement("span", { 
                        style: { color: nodeColor, fontSize: "12px", width: "12px", display: "flex", justifyContent: "center", flexShrink: 0 } 
                    }, item.level === 1 ? "●" : (item.level === 2 ? "○" : "◦")),
                    // 文本
                    React.createElement("span", { 
                        style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: isHovered ? 1 : 0.9 } 
                    }, item.displayText)
                )
                );
            })
        )
    );
};

// ==== 挂载逻辑 ====
const targetDOM = ea.targetView.contentEl.querySelector(".excalidraw.excalidraw-container");
let container = targetDOM.querySelector(`#${CONTAINER_ID}`);
if (!container) {
    container = document.createElement("div"); container.id = CONTAINER_ID; targetDOM.appendChild(container);
    const root = ReactDOM.createRoot(container); container._reactRoot = root;
    root.render(React.createElement(OutlineViewer, { onClose: () => { root.unmount(); container.remove(); } }));
} else {
    if (container._reactRoot) container._reactRoot.unmount(); else ReactDOM.unmountComponentAtNode(container);
    container.remove();
}