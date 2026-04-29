---
name: 动态素材库管理器
description: 动态加载或卸载 Excalidraw 素材库 (跨窗口持久化记录，智能重建防误删)。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本呼出面板。全键盘操作：输入过滤 -> 上下键选择 -> 回车智能切换(加载/卸载) -> Esc退出。
features:
  - 利用全局 Map 跨窗口持久化记录当前会话已加载的素材库
  - 去除危险的 Replace 模式，采用安全重组内存的方式实现卸载
  - 支持回车或双击智能 Toggle (加载/卸载)
---
/*
```javascript
*/

const SCRIPT_ID = "ymjr.feature.dynamic-library-manager";

var locales = {
  zh: {
    settings_desc: "个人扩展素材库的所在文件夹路径",
    modal_title: "📚 动态素材库管理器",
    placeholder_search: "输入名称模糊搜索...",
    btn_cancel: "关闭 (Esc)",
    btn_unload: "卸载 (Del)",
    btn_load: "加载 (Enter)",
    empty_list: "未找到匹配的素材库",
    tag_loaded: "🟢 已加载",
    notice_load_success: "🎉 成功加载: {name}",
    notice_unload_success: "🗑️ 成功卸载: {name}",
    notice_error: "❌ 操作失败，请检查文件格式"
  },
  en: {
    settings_desc: "Extra Personal library folder path",
    modal_title: "📚 Dynamic Library Manager",
    placeholder_search: "Type to search...",
    btn_cancel: "Close (Esc)",
    btn_unload: "Unload (Del)",
    btn_load: "Load (Enter)",
    empty_list: "No matching library files",
    tag_loaded: "🟢 Loaded",
    notice_load_success: "🎉 Successfully loaded: {name}",
    notice_unload_success: "🗑️ Successfully unloaded: {name}",
    notice_error: "❌ Operation failed. Check file format."
  }
};

// 1. 初始化命名空间与全局持久化状态
if (!ExcalidrawAutomate.plugin._ymjr_dynLib) {
    ExcalidrawAutomate.plugin._ymjr_dynLib = {
        isPatched: false,
        originalSetLibrary: null,
        dynamicItemsMap: new Map() // 【核心】跨窗口持久化存储动态加载的素材项
    };
}

function fuzzyMatch(text, query) {
    text = text.toLowerCase();
    query = query.toLowerCase();
    let textIdx = 0;
    let queryIdx = 0;
    while (textIdx < text.length && queryIdx < query.length) {
        if (text[textIdx] === query[queryIdx]) { queryIdx++; }
        textIdx++;
    }
    return queryIdx === query.length;
}

// 2. 核心功能类封装
class DynamicLibraryManager {
    constructor(ea, api, app) {
        this.ea = ea;
        this.api = api;
        this.app = app;
        this.state = ExcalidrawAutomate.plugin._ymjr_dynLib; // 引用全局状态
        this.libraryPath = "";
        this.files = [];
    }

    async init() {
        await this.ensureSettings();
        this.setupInterceptor();
        this.fetchLibraryFiles();
        this.renderUI();
    }

    async ensureSettings() {
        let settings = this.ea.getScriptSettings();
        if (!settings["extra library path"]) {
            settings = {
                "extra library path": { value: "Excalidraw/Libraries", description: t("settings_desc") }
            };
            this.ea.setScriptSettings(settings);
        }
        this.libraryPath = settings["extra library path"].value.replace(/\\/g, '/');
    }

    // 拦截器：防止动态注入的库被错误写入持久化配置文件中
    setupInterceptor() {
        if (!this.state.isPatched) {
            this.state.originalSetLibrary = ExcalidrawAutomate.plugin.setStencilLibrary.bind(ExcalidrawAutomate.plugin);
            ExcalidrawAutomate.plugin.setStencilLibrary = async (library) => {
                try {
                    const libraryItems = library.libraryItems.filter(item => 
                        ["unpublished", "published"].includes(item.status)
                    );
                    const saveLib = { ...library, libraryItems: libraryItems };
                    return this.state.originalSetLibrary(saveLib);
                } catch (e) {
                    console.error(`[${SCRIPT_ID}] Intercept Error:`, e);
                    return this.state.originalSetLibrary(library);
                }
            };
            this.state.isPatched = true;
        }
    }

    fetchLibraryFiles() {
        let allFiles = this.app.vault.getFiles();
        this.files = allFiles.filter(f => 
            f.path.startsWith(this.libraryPath) && 
            ['json', 'excalidrawlib'].includes(f.extension)
        );
    }

