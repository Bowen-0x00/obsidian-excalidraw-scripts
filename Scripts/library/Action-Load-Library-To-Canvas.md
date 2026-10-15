---
name: 加载素材库到画布
description: 将 .excalidrawlib 素材库中的所有 item 以网格状平铺加载到画布，并在各组件上方自动标注名称与描述。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本呼出素材库加载面板，选择或输入 .excalidrawlib 文件路径，配置网格列数与间距后，一键将库中所有组件呈网格状平铺排布到画布，并在组件上方添加文字标注。
features:
  - 完整解析 .excalidrawlib 素材库中的 libraryItems 列表（兼容 v1 与 v2 格式）
  - 智能计算各素材组件的几何外接包围盒 (Bounding Box)
  - 网格流式布局：x + width + margin 沿水平方向依次展示下一个 item，支持自适应换行
  - 提取 item 的 name 与 description，在组件上方自动排版并添加标题与描述文本
  - 自动克隆图元并重置所有 ID、内部 Group 及绑定引用，并为每个 item 创建组合群组
  - 提供美观的图形交互面板，支持模糊搜索素材库、自定义列数、行列间距与排布模式
dependencies:
  - 无前置依赖
autorun: false
---
/*
```javascript
*/

const SCRIPT_ID = "ymjr.action.load-library-to-canvas";

var locales = {
  zh: {
    modal_title: "📚 加载素材库到画布",
    search_placeholder: "输入名称搜索素材库 (.excalidrawlib)...",
    custom_path_label: "或输入文件路径:",
    custom_path_placeholder: "例如: Excalidraw/Libraries/digital-circuit-components.excalidrawlib",
    cfg_columns: "每行列数",
    cfg_gap_x: "水平间距 (Gap X)",
    cfg_gap_y: "垂直间距 (Gap Y)",
    cfg_layout_mode: "排布方式",
    mode_aligned: "整齐网格 (对齐列宽)",
    mode_flow: "紧凑流式 (紧接宽度)",
    cfg_show_text: "在组件上方添加名称与描述 (Name & Description)",
    btn_cancel: "取消 (Esc)",
    btn_confirm: "加载到画布 (Enter)",
    item_count_tip: "共发现 {count} 个素材组件",
    preview_sample: "组件预览: {sample}",
    empty_list: "未在 Vault 中找到匹配的素材库文件",
    notice_no_view: "⚠️ 请先打开一个 Excalidraw 画布",
    notice_no_file: "❌ 请选择或输入有效的素材库文件路径",
    notice_empty_lib: "⚠️ 素材库中未发现有效组件",
    notice_loading: "⏳ 正在解析并排版素材库...",
    notice_success: "🎉 成功将 {count} 个素材组件平铺加载到画布！",
    notice_error: "❌ 加载失败，请检查文件格式或控制台日志"
  },
  en: {
    modal_title: "📚 Load Library to Canvas",
    search_placeholder: "Type to search libraries (.excalidrawlib)...",
    custom_path_label: "Or enter file path:",
    custom_path_placeholder: "e.g. Excalidraw/Libraries/digital-circuit-components.excalidrawlib",
    cfg_columns: "Columns per row",
    cfg_gap_x: "Horizontal Gap",
    cfg_gap_y: "Vertical Gap",
    cfg_layout_mode: "Layout Mode",
    mode_aligned: "Aligned Grid (Align Columns)",
    mode_flow: "Compact Flow (Fit Widths)",
    cfg_show_text: "Add Name & Description above items",
    btn_cancel: "Cancel (Esc)",
    btn_confirm: "Load to Canvas (Enter)",
    item_count_tip: "Found {count} components",
    preview_sample: "Preview: {sample}",
    empty_list: "No matching library files found in vault",
    notice_no_view: "⚠️ Please open an Excalidraw drawing first",
    notice_no_file: "❌ Please select or enter a valid library file path",
    notice_empty_lib: "⚠️ No valid components found in library",
    notice_loading: "⏳ Parsing and laying out library...",
    notice_success: "🎉 Successfully loaded {count} items to canvas!",
    notice_error: "❌ Failed to load. Check file format or console."
  }
};

