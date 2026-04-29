---
name: 高亮连线核心引擎
description: 后台引擎：提供光标变化、选中识别与粗体发光渲染。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，专门负责寻找并渲染带有 customData.highlightLine 标记的连线元素。
features:
  - 拦截 handleCanvasPointerMove 实现鼠标悬停在发光连线时自动变手型
  - 拦截 handleCanvasPointerUp 动态追踪当前活动选中的发光连线及其绑定的上下游
  - 拦截 _renderInteractiveScene 利用 Rough.js 实时绘制多层描边的荧光发光效果
dependencies:
  - 与 Action-Toggle-LineHighlight 配合使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    settings_color: "高亮边缘发光颜色",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    settings_color: "Highlight glow color",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.highlight-engine";

let activeHighlightEls = []; 

async function ensureSettings() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["highlight line"] ?? {};
    if(!settings["highlight color"]) {
        settings = {
            "highlight color": { value: "#FFC800", description: t("settings_color") },
            ...settings
        };
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["highlight line"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
}

const handlePointerMove = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { App, hitElement } = context;
    if (hitElement && hitElement.customData?.highlightLine) {
        if (App.interactiveCanvas) {
            App.interactiveCanvas.style.cursor = "pointer";
        }
    }
    return false;
};

const handlePointerUp = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { App } = context;
    const selectedEl = App.scene.getSelectedElements(App.state);

    if (selectedEl && selectedEl.customData?.highlightLine) {
        activeHighlightEls = [selectedEl];
        
        if (selectedEl.type !== "arrow" && selectedEl.boundElements) {
            let elementsMap = App?.scene?.getNonDeletedElementsMap?.();
            selectedEl.boundElements.forEach(bound => {
                if (bound.type === "arrow" && elementsMap) {
                    activeHighlightEls.push(elementsMap.get(bound.id));
                }
            });
        }
    } else {
        activeHighlightEls = [];
    }
    return false;
};

const handleHighlightRender = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    if (activeHighlightEls.length === 0) return false;

    const { canvas, appState, context, getElementAbsoluteCoords, rough } = contextPayload;
    if (!api) return false;

    try {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(appState.zoom.value, appState.zoom.value);
        let elementsMap = api.App?.scene?.getNonDeletedElementsMap?.();
        
        for (const el of activeHighlightEls) {
            context.save();
            if (["arrow", "line"].includes(el.type)) {
                context.translate((el.x + appState.scrollX) * window.devicePixelRatio, (el.y + appState.scrollY) * window.devicePixelRatio);
                context.scale(window.devicePixelRatio, window.devicePixelRatio);
                context.lineJoin = "round"; context.lineCap = "round";
                const rc = rough.canvas(canvas);
                const fillShape = api.ShapeCache.generateElementShape(el);
                
                if (fillShape) {
                    const highlightColor = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["highlight line"]["highlight color"].value;
                    fillShape.forEach((shape) => {
                        const shapeNew = JSON.parse(JSON.stringify(shape));
                        shapeNew.options.strokeWidth *= 4;
                        shapeNew.options.stroke = highlightColor;
                        rc.draw(shapeNew);
                    });
                    fillShape.forEach((shape) => rc.draw(shape));
                }
            } else if (el.type != "image") {
                context.lineJoin = "round";
                context.lineCap = "round";
                const rc = rough.canvas(canvas);
                let [x1, y1, x2, y2] = getElementAbsoluteCoords(el, api?.App?.scene?.getNonDeletedElementsMap?.());
                const cx = ((x1 + x2) / 2 + appState.scrollX) * window.devicePixelRatio;
                const cy = ((y1 + y2) / 2 + appState.scrollY) * window.devicePixelRatio;

                context.translate(cx, cy);
                context.rotate(el.angle);
                context.translate(-cx, -cy);
                context.translate((el.x + appState.scrollX) * window.devicePixelRatio, (el.y + appState.scrollY) * window.devicePixelRatio);
                context.scale(window.devicePixelRatio, window.devicePixelRatio);
                const fillShape = api.ShapeCache.generateElementShape(el);
                if (fillShape) {
                    const shapeNew = JSON.parse(JSON.stringify(fillShape));
                    shapeNew.options.strokeWidth *= 4;
                    shapeNew.options.stroke = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["highlight line"]["highlight color"].value
                    shapeNew.options.fill = "transparent"
                    rc.draw(shapeNew);
                    const shapeWithoutFill = JSON.parse(JSON.stringify(fillShape));
                    shapeWithoutFill.options.fill = "transparent"
                    rc.draw(shapeWithoutFill);
                }
            }
            context.restore();
        }
        context.restore();
    } catch (e) {
        console.error(`[Feature: LineHighlight] Render Error:`, e);
    }
    return false; 
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core 未运行");
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    await ensureSettings();

    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerMove', handlePointerMove, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerUp', handlePointerUp, 60);
    window.EA_Core.registerHook(SCRIPT_ID, '_renderInteractiveScene', handleHighlightRender, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
            activeHighlightEls = [];
            let view = app.workspace.getActiveFileView();
            view?.updateScene({ appState: { ...view.getScene().appState } });
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}



mountFeature();
