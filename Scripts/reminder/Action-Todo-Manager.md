---
name: Todo与提醒事项管理器
description: 提供友好的可视化面板，将选中的文本转化为待办提醒，并一键同步至 Eve TodoList。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的文本元素，运行此脚本将唤起 Todo 管理面板进行时间分配与云端同步。
features:
  - 美观的 HTML 悬浮 UI 面板，替代原生 Modal
  - 动态获取上下文，完美适配多栏分屏与 Excalidraw / MD 混合工作流
  - 自动管理与解析 `- [ ] task (@date)` 格式
dependencies:
  - 依赖网络请求 (需允许跨域访问 Eve Studio API)
autorun: false
---
/*
```javascript
*/
var locales = {
    zh: {
        ui_title: "📝 Todo 管理器",
        settings_userId: "Eve Todo User ID",
        settings_token: "Eve Todo Token",
        notice_no_text: "请至少选择一个文本元素！",
        notice_sync_success: "🎉 成功同步到 TodoList！",
        notice_sync_fail: "❌ 同步失败，请检查网络或配置。",
        notice_saved: "✅ 提醒时间已更新至画布",
        btn_set_time: "更新时间",
        btn_sync: "同步至云端",
        btn_close: "关闭",
        label_no_date: "未设置时间",
        ph_select_date: "选择时间..."
    },
    en: {
        ui_title: "📝 Todo Manager",
        settings_userId: "Eve Todo User ID",
        settings_token: "Eve Todo Token",
        notice_no_text: "Please select at least one text element!",
        notice_sync_success: "🎉 Synced to TodoList successfully!",
        notice_sync_fail: "❌ Sync failed. Check network or settings.",
        notice_saved: "✅ Reminder updated on canvas",
        btn_set_time: "Update Time",
        btn_sync: "Sync to Cloud",
        btn_close: "Close",
        label_no_date: "No date set",
        ph_select_date: "Select date..."
    }
};

// ==========================================
// 1. 状态与配置管理
// ==========================================
const SCRIPT_NAMESPACE = "_ymjr_todoManager";
const UI_CONTAINER_ID = "ymjr-todo-ui-container";

async function ensureSettings() {
    let settings = ExcalidrawAutomate.plugin.settings.scriptEngineSettings["eve todo"] ?? {};
    let isDirty = false;
    if(!settings["userId"]) {
        settings["userId"] = { value: "", description: t("settings_userId") };
        isDirty = true;
    }
    if(!settings["token"]) {
        settings["token"] = { value: "", description: t("settings_token") };
        isDirty = true;
    }
    if(isDirty) {
        ExcalidrawAutomate.plugin.settings.scriptEngineSettings["eve todo"] = settings;
        await ExcalidrawAutomate.plugin.saveSettings();
    }
    return {
        userId: settings["userId"].value,
        token: settings["token"].value
    };
}

// 动态获取当前活动画布的 ea 和 api，防止由于 view 切换导致的上下文过期
function getActiveContext() {
    const view = app.workspace.getActiveFileView();
    if (view && view.getViewType() === "excalidraw") {
        const activeEa = window.ExcalidrawAutomate.getAPI(view);
        const activeApi = activeEa.getExcalidrawAPI();
        return { activeEa, activeApi, view };
    }
    return null;
}

// ==========================================
// 2. 核心业务逻辑 (Todo 解析与同步)
// ==========================================
const taskRegex = /^- \[ \] (.*?) \(@(.+)\)/;

function parseElementToTask(el) {
    const match = el.rawText.match(taskRegex);
    if (match) {
        return { isTask: true, content: match[1], dateStr: match[2], el };
    }
    // 自动清洗现有文本，提取纯文本部分
    let cleanText = el.rawText.replace(/^- \[ \]\s*/, '').trim();
    return { isTask: false, content: cleanText, dateStr: null, el };
}