class LoadLibraryToCanvasManager {
  constructor(ea, api, app) {
    this.ea = ea;
    this.api = api;
    this.app = app;
    this.files = [];
    this.filteredFiles = [];
    this.selectedIndex = 0;
    this.customPath = "";
    this.settings = {
      columns: 4,
      gapX: 60,
      gapY: 80,
      layoutMode: "aligned",
      showText: true
    };
  }

  async init() {
    if (!this.ea.targetView || !this.ea.targetView.excalidrawAPI) {
      new Notice(t("notice_no_view"));
      return;
    }

    this.fetchLibraryFiles();
    this.renderUI();
  }

  fetchLibraryFiles() {
    const allFiles = this.app.vault.getFiles();
    this.files = allFiles.filter(f => 
      f.extension === "excalidrawlib" || 
      (f.extension === "json" && f.name.includes("library"))
    );

    // 优先排布以 digital-circuit-components 开头的库，或按字母顺序排序
    this.files.sort((a, b) => {
      const aIsCircuit = a.basename.includes("digital-circuit");
      const bIsCircuit = b.basename.includes("digital-circuit");
      if (aIsCircuit && !bIsCircuit) return -1;
      if (!aIsCircuit && bIsCircuit) return 1;
      return a.basename.localeCompare(b.basename);
    });

    this.filteredFiles = [...this.files];
    if (this.filteredFiles.length > 0) {
      this.customPath = this.filteredFiles[0].path;
    }
  }

