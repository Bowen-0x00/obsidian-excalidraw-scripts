---
name: WaveDrom 波形生成器
description: 基于 WaveDrom JSON 规范快速绘制数字电路时序波形图。支持实时预览与代码编辑。
author: ymjr
version: 1.0.0
license: MIT
usage: 选择已有的 Wavedrom 占位块或直接在空白画板运行此脚本。在弹出的编辑器中编写波形图 JSON 代码（支持实时预览）。点击确认后将以透明矩形（携带 customData）的形式写入画布并交由后台引擎接管绘制。
features:
  - 与内置在 [Feature-Wavedrom-Engine] 中的核心 API 建立通信唤起编辑器
  - 向目标矩形写入 `customData.wavedrom` 及相应的 `code`
  - 包含针对旧版纯文本波形的“迁移升级”逻辑
dependencies:
  - 必须依赖 [Feature-Wavedrom-Engine] 脚本引擎
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_no_engine: "❌ 请先确保 [Wavedrom 波形引擎] 脚本处于 Autorun 并在运行中！",
    initial_code: `{ signal : [\n  { name: "clk",  wave: "p......" },\n  { name: "bus",  wave: "x.34.5x", data: "head body tail" },\n  { name: "wire", wave: "0.1..0." }\n]}`
  },
  en: {
    notice_no_engine: "❌ Please ensure the [Wavedrom Engine] script is set to Autorun and is currently running!",
    initial_code: `{ signal : [\n  { name: "clk",  wave: "p......" },\n  { name: "bus",  wave: "x.34.5x", data: "head body tail" },\n  { name: "wire", wave: "0.1..0." }\n]}`
  }
};
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();
const WavedromCore = ExcalidrawAutomate.plugin._ymjr_wavedrom;

if (!WavedromCore || !WavedromCore.openEditor) {
    new Notice(t("notice_no_engine"));
    return;
}

// 确保本地 Wavedrom 引擎已挂载
WavedromCore.loadLocalScripts();

// ==========================================
// 辅助函数：应用数据到画板
// ==========================================
const applyDataToCanvas = async (jsonString, targetEl = null) => {
    ea.clear(); 

    let elToUpdate;

    if (targetEl) {
        if (targetEl.type === "text") {
            // [自动迁移方案]：如果是旧版的 text 元素，销毁它，在原地生成一个干净的透明矩形
            ea.deleteViewElements([targetEl]);
            ea.style.strokeColor = "transparent";
            ea.style.backgroundColor = "white";
            // 继承原有坐标
            const id = ea.addRect(targetEl.x, targetEl.y, targetEl.width, targetEl.height);
            elToUpdate = ea.getElement(id);
        } else {
            // 已经是矩形了，直接更新
            elToUpdate = targetEl;
            ea.copyViewElementsToEAforEditing([elToUpdate]);
        }
    } else {
        // 新建元素
        ea.style.strokeColor = "transparent";
        ea.style.backgroundColor = "transparent";
        
        const viewState = api.getAppState();
        const cx = viewState.scrollX + (viewState.width / 2 / viewState.zoom.value);
        const cy = viewState.scrollY + (viewState.height / 2 / viewState.zoom.value);
        
        const id = ea.addRect(cx - 200, cy - 100, 400, 200); // 初始默认尺寸，渲染后会自动纠正
        elToUpdate = ea.getElement(id);
    }
    
    // 核心改变：将代码塞进 customData，避开文本排版引擎的干扰
    elToUpdate.customData = { ...elToUpdate.customData, wavedrom: true, code: jsonString };
    
    await ea.addElementsToView(true, false, false);
    
    const state = api.getAppState();
    await ea.viewUpdateScene({ appState: { zoom: { value: state.zoom.value + 0.0001 } } });
};

// ==========================================
// 场景判断与启动
// ==========================================
let initialCode = t("initial_code");
let targetEl = null;

if (selectedEls.length > 0) {
    const el = selectedEls[0];
    if (el.customData?.wavedrom || el.type === "text") {
        targetEl = el;
        // 优先读取 customData.code，如果为空则兼容旧图读取 el.text
        initialCode = el.customData?.code || el.text || initialCode;
    }
}

// 唤起原生 HTML 悬浮面板
WavedromCore.openEditor(initialCode, (resultCode) => {
    applyDataToCanvas(resultCode, targetEl);
});
