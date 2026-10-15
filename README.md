# Obsidian Excalidraw Scripts

[English](./README.md) | [简体中文](docs/README_ZH.md)

Custom Excalidraw Automate scripts and libraries maintained by [Bowen-0x00](https://github.com/Bowen-0x00). This is the **script distribution repository**, not the plugin source or plugin binary repository.

- **Script catalog, descriptions and installation buttons:** [Scripts/index.md](Scripts/index.md).
- **Recommended plugin:** [Excalidraw-ymjr](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr). Many Feature engines require its custom hooks; compatibility with the original plugin must be checked per script.
- **Ready-to-open examples:** [example vault](https://github.com/Bowen-0x00/obsidian-excalidraw-example-vault).

## Install from the custom script market

1. Install and enable [Excalidraw-ymjr](https://github.com/Bowen-0x00/obsidian-excalidraw-plugin-ymjr/releases). The plugin repository documents BRAT and manual installation; this repository does not install the plugin itself.
2. In the plugin settings, configure a scripts folder and set **Custom script store URL** to:

   ```text
   https://raw.githubusercontent.com/Bowen-0x00/obsidian-excalidraw-scripts/main/Scripts/index.md
   ```

3. Open an Excalidraw drawing. Choose **Install or update Excalidraw Scripts (Custom)** from the drawing's menu or header action. The ordinary community script store is a different catalog.
4. Use the category tables to find a script, read its description and dependencies, and click its install button. Custom-market downloads are stored beneath the configured scripts folder in `Downloaded(Custom)/`.
5. Install the required `Feature-*-Engine` scripts as well as the corresponding `Action-*` scripts. An Action performs an operation; an Engine provides background rendering or interaction. Review each script's `dependencies`, `usage` and `autorun` metadata before enabling it.

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

[`Library/`](Library/) contains additional Excalidraw libraries. Historical demonstrations are available in [`images/`](images/), [this video](https://www.bilibili.com/video/BV1zN4y1H7Dx/) and [Bilibili](https://space.bilibili.com/39231346/); they may show older interfaces or filenames. Use the current catalog, not old encrypted-script links, for installation.

## Versions and updates

Each script has its own `version` in YAML frontmatter. This is independent of the Excalidraw-ymjr plugin version. Check the downloaded file's frontmatter against the catalog's Version field when troubleshooting.

The Markdown custom market currently uses the `fname` and `mtime` entries in [`Scripts/directory-info.json`](Scripts/directory-info.json) to detect updates; it does **not** compare semantic version strings. Keep the catalog, metadata and actual script files from the same publication. Reopen the custom market after an update and verify the installed file, rather than relying only on an “up to date” button.

If a download fails, check the custom-market URL, network access to `raw.githubusercontent.com`, required plugin/engine versions and any duplicate local copies. Report the exact script filename, its version, plugin version, Obsidian version and reproduction steps in [Issues](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts/issues). Never include tokens or private vault content.

## Repository maintenance

Published scripts live under `Scripts/<category>/`. `Scripts/index.md` is a plugin-consumed document: category tables come first, followed by one description and `excalidraw-script-install` block per script. `Scripts/directory-info.json` is the update-detection inventory, not an installation manifest.

The Node.js maintenance entry is `node Scripts/get_json.js` (paths are resolved from the utility's own directory). Regenerate metadata and the market page after changing scripts; do not hand-edit generated versions or installation URLs. Respect `.gitignore`, review the explicit publication file list, and never mirror an entire development scripts folder into this repository. Test files, private prompts, credentials and vault state do not belong in a publication.

## Credits and license

Thanks to [Zsolt Viczian and the Obsidian Excalidraw contributors](https://github.com/zsviczian/obsidian-excalidraw-plugin) and the [Excalidraw contributors](https://github.com/excalidraw/excalidraw). Preserve script authorship and license metadata; check the license declared by each script or library instead of assuming a repository-wide license.

## Support

Feedback: [GitHub Issues](https://github.com/Bowen-0x00/obsidian-excalidraw-scripts/issues) or [Bilibili](https://space.bilibili.com/39231346/).

If these scripts help you, you can [buy me a coffee](https://ko-fi.com/G2G3SY16R) or use the [WeChat sponsorship code](images/赞助码.jpg).
