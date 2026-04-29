---
name: 粘贴摘录解析引擎
description: 后台引擎：拦截并解析粘贴板中的特殊格式（BookxNote、Zotero、Eagle、Bookmaster及自定义ymjr等）为带链接的 Excalidraw 元素。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻。当您在画板中按下 Ctrl+V 粘贴时，自动探测文本剪贴板中是否包含支持的第三方软件协议链接。如果命中，会自动转换为对应的图片、引用块或代码块元素。
features:
  - 拦截 `onPaste` 钩子，支持 BookxNote Pro, Zotero PDF, Bookmaster, Booknote, Eagle 格式。
  - 支持私有的 `ymjr:` JSON 协议，实现富文本与代码高亮等高级粘贴机制。
  - 智能清洗由于跨软件复制带来的无效 HTML 富文本标签。
dependencies:
  - 独立运行。如果是代码高亮协议，需配合 [CodeHighlight] 模块使用。
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_parse_error: "[Feature: PasteExtractor] 解析 ymjr JSON 错误:",
    log_no_core: "EA_Core 未运行，无法挂载摘录引擎",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_parse_error: "[Feature: PasteExtractor] Error parsing ymjr JSON:",
    log_no_core: "EA_Core not running, cannot mount paste extractor engine",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.paste-engine";