    // 核心重组逻辑：合并“永久素材”与“仍在Map中的动态素材”覆写画布内存
    async rebuildLibrary() {
        // 1. 获取用户本地真正的永久素材库
        let permanentItems = [];
        const lib2 = ExcalidrawAutomate.plugin.settings.library2;
        if (lib2 && lib2.libraryItems) {
            permanentItems = lib2.libraryItems.filter(item => ["unpublished", "published"].includes(item.status));
        } else if (ExcalidrawAutomate.plugin.settings.library && ExcalidrawAutomate.plugin.settings.library.libraryItems) {
            permanentItems = ExcalidrawAutomate.plugin.settings.library.libraryItems.filter(item => ["unpublished", "published"].includes(item.status));
        }

        // 2. 获取当前会话下所有活跃的动态素材
        let dynamicItems = [];
        for (const items of this.state.dynamicItemsMap.values()) {
            dynamicItems.push(...items);
        }

        // 3. 组合并强行覆盖画布内存 (实现无痕添加和精准删除)
        const assembledItems = [...permanentItems, ...dynamicItems];

        this.api.updateLibrary({
            libraryItems: assembledItems,
            prompt: false,
            merge: false, // 必须是 false，才能剔除被删掉的库
            openLibraryMenu: true
        });
    }

    async executeLoad(file) {
        try {
            const content = await this.app.vault.read(file);
            const lib = JSON.parse(content);
            
            let libraryItems = lib.libraryItems || lib.library || [];
            if (!libraryItems.length) throw new Error("Empty library structure");

            libraryItems.forEach(el => el.status = file.basename);
            
            // 存入全局 Map
            this.state.dynamicItemsMap.set(file.basename, libraryItems);
            await this.rebuildLibrary();

            new Notice(t("notice_load_success", { name: file.basename }));
            this.renderListUIOnly(); 
        } catch (error) {
            console.error(`[${SCRIPT_ID}] Load Error:`, error);
            new Notice(t("notice_error"));
        }
    }

    async executeUnload(file) {
        if (!this.state.dynamicItemsMap.has(file.basename)) return;
        try {
            // 从全局 Map 移除
            this.state.dynamicItemsMap.delete(file.basename);
            await this.rebuildLibrary();

            new Notice(t("notice_unload_success", { name: file.basename }));
            this.renderListUIOnly(); 
        } catch (error) {
            console.error(`[${SCRIPT_ID}] Unload Error:`, error);
            new Notice(t("notice_error"));
        }
    }

