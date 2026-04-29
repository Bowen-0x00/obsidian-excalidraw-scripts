---
name: 发送图片到 Eagle
description: 后台引擎：在 Obsidian 的图片右键菜单中注入 "Send image to Eagle" 选项。
author: ymjr
version: 1.0.0
license: MIT
usage: 后台常驻。自动在 Obsidian 的文件树和阅读模式图片右键菜单中增加快捷发送选项，支持读取 Markdown Frontmatter 标签并一键发送图片到本地 Eagle 客户端。
features:
  - 拦截 Obsidian `file-menu` 和全局 `contextmenu`
  - 通过 Eagle API 进行离线图片推送
dependencies:
  - 独立运行，需确保本地 Eagle 软件开启
autorun: true
---
/*
```javascript
*/
var locales = {
  zh: {
    menu_send: "发送图片到 Eagle",
    notice_success: "✅ 图片已成功发送至 Eagle!",
    notice_error: "⚠️ Eagle 返回错误: {msg}",
    notice_connection_failed: "❌ 无法连接到 Eagle，请检查软件是否打开！",
    notice_parse_failed: "❌ 解析图片路径失败",
    log_unmounted: "[{id}] 🔌 已卸载",
    log_mounted: "[{id}] 🚀 挂载完毕"
  },
  en: {
    menu_send: "Send image to Eagle",
    notice_success: "✅ Image sent to Eagle successfully!",
    notice_error: "⚠️ Eagle returned error: {msg}",
    notice_connection_failed: "❌ Failed to connect to Eagle, please check if the app is open!",
    notice_parse_failed: "❌ Failed to parse image path",
    log_unmounted: "[{id}] 🔌 Unmounted",
    log_mounted: "[{id}] 🚀 Mounted successfully"
  }
};

const SCRIPT_ID = "ymjr.feature.send-to-eagle";

async function getEagleConfig() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["add image to eagle"] ?? {};
    if (!settings["eagle url"]) {
        settings = {
            "eagle url": { value: "http://localhost:41595", description: "Eagle API URL" },
            "eagle token" : { value: "bcb88edd-23c6-434a-beb1-b7d891cf3613", description: "Eagle API Token" }
        };
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["add image to eagle"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
    return {
        URL: settings["eagle url"].value,
        TOKEN: settings["eagle token"].value
    };
}

async function sendPathToEagle(path, name) {
    const config = await getEagleConfig();
    let leaf = app.workspace.activeLeaf;
    let tags = ["Obsidian"];

    if (leaf?.view?.file) {
        app.fileManager.processFrontMatter(leaf.view.file, fm => {
            function addTags(t) {
                if (Array.isArray(t)) tags = tags.concat(t);
                else if (typeof t === "string") tags.push(t);
            }
            if (fm?.tags) addTags(fm.tags);
            if (fm?.fields?.Tags) addTags(fm.fields.Tags);
        });
    }

    try {
        let data = {
            "path": path,
            "name": name || "Obsidian Export",
            "website": '',
            "tags": tags,
            "token": config.TOKEN,
        };
        
        const response = await fetch(`${config.URL}/api/item/addFromPath`, {
            method: 'POST',
            body: JSON.stringify(data),
            redirect: 'follow'
        });
        const result = await response.json();
        
        if (result.status === "success") {
            new Notice(t("notice_success"), 2000);
        } else {
            new Notice(t("notice_error", { msg: result.message }), 4000);
        }
    } catch (e) {
        console.error("Eagle API Error:", e);
        new Notice(t("notice_connection_failed"));
    }
}

function showStandaloneMenu(event, target) {
    const menu = new ea.obsidian.Menu();
    menu.addItem((item) => item
        .setIcon("image-file")
        .setTitle(t("menu_send"))
        .onClick(async () => {
            try {
                let imgUrl = new URL(target.src);
                let path = decodeURIComponent(imgUrl.pathname);
                if (path.match(/^\/[A-Za-z]:/)) path = path.substring(1); // Windows 路径修复
                await sendPathToEagle(path, target.alt);
            } catch (e) {
                new Notice(t("notice_parse_failed"));
            }
        })
    );

    const escapeHandler = (e) => {
        if (e.key === "Escape") {
            e.preventDefault(); e.stopPropagation();
            menu.hide();
            document.removeEventListener("keydown", escapeHandler); 
        }
    };
    document.addEventListener("keydown", escapeHandler);
    menu.showAtPosition({ x: event.pageX, y: event.pageY });
}

const fileMenuHandler = (menu, file) => {
    if (file && file.extension && /^(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(file.extension)) {
        menu.addItem((item) => {
            item.setSection('action-primary')
                .setIcon("image-file")
                .setTitle(t("menu_send"))
                .onClick(async () => {
                    const basePath = app.vault.adapter.getBasePath();
                    const absolutePath = `${basePath}/${file.path}`.replace(/\//g, require('path').sep);
                    await sendPathToEagle(absolutePath, file.basename);
                });
        });
    }
};

const contextMenuHandler = (event) => {
    if (event.target && event.target.tagName && event.target.tagName.toLowerCase() === "img") {
        const isReadingMode = !!event.target.closest('.markdown-reading-view');
        if (isReadingMode || event.target.src.startsWith('http')) {
            event.preventDefault();
            event.stopPropagation();
            showStandaloneMenu(event, event.target);
        }
    }
};

function mountFeature() {

    if (ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]) {
        ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`]();
    }

    const fileMenuRef = app.workspace.on("file-menu", fileMenuHandler);
    document.addEventListener("contextmenu", contextMenuHandler, { capture: true });

    ExcalidrawAutomate.plugin[`disable_${SCRIPT_ID}`] = () => {
        app.workspace.offref(fileMenuRef);
        document.removeEventListener("contextmenu", contextMenuHandler, { capture: true });
        console.log(t("log_unmounted", { id: SCRIPT_ID }));
    };

    console.log(t("log_mounted", { id: SCRIPT_ID }));
}

mountFeature();