// ==========================================
// 核心逻辑：粘贴事件拦截与解析
// ==========================================
const handlePaste = async (contextPayload) => {
    const { ea, api } = contextPayload;
    if (!ea || !api) return;

    const {  payload, event, excalidrawFile, view, pointerPosition } = contextPayload;
    
    if (!payload || typeof payload.text !== "string") {
        return false;
    }

    if (!api) return false;
    
    const state = api.getAppState();
    let text = payload.text;

    // ------------------------------------------
    // 1. 全局清理：剥离富文本 HTML 标签
    // ------------------------------------------
    if (text.includes('<span') || text.includes('</span')) {
        text = text.replace(/<span.*?>/g, '').replaceAll('</span>', '');
    }
    if (text.includes('<mark') || text.includes('</mark')) {
        text = text.replace(/<mark.*?>/g, '').replaceAll('</mark>', '');
    }
    if (text.includes('<font') || text.includes('</font')) {
        text = text.replace(/<font.*?>/g, '').replaceAll('</font>', '');
    }
    // 同步修改回 payload 供后续可能需要的逻辑使用
    payload.text = text;

    // ------------------------------------------
    // 2. 解析：BookxNote Pro
    // ------------------------------------------
    if (text.includes('(bookxnotepro://')) {
        let image_paths = text.match(/!\[\[.*\]\]/g);
        if (image_paths?.length) {
            let links = text.match(/bookxnotepro:\/\/[^\)]*/g);
            
            // 处理引用块文本
            if (text.startsWith("```ad-quote")) {
                const match = text.match(/^```ad-quote\s*([\w\W]*)\s```/);
                if (match) {
                    payload.text = '';
                    ea.style.strokeColor = state.currentItemStrokeColor;
                    ea.style.fontSize    = state.currentItemFontSize;
                    ea.style.fontFamily  = state.currentItemFontFamily;
                    const id = ea.addText(0, 0, match[1]);
                    const el = ea.getElement(id);
                    if (links && links[0]) el.link = links[0];
                    await ea.addElementsToView(true, false, false);
                    return true; // 返回 true 代表已拦截处理完毕
                }
            }
            
            // 处理图片
            payload.text = '';
            ea.clear();
            for (let i = 0; i < image_paths.length; i++) {
                let image_path = image_paths[i];
                let link = links ? links[i] : null;
                let id = await ea.addImage(0, 0, image_path.substring(3, image_path.length - 2), true);
                let el = ea.getElement(id);
                if (link) el.link = link;
            }
            await ea.addElementsToView(true, false, false);
            return true;
        }
    }    

    // ------------------------------------------
    // 3. 解析：Zotero PDF
    // ------------------------------------------
    if (text.includes('[pdf](zotero://')) {
        let image_paths = text.match(/!\[\[.*\]\]/g);
        if (image_paths?.length) {
            let links = text.match(/zotero:\/\/[^\)]*/g);

            payload.text = '';
            ea.clear();
            let y = 0; // 修复了原代码缺少 let 的问题
            for (let i = 0; i < image_paths.length; i++) {
                let image_path = image_paths[i];
                let link = links ? links[i] : null;
                let id = await ea.addImage(0, y, image_path.substring(3, image_path.length - 2), false);
                let el = ea.getElement(id);
                if (link) el.link = link;
                y += el.height + 10;
            }
            await ea.addElementsToView(true, false, false);
            return true;
        }
    }

    // ------------------------------------------
    // 4. 解析：Bookmaster
    // ------------------------------------------
    if (text.includes('obsidian://bookmaster')) {
        let image_paths = text.match(/!\[\[.*\]\]/g);
        let links = text.match(/obsidian:\/\/bookmaster[^\)]*/g);

        if (image_paths && image_paths.length > 0) {
            payload.text = '';
            ea.clear();
            let y = 0;
            for (let i = 0; i < image_paths.length; i++) {
                let image_path = image_paths[i];
                let link = links ? links[i] : null;
                let id = await ea.addImage(0, y, image_path.substring(3, image_path.length - 2), true);
                let el = ea.getElement(id);
                if (link) el.link = link;
                el.width /= 4;
                el.height /= 4;
                y += el.height + 1;
            }
            await ea.addElementsToView(true, false, false);
            return true;
        }
    }

    // ------------------------------------------
    // 5. 解析：Booknote
    // ------------------------------------------
    if (text.includes('obsidian://booknote')) {
        let image_paths = text.match(/!\[\[.*\]\]/g);
        let links = text.match(/obsidian:\/\/booknote[^\)]*/g);

        if (image_paths && image_paths.length > 0) {
            payload.text = '';
            ea.clear();
            let y = 0;
            for (let i = 0; i < image_paths.length; i++) {
                let image_path = image_paths[i];
                let link = links ? links[i] : null;
                let id = await ea.addImage(0, y, image_path.substring(3, image_path.length - 2), true);
                let el = ea.getElement(id);
                if (link) el.link = link;
                el.width /= 4;
                el.height /= 4;
                y += el.height + 1;
            }
            await ea.addElementsToView(true, false, false);
            return true;
        }
    }

    // ------------------------------------------
    // 6. 解析：Eagle 链接
    // ------------------------------------------
    if (text.match(/!\[(.*?)\]\((.*?)\)/)) {
        const match = text.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
            payload.text = '';
            ea.clear();
            const id = await ea.addImage(0, 0, match[2], true);
            const el = ea.getElement(id);
            const linkMatch = text.match(/.*(eagle:\/\/item.*)\)/);
            if (linkMatch) el.link = linkMatch[1];
            
            await ea.addElementsToView(true, false, false);
            return true;
        }
    }

    // ------------------------------------------
    // 7. 解析：YMJR 自定义协议
    // ------------------------------------------
    if (text.startsWith("ymjr:")) {
        const jsonStr = text.substring("ymjr:".length);
        payload.text = '';
        ea.clear();
        try {
            const obj = JSON.parse(jsonStr);
            if (obj?.type === 'image' || obj?.type === 'image_path') {
                let id;
                if (obj.type === 'image') {
                    const file = await ea.targetView.excalidrawData.saveDataURLtoVault(obj.data, "image/png", "");
                    id = await ea.addImage(0, 0, file, true);
                } else if (obj.type === 'image_path') {
                    id = await ea.addImage(0, 0, `file:///${obj.data}`, true);
                }
                const el = ea.getElement(id);
                el.link = obj.link;
                await ea.addElementsToView(true, false, false);
                return true;

            } else if (obj?.type === 'text') {
                ea.style.strokeColor = state.currentItemStrokeColor;
                ea.style.fontSize    = state.currentItemFontSize;
                ea.style.fontFamily  = state.currentItemFontFamily;
                const id = await ea.addText(0, 0, obj.data, { wrapAt: 100 }); // 修复了原代码非法的赋值表达式
                const el = ea.getElement(id);
                el.link = obj.link;
                await ea.addElementsToView(true, false, false);
                return true;

            } else if (obj?.type === 'code') {
                const id = await ea.addText(0, 0, obj.text.replaceAll('\r\n', '\n'));
                const el = ea.getElement(id);
                el.fontFamily = 3; // code font
                el.link = `ymjr://open?app=code&folder=${encodeURI(obj.folderPath)}&file=${encodeURI(obj.filePath)}&line=${obj.lineNum}`;
                el.customData = {
                    codeHighlight: {
                        embedFont: true,
                        language: obj?.language || "Verilog",
                        style: "atom-one-dark"
                    }
                };
                ea.refreshTextElementSize(id);
                await ea.addElementsToView(true, false, false);
                return true;
            }
        } catch (e) {
            console.error(t("log_parse_error"), e);
        }
    }

    // 如果都不匹配，返回 false，交由 Excalidraw 原生或其他插件进行默认的粘贴处理
    return false;
};


// ==========================================
// 生命周期挂载与卸载
// ==========================================
async function mountFeature() {
    if (!window.EA_Core) return console.warn(t("log_no_core"));
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    // 因为需要等待图片上传生成元素等异步操作，Hook Engine 使用 dispatchAsync，所以这里用 async 函数
    window.EA_Core.registerHook(SCRIPT_ID, 'onPaste', handlePaste, 50);
    
    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) {
            window.EA_Core.unregisterHook(SCRIPT_ID);
        }
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();