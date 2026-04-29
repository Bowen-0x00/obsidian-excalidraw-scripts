---
name: 模板文本引擎
description: 后台引擎：拦截文本 Wrap 逻辑，动态替换为 Template 数据。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻。为携带 `customData.template` 的文本元素提供底层的“运行时变量替换”能力，使得文字元素可以成为动态展示外部数据的容器。
features:
  - 拦截 `beforeWrapText` 钩子
  - 根据元素 ID 到全局上下文 `window.templateMap` 中匹配对应渲染内容
dependencies:
  - 需要与其他生成模板数据的脚本配合使用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_no_core: "EA_Core 未运行",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_no_core: "EA_Core not running",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};
const SCRIPT_ID = "ymjr.feature.template-engine";

const handleBeforeWrapText = (hookCtx) => {
    const { ea, api } = hookCtx;
    if (!ea || !api) return;

    const { textElement } = hookCtx;
    
    if (textElement?.customData?.template) {
        const templateMap = (window).templateMap || {};
        const templateData = templateMap[textElement.id];
        
        if (templateData && templateData.content) {
            hookCtx.text = templateData.content;
        }
        
        if (textElement.customData.indent !== undefined) {
            hookCtx.indent = textElement.customData.indent;
        }
    }
    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'beforeWrapText', handleBeforeWrapText, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };
    
    console.log(t("log_mounted", { id: SCRIPT_ID }));
}


mountFeature();