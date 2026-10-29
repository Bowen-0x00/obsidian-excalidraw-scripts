---
name: 图标库管理器 (Icon Library)
description: 现代矢量与多色图标库管理面板。支持指定本地图标库路径、多分类与模糊搜索、多色/单色矢量 Path (方案 1.2 svgLayers) JIT 按需插入画布。
author: ymjr
version: 1.0.0
license: MIT
usage: 运行脚本呼出图标库选择面板。可使用全键盘操作：键入关键词模糊搜索、上下左右键选择、Enter 键一键将图标插入到当前画布中心。
features:
  - 原生支持单色与多色图标 (方案 1.2: svgLayers 多图层 Path 渲染)
  - 本地文件夹即真理源，支持自定义本地图标路径 (Vault 文件夹)
  - 智能提取多图层颜色与 ViewBox，无缝缩放与手绘/精准风格切换
  - 媲美现代组件库 (Figma / Raycast) 的极致 UI 与全键盘交互
dependencies:
  - 独立运行
autorun: false
---
/*
```javascript
*/

const SCRIPT_ID = "ymjr.action.icon-library";

var locales = {
  zh: {
    modal_title: "🎨 矢量与多色图标库",
    search_placeholder: "🔍 搜索图标 (如: google, docker, python, s3)...",
    cat_all: "全部",
    cfg_size: "尺寸",
    cfg_style: "风格",
    style_rough: "手绘 (Rough)",
    style_sharp: "纯净 (Sharp)",
    settings_label: "⚙️ 图标库路径",
    settings_desc: "Vault 内图标文件夹路径 (例如: Icons)",
    settings_prompt: "请输入本地图标文件夹路径 (相对于 Vault 根目录):",
    empty_icons: "未找到匹配的图标文件",
    empty_folder: "所选路径下暂无 SVG 图标文件",
    btn_insert: "插入画布 (Enter)",
    btn_close: "关闭 (Esc)",
    status_count: "共找到 {count} 个图标",
    notice_no_view: "⚠️ 请先打开一个 Excalidraw 画布",
    notice_inserted: "✨ 已插入图标: {name}",
    notice_path_saved: "✅ 图标路径已更新: {path}"
  },
  en: {
    modal_title: "🎨 Vector & Multi-Color Icon Library",
    search_placeholder: "🔍 Search icons (e.g. google, docker, python, s3)...",
    cat_all: "All",
    cfg_size: "Size",
    cfg_style: "Style",
    style_rough: "Rough",
    style_sharp: "Sharp",
    settings_label: "⚙️ Icon Path",
    settings_desc: "Vault folder path for icons (e.g. Icons)",
    settings_prompt: "Enter local icons folder path (relative to Vault root):",
    empty_icons: "No matching icons found",
    empty_folder: "No SVG icons found in the specified path",
    btn_insert: "Insert (Enter)",
    btn_close: "Close (Esc)",
    status_count: "{count} icons found",
    notice_no_view: "⚠️ Please open an Excalidraw drawing first",
    notice_inserted: "✨ Inserted icon: {name}",
    notice_path_saved: "✅ Icon path updated: {path}"
  }
};

