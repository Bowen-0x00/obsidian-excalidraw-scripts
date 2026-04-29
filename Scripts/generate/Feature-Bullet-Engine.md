---
name: 序号标签核心引擎
description: 后台引擎：拦截鼠标点击并自动生成序号标签
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。与 Action-Bullet-UI 配合使用。
features:
  - 拦截 handleCanvasPointerDown 在鼠标点击位置生成序号容器
  - 修复坐标 Infinity 报错，并支持多语言
  - 实时读取 UI 修改的 tempSettings，支持多颜色循环
dependencies:
  - Action-Bullet-UI
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 引擎挂载完毕",
    render_error: "渲染错误:"
  },
  en: {
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Engine mounted successfully",
    render_error: "Render Error:"
  }
};

const SCRIPT_ID = "ymjr.feature.bullet-engine";
const NAMESPACE = "_ymjr_bullet";

if (!ExcalidrawAutomate.plugin[NAMESPACE]) {
    ExcalidrawAutomate.plugin[NAMESPACE] = {
        isActive: false,
        currentIndex: 1,
        uiElement: null,
        onIndexChange: null,
        tempSettings: null // 用于存储 UI 尚未保存的即时设置
    };
}

async function ensureSettings() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["bullet_settings"] ?? {};
    // 兼容旧版本的单色 bgColor
    if (settings.bgColor && !settings.colorList) {
        settings.colorList = [settings.bgColor];
        delete settings.bgColor;
    }
    if (!settings["fontSize"]) {
        settings = {
            fontSize: 20,
            circleSize: 36,
            colorList: ["#FFADAD", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#A0C4FF", "#BDB2FF", "#FFC6FF"],
            fontColor: "#000000",
            ...settings
        };
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["bullet_settings"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
}

const handlePointerDown = (context) => {
    const state = ExcalidrawAutomate.plugin[NAMESPACE];
    if (!state || !state.isActive) return false;

    const { ea: ctxEa, api, App, event } = context;
    if (!ctxEa || !api || !App || !event) return false;

    // 仅响应鼠标左键
    if (event.button !== 0) return false;

    // 优先读取 UI 中的即时临时设置，如果 UI 未打开则读取系统持久化设置
    const savedSettings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["bullet_settings"];
    const settings = state.tempSettings || savedSettings;
    
    try {
        ctxEa.clear();
        ctxEa.style.fontSize = Number(settings.fontSize);
        ctxEa.style.strokeColor = settings.fontColor;
        
        // 自动计算循环颜色
        let currentColor = "#FFD6A5"; // fallback
        if (Array.isArray(settings.colorList) && settings.colorList.length > 0) {
            const cIndex = (state.currentIndex - 1) % settings.colorList.length;
            currentColor = settings.colorList[cIndex];
        }
        ctxEa.style.backgroundColor = currentColor;
        
        ctxEa.style.fillStyle = "solid";
        ctxEa.style.verticalAlign = "middle";
        ctxEa.style.textAlign = "center";

        const textStr = String(state.currentIndex);
        const { width, height } = ctxEa.measureText(textStr);
        const circleSize = Number(settings.circleSize);
        const maxSize = Math.max(width, height, circleSize);
        const padding = maxSize * 0.25;
        const totalSize = maxSize + padding * 2;

        const id = ctxEa.addText(0, 0, textStr, {
            width: maxSize,
            height: maxSize,
            box: "ellipse",
            boxPadding: padding,
            textAlign: "center",
            textVerticalAlign: "middle",
            boxStrokeColor: settings.fontColor
        });

        const el = ctxEa.getElement(id);
        if (el && el.containerId) {
            const container = ctxEa.getElement(el.containerId);
            container.backgroundColor = currentColor;
            container.strokeColor = "transparent"; // 隐藏边框
            container.fillStyle = "solid";
        }

        ctxEa.addElementsToView(true, false, true);

        // 序号递增并通知 UI 更新
        state.currentIndex++;
        if (typeof state.onIndexChange === "function") {
            state.onIndexChange(state.currentIndex);
        }
    } catch (e) {
        console.error(`[Feature: BulletEngine] ${t("render_error")}`, e);
    }
    
    // 返回 true 会阻断 Excalidraw 默认画图事件，解决 "size or position is too large" 报错
    return true; 
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn("EA_Core 未运行");
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    await ensureSettings();

    window.EA_Core.registerHook(SCRIPT_ID, 'handleCanvasPointerDown', handlePointerDown, 70);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };
    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();