function formatHtmlDateToTaskDate(htmlDate) {
    if (!htmlDate) return null;
    const d = new Date(htmlDate);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    const hours = ('0' + d.getHours()).slice(-2);
    const minutes = ('0' + d.getMinutes()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function pushToEveAPI(tasksData, config) {
    let tasks = tasksData.map(item => {
        const createTime = Date.now();
        const todoTime = new Date(item.dateStr).getTime();
        return {
            "complete": false, "createTime": createTime, "delete": false,
            "reminderTime": todoTime, "snowAdd": 0, "snowAssess": 2,
            "standbyStr1": null, "standbyStr2": null, "standbyStr3": null,
            "standbyInt1": 407634, "updateTime": createTime, "syncTime": 0,
            "taskContent": item.content, "taskDescribe": null,
            "taskId": `tid_${config.userId}Zc0UsN_${createTime}_${Math.floor(Math.random()*1000)}`,
            "taskSort": 5000, "todoTime": todoTime, "userId": config.userId,
            "status": "add", "version": 0
        };
    });

    const data = `tasksJson=${encodeURIComponent(JSON.stringify(tasks))}`;
    const url = `https://www.evestudio.cn/todoList/syncPushData?tdChannelCode=PC&packageName=com.eve.todolist&appName=Todo%E6%B8%85%E5%8D%95&token=${config.token}&userId=${config.userId}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: data,
            mode: 'no-cors',
            headers: {
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            }
        });
        return true;
    } catch (e) {
        console.error("Eve Todo Sync Error: ", e);
        return false;
    }
}

// ==========================================
// 3. UI 渲染与交互逻辑
// ==========================================
function destroyUI() {
    const existing = document.getElementById(UI_CONTAINER_ID);
    if (existing) existing.remove();
    if (ExcalidrawAutomate.plugin[SCRIPT_NAMESPACE]) {
        delete ExcalidrawAutomate.plugin[SCRIPT_NAMESPACE];
    }
}

function buildUI(elementsData, config) {
    destroyUI(); // 确保单例

    const container = document.createElement("div");
    container.id = UI_CONTAINER_ID;
    
    // 注入友好的现代 CSS
    const style = document.createElement("style");
    style.innerHTML = `
        #${UI_CONTAINER_ID} {
            position: fixed; top: 20px; right: 20px; width: 340px;
            background: rgba(30, 30, 30, 0.85);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px; padding: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            color: #ececec; font-family: sans-serif; z-index: 99999;
            display: flex; flex-direction: column; gap: 12px;
        }
        .ymjr-todo-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;}
        .ymjr-todo-close { cursor: pointer; color: #aaa; transition: color 0.2s; }
        .ymjr-todo-close:hover { color: #fff; }
        .ymjr-todo-list { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .ymjr-todo-item { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
        .ymjr-todo-content { font-size: 13px; margin-bottom: 8px; word-break: break-all; opacity: 0.9; }
        .ymjr-todo-controls { display: flex; gap: 8px; align-items: center; }
        .ymjr-todo-input { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px; border-radius: 4px; color-scheme: dark; font-size: 12px; }
        .ymjr-todo-btn { cursor: pointer; background: #4a5ee9; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; transition: background 0.2s; }
        .ymjr-todo-btn:hover { background: #5b6fff; }
        .ymjr-todo-btn.sync { background: #00c853; width: 100%; margin-top: 8px; padding: 10px;}
        .ymjr-todo-btn.sync:hover { background: #00e676; }
    `;
    container.appendChild(style);

    // Header
    const header = document.createElement("div");
    header.className = "ymjr-todo-header";
    header.innerHTML = `<span>${t("ui_title")}</span><span class="ymjr-todo-close">✖</span>`;
    header.querySelector(".ymjr-todo-close").onclick = destroyUI;
    container.appendChild(header);

    // List
    const list = document.createElement("div");
    list.className = "ymjr-todo-list";
    
    elementsData.forEach((data, index) => {
        const item = document.createElement("div");
        item.className = "ymjr-todo-item";
        
        // 解析默认时间用于 input
        let defaultIso = "";
        if (data.dateStr) {
            const parsed = new Date(data.dateStr);
            if (!isNaN(parsed)) {
                defaultIso = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            }
        }

        item.innerHTML = `
            <div class="ymjr-todo-content">📋 ${data.content}</div>
            <div class="ymjr-todo-controls">
                <input type="datetime-local" class="ymjr-todo-input" id="todo-date-${index}" value="${defaultIso}">
                <button class="ymjr-todo-btn apply-btn" data-idx="${index}">${t("btn_set_time")}</button>
            </div>
        `;
        list.appendChild(item);
    });
    container.appendChild(list);

    // Sync Button
    const syncBtn = document.createElement("button");
    syncBtn.className = "ymjr-todo-btn sync";
    syncBtn.innerText = t("btn_sync");
    container.appendChild(syncBtn);

    // 挂载到 DOM
    document.body.appendChild(container);
    ExcalidrawAutomate.plugin[SCRIPT_NAMESPACE] = { ui: container };

    // ==========================================
    // 4. 事件绑定 (内部动态获取 Context)
    // ==========================================
    
    // 更新画布元素时间
    list.querySelectorAll(".apply-btn").forEach(btn => {
        btn.onclick = async (e) => {
            const ctx = getActiveContext();
            if (!ctx) return new Notice("未找到活跃的 Excalidraw 画布");
            
            const idx = e.target.getAttribute("data-idx");
            const inputVal = document.getElementById(`todo-date-${idx}`).value;
            const targetData = elementsData[idx];
            
            if (!inputVal) return;
            const formattedDate = formatHtmlDateToTaskDate(inputVal);
            const newText = `- [ ] ${targetData.content} (@${formattedDate})`;
            
            // 更新元素属性
            targetData.el.rawText = newText;
            targetData.el.text = newText;
            targetData.el.originalText = newText;
            targetData.dateStr = formattedDate; // 更新缓存
            targetData.isTask = true;

            // 调用当前的 ea 将更新推送到画布
            ctx.activeEa.copyViewElementsToEAforEditing([targetData.el]);
            await ctx.activeEa.addElementsToView();
            new Notice(t("notice_saved"));
        };
    });

    // 同步到 Eve API
    syncBtn.onclick = async () => {
        const validTasks = elementsData.filter(d => d.isTask && d.dateStr);
        if (validTasks.length === 0) {
            new Notice("没有可同步的完整提醒项 (需先设置时间)");
            return;
        }
        
        syncBtn.innerText = "Syncing...";
        syncBtn.style.opacity = "0.7";
        
        const success = await pushToEveAPI(validTasks, config);
        
        syncBtn.innerText = t("btn_sync");
        syncBtn.style.opacity = "1";
        
        if (success) {
            new Notice(t("notice_sync_success"));
            destroyUI(); // 同步成功后关闭面板
        } else {
            new Notice(t("notice_sync_fail"));
        }
    };
}

// ==========================================
// 5. 启动入口
// ==========================================
async function main() {
    const api = ea.getExcalidrawAPI();
    const selectedEls = ea.getViewSelectedElements().filter(el => el.type === "text");

    if (!selectedEls || selectedEls.length === 0) {
        new Notice(t("notice_no_text"));
        return;
    }

    const config = await ensureSettings();
    const elementsData = selectedEls.map(parseElementToTask);
    
    buildUI(elementsData, config);
}

main();