---
name: Markdown 标题引擎
description: 后台引擎：在文本编辑提交时，自动将 Markdown 标题 (#) 转换为对应样式的标题文本元素。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。当在画板内输入 `# 标题内容` 或 `## 标题内容` 时，引擎会自动拦截并在底层重新渲染，生成预设字号与字体的原生标题样式节点。
features:
  - 拦截 `onTextSubmit` 钩子，通过正则精确判断 `#` 标题层级
  - 自动覆盖设置 `fontFamily` 和 `fontSize` 属性，并清理多余的 `#`
dependencies:
  - 独立运行，无外部依赖
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_fail: "EA_Core 未运行",
    log_mounted: "🚀 [Feature] {id} 引擎挂载完毕.",
    set_font: "各级标题字体",
    set_size: "各级标题字号",
    set_color: "各级标题颜色",
    set_weight: "各级标题字重"
  },
  en: {
    log_fail: "EA_Core not running",
    log_mounted: "🚀 [Feature] {id} engine mounted successfully.",
    set_font: "Font family for each header level",
    set_size: "Font size for each header level",
    set_color: "Stroke color for each header level",
    set_weight: "Font weight for each header level"
  }
};

const SCRIPT_ID = "ymjr.feature.markdown-header";

async function ensureSettings() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["text to header"] ?? {};
    if (!settings["fontFamily"]) {
        settings = {
            "fontFamily": { value: "LXGW WenKai, LXGW WenKai, LXGW WenKai", description: t("set_font") },
            "fontSize": { value: "48, 36, 28", description: t("set_size") },
            "strokeColor": { value: "#0c8599, #15aabf, #3bc9db", description: t("set_color") },
            "fontWeight": { value: "800, 700, 600", description: t("set_weight") },
            ...settings
        };
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["text to header"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
}

const handleTextSubmit = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { textElement, nextOriginalText } = contextPayload;
    const markdownHeaderRegex = /^#{1,6} /;
    
    if (markdownHeaderRegex.test(nextOriginalText)) {
        const headerLevel = (nextOriginalText.match(/^#+/) || [""])[0].length;
        const settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["text to header"];

        const getValue = (settingString) => {
            const settingArray = settingString.split(',').map(item => item.trim());
            return settingArray[Math.min(headerLevel - 1, settingArray.length - 1)];
        };

        // 异步更新元素属性以避免与 Excalidraw 原生提交流程冲突
        setTimeout(() => {
            const elementsMap = api?.App?.scene?.getNonDeletedElementsMap?.();
            const el = elementsMap.get(textElement.id);
            if (!el) return;

            el.rawText = el.originalText;
            el.strokeColor = getValue(settings.strokeColor.value);
            el.fontSize = parseInt(getValue(settings.fontSize.value), 10);
            el.fontFamily = `"${getValue(settings.fontFamily.value)}"`;
            el.customData = {
                ...el.customData,
                font: { weight: getValue(settings.fontWeight.value) },
                titleLevel: `${headerLevel}`
            };

            ea.clear();
            ea.copyViewElementsToEAforEditing([el]);
            ea.addElementsToView(false, false, false);
        }, 50);

        // 修改上下文并拦截，返回剔除了 # 号的纯净文本
        contextPayload.updatedNextOriginalText = nextOriginalText.replace(markdownHeaderRegex, '');
        return true; 
    }
    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_fail"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    await ensureSettings();
    window.EA_Core.registerHook(SCRIPT_ID, 'onBeforeTextSubmit', handleTextSubmit, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();