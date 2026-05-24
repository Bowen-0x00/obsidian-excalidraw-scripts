---
name: 扩展调色板核心引擎 (JSON i18n版)
description: 后台引擎：提供自定义颜色面板配置的 JSON 解析与全局色彩注入支持，完美支持中英双语国际化切换。
author: ymjr
version: 1.0.1
license: MIT
usage: 作为后台常驻引擎运行。请不要在设置中手动修改其生成的 JSON，建议配合管理面板脚本使用。
features:
  - 拦截 excalidrawExtraColors 钩子
  - 支持组名与颜色名称
  - 自动侦测 Obsidian 系统语言并实时切换 UI 显示
  - 自动为每个不规则分组进行 5列网格末尾占位补齐
dependencies:
  - 无前置依赖
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    setting_desc: "⚠️ 请不要在此处直接修改 JSON 代码。请运行 '管理自定义调色板' 脚本通过可视化面板进行增删改查。",
    log_parse_error: "[Feature: ExtraColors] JSON 颜色配置解析错误，已启用默认备份:",
    log_no_core: "EA_Core 未运行，无法挂载调色板引擎。",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕",
  },
  en: {
    setting_desc: "⚠️ Do not modify JSON directly. Use 'Manage Custom Palette' script UI to update.",
    log_parse_error: "[Feature: ExtraColors] JSON parsing error, rolled back to default:",
    log_no_core: "EA_Core not running, cannot mount palette engine.",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully",
  }
};

const SCRIPT_ID = "ymjr.feature.extra-colors-engine";

// 🚀 升级为国际化 JSON 结构（同时兼容纯字符串和多语言对象）
const defaultPaletteData = [
  {
    "groupName": { "zh": "莫兰迪色系", "en": "Morandi Colors" },
    "colors": [
      { "name": { "zh": "樱花粉", "en": "Cherry Blossom" }, "value": "#EDAFB8" },
      { "name": { "zh": "粉黛色", "en": "Powder Petal" }, "value": "#F7E1D7" },
      { "name": { "zh": "燕麦灰", "en": "Dust Grey" }, "value": "#DEDBD2" },
      { "name": { "zh": "豆绿灰", "en": "Ash Grey" }, "value": "#B0C4B1" },
      { "name": { "zh": "铁锈橙", "en": "Iron Grey" }, "value": "#f08c01" }
    ]
  },
  {
    "groupName": { "zh": "历史经典色", "en": "Historical Classics" },
    "colors": [
      { "name": { "zh": "青柠绿", "en": "Lime Green" }, "value": "#6ECC54" },
      { "name": { "zh": "提香红", "en": "Titian Red" }, "value": "#D34947" },
      { "name": { "zh": "马尔斯绿", "en": "Marrs Green" }, "value": "#018B8D" },
      { "name": { "zh": "克莱因蓝", "en": "Klein Blue" }, "value": "#002FA7" },
      { "name": { "zh": "勃艮第红", "en": "Burgundy Red" }, "value": "#470125" },
      { "name": { "zh": "美泉宫黄", "en": "Schonbrunn Yellow" }, "value": "#F9D46C" },
      { "name": { "zh": "蒂芙尼蓝", "en": "Tiffany Blue" }, "value": "#71E2D1" },
      { "name": { "zh": "中国红", "en": "Chinese Red" }, "value": "#C8161D" },
      { "name": { "zh": "凡戴克棕", "en": "Vandyke Brown" }, "value": "#492D22" },
      { "name": { "zh": "爱马仕橙", "en": "Hermes Orange" }, "value": "#EB5C20" },
      { "name": { "zh": "普鲁士蓝", "en": "Prussian Blue" }, "value": "#0D3A69" }
    ]
  }
];

// 🌐 动态获取当前 Obsidian 系统的语言环境
function getCurrentLanguage() {
    let lang = "en";
    if (typeof window !== "undefined") {
        // 优先读取 Obsidian 的本地存储语言设置，其次匹配浏览器宿主语言
        const obsidianLang = window.localStorage.getItem("language");
        lang = obsidianLang || (navigator.language && navigator.language.startsWith("zh") ? "zh" : "en");
    }
    return lang.startsWith("zh") ? "zh" : "en";
}

// 🗺️ 国际化文本提取工具
function getLocalizedText(field, currentLang) {
    if (!field) return "";
    if (typeof field === "string") return field; // 兼容老版本或单语言字符串
    if (typeof field === "object") {
        return field[currentLang] || field["en"] || Object.values(field)[0] || "";
    }
    return String(field);
}

async function ensureSettings() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"] ?? {};
    
    if(!settings["Palette JSON Config"]) {
        settings = {
            "Palette JSON Config": { 
                value: JSON.stringify(defaultPaletteData, null, 2), 
                description: t("setting_desc") 
            },
            ...settings
        };
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
}

const handleExtraColorsRequest = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api || !contextPayload || !Array.isArray(contextPayload.colors)) return false;

    const settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"];
    const jsonString = settings?.["Palette JSON Config"]?.value;

    let paletteData = defaultPaletteData;
    if (jsonString) {
        try {
            paletteData = JSON.parse(jsonString);
        } catch (error) {
            console.error(t("log_parse_error"), error);
            paletteData = defaultPaletteData;
        }
    }

    try {
        const finalColors = [];
        let spacerCounter = 0;
        const currentLang = getCurrentLanguage(); // 实时获取当前语言

        paletteData.forEach((group) => {
            const groupNameText = getLocalizedText(group.groupName, currentLang);
            if (!groupNameText || !Array.isArray(group.colors) || group.colors.length === 0) return;

            // 1. 注入动态本地化后的分组名 Token 
            finalColors.push({
                name: `__group__${groupNameText}`,
                value: "header"
            });

            // 2. 注入当前组内的所有颜色（动态转换名称）
            group.colors.forEach((color) => {
                const colorNameText = getLocalizedText(color.name, currentLang);
                finalColors.push({
                    name: colorNameText,
                    value: color.value
                });
            });

            // 3. 动态网格数学对齐：补全当前组最后一行的空位（Excalidraw调色板为5列）
            const remainder = group.colors.length % 5;
            if (remainder !== 0) {
                const paddingNeeded = 5 - remainder;
                for (let i = 0; i < paddingNeeded; i++) {
                    finalColors.push({
                        name: `__spacer_${spacerCounter++}`,
                        value: "transparent"
                    });
                }
            }
        });

        contextPayload.colors.push(...finalColors);
    } catch (e) {
        console.error(e);
    }

    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    await ensureSettings();

    window.EA_Core.registerHook(SCRIPT_ID, 'excalidrawExtraColors', handleExtraColorsRequest, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();