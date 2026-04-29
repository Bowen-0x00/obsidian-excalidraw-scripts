---
name: 扩展调色板核心引擎
description: 后台引擎：提供自定义颜色面板配置解析与全局色彩注入支持。
author: ymjr
version: 1.0.0
license: MIT
usage: 作为后台常驻引擎运行，用于给画板默认色板注入用户自定义颜色。
features:
  - 拦截 excalidrawExtraColors 钩子
  - 从设置中读取 "Palette List" 字符串并解析为色值对象
  - 将莫兰迪等自定义色系动态注入全局 Excalidraw UI
dependencies:
  - 无前置依赖
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    setting_desc: "格式: 名称:#Hex, 名称:#Hex (以逗号分隔各项)",
    log_parse_error: "[Feature: ExtraColors] 颜色配置解析错误:",
    log_no_core: "EA_Core 未运行，无法挂载调色板引擎。",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    setting_desc: "Format: Name:#Hex, Name:#Hex (comma-separated)",
    log_parse_error: "[Feature: ExtraColors] Palette parsing error:",
    log_no_core: "EA_Core not running, cannot mount palette engine.",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.extra-colors-engine";

// 默认莫兰迪色系配置
const defaultPaletteString = "Cherry Blossom:#EDAFB8, Powder Petal:#F7E1D7, Dust Grey:#DEDBD2, Ash Grey:#B0C4B1, Iron Grey:#f08c01";

/**
 * 引擎配置初始化
 */
async function ensureSettings() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"] ?? {};
    
    if(!settings["Palette List"]) {
        settings = {
            "Palette List": { 
                value: defaultPaletteString, 
                description: t("setting_desc") 
            },
            ...settings
        };
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
}

/**
 * 处理底层派发的颜色获取请求
 * 对应插件源码: core.dispatchSync('excalidrawExtraColors', context);
 */
const handleExtraColorsRequest = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    // 防御性检查：确保 contextPayload 中存在 colors 数组容器
    if (!contextPayload || !Array.isArray(contextPayload.colors)) {
        return false;
    }

    // 实时读取引擎配置
    const settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["extra colors"];
    const rawString = settings?.["Palette List"]?.value || defaultPaletteString;

    if (!rawString) return false;

    try {
        const parsedColors = rawString.split(",").map(item => {
            const parts = item.split(":");
            
            if (parts.length >= 2) {
                // 标准格式: "Name:#Hex"
                return { 
                    name: parts[0].trim(), 
                    value: parts.slice(1).join(":").trim() 
                };
            } else {
                // 容错格式: 用户只输入了色值
                const cleanItem = item.trim();
                if(!cleanItem) return null;
                return { 
                    name: cleanItem, 
                    value: cleanItem 
                };
            }
        }).filter(item => item !== null);

        // 将解析后的颜色推入底层的上下文中
        contextPayload.colors.push(...parsedColors);

    } catch (error) {
        console.error(t("log_parse_error"), error);
    }

    return false; // 继续事件传播
};

/**
 * 挂载引擎特性
 */
async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    
    // 执行热重载清理
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    // 确保配置就绪
    await ensureSettings();

    // 注册 Hook 监听底层调用 (优先级设定为 60)
    window.EA_Core.registerHook(SCRIPT_ID, 'excalidrawExtraColors', handleExtraColorsRequest, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();