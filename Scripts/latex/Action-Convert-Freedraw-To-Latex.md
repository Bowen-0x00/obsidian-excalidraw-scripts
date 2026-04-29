---
name: 手写转公式
description: 将选中的手写笔迹通过 SimpleTeX 转换为 LaTeX 公式，带有美观的交互界面。
author: ymjr
version: 1.0.0
license: MIT
usage: 选中画板中的手写笔迹，运行此脚本即可进行转换并在悬浮面板中确认。
features:
  - 现代化美观的 HTML 悬浮面板 UI/UX
  - 支持公式的二次编辑与校验
  - 桌面端使用 Node 原生 https 保障绝对稳定，自动处理乱码或换行符问题
  - 优雅处理上下文引用，防止焦点切换导致画布报错
dependencies: []
autorun: false
---
/*
```javascript
*/
var locales = {
  zh: {
    notice_select: "请先选中需要转换的手写笔迹！",
    notice_token: "请先在脚本设置中配置 SimpleTeX Token",
    ui_title: "✨ 手写转 LaTeX",
    ui_uploading: "正在上传并识别笔迹...",
    ui_success: "识别成功！请确认或编辑公式：",
    ui_failed: "识别失败：",
    btn_cancel: "取消",
    btn_confirm: "插入图纸",
    settings_token: "SimpleTeX Token 密钥 (来自 simpletex.cn/user/center)"
  },
  en: {
    notice_select: "Please select freedraw elements first!",
    notice_token: "Please configure SimpleTeX token in script settings",
    ui_title: "✨ Freedraw to LaTeX",
    ui_uploading: "Uploading and recognizing...",
    ui_success: "Success! Confirm or edit:",
    ui_failed: "Recognition failed: ",
    btn_cancel: "Cancel",
    btn_confirm: "Insert",
    settings_token: "SimpleTeX Token from simpletex.cn/user/center"
  }
};

const PLUGIN_NAMESPACE = "_ymjr_simpletex_ui";

// 1. 初始化设置
async function ensureSettings(ea) {
  let settings = ea.getScriptSettings();
  if (!settings["simpletext token"]) {
    settings = {
      "simpletext token": {
        value: "",
        description: t("settings_token"),
      },
      ...settings
    };
    ea.setScriptSettings(settings);
  }
  return settings["simpletext token"].value;
}