    renderUI() {
        const existingPanel = document.getElementById("ymjr-dynlib-container");
        if (existingPanel) existingPanel.remove();

        const container = document.createElement("div");
        container.id = "ymjr-dynlib-container";
        this.container = container; 
        
        const style = `
            #ymjr-dynlib-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(2px);
                display: flex; justify-content: center; align-items: flex-start;
                padding-top: 10vh; z-index: 9999;
            }
            .ymjr-modal {
                background: var(--background-primary); border: 1px solid var(--background-modifier-border);
                border-radius: 8px; box-shadow: var(--shadow-l); width: 450px; max-height: 80vh;
                display: flex; flex-direction: column; overflow: hidden; font-family: var(--font-interface);
            }
            .ymjr-header {
                padding: 16px; border-bottom: 1px solid var(--background-modifier-border);
                font-size: 1.2em; font-weight: 600; color: var(--text-normal);
            }
            .ymjr-search-box {
                padding: 12px 16px; border-bottom: 1px solid var(--background-modifier-border);
                background: var(--background-primary-alt);
            }
            .ymjr-search-input {
                width: 100%; padding: 8px 12px; border-radius: 6px;
                background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border);
                color: var(--text-normal); font-size: 1em; outline: none; transition: box-shadow 0.2s, border-color 0.2s;
            }
            .ymjr-search-input:focus {
                border-color: var(--interactive-accent); box-shadow: 0 0 0 2px var(--background-modifier-active-hover);
            }
            .ymjr-file-list {
                flex-grow: 1; overflow-y: auto; padding: 8px; max-height: 350px; scroll-behavior: smooth;
            }
            .ymjr-file-item {
                padding: 10px 12px; margin: 2px 0; border-radius: 6px; cursor: pointer;
                transition: background 0.1s; color: var(--text-normal); border: 1px solid transparent;
                display: flex; justify-content: space-between; align-items: center;
            }
            .ymjr-file-item.selected { 
                background: var(--interactive-accent); color: var(--text-on-accent); font-weight: 500;
            }
            .ymjr-tag-loaded {
                font-size: 0.8em; padding: 2px 6px; border-radius: 4px;
                background: rgba(40, 200, 100, 0.2); color: #28c864; font-weight: bold;
            }
            .ymjr-file-item.selected .ymjr-tag-loaded { background: rgba(255, 255, 255, 0.2); color: white; }
            .ymjr-footer {
                padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
                border-top: 1px solid var(--background-modifier-border); background: var(--background-primary);
            }
            .ymjr-footer-right { display: flex; gap: 8px; }
            .ymjr-btn {
                padding: 6px 14px; border-radius: 4px; cursor: pointer; border: none; font-weight: 500;
            }
            .ymjr-btn-cancel { background: transparent; color: var(--text-muted); border: 1px solid var(--background-modifier-border); }
            .ymjr-btn-cancel:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
            .ymjr-btn-danger { background: rgba(220, 50, 50, 0.1); color: #e63c3c; border: 1px solid rgba(220, 50, 50, 0.3); }
            .ymjr-btn-danger:hover { background: rgba(220, 50, 50, 0.2); }
            .ymjr-btn-confirm { background: var(--interactive-accent); color: var(--text-on-accent); }
            .ymjr-btn-confirm:hover { background: var(--interactive-accent-hover); }
            .ymjr-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        `;

        container.innerHTML = `
            <style>${style}</style>
            <div class="ymjr-modal">
                <div class="ymjr-header">${t("modal_title")}</div>
                <div class="ymjr-search-box">
                    <input type="text" class="ymjr-search-input" placeholder="${t("placeholder_search")}" />
                </div>
                <div class="ymjr-file-list"></div>
                <div class="ymjr-footer">
                    <button class="ymjr-btn ymjr-btn-cancel">${t("btn_cancel")}</button>
                    <div class="ymjr-footer-right">
                        <button class="ymjr-btn ymjr-btn-danger" disabled>${t("btn_unload")}</button>
                        <button class="ymjr-btn ymjr-btn-confirm" disabled>${t("btn_load")}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        this.searchInput = container.querySelector('.ymjr-search-input');
        this.listContainer = container.querySelector('.ymjr-file-list');
        this.loadBtn = container.querySelector('.ymjr-btn-confirm');
        this.unloadBtn = container.querySelector('.ymjr-btn-danger');
        const cancelBtn = container.querySelector('.ymjr-btn-cancel');

        this.filteredFiles = [...this.files];
        this.selectedIndex = 0;

        this.renderListUIOnly();

        const closeUI = () => container.remove();
        
        // 智能 Toggle
        const doToggle = async () => {
            if (this.filteredFiles.length === 0 || this.selectedIndex < 0) return;
            const selectedFile = this.filteredFiles[this.selectedIndex];
            if (this.state.dynamicItemsMap.has(selectedFile.basename)) {
                await this.executeUnload(selectedFile);
            } else {
                await this.executeLoad(selectedFile);
            }
        };

        const doUnload = async () => {
            if (this.filteredFiles.length === 0 || this.selectedIndex < 0) return;
            await this.executeUnload(this.filteredFiles[this.selectedIndex]);
        };

        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            this.filteredFiles = this.files.filter(f => fuzzyMatch(f.name, query));
            this.selectedIndex = this.filteredFiles.length > 0 ? 0 : -1; 
            this.renderListUIOnly();
        });

        container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault(); closeUI();
            } else if (e.key === 'Enter') {
                e.preventDefault(); doToggle();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if(!this.unloadBtn.disabled) { e.preventDefault(); doUnload(); }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.selectedIndex < this.filteredFiles.length - 1) {
                    this.selectedIndex++; this.renderListUIOnly();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.selectedIndex > 0) {
                    this.selectedIndex--; this.renderListUIOnly();
                }
            }
        });

        cancelBtn.addEventListener('click', closeUI);
        this.loadBtn.addEventListener('click', doToggle);
        this.unloadBtn.addEventListener('click', doUnload);
        container.addEventListener('click', (e) => { if (e.target === container) closeUI(); });

        setTimeout(() => this.searchInput.focus(), 50); 
    }

    renderListUIOnly() {
        if (!this.listContainer) return;

        if (this.filteredFiles.length === 0) {
            this.listContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">${t("empty_list")}</div>`;
            this.loadBtn.disabled = true; this.unloadBtn.disabled = true;
            return;
        }

        this.listContainer.innerHTML = this.filteredFiles.map((f, i) => {
            const isSelected = i === this.selectedIndex;
            const isLoaded = this.state.dynamicItemsMap.has(f.basename);
            const tagHtml = isLoaded ? `<span class="ymjr-tag-loaded">${t("tag_loaded")}</span>` : '';
            return `<div class="ymjr-file-item ${isSelected ? 'selected' : ''}" data-index="${i}">
                <span>📄 ${f.name}</span>${tagHtml}
            </div>`;
        }).join('');
        
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredFiles.length) {
            const currentFile = this.filteredFiles[this.selectedIndex];
            const isLoaded = this.state.dynamicItemsMap.has(currentFile.basename);
            this.unloadBtn.disabled = !isLoaded;
            this.loadBtn.disabled = isLoaded; // 已经加载的项目禁用“加载”按钮，只能点“卸载”
        }

        const activeEl = this.listContainer.querySelector('.selected');
        if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });

        this.listContainer.querySelectorAll('.ymjr-file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectedIndex = parseInt(e.currentTarget.dataset.index);
                this.renderListUIOnly(); 
            });
            item.addEventListener('dblclick', async () => {
                const selectedFile = this.filteredFiles[this.selectedIndex];
                if (this.state.dynamicItemsMap.has(selectedFile.basename)) {
                    await this.executeUnload(selectedFile);
                } else {
                    await this.executeLoad(selectedFile);
                }
            });
        });
    }
}

// 3. 启动应用
(async () => {
    const currentApi = ea.getExcalidrawAPI();
    const manager = new DynamicLibraryManager(ea, currentApi, app);
    await manager.init();
})();