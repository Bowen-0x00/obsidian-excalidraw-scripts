---
name: 渐变色填充 (静默版)
description: 动作脚本：一键为选中的元素应用或取消默认的渐变色配置，适合绑定快捷键使用。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的一个或多个元素，运行此脚本即可一键应用默认的渐变色。再次运行可一键取消（Toggle 切换）。
features:
  - 静默读取全局默认的 `gradientDefaults` 配置
  - 动态在元素的 `customData.gradient` 中注入相应的底层 Canvas 绘制脚本指令
dependencies:
  - 必须依赖 [Feature-Gradient-Engine] 后台引擎进行最终的渲染与 SVG 导出拦截
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请选中需要设置渐变色的元素！",
    notice_cleared: "🧹 已清除渐变色",
    notice_applied: "🌈 已应用默认渐变色"
  },
  en: {
    notice_select: "Please select elements to set gradient!",
    notice_cleared: "🧹 Gradient cleared",
    notice_applied: "🌈 Default gradient applied"
  }
};
const { Notice } = ea.obsidian;

// 初始化或读取默认配置，支持方向与色标的完整结构
let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["gradientDefaults"] ?? {};
if (!settings["stops"]) {
    settings = {
        direction: { value: "horizontal", description: "默认方向 (horizontal/vertical/diagonal/radial)" },
        stops: { 
            value: [
                { offset: 0, color: "#5EFCE8" },
                { offset: 1, color: "#736EFE" }
            ], 
            description: "默认色标节点配置 (JSON数组)" 
        },
        ...settings
    };
    ExcalidrawAutomate.plugin.settings.scriptEngineSettings["gradientDefaults"] = settings;
    await ExcalidrawAutomate.plugin.saveSettings();
}

const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements();

if (selectedEls.length === 0) {
    new Notice(t("notice_select"));
    return;
}

// 检测当前是否已经应用了渐变 (实现 Toggle 开关)
const isAlreadyApplied = selectedEls.some(el => el.customData?.gradient);

if (isAlreadyApplied) {
    selectedEls.forEach((el) => {
        if (el.customData?.gradient) {
            delete el.customData.gradient;
            api.ShapeCache?.cache?.delete(el);
        }
    });
    new Notice(t("notice_cleared"));
} else {
    // 根据默认配置生成渐变
    const direction = settings.direction.value;
    const stops = settings.stops.value;

    let coords = "0, 0, el.width, 0"; 
    let typeFn = "createLinearGradient";

    if (direction === "radial") {
        typeFn = "createRadialGradient";
        coords = "el.width/2, el.height/2, 0, el.width/2, el.height/2, Math.max(el.width, el.height)/2";
    } else if (direction === "vertical") {
        coords = "0, 0, 0, el.height";
    } else if (direction === "diagonal") {
        coords = "0, 0, el.width, el.height";
    }

    let script = `var gradient = ctx.${typeFn}(${coords});\n`;
    stops.sort((a, b) => a.offset - b.offset).forEach(s => {
        script += `gradient.addColorStop(${s.offset}, "${s.color}");\n`;
    });

    selectedEls.forEach((el) => {
        el.customData = { ...el.customData, gradient: script };
        api.ShapeCache?.cache?.delete(el);
    });
    new Notice(t("notice_applied"));
}

ea.copyViewElementsToEAforEditing(selectedEls);
ea.addElementsToView(false, false, false);