// 2. 网络请求封装 (主推原生 HTTPS 以保证桌面端绝对稳定性)
async function uploadBlobToSimpleTeX(blob, token) {
  // 极度重要：清理 Token 前后可能误复制的换行符/空格，这是导致 Invalid URL 的元凶之一
  const safeToken = (token || "").trim();
  const arrayBuffer = await blob.arrayBuffer();
  const boundary = "----WebKitFormBoundary_" + Math.random().toString(16).slice(2);

  // 桌面端环境判断，使用原生 Node.js 处理 (绕过 Obsidian 的 IPC requestUrl 限制)
  if (typeof require !== "undefined") {
    const https = require("https");
    // 使用 global 的 Buffer 防止部分环境报错
    const fileBuffer = Buffer.from(arrayBuffer); 
    const headerPart = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="screenshot.png"\r\n` +
      `Content-Type: image/png\r\n\r\n`
    );
    const footerPart = Buffer.from(`\r\n--${boundary}--\r\n`);
    const postData = Buffer.concat([headerPart, fileBuffer, footerPart]);

    const options = {
      hostname: "server.simpletex.cn",
      path: "/api/latex_ocr/v2",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": postData.length,
        "token": safeToken
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf-8");
            const json = JSON.parse(body);
            if (json.res && json.res.latex) {
              resolve(json.res.latex.trim());
            } else {
              reject(new Error(json.msg || "识别失败，未找到 LaTeX 字段"));
            }
          } catch (err) {
            reject(new Error("返回数据解析失败"));
          }
        });
      });
      req.on("error", (err) => reject(err));
      req.write(postData);
      req.end();
    });
  } 
  
  // 兜底方案：如果未来在移动端运行，则回退为原生 fetch (这里做了最简单的占位，当前主要聚焦你报错的 PC 环境)
  throw new Error("当前网络模块仅支持桌面端 Obsidian (Node.js)。");
}

// 3. 现代化 UI 管理器
class SimpleTexUI {
  constructor(view) {
    this.container = view.containerEl;
    this.cleanup(); // 挂载前先清理旧实例
    this.el = document.createElement("div");
    this.el.id = "ymjr-simpletex-modal";
    
    // 主容器样式
    this.el.style.cssText = `
      position: absolute; top: 20px; right: 20px; width: 320px;
      background: var(--background-primary); border: 1px solid var(--background-modifier-border);
      border-radius: 12px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 1000; display: flex; flex-direction: column; gap: 12px;
      font-family: var(--font-interface); color: var(--text-normal);
      backdrop-filter: blur(8px); transition: all 0.2s ease;
    `;
    
    // 动画及按钮样式注入
    if (!document.getElementById("ymjr-simpletex-css")) {
      const style = document.createElement("style");
      style.id = "ymjr-simpletex-css";
      style.innerHTML = `
        @keyframes ymjr-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .ymjr-btn {
          flex: 1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
          border: 1px solid var(--background-modifier-border); background: var(--background-secondary);
          color: var(--text-normal); transition: all 0.15s ease;
        }
        .ymjr-btn:hover { background: var(--background-modifier-hover); }
        .ymjr-btn.primary { background: var(--interactive-accent); color: var(--text-on-accent); border: none; }
        .ymjr-btn.primary:hover { background: var(--interactive-accent-hover); }
      `;
      document.head.appendChild(style);
    }
    
    this.container.appendChild(this.el);
    ExcalidrawAutomate.plugin[PLUGIN_NAMESPACE] = this;
  }

  renderLoading() {
    this.el.innerHTML = `
      <div style="font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        ${t("ui_title")}
      </div>
      <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted); margin-top: 8px;">
        <div style="width: 14px; height: 14px; border: 2px solid var(--text-muted); border-top-color: transparent; border-radius: 50%; animation: ymjr-spin 0.8s linear infinite;"></div>
        ${t("ui_uploading")}
      </div>
    `;
  }

  renderResult(latexStr, onConfirm, onCancel) {
    this.el.innerHTML = `
      <div style="font-weight: 600; font-size: 14px; color: var(--text-success);">
        ${t("ui_success")}
      </div>
      <textarea id="ymjr-latex-input" style="
        width: 100%; height: 80px; padding: 8px; border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-modifier-form-field);
        color: var(--text-normal); font-family: monospace; font-size: 12px;
        resize: vertical; outline: none;
      ">${latexStr}</textarea>
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button class="ymjr-btn" id="ymjr-btn-cancel">${t("btn_cancel")}</button>
        <button class="ymjr-btn primary" id="ymjr-btn-confirm">${t("btn_confirm")}</button>
      </div>
    `;

    this.el.querySelector("#ymjr-btn-cancel").onclick = () => {
      this.cleanup();
      if(onCancel) onCancel();
    };

    this.el.querySelector("#ymjr-btn-confirm").onclick = () => {
      const finalLatex = this.el.querySelector("#ymjr-latex-input").value;
      this.cleanup();
      if(onConfirm) onConfirm(finalLatex);
    };
  }

  renderError(errMsg) {
    this.el.innerHTML = `
      <div style="font-weight: 600; font-size: 14px; color: var(--text-error);">
        ❌ ${t("ui_failed")}
      </div>
      <div style="font-size: 12px; color: var(--text-muted); word-break: break-all;">
        ${errMsg}
      </div>
      <div style="display: flex; margin-top: 8px;">
        <button class="ymjr-btn" id="ymjr-btn-close">${t("btn_cancel")}</button>
      </div>
    `;
    this.el.querySelector("#ymjr-btn-close").onclick = () => this.cleanup();
  }

  cleanup() {
    if (ExcalidrawAutomate.plugin[PLUGIN_NAMESPACE]) {
      const oldEl = ExcalidrawAutomate.plugin[PLUGIN_NAMESPACE].el;
      if (oldEl && oldEl.parentElement) {
        oldEl.parentElement.removeChild(oldEl);
      }
      delete ExcalidrawAutomate.plugin[PLUGIN_NAMESPACE];
    }
  }
}

// 4. 主执行流
async function main() {
  const currentEA = ea;
  const currentView = ea.targetView;
  const elements = currentEA.getViewSelectedElements();

  if (elements.length === 0) {
    new Notice(t("notice_select"));
    return;
  }

  const token = await ensureSettings(currentEA);
  if (!token) {
    new Notice(t("notice_token"));
    return;
  }

  // 提前计算包围盒，避免异步等待导致丢失原位置
  const originalBox = currentEA.getBoundingBox(elements);
  const ui = new SimpleTexUI(currentView);

  try {
    ui.renderLoading();
    
    // 生成原图
    const imgBlob = await currentView.png(currentView.getScene(true), undefined);
    
    // 发起网络请求
    const latexResult = await uploadBlobToSimpleTeX(imgBlob, token);
    
    // 渲染成功确认窗口
    ui.renderResult(latexResult, async (finalLatex) => {
      try {
        currentEA.clear();
        currentEA.deleteViewElements(elements);
        
        const id = await currentEA.addLaTex(originalBox.topX, originalBox.topY, finalLatex);
        const el = currentEA.getElement(id);
        
        // 维持原手写笔迹的等比缩放
        const ratio = el.width / el.height;
        el.width = originalBox.height * ratio;
        el.height = originalBox.height;
        
        await currentEA.addElementsToView(false, false, false);
      } catch (err) {
        console.error("[SimpleTeX] 插入出错:", err);
        new Notice("插入公式失败，请检查控制台。");
      }
    });

  } catch (error) {
    console.error("[SimpleTeX] Execute Error:", error);
    ui.renderError(error.message || String(error));
  }
}

main();