// --------------------------------------------------------------------------
// 1. 核心 SVG 解析引擎 (提取 ViewBox 与 Multi-Color Layers)
// --------------------------------------------------------------------------
class SVGIconParser {
  static parse(svgContent) {
    let viewBox = { x: 0, y: 0, width: 24, height: 24 };
    const vbMatch = svgContent.match(/viewBox=["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)\s*["']/i);
    if (vbMatch) {
      viewBox = {
        x: parseFloat(vbMatch[1]),
        y: parseFloat(vbMatch[2]),
        width: parseFloat(vbMatch[3]),
        height: parseFloat(vbMatch[4])
      };
    } else {
      const wMatch = svgContent.match(/\bwidth=["']([\d.]+)["']/i);
      const hMatch = svgContent.match(/\bheight=["']([\d.]+)["']/i);
      if (wMatch && hMatch) {
        viewBox = { x: 0, y: 0, width: parseFloat(wMatch[1]), height: parseFloat(hMatch[1]) };
      }
    }

    const layers = [];

    // 1. 解析 <path> 标签
    const pathRegex = /<path([^>]+)\/?>/gi;
    let match;
    while ((match = pathRegex.exec(svgContent)) !== null) {
      const attrs = match[1];
      const dMatch = attrs.match(/\bd=["']([^"']+)["']/i);
      if (!dMatch) continue;
      const d = dMatch[1].trim();

      const layer = this.extractStyle(attrs, d);
      layers.push(layer);
    }

    // 2. 解析基本几何图形并转为 path 命令
    // <circle cx cy r>
    const circleRegex = /<circle([^>]+)\/?>/gi;
    while ((match = circleRegex.exec(svgContent)) !== null) {
      const attrs = match[1];
      const cx = parseFloat((attrs.match(/\bcx=["']([-\d.]+)["']/i) || [])[1] || 0);
      const cy = parseFloat((attrs.match(/\bcy=["']([-\d.]+)["']/i) || [])[1] || 0);
      const r = parseFloat((attrs.match(/\br=["']([-\d.]+)["']/i) || [])[1] || 0);
      if (r > 0) {
        const d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
        layers.push(this.extractStyle(attrs, d));
      }
    }

    // <rect x y width height rx ry>
    const rectRegex = /<rect([^>]+)\/?>/gi;
    while ((match = rectRegex.exec(svgContent)) !== null) {
      const attrs = match[1];
      const x = parseFloat((attrs.match(/\bx=["']([-\d.]+)["']/i) || [])[1] || 0);
      const y = parseFloat((attrs.match(/\by=["']([-\d.]+)["']/i) || [])[1] || 0);
      const w = parseFloat((attrs.match(/\bwidth=["']([-\d.]+)["']/i) || [])[1] || 0);
      const h = parseFloat((attrs.match(/\bheight=["']([-\d.]+)["']/i) || [])[1] || 0);
      if (w > 0 && h > 0) {
        const d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
        layers.push(this.extractStyle(attrs, d));
      }
    }

    // <polygon points="...">
    const polyRegex = /<polygon([^>]+)\/?>/gi;
    while ((match = polyRegex.exec(svgContent)) !== null) {
      const attrs = match[1];
      const pMatch = attrs.match(/\bpoints=["']([^"']+)["']/i);
      if (pMatch) {
        const pts = pMatch[1].trim().split(/[\s,]+/).filter(Boolean);
        if (pts.length >= 4) {
          let d = `M ${pts[0]} ${pts[1]}`;
          for (let i = 2; i < pts.length; i += 2) {
            d += ` L ${pts[i]} ${pts[i + 1]}`;
          }
          d += " Z";
          layers.push(this.extractStyle(attrs, d));
        }
      }
    }

    return { viewBox, layers };
  }

  static extractStyle(attrs, d) {
    let fill = undefined;
    let stroke = undefined;
    let strokeWidth = undefined;

    const fillMatch = attrs.match(/\bfill=["']([^"']+)["']/i);
    if (fillMatch) fill = fillMatch[1].trim();

    const strokeMatch = attrs.match(/\bstroke=["']([^"']+)["']/i);
    if (strokeMatch) stroke = strokeMatch[1].trim();

    const swMatch = attrs.match(/\bstroke-width=["']([^"']+)["']/i);
    if (swMatch) strokeWidth = parseFloat(swMatch[1]);

    const styleMatch = attrs.match(/\bstyle=["']([^"']+)["']/i);
    if (styleMatch) {
      const style = styleMatch[1];
      const sFill = style.match(/fill\s*:\s*([^;]+)/i);
      if (sFill) fill = sFill[1].trim();
      const sStroke = style.match(/stroke\s*:\s*([^;]+)/i);
      if (sStroke) stroke = sStroke[1].trim();
      const sSw = style.match(/stroke-width\s*:\s*([\d.]+)/i);
      if (sSw) strokeWidth = parseFloat(sSw[1]);
    }

    if (!fill && !stroke) {
      fill = "#000000";
    }

    return {
      d,
      fill: fill || "none",
      stroke: stroke || "none",
      strokeWidth: strokeWidth || 1
    };
  }
}

// --------------------------------------------------------------------------
// 2. 图标库管理器 (UI & UX Controller)
// --------------------------------------------------------------------------
class IconLibraryManager {
  constructor(ea, api, app) {
    this.ea = ea;
    this.api = api;
    this.app = app;
    this.icons = [];
    this.filteredIcons = [];
    this.categories = [];
    this.activeCategory = "all";
    this.searchQuery = "";
    this.selectedIndex = 0;
    this.targetSize = 48;
    this.styleMode = "rough"; // "rough" | "sharp"
    this.iconFolderPath = "Icons";
  }

  async init() {
    await this.loadSettings();
    await this.scanIcons();
    this.renderUI();
  }

  async loadSettings() {
    let settings = this.ea.getScriptSettings() || {};
    let val = settings["icon_library_folder"];
    let folderValue = typeof val === "object" && val !== null ? val.value : val;
    if (!folderValue || typeof folderValue !== "string") {
      folderValue = "Icons";
      settings["icon_library_folder"] = {
        value: "Icons",
        description: t("settings_desc")
      };
      await this.ea.setScriptSettings(settings);
    }
    this.iconFolderPath = folderValue.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  }

  async scanIcons() {
    const allFiles = this.app.vault.getFiles();
    const folderPrefix = this.iconFolderPath ? this.iconFolderPath + "/" : "";
    const svgFiles = allFiles.filter(f => 
      f.extension === "svg" && 
      (folderPrefix ? f.path.startsWith(folderPrefix) : true)
    );

    const categorySet = new Set();
    this.icons = [];

    for (const file of svgFiles) {
      const relPath = folderPrefix ? file.path.slice(folderPrefix.length) : file.path;
      const parts = relPath.split("/");
      const category = parts.length > 1 ? parts[0] : "General";
      categorySet.add(category);

      const content = await this.app.vault.read(file);
      const parsed = SVGIconParser.parse(content);

      this.icons.push({
        file,
        name: file.basename,
        category,
        content,
        parsed
      });
    }

    this.categories = Array.from(categorySet);
    this.filterIcons();
  }

  filterIcons() {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredIcons = this.icons.filter(icon => {
      const matchesCat = this.activeCategory === "all" || icon.category === this.activeCategory;
      if (!matchesCat) return false;
      if (!query) return true;
      return icon.name.toLowerCase().includes(query) || icon.category.toLowerCase().includes(query);
    });

    if (this.selectedIndex >= this.filteredIcons.length) {
      this.selectedIndex = Math.max(0, this.filteredIcons.length - 1);
    }
  }

  insertSelectedIcon() {
    if (this.filteredIcons.length === 0) return;
    const selected = this.filteredIcons[this.selectedIndex];
    if (!selected) return;
    this.insertIconToCanvas(selected);
  }

  insertIconToCanvas(icon) {
    const view = this.ea.targetView;
    if (!view) {
      new Notice(t("notice_no_view"));
      return;
    }

    const { viewBox, layers } = icon.parsed;
    const size = this.targetSize;
    const roughness = this.styleMode === "rough" ? 1 : 0;

    // 获取视口中心坐标
    const appState = this.api.getAppState();
    const zoom = appState.zoom.value;
    const centerX = -appState.scrollX + (view.containerEl.clientWidth / 2) / zoom;
    const centerY = -appState.scrollY + (view.containerEl.clientHeight / 2) / zoom;

    // 创建承载图元 (使用 rectangle，原生支持 2D 尺寸、自由移动与等比缩放，不干扰顶点编辑)
    const id = this.ea.addRect(centerX - size / 2, centerY - size / 2, size, size);
    const el = this.ea.getElement(id);

    const distinctColors = new Set(
      layers.flatMap((l) => [l.fill, l.stroke]).filter((c) => c && c !== "none")
    );
    const isSingleColor = distinctColors.size <= 1;

    el.strokeWidth = 1;
    el.roughness = roughness;
    el.fillStyle = "solid";

    if (isSingleColor) {
      // 单色图标：默认继承当前画笔的线条色，支持调色板即时改色
      const currentStroke = this.api.getAppState().currentItemStrokeColor;
      el.strokeColor = currentStroke && currentStroke !== "transparent" ? currentStroke : "#1e1e1e";
      el.backgroundColor = "transparent";
    } else {
      // 多色图标：默认保持原色（透明描边与背景让各图层原汁原味呈现）
      el.strokeColor = "transparent";
      el.backgroundColor = "transparent";
    }

    el.customData = {
      ...el.customData,
      svgLayers: layers,
      svgViewBox: viewBox,
      scaleX: 1,
      scaleY: 1
    };

    this.ea.addElementsToView(false, true, true);
    new Notice(t("notice_inserted", { name: icon.name }));
    this.close();
  }

  renderUI() {
    const existing = document.getElementById("ymjr-icon-library-container");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "ymjr-icon-library-container";
    this.container = container;

    const style = `
      #ymjr-icon-library-container {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(8px);
        display: flex; justify-content: center; align-items: flex-start;
        padding-top: 8vh; z-index: 99999; font-family: var(--font-interface);
      }
      .ymjr-icon-modal {
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 14px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        width: 680px; max-height: 82vh;
        display: flex; flex-direction: column; overflow: hidden;
        animation: ymjr-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes ymjr-pop-in {
        from { opacity: 0; transform: scale(0.96) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .ymjr-icon-header {
        padding: 16px 20px 12px;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      .ymjr-icon-title {
        font-size: 1.15em; font-weight: 600; color: var(--text-normal);
        display: flex; align-items: center; gap: 8px;
      }
      .ymjr-icon-path-btn {
        background: var(--background-secondary); border: 1px solid var(--background-modifier-border);
        color: var(--text-muted); padding: 4px 10px; border-radius: 6px; font-size: 0.85em;
        cursor: pointer; transition: all 0.15s ease;
      }
      .ymjr-icon-path-btn:hover {
        background: var(--background-modifier-hover); color: var(--text-normal);
      }
      .ymjr-icon-search-wrap {
        padding: 12px 20px;
        background: var(--background-primary-alt);
        border-bottom: 1px solid var(--background-modifier-border);
      }
      .ymjr-icon-search-input {
        width: 100%; padding: 10px 14px; border-radius: 8px;
        background: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal); font-size: 0.95em; outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .ymjr-icon-search-input:focus {
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 2px var(--background-modifier-active-hover);
      }
      .ymjr-icon-categories {
        padding: 8px 20px; display: flex; gap: 8px; overflow-x: auto;
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
      }
      .ymjr-cat-pill {
        padding: 4px 12px; border-radius: 20px; font-size: 0.82em;
        background: var(--background-secondary); color: var(--text-muted);
        cursor: pointer; border: 1px solid transparent; white-space: nowrap;
        transition: all 0.15s ease;
      }
      .ymjr-cat-pill:hover {
        color: var(--text-normal); background: var(--background-modifier-hover);
      }
      .ymjr-cat-pill.active {
        background: var(--interactive-accent); color: var(--text-on-accent);
        font-weight: 500;
      }
      .ymjr-icon-grid {
        flex-grow: 1; overflow-y: auto; padding: 16px 20px;
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
        max-height: 420px; scroll-behavior: smooth;
      }
      .ymjr-icon-card {
        padding: 12px 8px; border-radius: 10px; cursor: pointer;
        background: var(--background-secondary); border: 1px solid var(--background-modifier-border);
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .ymjr-icon-card:hover {
        transform: translateY(-2px); border-color: var(--interactive-accent);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .ymjr-icon-card.selected {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-active-hover);
        outline: 2px solid var(--interactive-accent);
      }
      .ymjr-icon-preview {
        width: 44px; height: 44px; display: flex; justify-content: center; align-items: center;
      }
      .ymjr-icon-preview svg {
        width: 36px; height: 36px; max-width: 100%; max-height: 100%;
      }
      .ymjr-icon-name {
        font-size: 0.8em; color: var(--text-normal); text-align: center;
        width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .ymjr-icon-cat-tag {
        font-size: 0.7em; color: var(--text-muted); background: var(--background-primary);
        padding: 1px 6px; border-radius: 4px;
      }
      .ymjr-empty-state {
        grid-column: 1 / -1; padding: 40px 0; text-align: center;
        color: var(--text-muted); font-size: 0.9em;
      }
      .ymjr-icon-footer {
        padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
      }
      .ymjr-footer-controls {
        display: flex; align-items: center; gap: 14px;
      }
      .ymjr-control-group {
        display: flex; align-items: center; gap: 6px; font-size: 0.82em; color: var(--text-muted);
      }
      .ymjr-size-btn, .ymjr-style-btn {
        padding: 3px 8px; border-radius: 4px; background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border); color: var(--text-muted);
        cursor: pointer; font-size: 0.82em; transition: all 0.1s ease;
      }
      .ymjr-size-btn.active, .ymjr-style-btn.active {
        background: var(--interactive-accent); color: var(--text-on-accent);
        border-color: var(--interactive-accent); font-weight: 500;
      }
      .ymjr-footer-actions {
        display: flex; align-items: center; gap: 8px;
      }
      .ymjr-btn-cancel {
        padding: 6px 12px; border-radius: 6px; background: transparent;
        border: 1px solid var(--background-modifier-border); color: var(--text-muted);
        cursor: pointer; font-size: 0.85em;
      }
      .ymjr-btn-cancel:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
      .ymjr-btn-confirm {
        padding: 6px 16px; border-radius: 6px; background: var(--interactive-accent);
        color: var(--text-on-accent); border: none; cursor: pointer; font-weight: 500;
        font-size: 0.85em; transition: background 0.15s ease;
      }
      .ymjr-btn-confirm:hover { background: var(--interactive-accent-hover); }
    `;

    container.innerHTML = `
      <style>${style}</style>
      <div class="ymjr-icon-modal">
        <div class="ymjr-icon-header">
          <div class="ymjr-icon-title">${t("modal_title")}</div>
          <button class="ymjr-icon-path-btn" id="ymjr-btn-path" title="${t("settings_desc")}">
            ${t("settings_label")}: <b>${this.iconFolderPath}</b>
          </button>
        </div>

        <div class="ymjr-icon-search-wrap">
          <input 
            type="text" 
            class="ymjr-icon-search-input" 
            id="ymjr-search-input" 
            placeholder="${t("search_placeholder")}" 
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="ymjr-icon-categories" id="ymjr-cat-list"></div>

        <div class="ymjr-icon-grid" id="ymjr-icon-grid"></div>

        <div class="ymjr-icon-footer">
          <div class="ymjr-footer-controls">
            <div class="ymjr-control-group">
              <span>${t("cfg_size")}:</span>
              <button class="ymjr-size-btn ${this.targetSize === 32 ? 'active' : ''}" data-size="32">32</button>
              <button class="ymjr-size-btn ${this.targetSize === 48 ? 'active' : ''}" data-size="48">48</button>
              <button class="ymjr-size-btn ${this.targetSize === 64 ? 'active' : ''}" data-size="64">64</button>
              <button class="ymjr-size-btn ${this.targetSize === 96 ? 'active' : ''}" data-size="96">96</button>
            </div>
            <div class="ymjr-control-group">
              <span>${t("cfg_style")}:</span>
              <button class="ymjr-style-btn ${this.styleMode === 'rough' ? 'active' : ''}" data-style="rough">${t("style_rough")}</button>
              <button class="ymjr-style-btn ${this.styleMode === 'sharp' ? 'active' : ''}" data-style="sharp">${t("style_sharp")}</button>
            </div>
          </div>

          <div class="ymjr-footer-actions">
            <button class="ymjr-btn-cancel" id="ymjr-btn-cancel">${t("btn_close")}</button>
            <button class="ymjr-btn-confirm" id="ymjr-btn-confirm">${t("btn_insert")}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    this.bindEvents();
    this.renderCategories();
    this.renderGrid();

    // 自动聚焦搜索框
    const searchInput = container.querySelector("#ymjr-search-input");
    if (searchInput) searchInput.focus();
  }

  renderCategories() {
    const catListEl = this.container.querySelector("#ymjr-cat-list");
    if (!catListEl) return;

    let html = `
      <div class="ymjr-cat-pill ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">
        ${t("cat_all")} (${this.icons.length})
      </div>
    `;

    for (const cat of this.categories) {
      const count = this.icons.filter(i => i.category === cat).length;
      html += `
        <div class="ymjr-cat-pill ${this.activeCategory === cat ? 'active' : ''}" data-cat="${cat}">
          ${cat} (${count})
        </div>
      `;
    }

    catListEl.innerHTML = html;

    catListEl.querySelectorAll(".ymjr-cat-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        this.activeCategory = pill.dataset.cat;
        this.filterIcons();
        this.renderCategories();
        this.renderGrid();
      });
    });
  }

  renderGrid() {
    const gridEl = this.container.querySelector("#ymjr-icon-grid");
    if (!gridEl) return;

    if (this.filteredIcons.length === 0) {
      gridEl.innerHTML = `<div class="ymjr-empty-state">${t("empty_icons")}</div>`;
      return;
    }

    let html = "";
    this.filteredIcons.forEach((icon, idx) => {
      const isSelected = idx === this.selectedIndex;
      html += `
        <div class="ymjr-icon-card ${isSelected ? 'selected' : ''}" data-idx="${idx}" title="${icon.name}">
          <div class="ymjr-icon-preview">
            ${icon.content}
          </div>
          <div class="ymjr-icon-name">${icon.name}</div>
          <div class="ymjr-icon-cat-tag">${icon.category}</div>
        </div>
      `;
    });

    gridEl.innerHTML = html;

    gridEl.querySelectorAll(".ymjr-icon-card").forEach(card => {
      card.addEventListener("click", () => {
        this.selectedIndex = parseInt(card.dataset.idx, 10);
        this.insertSelectedIcon();
      });
      card.addEventListener("mouseenter", () => {
        this.selectedIndex = parseInt(card.dataset.idx, 10);
        this.updateCardSelection();
      });
    });

    this.scrollToSelected();
  }

  updateCardSelection() {
    const cards = this.container.querySelectorAll(".ymjr-icon-card");
    cards.forEach((card, idx) => {
      if (idx === this.selectedIndex) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
  }

  scrollToSelected() {
    const selectedEl = this.container.querySelector(`.ymjr-icon-card[data-idx="${this.selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  bindEvents() {
    // 点击背景退出
    this.container.addEventListener("click", (e) => {
      if (e.target === this.container) this.close();
    });

    // 搜索输入
    const searchInput = this.container.querySelector("#ymjr-search-input");
    searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.selectedIndex = 0;
      this.filterIcons();
      this.renderGrid();
    });

    // 键盘导航
    this.keyHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.insertSelectedIcon();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (this.selectedIndex < this.filteredIcons.length - 1) {
          this.selectedIndex++;
          this.updateCardSelection();
          this.scrollToSelected();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
          this.updateCardSelection();
          this.scrollToSelected();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = this.selectedIndex + 4;
        if (next < this.filteredIcons.length) {
          this.selectedIndex = next;
          this.updateCardSelection();
          this.scrollToSelected();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = this.selectedIndex - 4;
        if (prev >= 0) {
          this.selectedIndex = prev;
          this.updateCardSelection();
          this.scrollToSelected();
        }
      }
    };
    window.addEventListener("keydown", this.keyHandler);

    // 尺寸控制
    this.container.querySelectorAll(".ymjr-size-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.targetSize = parseInt(btn.dataset.size, 10);
        this.container.querySelectorAll(".ymjr-size-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // 风格控制 (Rough vs Sharp)
    this.container.querySelectorAll(".ymjr-style-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.styleMode = btn.dataset.style;
        this.container.querySelectorAll(".ymjr-style-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // 设置图标路径按钮 -> 呼出 Vault 文件夹选择器
    const pathBtn = this.container.querySelector("#ymjr-btn-path");
    pathBtn.addEventListener("click", () => {
      this.openFolderPickerModal();
    });
    // 底部按钮
    this.container.querySelector("#ymjr-btn-cancel").addEventListener("click", () => this.close());
    this.container.querySelector("#ymjr-btn-confirm").addEventListener("click", () => this.insertSelectedIcon());
  }

  openFolderPickerModal() {
    const existing = document.getElementById("ymjr-folder-picker-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "ymjr-folder-picker-overlay";

    const allFiles = this.app.vault.getFiles();
    const folderSvgCount = new Map();
    allFiles.forEach(f => {
      if (f.extension === "svg") {
        const folder = f.parent ? f.parent.path : "";
        folderSvgCount.set(folder, (folderSvgCount.get(folder) || 0) + 1);
      }
    });

    const allFolders = this.app.vault.getAllLoadedFiles()
      .filter(f => f.children)
      .map(f => f.path)
      .sort((a, b) => a.localeCompare(b));

    const style = `
      #ymjr-folder-picker-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(6px);
        display: flex; justify-content: center; align-items: center;
        z-index: 100000; font-family: var(--font-interface);
      }
      .ymjr-fp-modal {
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px; width: 500px; max-height: 75vh;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3);
        display: flex; flex-direction: column; overflow: hidden;
      }
      .ymjr-fp-header {
        padding: 14px 18px; border-bottom: 1px solid var(--background-modifier-border);
        font-weight: 600; color: var(--text-normal); font-size: 1.05em;
        display: flex; justify-content: space-between; align-items: center;
      }
      .ymjr-fp-search {
        padding: 10px 18px; border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-primary-alt);
      }
      .ymjr-fp-input {
        width: 100%; padding: 8px 12px; border-radius: 6px;
        background: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal); font-size: 0.9em; outline: none;
      }
      .ymjr-fp-input:focus {
        border-color: var(--interactive-accent);
      }
      .ymjr-fp-list {
        flex-grow: 1; overflow-y: auto; padding: 10px 18px; max-height: 360px;
      }
      .ymjr-fp-item {
        padding: 8px 12px; margin-bottom: 4px; border-radius: 6px; cursor: pointer;
        display: flex; justify-content: space-between; align-items: center;
        background: var(--background-secondary); border: 1px solid transparent;
        transition: all 0.15s ease;
      }
      .ymjr-fp-item:hover {
        background: var(--background-modifier-hover); border-color: var(--interactive-accent);
      }
      .ymjr-fp-item.active {
        border-color: var(--interactive-accent); background: var(--background-modifier-active-hover);
      }
      .ymjr-fp-badge {
        font-size: 0.78em; color: var(--text-muted); background: var(--background-primary);
        padding: 2px 8px; border-radius: 12px;
      }
      .ymjr-fp-custom {
        padding: 12px 18px; border-top: 1px solid var(--background-modifier-border);
        display: flex; gap: 8px; align-items: center; background: var(--background-primary);
      }
      .ymjr-fp-custom input {
        flex-grow: 1; padding: 6px 10px; border-radius: 6px; font-size: 0.85em;
        background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
      }
      .ymjr-fp-custom button {
        padding: 6px 14px; border-radius: 6px; background: var(--interactive-accent);
        color: var(--text-on-accent); border: none; cursor: pointer; font-size: 0.85em;
      }
    `;

    overlay.innerHTML = `
      <style>${style}</style>
      <div class="ymjr-fp-modal">
        <div class="ymjr-fp-header">
          <span>📁 选择图标文件夹 (Vault Folder)</span>
          <button id="ymjr-fp-close" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.2em;">✕</button>
        </div>
        <div class="ymjr-fp-search">
          <input type="text" class="ymjr-fp-input" id="ymjr-fp-filter" placeholder="过滤文件夹..." />
        </div>
        <div class="ymjr-fp-list" id="ymjr-fp-items"></div>
        <div class="ymjr-fp-custom">
          <input type="text" id="ymjr-fp-manual" placeholder="或输入自定义文件夹相对路径..." value="${this.iconFolderPath}" />
          <button id="ymjr-fp-save">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const renderItems = (filterText = "") => {
      const listEl = overlay.querySelector("#ymjr-fp-items");
      const q = filterText.toLowerCase().trim();
      const matched = allFolders.filter(f => !q || f.toLowerCase().includes(q));

      if (matched.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">未找到匹配文件夹</div>`;
        return;
      }

      let html = "";
      matched.forEach(folder => {
        const svgCount = folderSvgCount.get(folder) || 0;
        const isActive = folder === this.iconFolderPath;
        html += `
          <div class="ymjr-fp-item ${isActive ? 'active' : ''}" data-path="${folder}">
            <span style="font-size:0.9em;color:var(--text-normal);">📁 ${folder}</span>
            <span class="ymjr-fp-badge">${svgCount} 个 SVG</span>
          </div>
        `;
      });
      listEl.innerHTML = html;

      listEl.querySelectorAll(".ymjr-fp-item").forEach(item => {
        item.addEventListener("click", () => {
          this.applyNewFolder(item.dataset.path);
          overlay.remove();
        });
      });
    };

    renderItems();

    overlay.querySelector("#ymjr-fp-filter").addEventListener("input", (e) => {
      renderItems(e.target.value);
    });

    overlay.querySelector("#ymjr-fp-save").addEventListener("click", () => {
      const customVal = overlay.querySelector("#ymjr-fp-manual").value;
      if (customVal && customVal.trim()) {
        this.applyNewFolder(customVal.trim());
        overlay.remove();
      }
    });

    overlay.querySelector("#ymjr-fp-close").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  async applyNewFolder(folderPath) {
    this.iconFolderPath = folderPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    let settings = this.ea.getScriptSettings() || {};
    settings["icon_library_folder"] = {
      value: this.iconFolderPath,
      description: t("settings_desc")
    };
    await this.ea.setScriptSettings(settings);
    new Notice(t("notice_path_saved", { path: this.iconFolderPath }));
    await this.scanIcons();
    this.renderCategories();
    this.renderGrid();
    const pathBtn = this.container.querySelector("#ymjr-btn-path b");
    if (pathBtn) pathBtn.textContent = this.iconFolderPath || "/";
  }

  close() {
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
    }
    if (this.container) {
      this.container.remove();
    }
  }
}

// --------------------------------------------------------------------------
// 3. 运行入口
// --------------------------------------------------------------------------
(async () => {
  const api = ea.getExcalidrawAPI();
  const manager = new IconLibraryManager(ea, api, app);
  await manager.init();
})();
