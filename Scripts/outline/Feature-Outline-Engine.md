---
name: 大纲核心引擎
description: 后台引擎：提供 Excalidraw 大纲数据的解析、清洗、智能探测与统一定位算法。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻，不提供可见UI。
features:
  - 智能探测画布中的大纲模式
  - 注册全局命名空间 ExcalidrawAutomate.plugin._ymjr_outline
dependencies: []
autorun: true
---
/*
```javascript
*/
const locales = {
    zh: { log_unmounted: "[{id}] 🔌 已卸载", log_mounted: "[{id}] 🚀 挂载完毕", warn_core: "EA_Core 未运行，但引擎仍将加载基本功能" },
    en: { log_unmounted: "[{id}] 🔌 Unmounted", log_mounted: "[{id}] 🚀 Mounted successfully", warn_core: "EA_Core not running, but engine will load basic features" }
};

const SCRIPT_ID = "ymjr.feature.outline-engine";

async function mountFeature() {
    if (!window.EA_Core) console.warn(t("warn_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    ExcalidrawAutomate.plugin._ymjr_outline = {
        config: null, 
        
        normalizeOutlineText: (raw) => {
            if (raw === undefined || raw === null) return '';
            return String(raw).trim().replace(/^\.+/, '').replace(/\.+$/, '').replace(/\.+/g, '.');
        },

        // 智能探测画布中包含的大纲类型
        detectAvailableModes: (elements) => {
            const hasFrame = elements.some(el => el?.type === 'frame');
            const hasLevel = elements.some(el => el?.customData?.titleLevel || el?.customData?.outlineLevel);
            const hasText = elements.some(el => el?.customData?.outlineText);
            
            const modes = [];
            if (hasLevel) modes.push('text - level');
            if (hasText) modes.push('text - text');
            if (hasFrame) modes.push('frame');
            return modes;
        },

        getProcessedElements: (elements, cfg) => {
            if (!cfg || !elements) return [];
            const { titleType, sortAxis } = cfg;
            
            let raw = [];
            if (titleType === 'frame') raw = elements.filter(el => el?.type === 'frame');
            else if (titleType === 'text - level') raw = elements.filter(el => el?.customData?.titleLevel || el?.customData?.outlineLevel);
            else if (titleType === 'text - text') raw = elements.filter(el => el?.customData?.outlineText);

            if (!raw.length) return [];

            const compareOutlineText = (a, b) => {
                const parts1 = ExcalidrawAutomate.plugin._ymjr_outline.normalizeOutlineText(a.customData?.outlineText).split('.').map(Number);
                const parts2 = ExcalidrawAutomate.plugin._ymjr_outline.normalizeOutlineText(b.customData?.outlineText).split('.').map(Number);
                const len = Math.max(parts1.length, parts2.length);
                for (let i = 0; i < len; i++) {
                    const p1 = parts1[i] || 0, p2 = parts2[i] || 0;
                    if (p1 !== p2) return p1 - p2;
                }
                return (a.y || 0) !== (b.y || 0) ? (a.y || 0) - (b.y || 0) : (a.x || 0) - (b.x || 0);
            };

            const compareByPosition = (a, b) => sortAxis === 'y' 
                ? ((a.y || 0) !== (b.y || 0) ? (a.y || 0) - (b.y || 0) : (a.x || 0) - (b.x || 0))
                : ((a.x || 0) !== (b.x || 0) ? (a.x || 0) - (b.x || 0) : (a.y || 0) - (b.y || 0));

            raw.sort(titleType === 'text - text' ? compareOutlineText : compareByPosition);

            const processed = [];
            if (titleType === 'text - text') {
                for (const el of raw) {
                    const outline = ExcalidrawAutomate.plugin._ymjr_outline.normalizeOutlineText(el.customData?.outlineText);
                    processed.push({ id: el.id, el, outline, displayText: `${outline} ${el.text ?? el.name ?? ''}`, level: outline ? outline.split('.').length : 1 });
                }
            } else if (titleType === 'text - level') {
                const counters = [];
                for (const el of raw) {
                    let lvlRaw = el.customData?.titleLevel ?? el.customData?.outlineLevel;
                    if (typeof lvlRaw === 'string') lvlRaw = Number(lvlRaw.trim().match(/^(\d+)/)?.[1] || lvlRaw);
                    let L = parseInt(String(lvlRaw), 10);
                    if (!Number.isInteger(L) || L <= 0) L = 1;

                    if (counters.length < L) {
                        while (counters.length < L) counters.push(0);
                        counters[L - 1] = 1;
                    } else {
                        counters.splice(L);
                        counters[L - 1] = (counters[L - 1] || 0) + 1;
                    }
                    const outline = counters.join('.');
                    processed.push({ id: el.id, el, outline, displayText: `${outline} ${el.text ?? el.name ?? ''}`, level: L });
                }
            } else if (titleType === 'frame') {
                raw.forEach((el, i) => processed.push({ id: el.id, el, outline: String(i + 1), displayText: `${i + 1} ${el.name ?? el.text ?? ''}`, level: 1 }));
            }
            return processed;
        }
    };

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        delete ExcalidrawAutomate.plugin._ymjr_outline;
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();