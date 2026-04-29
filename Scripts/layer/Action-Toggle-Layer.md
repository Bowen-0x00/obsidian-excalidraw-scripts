---
name: 切换图层控制面板
description: 开关图层控制 UI 界面。支持直观分配图层、自定义删除UI确认、切换作画目标层。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行此脚本，画布右侧将弹出或关闭“图层控制面板”。通过面板可以切换当前活动图层、新建图层、控制图层元素的显示/隐藏/锁定状态，以及将选中元素一键移入指定图层。
features:
  - 基于 React 构建的高性能悬浮拖拽控制面板
  - 支持图层元素的“可见性👁️”和“可交互性🔒”独立控制
  - 选中目标后，点击“📥”按钮可快速转移元素图层归属
  - 带二次确认保护的自定义图层安全删除逻辑
dependencies:
  - 必须依赖 [Feature-Layer-Engine] 核心引擎脚本
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_engine: "请先启动 [图层控制核心引擎] 脚本！",
    notice_no_select: "请先选中需要移动的元素！",
    notice_moved: "已将 {count} 个元素移入 [{name}] 层",
    notice_deleted: "已删除图层 [{name}]",
    ui_layers: "Layers",
    ui_all_layer: "🌈 All (Default)",
    ui_placeholder: "New Layer...",
    ui_confirm_delete: "确定删除此图层？",
    ui_delete_desc: "[{name}] 上的元素将被移入 All 图层，不会丢失。",
    ui_cancel: "取消",
    ui_delete: "删除",
    ui_title_move: "点击设为当前作画图层",
    ui_title_transfer: "将选中元素移入此图层",
    ui_title_visible: "可见",
    ui_title_hidden: "已隐藏",
    ui_title_selectable: "可选",
    ui_title_locked: "已锁定",
    ui_title_delete: "删除图层"
  },
  en: {
    notice_no_engine: "Please start [Layer Control Core Engine] first!",
    notice_no_select: "Please select elements to move first!",
    notice_moved: "Moved {count} elements to [{name}] layer",
    notice_deleted: "Layer [{name}] deleted",
    ui_layers: "Layers",
    ui_all_layer: "🌈 All (Default)",
    ui_placeholder: "New Layer...",
    ui_confirm_delete: "Delete this layer?",
    ui_delete_desc: "Elements on [{name}] will be moved to 'All' layer.",
    ui_cancel: "Cancel",
    ui_delete: "Delete",
    ui_title_move: "Set as active layer",
    ui_title_transfer: "Move selected elements to this layer",
    ui_title_visible: "Visible",
    ui_title_hidden: "Hidden",
    ui_title_selectable: "Selectable",
    ui_title_locked: "Locked",
    ui_title_delete: "Delete layer"
  }
};

const layerData = ExcalidrawAutomate.plugin._ymjr_layer_engine;
if (!layerData) {
    new Notice(t("notice_no_engine"));
    return;
}

// 兼容 React 18 的卸载方式
let existingContainer = document.getElementById('layerToolContainer');
if (existingContainer) {
    if (existingContainer.__reactRoot) {
        existingContainer.__reactRoot.unmount();
    } else {
        ReactDOM.unmountComponentAtNode(existingContainer);
    }
    existingContainer.remove();
    return;
}

