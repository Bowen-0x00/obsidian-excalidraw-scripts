# Obsidian Excalidraw Scripts

[English](./README.md) | [简体中文](docs/README_ZH.md)

Custom Excalidraw Automate scripts and libraries maintained by [Bowen-0x00](https://github.com/Bowen-0x00). This is the **script distribution repository**, not the plugin source or plugin binary repository.

- **Script catalog, descriptions and installation buttons:** [Scripts/index.md](Scripts/index.md).
- **Recommended plugin:** [Excalidraw-ymjr](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr). Many Feature engines require its custom hooks; compatibility with the original plugin must be checked per script.
- **Ready-to-open examples:** [example vault](https://github.com/Bowen-0x00/obsidian-excalidraw-example-vault).

## See it in action

These recordings show the capabilities behind the scripts: structured diagrams, rich content, animation and interactive canvases. Some were recorded before the script refactor, so menus and filenames may differ; the links below lead to the **current script categories**.

<table width="100%">
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
      <p>Load and switch reusable symbol libraries as you draw.</p>
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

## Repository maintenance

Published scripts live under `Scripts/<category>/`. `Scripts/index.md` is a plugin-consumed document: category tables come first, followed by one description and `excalidraw-script-install` block per script. `Scripts/directory-info.json` is the update-detection inventory, not an installation manifest.

The Node.js maintenance entry is `node Scripts/get_json.js` (paths are resolved from the utility's own directory). Regenerate metadata and the market page after changing scripts; do not hand-edit generated versions or installation URLs. Respect `.gitignore`, review the explicit publication file list, and never mirror an entire development scripts folder into this repository. Test files, private prompts, credentials and vault state do not belong in a publication.

Maintainers publish the same `main` commit to [GitHub](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts) and [Gitee](https://gitee.com/Bowen-0x00/obsidian-excalidraw-scripts). Configure `origin` with both HTTPS push URLs and repository-local `remote.pushDefault=origin`, `branch.main.pushRemote=origin`, and `push.default=simple`; then run `git push` once from `main`. These settings are local, not inherited by new clones. Verify both remote refs and raw catalogs afterward: a multi-target push can succeed on one host and fail on the other.

## Credits and license

Thanks to [Zsolt Viczian and the Obsidian Excalidraw contributors](https://github.com/zsviczian/obsidian-excalidraw-plugin) and the [Excalidraw contributors](https://github.com/excalidraw/excalidraw). Preserve script authorship and license metadata; check the license declared by each script or library instead of assuming a repository-wide license.

## Support

Feedback: [GitHub Issues](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts/issues) or [Bilibili](https://space.bilibili.com/39231346/).

If these scripts help you, you can [buy me a coffee](https://ko-fi.com/G2G3SY16R) or use the [WeChat sponsorship code](images/赞助码.jpg).