  fuzzyMatch(text, query) {
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

  async readLibraryFile(target) {
    if (!target) return null;
    if (typeof target === "object" && target.path) {
      return await this.app.vault.read(target);
    }
    if (typeof target === "string") {
      target = target.trim();
      // 1. Vault abstract file
      const tfile = this.app.vault.getAbstractFileByPath(target);
      if (tfile) return await this.app.vault.read(tfile);

      // 2. Vault adapter
      if (this.app.vault.adapter) {
        try {
          if (await this.app.vault.adapter.exists(target)) {
            return await this.app.vault.adapter.read(target);
          }
        } catch (e) {}
      }

      // 3. Desktop Node fs
      const req = (typeof window !== "undefined" && window.require) ? window.require : (typeof require === "function" ? require : null);
      if (req) {
        try {
          const fs = req("fs");
          if (fs.existsSync(target)) {
            return fs.readFileSync(target, "utf8");
          }
        } catch (e) {}
      }
    }
    return null;
  }

  parseLibraryData(rawJson) {
    let libData;
    try {
      libData = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
    } catch (e) {
      throw new Error("Invalid JSON format");
    }

    let items = [];
    if (Array.isArray(libData)) {
      items = libData;
    } else if (Array.isArray(libData.libraryItems)) {
      items = libData.libraryItems;
    } else if (Array.isArray(libData.library)) {
      items = libData.library;
    }

    const validItems = [];
    for (const item of items) {
      let elements = [];
      let name = "";
      let description = "";

      if (Array.isArray(item)) {
        elements = item;
      } else if (item && typeof item === "object") {
        elements = item.elements || [];
        name = (typeof item.name === "string" ? item.name : (item.customData?.name || "")).trim();
        description = (typeof item.description === "string" ? item.description : (item.customData?.description || "")).trim();
      }

      const activeElements = elements.filter(el => el && !el.isDeleted);
      if (activeElements.length > 0) {
        validItems.push({
          rawItem: item,
          name: name,
          description: description,
          elements: activeElements
        });
      }
    }
    return validItems;
  }

  calcBoundingBox(elements) {
    if (!elements || elements.length === 0) {
      return { topX: 0, topY: 0, width: 0, height: 0 };
    }
    if (typeof this.ea.getBoundingBox === "function") {
      try {
        const bb = this.ea.getBoundingBox(elements);
        if (bb && isFinite(bb.topX) && isFinite(bb.topY) && bb.width > 0 && bb.height > 0) {
          return bb;
        }
      } catch (e) {}
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      if (Array.isArray(el.points) && el.points.length > 0) {
        for (const pt of el.points) {
          const px = el.x + pt[0];
          const py = el.y + pt[1];
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      } else {
        const ex1 = el.x;
        const ey1 = el.y;
        const ex2 = el.x + (el.width || 0);
        const ey2 = el.y + (el.height || 0);
        if (ex1 < minX) minX = ex1;
        if (ex2 > maxX) maxX = ex2;
        if (ey1 < minY) minY = ey1;
        if (ey2 > maxY) maxY = ey2;
      }
    }
    return {
      topX: minX,
      topY: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    };
  }

  wrapText(str, maxChars = 26) {
    if (!str || str.length <= maxChars) return str;
    const lines = [];
    const paragraphs = str.split("\n");
    for (const para of paragraphs) {
      let current = "";
      for (let i = 0; i < para.length; i++) {
        current += para[i];
        if (current.length >= maxChars) {
          lines.push(current);
          current = "";
        }
      }
      if (current) lines.push(current);
    }
    return lines.join("\n");
  }

  measureItemText(text, fontSize = 16) {
    if (!text) return { width: 0, height: 0 };
    if (typeof this.ea.measureText === "function") {
      try {
        const oldFontSize = this.ea.style.fontSize;
        this.ea.style.fontSize = fontSize;
        const res = this.ea.measureText(text);
        this.ea.style.fontSize = oldFontSize;
        if (res && res.width > 0 && res.height > 0) return res;
      } catch (e) {}
    }
    const lines = text.split("\n");
    let maxLineLen = 0;
    for (const line of lines) {
      let len = 0;
      for (let i = 0; i < line.length; i++) {
        len += line.charCodeAt(i) > 255 ? 1 : 0.6;
      }
      if (len > maxLineLen) maxLineLen = len;
    }
    return {
      width: Math.max(20, maxLineLen * fontSize * 1.05),
      height: Math.max(fontSize, lines.length * fontSize * 1.35)
    };
  }

  cloneItemElements(elements) {
    const genId = () => {
      return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
    };

    const idMap = new Map();
    const groupMap = new Map();

    elements.forEach(el => {
      idMap.set(el.id, genId());
      if (Array.isArray(el.groupIds)) {
        el.groupIds.forEach(gid => {
          if (!groupMap.has(gid)) {
            groupMap.set(gid, genId());
          }
        });
      }
    });

    return elements.map(el => {
      const copy = JSON.parse(JSON.stringify(el));
      copy.id = idMap.get(el.id) || genId();
      copy.seed = Math.floor(Math.random() * 2000000000);
      copy.version = 1;
      copy.versionNonce = Math.floor(Math.random() * 2000000000);
      copy.updated = Date.now();

      if (Array.isArray(copy.groupIds)) {
        copy.groupIds = copy.groupIds.map(gid => groupMap.get(gid) || gid);
      } else {
        copy.groupIds = [];
      }

      if (copy.containerId && idMap.has(copy.containerId)) {
        copy.containerId = idMap.get(copy.containerId);
      }

      if (Array.isArray(copy.boundElements)) {
        copy.boundElements = copy.boundElements.map(b => ({
          ...b,
          id: idMap.get(b.id) || b.id
        }));
      }

      if (copy.startBinding && copy.startBinding.elementId && idMap.has(copy.startBinding.elementId)) {
        copy.startBinding = {
          ...copy.startBinding,
          elementId: idMap.get(copy.startBinding.elementId)
        };
      }

      if (copy.endBinding && copy.endBinding.elementId && idMap.has(copy.endBinding.elementId)) {
        copy.endBinding = {
          ...copy.endBinding,
          elementId: idMap.get(copy.endBinding.elementId)
        };
      }

      if (copy.frameId && idMap.has(copy.frameId)) {
        copy.frameId = idMap.get(copy.frameId);
      }

      return copy;
    });
  }

  async executeLoad(targetFileOrPath) {
    try {
      new Notice(t("notice_loading"));
      const content = await this.readLibraryFile(targetFileOrPath);
      if (!content) {
        new Notice(t("notice_no_file"));
        return false;
      }

      const items = this.parseLibraryData(content);
      if (items.length === 0) {
        new Notice(t("notice_empty_lib"));
        return false;
      }

      const appState = this.ea.targetView.excalidrawAPI?.getAppState();
      const theme = appState?.theme || "light";
      const isDark = theme === "dark";
      const nameColor = isDark ? "#f1f3f5" : "#1e1e1e";
      const descColor = isDark ? "#adb5bd" : "#6c757d";

      // 1. 预处理每个组件的外接盒与文字度量
      const processedItems = items.map((item, idx) => {
        const bb = this.calcBoundingBox(item.elements);
        const hasText = this.settings.showText && (Boolean(item.name) || Boolean(item.description));
        
        let nameDim = { width: 0, height: 0 };
        let descDim = { width: 0, height: 0 };
        let wrappedDesc = "";

        if (hasText) {
          if (item.name) {
            nameDim = this.measureItemText(item.name, 16);
          }
          if (item.description) {
            wrappedDesc = this.wrapText(item.description, 26);
            descDim = this.measureItemText(wrappedDesc, 12);
          }
        }

        const totalTextHeight = (item.name ? nameDim.height : 0) + 
                                (item.description ? descDim.height : 0) + 
                                (item.name && item.description ? 4 : 0);
        const textWidth = Math.max(nameDim.width, descDim.width);
        const labelGap = totalTextHeight > 0 ? 12 : 0;

        const totalWidth = Math.max(bb.width, hasText ? Math.min(textWidth, 320) : 0);
        const totalHeight = bb.height + (hasText ? totalTextHeight + labelGap : 0);

        return {
          idx,
          name: item.name,
          description: item.description,
          wrappedDesc,
          elements: item.elements,
          bb,
          hasText,
          nameDim,
          descDim,
          totalTextHeight,
          textWidth,
          labelGap,
          totalWidth,
          totalHeight
        };
      });

      // 2. 网格坐标布局计算
      const cols = Math.max(1, parseInt(this.settings.columns) || 4);
      const gapX = Math.max(0, parseFloat(this.settings.gapX) || 60);
      const gapY = Math.max(0, parseFloat(this.settings.gapY) || 80);
      const isAligned = this.settings.layoutMode === "aligned";

      const rows = Math.ceil(processedItems.length / cols);
      const layoutPositions = [];

      if (isAligned) {
        // 整齐列对齐网格：每列宽度为该列最大宽度，每行高度为该行最大高度
        const colWidths = new Array(cols).fill(0);
        const rowHeights = new Array(rows).fill(0);

        for (let idx = 0; idx < processedItems.length; idx++) {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          colWidths[c] = Math.max(colWidths[c], processedItems[idx].totalWidth);
          rowHeights[r] = Math.max(rowHeights[r], processedItems[idx].totalHeight);
        }

        const colX = new Array(cols).fill(0);
        for (let c = 1; c < cols; c++) {
          colX[c] = colX[c - 1] + colWidths[c - 1] + gapX;
        }

        const rowY = new Array(rows).fill(0);
        for (let r = 1; r < rows; r++) {
          rowY[r] = rowY[r - 1] + rowHeights[r - 1] + gapY;
        }

        for (let idx = 0; idx < processedItems.length; idx++) {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          layoutPositions.push({
            cellX: colX[c],
            cellY: rowY[r],
            cellW: colWidths[c],
            cellH: rowHeights[r]
          });
        }
      } else {
        // 紧凑流式网格：x + width + margin 沿 X 轴紧接排列，换行时对齐行高
        let curX = 0;
        let curY = 0;
        let rowMaxH = 0;

        for (let idx = 0; idx < processedItems.length; idx++) {
          if (idx > 0 && idx % cols === 0) {
            curY += rowMaxH + gapY;
            curX = 0;
            rowMaxH = 0;
          }
          const item = processedItems[idx];
          layoutPositions.push({
            cellX: curX,
            cellY: curY,
            cellW: item.totalWidth,
            cellH: item.totalHeight
          });
          curX += item.totalWidth + gapX;
          rowMaxH = Math.max(rowMaxH, item.totalHeight);
        }
      }

      // 3. 构建并注入画布元素
      this.ea.clear();
      const genGroupId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);

      for (let idx = 0; idx < processedItems.length; idx++) {
        const item = processedItems[idx];
        const pos = layoutPositions[idx];
        const itemGroupId = genGroupId();

        const centerX = pos.cellX + pos.cellW / 2;
        let textTopY = pos.cellY;

        // 如果存在 name 或 description，在组件上方添加文字
        if (item.hasText) {
          if (item.name) {
            this.ea.style.fontSize = 16;
            this.ea.style.fontFamily = 1;
            this.ea.style.strokeColor = nameColor;
            const nameId = this.ea.addText(centerX - item.nameDim.width / 2, textTopY, item.name, {
              textAlign: "center"
            });
            const nameEl = this.ea.getElement(nameId);
            if (nameEl) {
              nameEl.groupIds = [itemGroupId];
              nameEl.x = centerX - nameEl.width / 2;
              textTopY += nameEl.height + 4;
            }
          }

          if (item.description) {
            this.ea.style.fontSize = 12;
            this.ea.style.fontFamily = 1;
            this.ea.style.strokeColor = descColor;
            const descId = this.ea.addText(centerX - item.descDim.width / 2, textTopY, item.wrappedDesc, {
              textAlign: "center"
            });
            const descEl = this.ea.getElement(descId);
            if (descEl) {
              descEl.groupIds = [itemGroupId];
              descEl.x = centerX - descEl.width / 2;
              textTopY += descEl.height + 4;
            }
          }
        }

        // 图元放置位置 (文字下方或单元格顶部)
        const elemY = pos.cellY + (item.hasText ? item.totalTextHeight + item.labelGap : 0);
        const elemX = centerX - item.bb.width / 2;
        const dx = elemX - item.bb.topX;
        const dy = elemY - item.bb.topY;

        // 克隆并重映射组件内部图元
        const clonedElements = this.cloneItemElements(item.elements);
        for (const el of clonedElements) {
          el.x += dx;
          el.y += dy;
          if (!el.groupIds) el.groupIds = [];
          el.groupIds.push(itemGroupId);
          this.ea.elementsDict[el.id] = el;
        }
      }

      // 4. 提交到画布并自动对齐居中
      await this.ea.addElementsToView(true, true, true);
      new Notice(t("notice_success", { count: processedItems.length }));
      return true;
    } catch (err) {
      console.error(`[${SCRIPT_ID}] Load Error:`, err);
      new Notice(t("notice_error"));
      return false;
    }
  }

  renderUI() {
    const existingPanel = document.getElementById("ymjr-loadlib-container");
    if (existingPanel) existingPanel.remove();

    const container = document.createElement("div");
    container.id = "ymjr-loadlib-container";
    this.container = container;

    const style = `
      #ymjr-loadlib-container {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(3px);
        display: flex; justify-content: center; align-items: flex-start;
        padding-top: 8vh; z-index: 9999;
      }
      .ymjr-lib-modal {
        background: var(--background-primary); border: 1px solid var(--background-modifier-border);
        border-radius: 10px; box-shadow: var(--shadow-l); width: 520px; max-height: 85vh;
        display: flex; flex-direction: column; overflow: hidden; font-family: var(--font-interface);
      }
      .ymjr-lib-header {
        padding: 16px 20px; border-bottom: 1px solid var(--background-modifier-border);
        font-size: 1.15em; font-weight: 600; color: var(--text-normal); display: flex; justify-content: space-between; align-items: center;
      }
      .ymjr-lib-body {
        padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
      }
      .ymjr-search-input, .ymjr-custom-input, .ymjr-cfg-input, .ymjr-cfg-select {
        width: 100%; padding: 8px 12px; border-radius: 6px;
        background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border);
        color: var(--text-normal); font-size: 0.95em; outline: none; box-sizing: border-box;
      }
      .ymjr-search-input:focus, .ymjr-custom-input:focus, .ymjr-cfg-input:focus, .ymjr-cfg-select:focus {
        border-color: var(--interactive-accent);
      }
      .ymjr-file-list {
        border: 1px solid var(--background-modifier-border); border-radius: 6px;
        max-height: 160px; overflow-y: auto; background: var(--background-primary-alt); padding: 4px;
      }
      .ymjr-file-item {
        padding: 8px 12px; margin: 2px 0; border-radius: 5px; cursor: pointer;
        display: flex; justify-content: space-between; align-items: center;
        color: var(--text-normal); font-size: 0.9em;
      }
      .ymjr-file-item:hover {
        background: var(--background-modifier-hover);
      }
      .ymjr-file-item.selected {
        background: var(--interactive-accent); color: var(--text-on-accent); font-weight: 500;
      }
      .ymjr-cfg-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      }
      .ymjr-cfg-item {
        display: flex; flex-direction: column; gap: 4px;
      }
      .ymjr-cfg-label {
        font-size: 0.85em; color: var(--text-muted);
      }
      .ymjr-checkbox-row {
        display: flex; align-items: center; gap: 8px; margin-top: 4px;
      }
      .ymjr-checkbox-row label {
        font-size: 0.9em; color: var(--text-normal); cursor: pointer; user-select: none;
      }
      .ymjr-lib-footer {
        padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid var(--background-modifier-border); background: var(--background-secondary);
      }
      .ymjr-btn {
        padding: 8px 16px; border-radius: 6px; cursor: pointer; border: none; font-weight: 500; font-size: 0.95em;
      }
      .ymjr-btn-cancel {
        background: transparent; color: var(--text-muted); border: 1px solid var(--background-modifier-border);
      }
      .ymjr-btn-cancel:hover {
        background: var(--background-modifier-hover); color: var(--text-normal);
      }
      .ymjr-btn-confirm {
        background: var(--interactive-accent); color: var(--text-on-accent);
      }
      .ymjr-btn-confirm:hover {
        background: var(--interactive-accent-hover);
      }
    `;

    container.innerHTML = `
      <style>${style}</style>
      <div class="ymjr-lib-modal">
        <div class="ymjr-lib-header">
          <span>${t("modal_title")}</span>
          <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.2em;" id="ymjr-close-x">✕</button>
        </div>
        <div class="ymjr-lib-body">
          <div>
            <input type="text" class="ymjr-search-input" id="ymjr-search" placeholder="${t("search_placeholder")}" />
          </div>
          <div class="ymjr-file-list" id="ymjr-file-list"></div>
          <div>
            <div class="ymjr-cfg-label" style="margin-bottom: 4px;">${t("custom_path_label")}</div>
            <input type="text" class="ymjr-custom-input" id="ymjr-custom-path" value="${this.customPath}" placeholder="${t("custom_path_placeholder")}" />
          </div>
          <div class="ymjr-cfg-grid">
            <div class="ymjr-cfg-item">
              <label class="ymjr-cfg-label">${t("cfg_columns")}</label>
              <input type="number" class="ymjr-cfg-input" id="ymjr-cols" min="1" max="20" value="${this.settings.columns}" />
            </div>
            <div class="ymjr-cfg-item">
              <label class="ymjr-cfg-label">${t("cfg_layout_mode")}</label>
              <select class="ymjr-cfg-select" id="ymjr-layout-mode">
                <option value="aligned" selected>${t("mode_aligned")}</option>
                <option value="flow">${t("mode_flow")}</option>
              </select>
            </div>
            <div class="ymjr-cfg-item">
              <label class="ymjr-cfg-label">${t("cfg_gap_x")}</label>
              <input type="number" class="ymjr-cfg-input" id="ymjr-gap-x" min="0" step="10" value="${this.settings.gapX}" />
            </div>
            <div class="ymjr-cfg-item">
              <label class="ymjr-cfg-label">${t("cfg_gap_y")}</label>
              <input type="number" class="ymjr-cfg-input" id="ymjr-gap-y" min="0" step="10" value="${this.settings.gapY}" />
            </div>
          </div>
          <div class="ymjr-checkbox-row">
            <input type="checkbox" id="ymjr-show-text" ${this.settings.showText ? "checked" : ""} />
            <label for="ymjr-show-text">${t("cfg_show_text")}</label>
          </div>
        </div>
        <div class="ymjr-lib-footer">
          <button class="ymjr-btn ymjr-btn-cancel" id="ymjr-btn-cancel">${t("btn_cancel")}</button>
          <button class="ymjr-btn ymjr-btn-confirm" id="ymjr-btn-confirm">${t("btn_confirm")}</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const searchInput = container.querySelector("#ymjr-search");
    const customPathInput = container.querySelector("#ymjr-custom-path");
    const listContainer = container.querySelector("#ymjr-file-list");
    const colsInput = container.querySelector("#ymjr-cols");
    const layoutModeSelect = container.querySelector("#ymjr-layout-mode");
    const gapXInput = container.querySelector("#ymjr-gap-x");
    const gapYInput = container.querySelector("#ymjr-gap-y");
    const showTextCheckbox = container.querySelector("#ymjr-show-text");
    const confirmBtn = container.querySelector("#ymjr-btn-confirm");
    const cancelBtn = container.querySelector("#ymjr-btn-cancel");
    const closeXBtn = container.querySelector("#ymjr-close-x");

    const closeUI = () => {
      container.remove();
    };

    const renderList = () => {
      if (this.filteredFiles.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 0.9em;">${t("empty_list")}</div>`;
        return;
      }
      listContainer.innerHTML = this.filteredFiles.map((f, i) => {
        const isSelected = i === this.selectedIndex;
        return `<div class="ymjr-file-item ${isSelected ? "selected" : ""}" data-index="${i}">
          <span>📦 ${f.name}</span>
          <span style="font-size:0.75em; opacity:0.6;">${f.path.includes("/") ? f.path.substring(0, f.path.lastIndexOf("/")) : ""}</span>
        </div>`;
      }).join("");

      const activeEl = listContainer.querySelector(".selected");
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });

      listContainer.querySelectorAll(".ymjr-file-item").forEach(el => {
        el.addEventListener("click", (e) => {
          this.selectedIndex = parseInt(e.currentTarget.dataset.index);
          const selFile = this.filteredFiles[this.selectedIndex];
          if (selFile) {
            customPathInput.value = selFile.path;
            this.customPath = selFile.path;
          }
          renderList();
        });
        el.addEventListener("dblclick", async () => {
          await doConfirm();
        });
      });
    };

    const doConfirm = async () => {
      this.settings.columns = parseInt(colsInput.value) || 4;
      this.settings.gapX = parseFloat(gapXInput.value) || 60;
      this.settings.gapY = parseFloat(gapYInput.value) || 80;
      this.settings.layoutMode = layoutModeSelect.value;
      this.settings.showText = showTextCheckbox.checked;

      const targetPath = customPathInput.value.trim() || (this.filteredFiles[this.selectedIndex]?.path);
      if (!targetPath) {
        new Notice(t("notice_no_file"));
        return;
      }

      confirmBtn.disabled = true;
      const success = await this.executeLoad(targetPath);
      confirmBtn.disabled = false;
      if (success) {
        closeUI();
      }
    };

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      if (!q) {
        this.filteredFiles = [...this.files];
      } else {
        this.filteredFiles = this.files.filter(f => this.fuzzyMatch(f.name, q) || this.fuzzyMatch(f.path, q));
      }
      this.selectedIndex = 0;
      if (this.filteredFiles.length > 0) {
        customPathInput.value = this.filteredFiles[0].path;
        this.customPath = this.filteredFiles[0].path;
      }
      renderList();
    });

    customPathInput.addEventListener("input", (e) => {
      this.customPath = e.target.value;
    });

    cancelBtn.addEventListener("click", closeUI);
    closeXBtn.addEventListener("click", closeUI);
    confirmBtn.addEventListener("click", doConfirm);

    container.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeUI();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey || document.activeElement !== searchInput)) {
        e.preventDefault();
        doConfirm();
      } else if (e.key === "ArrowDown") {
        if (this.selectedIndex < this.filteredFiles.length - 1) {
          e.preventDefault();
          this.selectedIndex++;
          const sel = this.filteredFiles[this.selectedIndex];
          if (sel) customPathInput.value = sel.path;
          renderList();
        }
      } else if (e.key === "ArrowUp") {
        if (this.selectedIndex > 0) {
          e.preventDefault();
          this.selectedIndex--;
          const sel = this.filteredFiles[this.selectedIndex];
          if (sel) customPathInput.value = sel.path;
          renderList();
        }
      }
    });

    renderList();
    setTimeout(() => searchInput.focus(), 60);
  }
}

// 启动执行
(async () => {
  const currentApi = ea.getExcalidrawAPI();
  const manager = new LoadLibraryToCanvasManager(ea, currentApi, app);
  await manager.init();
})();