// React UI 组件
const LayerSwitch = ({ layer, onClose }) => {
    const [layers, setLayers] = React.useState(() => new Map(layer.layers));
    const [selectableLayers, setSelectableLayers] = React.useState(() => new Map(layer.selectableLayers));
    const [activeLayer, setActiveLayer] = React.useState(layer.activeLayer);
    const [position, setPosition] = React.useState({ left: layer.pos.left, top: layer.pos.top });
    
    const [newLayerName, setNewLayerName] = React.useState("");
    const [layerToDelete, setLayerToDelete] = React.useState(null); // 【新增】用于控制自定义删除确认框

    const isDraggingRef = React.useRef(false);
    const dragOffsetRef = React.useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (["INPUT", "BUTTON"].includes(e.target.tagName) || e.target.dataset?.role === "close-btn") return;
        isDraggingRef.current = true;
        dragOffsetRef.current = { x: e.clientX - position.left, y: e.clientY - position.top };
    };

    const handleMouseMove = (e) => {
        if (isDraggingRef.current) {
            const left = e.clientX - dragOffsetRef.current.x;
            const top = e.clientY - dragOffsetRef.current.y;
            setPosition({ left, top });
            layer.pos.left = left; layer.pos.top = top;
        }
    };

    const handleMouseUp = () => isDraggingRef.current = false;

    const syncLayersFromCanvas = () => {
        const elements = ea.getViewElements();
        let changed = false;
        elements.forEach(el => {
            if (el?.customData?.layer && !layer.layers.has(el.customData.layer)) {
                layer.layers.set(el.customData.layer, true);
                layer.selectableLayers.set(el.customData.layer, true);
                changed = true;
            }
        });
        if (changed) {
            setLayers(new Map(layer.layers));
            setSelectableLayers(new Map(layer.selectableLayers));
        }
    };

    React.useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        syncLayersFromCanvas();
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleActiveLayerChange = (name) => {
        setActiveLayer(name);
        layer.activeLayer = name;
        
        if (name !== 'all') {
            if (!layers.get(name)) handleLayerToggle(name, true);
            if (!selectableLayers.get(name)) handleSelectableToggle(name, true);
        }
        ea.getExcalidrawAPI()?.updateScene({ appState: { ...ea.getExcalidrawAPI().getAppState() } });
    };

    const handleLayerToggle = (name, forceState = null) => {
        setLayers((prev) => {
            const updated = new Map(prev);
            const show = forceState !== null ? forceState : !updated.get(name);
            updated.set(name, show);
            layer.layers.set(name, show);
            layer.showLayers = name === 'all' ? (show ? 'all' : 'none') : 'custom';

            const elements = ea.getViewElements().filter(el => el?.customData?.layer);
            let showElements = [], hideElements = [];

            if (name === 'all') {
                elements.forEach(el => (show ? showElements : hideElements).push(el));
                updated.forEach((_, key) => { layer.layers.set(key, show); updated.set(key, show); });
            } else {
                elements.forEach(el => (layer.layers.get(el.customData.layer) ? showElements : hideElements).push(el));
            }

            showElements.forEach(el => { el.customData = { ...(el.customData || {}), hide: false }; });
            hideElements.forEach(el => { el.customData = { ...(el.customData || {}), hide: true }; });

            ea.copyViewElementsToEAforEditing(showElements.concat(hideElements));
            ea.addElementsToView();
            return updated;
        });
    };

    const handleSelectableToggle = (name, forceState = null) => {
        setSelectableLayers((prev) => {
            const updated = new Map(prev);
            const selectable = forceState !== null ? forceState : !updated.get(name);
            
            if (name === 'all') {
                updated.forEach((_, key) => { updated.set(key, selectable); layer.selectableLayers.set(key, selectable); });
            } else {
                updated.set(name, selectable); layer.selectableLayers.set(name, selectable);
            }
            return updated;
        });
    };

    const addNewLayer = () => {
        const name = newLayerName.trim();
        if (name && !layers.has(name)) {
            layer.layers.set(name, true);
            layer.selectableLayers.set(name, true);
            setLayers(new Map(layer.layers));
            setSelectableLayers(new Map(layer.selectableLayers));
            handleActiveLayerChange(name);
            setNewLayerName("");
        }
    };

    const handleMoveSelectedToLayer = (targetLayerName) => {
        const selected = ea.getViewSelectedElements();
        if (selected.length === 0) {
            new Notice(t("notice_no_select"));
            return;
        }
        
        selected.forEach(el => {
            const newCustomData = { ...(el.customData || {}) };
            if (targetLayerName === 'all') {
                delete newCustomData.layer;
            } else {
                newCustomData.layer = targetLayerName;
            }
            el.customData = newCustomData;
        });
        
        ea.copyViewElementsToEAforEditing(selected);
        ea.addElementsToView();
        syncLayersFromCanvas();
        new Notice(t("notice_moved", { count: selected.length, name: targetLayerName }));
    };

    // 【新增】实际执行删除图层的逻辑
    const confirmDeleteLayer = () => {
        const nameToRemove = layerToDelete;
        if (!nameToRemove || nameToRemove === 'all') return;

        setLayers(prev => {
            const next = new Map(prev);
            next.delete(nameToRemove);
            layer.layers.delete(nameToRemove);
            return next;
        });
        setSelectableLayers(prev => {
            const next = new Map(prev);
            next.delete(nameToRemove);
            layer.selectableLayers.delete(nameToRemove);
            return next;
        });

        if (activeLayer === nameToRemove) {
            handleActiveLayerChange('all');
        }

        const elements = ea.getViewElements();
        const changedElements = [];
        elements.forEach(el => {
            if (el.customData?.layer === nameToRemove) {
                const newCustomData = { ...el.customData };
                delete newCustomData.layer;
                el.customData = newCustomData;
                changedElements.push(el);
            }
        });

        if (changedElements.length > 0) {
            ea.copyViewElementsToEAforEditing(changedElements);
            ea.addElementsToView();
        }
        setLayerToDelete(null); // 关闭弹窗
        new Notice(t("notice_deleted", { name: nameToRemove }));
    };

    const iconBtnStyle = { 
        background: 'transparent', border: 'none', cursor: 'pointer', 
        padding: '4px', fontSize: '14px', borderRadius: '4px', display: 'flex', alignItems: 'center'
    };

    return React.createElement(
        'div',
        {
            onMouseDown: handleMouseDown,
            style: {
                zIndex: 6, position: 'absolute', left: position.left, top: position.top, width: '280px',
                backgroundColor: "var(--island-bg-color)", boxShadow: "var(--shadow-island)", border: "1px solid var(--color-border)",
                padding: "1rem", borderRadius: "var(--border-radius-lg)", color: "var(--text-color-primary)", userSelect: "none",
                overflow: "hidden" // 配合自定义弹窗
            }
        },
        
        // 【新增】内嵌的自定义删除确认弹窗
        layerToDelete && React.createElement('div', {
            style: {
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'var(--island-bg-color)', zIndex: 10,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                padding: '20px', boxSizing: 'border-box', textAlign: 'center'
            }
        }, [
            React.createElement('h4', { style: { margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-normal)' } }, t("ui_confirm_delete")),
            React.createElement('p', { style: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' } }, t("ui_delete_desc", { name: layerToDelete })),
            React.createElement('div', { style: { display: 'flex', gap: '10px' } }, [
                React.createElement('button', {
                    onClick: () => setLayerToDelete(null),
                    style: { padding: '6px 16px', borderRadius: '4px', border: '1px solid var(--background-modifier-border)', background: 'transparent', color: 'var(--text-normal)', cursor: 'pointer' }
                }, t("ui_cancel")),
                React.createElement('button', {
                    onClick: confirmDeleteLayer,
                    style: { padding: '6px 16px', borderRadius: '4px', border: 'none', background: 'var(--text-error, #e53935)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }
                }, t("ui_delete"))
            ])
        ]),

        React.createElement('button', {
            'data-role': 'close-btn', onClick: (e) => { e.stopPropagation(); onClose?.(); },
            style: { position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--icon-fill-color)' }
        }, '×'),
        
        React.createElement('h3', { style: { marginTop: 0, marginBottom: '1rem', fontSize: '1rem' } }, t("ui_layers")),
        
        // 图层列表
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, 
            [...layers].map(([name, show]) => {
                const isTarget = activeLayer === name;
                const isSelectable = selectableLayers.get(name) || false;
                
                return React.createElement('div', {
                    key: name,
                    style: {
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 8px', 
                        backgroundColor: isTarget ? 'var(--color-primary-light, rgba(130, 170, 255, 0.15))' : 'transparent',
                        border: '1px solid ' + (isTarget ? 'var(--color-primary)' : 'var(--color-border, rgba(128, 128, 128, 0.2))'),
                        borderLeftWidth: isTarget ? '4px' : '1px',
                        borderRadius: '6px', transition: 'all 0.2s ease'
                    }
                }, [
                    React.createElement('div', {
                        onClick: () => handleActiveLayerChange(name),
                        title: t("ui_title_move"),
                        style: { 
                            flex: 1, cursor: 'pointer', fontWeight: isTarget ? 'bold' : 'normal', 
                            color: isTarget ? 'var(--color-primary)' : 'var(--text-color-primary, #333)', 
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px'
                        }
                    }, name === 'all' ? t("ui_all_layer") : name),

                    React.createElement('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } }, [
                        React.createElement('button', {
                            onClick: () => handleMoveSelectedToLayer(name),
                            title: t("ui_title_transfer"),
                            style: { ...iconBtnStyle, background: 'rgba(128, 128, 128, 0.15)' }
                        }, '📥'),
                        React.createElement('button', {
                            onClick: () => handleLayerToggle(name),
                            title: show ? t("ui_title_visible") : t("ui_title_hidden"),
                            style: { ...iconBtnStyle, filter: show ? 'none' : 'grayscale(1) opacity(0.4)' }
                        }, show ? '👁️' : '🕶️'),
                        React.createElement('button', {
                            onClick: () => handleSelectableToggle(name),
                            title: isSelectable ? t("ui_title_selectable") : t("ui_title_locked"),
                            style: { ...iconBtnStyle, filter: isSelectable ? 'none' : 'grayscale(1) opacity(0.4)' }
                        }, isSelectable ? '👆' : '🔒'),
                        name === 'all' 
                            ? React.createElement('div', { style: { width: '22px' } }) 
                            : React.createElement('button', {
                                onClick: () => setLayerToDelete(name), // 【修改】触发弹窗而不是直接 confirm
                                title: t("ui_title_delete"),
                                style: { ...iconBtnStyle, color: 'var(--text-error, red)' }
                            }, '🗑️')
                    ])
                ])
            })
        ),

        // 底部新增图层
        React.createElement('div', { style: { display: 'flex', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.8rem' } },
            React.createElement('input', { 
                type: 'text', placeholder: t("ui_placeholder"), value: newLayerName, 
                onChange: (e) => setNewLayerName(e.target.value),
                // 【修复核心】拦截 Excalidraw 画布层级的快捷键事件和指针拦截
                onKeyDown: (e) => {
                    e.stopPropagation(); 
                    if (e.key === 'Enter') addNewLayer();
                },
                onPointerDown: (e) => e.stopPropagation(),
                onPointerUp: (e) => e.stopPropagation(),
                style: { 
                    flex: 1, width: '100%', background: 'var(--input-bg-color)', border: '1px solid var(--color-border)', 
                    borderRadius: '4px', padding: '6px 8px', color: 'var(--text-color-primary)',
                    userSelect: 'text', cursor: 'text' // 覆盖容器的 userSelect: "none"
                }
            }),
            React.createElement('button', { 
                onClick: addNewLayer,
                style: { marginLeft: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 12px', cursor: 'pointer', fontWeight: 'bold' }
            }, '+')
        )
    );
};

// 渲染挂载
const container = document.createElement("div");
container.id = "layerToolContainer";
ea.targetView.contentEl.querySelector(".excalidraw.excalidraw-container").appendChild(container);

const state = ea.getExcalidrawAPI().getAppState();
if (layerData.pos.left === 0 && layerData.pos.top === 0) {
     layerData.pos = { left: state.width - 320, top: 20 };
}

// 兼容 React 18 createRoot API (消除警告)
if (ReactDOM.createRoot) {
    const root = ReactDOM.createRoot(container);
    container.__reactRoot = root;
    root.render(
        React.createElement(LayerSwitch, { 
            layer: layerData, 
            onClose: () => {
                root.unmount();
                container.remove();
            }
        })
    );
} else {
    ReactDOM.render(
        React.createElement(LayerSwitch, { 
            layer: layerData, 
            onClose: () => {
                ReactDOM.unmountComponentAtNode(container);
                container.remove();
            }
        }),
        container
    );
}