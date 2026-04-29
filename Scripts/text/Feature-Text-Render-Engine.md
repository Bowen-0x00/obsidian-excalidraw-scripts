---
name: 文本高级渲染引擎
description: 后台引擎：提供文本级的自定义渲染，支持局部加粗、局部变色、渐变色及特殊字体样式（支持混合叠加）。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎。自动拦截包含 `customData.boldPartial`、`customData.colorPartial` 等字段的文本元素的渲染过程，并在 Excalidraw 原生 Canvas 层进行自定义绘制，实现富文本级别的展现效果。
features:
  - 拦截 `drawElementOnCanvasTextBefore` 与 `drawElementOnCanvasTextAfter` 钩子
  - 支持多段局部样式 (Bold/Color) 嵌套叠加渲染
  - 支持读取全局字重 (`font.weight`) 与渐变色 (`gradient`) 配置
dependencies:
  - 作为基础引擎供所有 `Action-Format-Text-*` 动作脚本调用
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_fail: "EA_Core 未运行",
    log_gradient_error: "[Text Render Engine] 渐变解析失败:",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_fail: "EA_Core not running",
    log_gradient_error: "[Text Render Engine] Gradient eval failed:",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.text-render-engine";

const handleTextBefore = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { element, context, lines, horizontalOffset, verticalOffset, lineHeightPx } = contextPayload;
    if (!element.customData) return false;

    // --- 1. 全局字体与样式覆写 ---
    if (element.customData.bold || element.customData.title || element.customData.font || element.customData.gradient) {
        context.save();
        
        if (element.customData.bold) {
            context.font = `bold ${context.font}`;
        }
        if (element.customData.title) {
            const sizeMatch = context.font.match(/\d*\.*\d+px/);
            if (sizeMatch) context.font = `${sizeMatch[0]} caption`;
        }
        if (element.customData.font) {
            if (element.customData.font.weight) context.font = `${element.customData.font.weight} ${context.font}`;
            if (element.customData.font.italic) context.font = `italic ${context.font}`;
        }
        
        // 处理渐变色
        if (element.customData.gradient) {
            try {
                const runGradient = new Function('ctx', 'el', `
                    ${element.customData.gradient};
                    return gradient; 
                `);
                context.fillStyle = runGradient(context, element);
            } catch (e) {
                console.error(t("log_gradient_error"), e);
            }
        }
    }

    // --- 2. 局部混合样式渲染 (加粗 + 颜色 叠加支持) ---
    if (element.customData.boldPartial || element.customData.colorPartial) {
        const bolds = element.customData.boldPartial || [];
        const colors = element.customData.colorPartial || [];

        let count = 0; // 记录不含换行符的字符绝对索引
        
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            let x = horizontalOffset;
            
            const lineStart = count;
            const lineEnd = count + line.length;

            // 提取当前行所有的“样式变化端点”
            let breakPoints = new Set([0, line.length]);
            
            bolds.forEach(b => {
                if (b.start > lineStart && b.start < lineEnd) breakPoints.add(b.start - lineStart);
                if (b.end > lineStart && b.end < lineEnd) breakPoints.add(b.end - lineStart);
            });
            colors.forEach(c => {
                if (c.start > lineStart && c.start < lineEnd) breakPoints.add(c.start - lineStart);
                if (c.end > lineStart && c.end < lineEnd) breakPoints.add(c.end - lineStart);
            });

            // 排序生成连续的切割分段
            let pts = Array.from(breakPoints).sort((a, b) => a - b);

            for (let i = 0; i < pts.length - 1; i++) {
                let segStart = pts[i];
                let segEnd = pts[i + 1];
                let segText = line.substring(segStart, segEnd);
                
                if (!segText) continue;

                // 计算当前切片在整个字符串中的绝对坐标
                let absoluteStart = lineStart + segStart;

                // 判断当前切片命中了哪些样式
                let isBold = bolds.some(b => absoluteStart >= b.start && absoluteStart < b.end);
                // 如果有重叠颜色，优先取最后设置的那一个（反转数组查找）
                let colorObj = [...colors].reverse().find(c => absoluteStart >= c.start && absoluteStart < c.end);

                // 独立渲染当前切片
                context.save();
                if (isBold) {
                    context.font = `bold ${context.font}`;
                }
                if (colorObj) {
                    context.fillStyle = colorObj.color;
                    context.strokeStyle = colorObj.color;
                }

                context.fillText(segText, x, index * lineHeightPx + verticalOffset);
                x += context.measureText(segText).width;
                context.restore();
            }
            // 每行结束，增加该行的字符数 (旧脚本逻辑不计算 \n 占位)
            count += line.length;
        }
        return true; // 彻底接管默认文字渲染
    }

    return false; // 如果既没有全局也没有局部，交由 Excalidraw 原生处理
};

const handleTextAfter = (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const { element, context } = contextPayload;
    if (element.customData && (element.customData.bold || element.customData.title || element.customData.font || element.customData.gradient)) {
        context.restore();
    }
    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_fail"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'drawElementOnCanvasTextBefore', handleTextBefore, 60);
    window.EA_Core.registerHook(SCRIPT_ID, 'drawElementOnCanvasTextAfter', handleTextAfter, 60);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}


mountFeature();