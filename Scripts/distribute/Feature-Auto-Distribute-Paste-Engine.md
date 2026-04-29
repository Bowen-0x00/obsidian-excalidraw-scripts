---
name: 自动分发粘贴引擎
description: 后台引擎：监听粘贴事件，当选中多个容器且粘贴文本片段数量完全匹配时，自动将其分发到这些容器中。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻。在画布中选中 N 个图形节点，复制一段包含 N 个片段（换行/逗号/Tab分隔）的文本并粘贴，即可自动分配。
features:
  - 拦截 `onPaste` 钩子，无感接管符合条件的剪贴板文本。
dependencies:
  - 依赖 EA_Core 核心引擎
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕",
    log_no_core: "EA_Core 未运行，无法挂载文本分发引擎"
  },
  en: {
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully",
    log_no_core: "EA_Core not running, cannot mount distribute engine"
  }
};

const SCRIPT_ID = "ymjr.feature.paste-distribute";

// ==========================================
// 核心逻辑：粘贴事件拦截与多容器分发
// ==========================================
const handleAutoDistributePaste = async (contextPayload) => {
    const { ea, api, payload } = contextPayload;
    if (!ea || !api || !payload || typeof payload.text !== "string") return false;

    const appState = api.getAppState();
    // 使用 API 获取精准的当前选中元素 ID，并过滤出非文本类型的选中元素
    const sceneElements = api.getSceneElements();
    const selectedEls = sceneElements.filter(
        el => appState.selectedElementIds[el.id] && el.type !== "text" && !el.isDeleted
    );

    const elCount = selectedEls.length;
    let text = payload.text;
    
    // 简单清洗 HTML 标签（沿用你的清洗逻辑）
    if (text.includes('<span') || text.includes('</span')) {
        text = text.replace(/<span.*?>/g, '').replaceAll('</span>', '');
    }
    
    const parsedData = text.split(/,|\t|\n/).filter(element => element && element.trim() !== '');
    
    // 如果数据分段与选中容器数量完全匹配，拦截粘贴事件并接管渲染
    if (parsedData.length === elCount) {
        // 清空 payload.text 防止触发 Excalidraw 原生的粘贴逻辑
        payload.text = '';
        ea.clear();
        ea.copyViewElementsToEAforEditing(selectedEls);
        for (let i = 0; i < elCount; i++) {
            ea.style.strokeColor = appState.currentItemStrokeColor;
            ea.style.fontSize    = appState.currentItemFontSize;
            ea.style.fontFamily  = appState.currentItemFontFamily;
            
            const textId = ea.addText(0, 0, `${parsedData[i].trim()}`, {
                textAlign: "center",
                textVerticalAlign: "middle"
            });
            
            const textEl = ea.getElement(textId);
            const containerEl = ea.getElement(selectedEls[i].id);
            
            // 绑定 Text 到 Container 并处理定位
            textEl.containerId = containerEl.id;
            textEl.x = containerEl.x + containerEl.width / 2 - textEl.width / 2;
            textEl.y = containerEl.y + containerEl.height / 2 - textEl.height / 2;
            containerEl.boundElements = [...(containerEl.boundElements || []), { type: "text", id: textId }];
        }
        await ea.addElementsToView(false, false, false);
        return true; // 拦截成功，告诉引擎停止向下抛出
    }

    return false; // 不匹配，放行
};

// ==========================================
// 生命周期挂载与卸载
// ==========================================
async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    // 注册 Hook，优先级设定为 45 (在你的 PasteExtractor 解析器之后执行，防止冲突)
    window.EA_Core.registerHook(SCRIPT_ID, 'onPaste', handleAutoDistributePaste, 45);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();