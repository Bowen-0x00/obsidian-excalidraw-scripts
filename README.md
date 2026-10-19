# Obsidian Excalidraw Scripts

[English](./README.md) | [简体中文](docs/README_ZH.md)

Custom Excalidraw Automate scripts and libraries maintained by [Bowen-0x00](https://github.com/Bowen-0x00). This is the **script distribution repository**, not the plugin source or plugin binary repository.

- **Script catalog, descriptions and installation buttons:** [Scripts/index.md](Scripts/index.md).
- **Recommended plugin:** [Excalidraw-ymjr](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr). Many Feature engines require its custom hooks; compatibility with the original plugin must be checked per script.
- **Ready-to-open examples:** [example vault](https://github.com/Bowen-0x00/obsidian-excalidraw-example-vault).

## Native tables: themes and templates

Requires **Excalidraw-ymjr 2.29.0-4 or later**. These are real canvas exports and Obsidian screenshots, not mockups.

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>Eight one-click palettes</h3>
      <a href="images/table-appearance/themes-overview.png"><img src="images/table-appearance/themes-overview.png" width="100%" alt="Light, dark, Morandi, academic and sketch table palettes"></a>
      <p><a href="examples/table-appearance/themes-overview.excalidraw">Editable theme overview</a></p>
    </td>
    <td width="50%" valign="top">
      <h3>Five composable border templates</h3>
      <a href="images/table-appearance/borders-overview.png"><img src="images/table-appearance/borders-overview.png" width="100%" alt="Grid, framed, dashed, three-line and borderless tables"></a>
      <p><a href="examples/table-appearance/borders-overview.excalidraw">Editable border overview</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Images, diagrams and source-preserving ellipsis</h3>
      <img src="images/table-appearance/content-comparison.png" width="100%" alt="Native image and diagram cells alongside fixed-height ellipsis">
      <p><a href="examples/table-appearance/content-comparison.excalidraw">Editable content examples</a></p>
    </td>
    <td width="50%" valign="top">
      <h3>Floating appearance controls</h3>
      <img src="images/table-appearance/theme-gallery.png" width="100%" alt="Actual Obsidian table theme and appearance controls">
      <p><a href="images/table-appearance/fills-overview.png">Native fills</a> · <a href="images/table-appearance/shadow-comparison.png">Soft shadow</a> · <a href="images/table-appearance/theme-gallery-narrow.png">Narrow-window UI</a></p>
    </td>
  </tr>
</table>

- Automatic rows grow and shrink with content; fixed rows show ellipsis while retaining the full editable text. Images and diagram groups remain native editable elements.
- Create tables from the host command palette, paste Markdown, or install [`Action-Table-Generate` 1.1.0](Scripts/table/Action-Table-Generate.md). [`Action-Table-Modify` 1.1.0](Scripts/table/Action-Table-Modify.md) provides row/column and properties shortcuts. The host owns layout and interaction; no table Engine is required.
- **Upgrade:** stop and remove old `Feature-Table-Engine.md` and `Feature-Table-Paste-MD.md`, then restart Obsidian before opening old tables. Retiring catalog entries does not uninstall existing files. Back up drawings before automatic migration.
- [All 26 portable editable examples](examples/table-appearance/) embed their image resources. Exact three-line borders, native fills and one table-paper shadow survive PNG/SVG export. Switching themes is one undoable operation.
- Verified in Windows Obsidian 1.14.4. The 430px screenshot is desktop viewport emulation, not physical mobile validation. Version 2.29.0-3 and older do not include this native-table implementation.

## See it in action

These recordings show the capabilities behind the scripts: structured diagrams, rich content, animation and interactive canvases. Some were recorded before the script refactor, so menus and filenames may differ; the links below lead to the **current script categories**.

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3><a href="Scripts/echarts/">ECharts 1.3.0: chart capabilities</a></h3>
      <p>Sixteen real examples generated on an Excalidraw canvas—not pasted chart images. In the live canvas, hover for values, toggle legend entries, and edit chart data and appearance through the editor.</p>
      <a href="images/echarts-1.3.0/overview.svg"><img src="images/echarts-1.3.0/overview.svg" width="100%" alt="Static SVG export of sixteen editable, interactive ECharts examples on an Excalidraw canvas"></a>
      <p>This SVG is a static preview. <a href="images/echarts-1.3.0/overview.excalidraw.md">Download the editable Excalidraw canvas</a> and open it in Obsidian with Excalidraw-ymjr and the ECharts engine to interact with the charts.</p>
    </td>
    <td width="50%" valign="top">
      <h3><a href="Scripts/echarts/Action-Echarts-Manager.md">Visual editor and live preview</a></h3>
      <p>Real Obsidian UI: configure series, mixed bar/line charts and independent Y axes. Screenshots show the Chinese UI.</p>
      <a href="images/echarts-1.3.0/editor-dark.png"><img src="images/echarts-1.3.0/editor-dark.png" width="100%" alt="Actual ECharts editor with a live dual-axis mixed chart preview"></a>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3><a href="Scripts/mindmap/">Interactive mindmaps</a></h3>
      <p>Create branches, expand or collapse nodes, and arrange the tree.</p>
      <img src="images/mindmap2.gif" width="100%" alt="Creating and arranging an interactive mindmap in Excalidraw">
    </td>
    <td width="50%" valign="top">
      <h3><a href="Scripts/mindmap/">Markdown ↔ mindmap</a></h3>
      <p>Move between Markdown outlines and a visual mindmap.</p>
      <img src="images/md%20ex%20mindmap.gif" width="100%" alt="Converting between a Markdown outline and an Excalidraw mindmap">
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3><a href="Scripts/code-highlight/">Syntax-highlighted code</a></h3>
      <p>Turn canvas text into readable, styled code blocks.</p>
      <img src="images/code.gif" width="100%" alt="Syntax-highlighted code blocks on an Excalidraw canvas">
    </td>
    <td width="50%" valign="top">
      <h3><a href="Scripts/echarts/">ECharts on the canvas</a></h3>
      <p>Bring data charts into the same drawing as your explanation.</p>
      <img src="images/echarts.gif" width="100%" alt="Creating and editing ECharts charts inside Excalidraw">
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3><a href="Scripts/library/">On-demand libraries</a></h3>
      <p>Load, switch, and lay out reusable symbol libraries as you draw.</p>
      <img src="images/library2.gif" width="100%" alt="Loading reusable shapes from Excalidraw libraries">
    </td>
    <td width="50%" valign="top">
      <h3><a href="Scripts/animation/">Animated connections</a></h3>
      <p>Show direction and flow with animated lines and arrows.</p>
      <img src="images/arrow%20flow%20animation.gif" width="100%" alt="Animated flows and moving arrows in an Excalidraw diagram">
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3><a href="Scripts/connection/">Flexible connections</a></h3>
      <p>Use straight, curved and elbow connectors to organize a diagram.</p>
      <img src="images/switch%20connection%20shape2.gif" width="100%" alt="Changing the shapes of connections between diagram nodes">
    </td>
    <td width="50%" valign="top">
      <h3><a href="Scripts/arrow/">Resizable custom arrows</a></h3>
      <p>Stretch selected parts of an arrow while keeping its shape useful.</p>
      <img src="images/fixedDragable.gif" width="100%" alt="Resizing custom arrows while preserving their arrowheads">
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3><a href="Scripts/detail/">Expandable details</a></h3>
      <p>Reveal supporting content without crowding the main diagram.</p>
      <img src="images/detail2.gif" width="100%" alt="Expanding and collapsing supporting details in a drawing">
    </td>
    <td width="50%" valign="top">
      <h3><a href="Scripts/line-highlight/">Connection highlighting</a></h3>
      <p>Emphasize relationships and paths between elements.</p>
      <img src="images/highlight%20link.gif" width="100%" alt="Highlighting connections between elements in a visual diagram">
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3><a href="Scripts/export/">Rich-content SVG exports</a></h3>
      <p>Take drawings with embedded content beyond the canvas.</p>
      <img src="images/export%20svg.gif" width="100%" alt="Exporting an Excalidraw drawing containing text, code and charts">
    </td>
    <td width="50%" valign="top">
      <h3><a href="Scripts/tag/">Tags on elements</a></h3>
      <p>Organize canvas elements with editable tag metadata.</p>
      <img src="images/tags.gif" width="100%" alt="Adding and managing tags on Excalidraw elements">
    </td>
  </tr>
</table>

<details>
<summary>More demos: text styling, canvas layout and mobile</summary>

### Text styling

[Text scripts](Scripts/text/) provide global and partial text formatting.

<img src="images/TextHookFeature.PNG" width="360" alt="Examples of bold text, partial text color and other text formatting">

### Make room in a drawing

[Insert vertical space](Scripts/space/) to move existing content out of the way.

<img src="images/insert%20vertical%20space.gif" width="720" alt="Inserting vertical space between existing canvas elements">

### Mobile mindmaps

This historical mobile recording illustrates the interaction, not a verification of the current release on every phone or tablet.

<img src="images/mindmap2%20-%20mobile.gif" width="240" alt="Historical mobile recording of an interactive Excalidraw mindmap">

</details>

More recordings can be added to this gallery as the scripts evolve. See all [demo assets](images/), the [example vault](https://github.com/Bowen-0x00/obsidian-excalidraw-example-vault), and the [video walkthrough](https://www.bilibili.com/video/BV1zN4y1H7Dx/).

### Progressive drawing animation 1.2.1

Update [`Action-Progressive-Drawing-Animator.md`](Scripts/animation/Action-Progressive-Drawing-Animator.md), then stop and close the old console before running the script again.

- Ordinary text now reveals character by character: the native cached-canvas draw call receives its required position offset instead of silently falling back to the complete sentence.
- Optional **Slide navigation** moves the viewport before animating elements in the next frame or a saved `customData.slideshow` path region. Disable it to keep the current viewport.
- Uses Excalidraw-ymjr's EA_Core hooks. Actual intermediate canvas frames, pause/resume and two-frame navigation were checked on Windows Obsidian 1.14.4 with Excalidraw-ymjr 2.29.0-5; physical mobile devices were not tested.

### ECharts 1.3.0

Install both [`Feature-Echarts-Engine.md`](Scripts/echarts/Feature-Echarts-Engine.md) and [`Action-Echarts-Manager.md`](Scripts/echarts/Action-Echarts-Manager.md), then rerun the engine before opening the editor.

- Multiple named/color-coded series; grouped and stacked bar/area comparisons.
- Mixed bar/line/area series with left/right Y axes; numeric XY scatter, radar, funnel, gauge and rose charts alongside the existing common charts.
- CSV/Excel TSV with headers, quoted fields and multiple value columns; a synchronized table editor, axis titles and data zoom.
- Complete saved data for reopening; old option-only charts stay intact in custom JSON mode. Pie/funnel/gauge views select a metric without deleting other series.
- Per-chart SVG export no longer depends on the first live iframe.

[Full-resolution SVG overview](images/echarts-1.3.0/overview.svg) · [Editable Excalidraw canvas](images/echarts-1.3.0/overview.excalidraw.md) · [CSV editing screenshot](images/echarts-1.3.0/editor-csv.png). The README SVG does not run ECharts: interaction is available inside the Excalidraw canvas with the current engine. Hover for values, click legend entries to toggle series, and double-click a chart or run the manager Action to edit its data, type, colors and axes; saved configuration remains editable after reopening. All data is synthetic; the heatmap uses custom JSON, not a dedicated heatmap form.

Verified in Obsidian **1.14.4**, Excalidraw-ymjr **2.29.0-3**, ECharts **5.4.3**: real canvas insertion/editing, saved-file reopening, sixteen exported examples and actual editor screenshots. A narrow desktop viewport was checked; this is not a mobile-device compatibility claim.


## Install from the custom script market

1. Install and enable [Excalidraw-ymjr](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr/releases). The plugin repository documents BRAT and manual installation; this repository does not install the plugin itself.
2. In the plugin settings, configure a scripts folder and set **Custom script store URL** to:

   ```text
   https://raw.githubusercontent.com/Bowen-0x00/obsidian-excalidraw-scripts/main/Scripts/index.md
   ```

3. Open an Excalidraw drawing. Choose **Install or update Excalidraw Scripts (Custom)** from the drawing's menu or header action. The ordinary community script store is a different catalog.
4. Use the category tables to find a script, read its description and dependencies, and click its install button. Custom-market downloads are stored beneath the configured scripts folder in `Downloaded(Custom)/`.
5. Install the required `Feature-*-Engine` scripts as well as the corresponding `Action-*` scripts. An Action performs an operation; an Engine provides background rendering or interaction. Review each script's `dependencies`, `usage` and `autorun` metadata before enabling it.

Some plugin versions default to the [Gitee market URL](https://raw.giteeusercontent.com/Bowen-0x00/obsidian-excalidraw-scripts/raw/main/Scripts/index.md). Both repositories must be synchronized: updating GitHub alone does not update that default catalog. The catalog's source and its embedded script download URLs are separate; the current generated catalog downloads scripts from GitHub raw.

Scripts execute code inside your vault. Review the source, back up important drawings, and try unfamiliar scripts in a disposable vault first. Some scripts communicate with external applications or services; their prerequisites are script-specific.

### Manual installation

Download the desired `.md` file from [`Scripts/`](Scripts/) into the scripts folder configured in Excalidraw-ymjr. Keep its filename and any adjacent `.svg` icon, and install its required engines. Category subfolders can be retained for organization. Run Actions from the Excalidraw script interface or registered commands with a drawing open. Engine lifecycle and startup behavior depend on the plugin and the script's metadata.

Do not install repository documentation, `index.md`, `directory-info.json`, or maintenance utilities as scripts. Do not keep multiple copies of the same script under different subfolders: that makes command selection and updates ambiguous.

## Available capabilities

The [catalog](Scripts/index.md) is the complete, current list. Representative groups:

| Area | Script categories |
| --- | --- |
| Structured drawings | [`mindmap`](Scripts/mindmap/), [`table`](Scripts/table/), [`swimlane`](Scripts/swimlane/), [`outline`](Scripts/outline/) |
| Shapes and connections | [`generate`](Scripts/generate/), [`arrow`](Scripts/arrow/), [`brace`](Scripts/brace/), [`connection`](Scripts/connection/) |
| Text and visual styling | [`text`](Scripts/text/), [`color`](Scripts/color/), [`gradient`](Scripts/gradient/), [`shadow`](Scripts/shadow/), [`code-highlight`](Scripts/code-highlight/) |
| Interaction and navigation | [`hover`](Scripts/hover/), [`layer`](Scripts/layer/), [`detail`](Scripts/detail/), [`link`](Scripts/link/), [`follow`](Scripts/follow/), [`zoom`](Scripts/zoom/) |
| Animation and charts | [`animation`](Scripts/animation/), [`gif`](Scripts/gif/), [`step-appear`](Scripts/step-appear/), [`echarts`](Scripts/echarts/), [`wave-drom`](Scripts/wave-drom/) |
| Tools and integrations | [`library`](Scripts/library/), [`latex`](Scripts/latex/), [`export`](Scripts/export/), [`clipboard`](Scripts/clipboard/), [`select`](Scripts/select/), [`distribute`](Scripts/distribute/) |

[`Library/`](Library/) contains additional Excalidraw libraries. The gallery above links existing demonstrations to current script categories; use the catalog for installation instructions and script dependencies.

## Versions and updates

Each script has its own `version` in YAML frontmatter. This is independent of the Excalidraw-ymjr plugin version. Check the downloaded file's frontmatter against the catalog's Version field when troubleshooting.

The Markdown custom market currently uses the `fname` and `mtime` entries in [`Scripts/directory-info.json`](Scripts/directory-info.json) to detect updates; it does **not** compare semantic version strings. Keep the catalog, metadata and actual script files from the same publication. Reopen the custom market after an update and verify the installed file, rather than relying only on an “up to date” button.

If a download fails, check the custom-market URL, network access to `raw.githubusercontent.com`, required plugin/engine versions and any duplicate local copies. Report the exact script filename, its version, plugin version, Obsidian version and reproduction steps in [Issues](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts/issues). Never include tokens or private vault content.

### Swimlane collapse fix — 1.0.1

Update [Feature-Swimlane-Engine](Scripts/swimlane/Feature-Swimlane-Engine.md) and run the engine once again to replace its existing hooks. Collapse and expand now use the clicked drawing's EA instance instead of the instance captured at engine startup. This prevents edits from going to another drawing and keeps the controls working after the startup drawing closes. Existing swimlanes do not need to be marked again; no plugin update is required.

Verified on Windows in an isolated Obsidian 1.14.4 vault with Excalidraw-ymjr 2.29.0-3: cross-drawing collapse leaves the other drawing unchanged, controls work after startup-view disposal, child visibility is restored on expansion, and a saved collapsed drawing can be reopened and expanded. Physical mobile devices were not tested.

## Repository maintenance

Published scripts live under `Scripts/<category>/`. `Scripts/index.md` is a plugin-consumed document: category tables come first, followed by one description and `excalidraw-script-install` block per script. `Scripts/directory-info.json` is the update-detection inventory, not an installation manifest.

The Node.js maintenance entry is `node Scripts/get_json.js` (paths are resolved from the utility's own directory). Regenerate metadata and the market page after changing scripts; do not hand-edit generated versions or installation URLs. Respect `.gitignore`, review the explicit publication file list, and never mirror an entire development scripts folder into this repository. Test files, private prompts, credentials and vault state do not belong in a publication.

Maintainers publish the same `main` commit to [GitHub](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts) and [Gitee](https://gitee.com/Bowen-0x00/obsidian-excalidraw-scripts). Configure `origin` with both HTTPS push URLs and repository-local `remote.pushDefault=origin`, `branch.main.pushRemote=origin`, and `push.default=simple`; then run `git push` once from `main`. These settings are local, not inherited by new clones. Verify both remote refs and raw catalogs afterward: a multi-target push can succeed on one host and fail on the other.

### Automatic Agent bundle updates

The [Agent package](https://github.com/Bowen-0x00/obsidian-excalidraw-agent-skill) imports only the shared Engines declared in its [`bridge/shared-scripts.json`](https://github.com/Bowen-0x00/obsidian-excalidraw-agent-skill/blob/main/bridge/shared-scripts.json). Maintain those Engine sources here, not in both repositories.

On GitHub `main` push, [Notify Agent Skill](.github/workflows/notify-skill.yml) reads that target manifest and dispatches only when declared source files or notification configuration changed; unrelated scripts are skipped. The Agent receiver validates a pinned source snapshot and opens/updates one reviewable synchronization PR. Deletion/rename of a required source is an error, not a reason to retain a silent stale copy. There is no periodic receiver check; use **Run workflow** to catch up if a notification fails or is missed.

Both repositories need the Actions secret `SKILL_SYNC_TOKEN`; use a dedicated expiring fine-grained token for the target Agent repository (Contents and Pull requests read/write, Metadata read). Do not commit credentials. A GitHub push notification does not prove the Gitee mirror updated; keep the two existing publication targets synchronized separately. A sync PR is not an automatic Skill release, vault deployment or Engine reload. See the [Agent maintenance contract](https://github.com/Bowen-0x00/obsidian-excalidraw-agent-skill#shared-engine-source-and-automatic-update-prs).

## Credits and license

Thanks to [Zsolt Viczian and the Obsidian Excalidraw contributors](https://github.com/zsviczian/obsidian-excalidraw-plugin) and the [Excalidraw contributors](https://github.com/excalidraw/excalidraw). Preserve script authorship and license metadata; check the license declared by each script or library instead of assuming a repository-wide license.

## Support

Feedback: [GitHub Issues](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts/issues) or [Bilibili](https://space.bilibili.com/39231346/).

If these scripts help you, you can [buy me a coffee](https://ko-fi.com/G2G3SY16R) or use the [WeChat sponsorship code](images/赞助码.jpg).
