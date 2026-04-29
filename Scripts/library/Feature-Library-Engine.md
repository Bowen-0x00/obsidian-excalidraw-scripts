---
name: 素材库高级增强
description: 后台引擎：拦截素材添加动作，支持素材命名，并在素材库中渲染 Obsidian 相对路径的本地图片。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻引擎，彻底解决 Excalidraw 素材库无法预览 Obsidian 本地图片以及素材无法命名的问题。
features:
  - 拦截 `onBeforeAddToLibrary` 钩子，提供命名悬浮窗并将图片转为 `customData.imageLib` 相对路径存储
  - 拦截 `onLibraryUnitHydrate` 异步解析路径并向素材库面板注入 Base64 图片预览流
dependencies:
  - 独立运行
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    log_load_failed: "[Library Hydration] 图片加载失败 {id}:",
    modal_title_default: "输入文本",
    btn_cancel: "取消",
    btn_ok: "确定",
    modal_prompt: "请输入素材库项目名称:",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    log_load_failed: "[Library Hydration] Image load failed {id}:",
    modal_title_default: "Enter text",
    btn_cancel: "Cancel",
    btn_ok: "OK",
    modal_prompt: "Please enter library item name:",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.library-engine";

ExcalidrawAutomate.plugin._ymjr_customLibraryImageCache = ExcalidrawAutomate.plugin._ymjr_customLibraryImageCache || new Map();

const handleLibraryCheck = (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { elements, excalidrawApp } = context;
    if (!elements || !excalidrawApp) return false;

    const isMissing = elements.some(el => 
        el.type === "image" && el.customData?.imageLib?.path && !excalidrawApp.files[el.fileId]
    );

    if (isMissing) {
        context.isMissingFiles = true;
    }
    return false;
};

const handleLibraryHydrate = async (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { id, elements, excalidrawApp, svgCache, updateImageCache, rerender } = context;
    const obsidianApp = ea?.plugin?.app;
    if (!elements || !excalidrawApp || !obsidianApp) return false;

    const missingFileIds = [];
    let hasUpdates = false;

    for (const el of elements) {
        if (el.type === "image" && el.customData?.imageLib?.path && !excalidrawApp.files[el.fileId]) {
            missingFileIds.push(el.fileId);
        }
    }

    if (missingFileIds.length === 0) return false;

    const fileIdsToUpdate = [];

    for (const el of elements) {
        if (!missingFileIds.includes(el.fileId)) continue;
        const fileId = el.fileId;

        if (ExcalidrawAutomate.plugin._ymjr_customLibraryImageCache.has(fileId)) {
            excalidrawApp.files[fileId] = ExcalidrawAutomate.plugin._ymjr_customLibraryImageCache.get(fileId);
            fileIdsToUpdate.push(fileId);
            hasUpdates = true;
            continue;
        }

        try {
            const link = el.customData.imageLib.path;
            const cleanPath = link.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0];
            const file = obsidianApp.metadataCache.getFirstLinkpathDest(cleanPath, "");

            if (file) {
                const buffer = await obsidianApp.vault.readBinary(file);
                const extension = file.extension.toLowerCase();
                const mimeMap = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", gif: "image/gif", webp: "image/webp" };
                const mimeType = mimeMap[extension] || "application/octet-stream";

                const blob = new Blob([buffer], { type: mimeType });
                const reader = new FileReader();
                const dataURL = await new Promise((resolve) => {
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                const fileData = {
                    mimeType: mimeType, id: fileId, dataURL: dataURL,
                    created: Date.now(), lastRetrieved: Date.now()
                };

                ExcalidrawAutomate.plugin._ymjr_customLibraryImageCache.set(fileId, fileData);
                excalidrawApp.files[fileId] = fileData;
                fileIdsToUpdate.push(fileId);
                hasUpdates = true;
            }
        } catch (e) {
            console.error(t("log_load_failed", { id: el.fileId }), e);
        }
    }

    if (fileIdsToUpdate.length > 0 && updateImageCache) {
        await updateImageCache({ fileIds: fileIdsToUpdate, files: excalidrawApp.files, imageCache: excalidrawApp.imageCache });
    }

    if (hasUpdates || missingFileIds.length > 0) {
        setTimeout(() => {
            if (id) svgCache.delete(id);
            rerender(); 
        }, 0);
    }
    return false;
};

const handleBeforeAddToLibrary = async (context) => {
    const { ea, api } = context;
    if (!ea || !api) return;

    const { newElements } = context;
    const ModalClass = ea.obsidian?.Modal;
    
    if (ModalClass) {
        const userInput = await new Promise(resolve => {
            class InputModal extends ModalClass {
                constructor(app, title = t("modal_title_default")) {
                    super(app);
                    this._title = title;
                    this.value = null;
                }
                onOpen() {
                    const { contentEl } = this;
                    contentEl.empty();
                    contentEl.createEl("h3", { text: this._title });
                    this.input = contentEl.createEl("input");
                    this.input.style.width = "100%";
                    this.input.autofocus = true;
                    
                    const btnRow = contentEl.createEl("div");
                    btnRow.style.marginTop = "10px";
                    
                    const cancel = contentEl.createEl("button", { text: t("btn_cancel") });
                    cancel.style.marginRight = "8px";
                    cancel.onclick = () => { this.value = null; this.close(); };
                    
                    const ok = contentEl.createEl("button", { text: t("btn_ok") });
                    ok.onclick = () => { this.value = this.input.value; this.close(); };
                    
                    btnRow.appendChild(cancel);
                    btnRow.appendChild(ok);
                    
                    setTimeout(() => this.input.focus(), 50);
                }
                onClose() {
                    resolve(this.value);
                }
            }
            const modal = new InputModal(window.app, t("modal_prompt"));
            modal.open();
        });

        if (userInput === null) {
            return true;
        }
        context.name = userInput;
    }

    const currentFiles = window.ea?.targetView?.excalidrawData?.files;
    if (currentFiles) {
        for (let el of newElements) {
            if (el.type == "image") {
                let link;
                const fileData = currentFiles.get(el.fileId); 
                
                if (fileData?.linkParts?.original) {
                    link = `[[${fileData.linkParts.original}]]`;
                } else if (fileData?.hyperlink) {
                    link = fileData.hyperlink;
                }
                el.customData = {...el.customData, imageLib: {path: link}};

                if (fileData && fileData.dataURL) {
                    const cacheItem = {
                        ...fileData, 
                        isLoaded: function() { return true; },
                        getImage: function() { return this.dataURL; },
                        shouldScale: function() { return true; },
                        isHyperLink: false,
                        isLocalLink: false,
                        file: null
                    };
                    ExcalidrawAutomate.plugin._ymjr_customLibraryImageCache.set(el.fileId, cacheItem);
                }
            }
        }
    }

    return false;
};

async function mountFeature() {
    if (!window.EA_Core) return;
    if (typeof ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] === "function") ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();

    window.EA_Core.registerHook(SCRIPT_ID, 'onLibraryUnitCheck', handleLibraryCheck, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'onLibraryUnitHydrate', handleLibraryHydrate, 50);
    window.EA_Core.registerHook(SCRIPT_ID, 'onBeforeAddToLibrary', handleBeforeAddToLibrary, 50);

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        if (window.EA_Core) window.EA_Core.unregisterHook(SCRIPT_ID);
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}


mountFeature();
