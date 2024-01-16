/*
```javascript
*/

console.log("show outline by frame - kanban")
const api = ea.getExcalidrawAPI();
const frames = ea.getViewElements().filter(el => el.type == "frame");
if (!frames.length) return

function getFrameNameDOMId (frameElement) {
  return `${api.id}-frame-name-${frameElement.id}`;
};

const frameNameMap = new Map()
frames.forEach(el => {
  frameNameMap.set(el.id, document.getElementById(getFrameNameDOMId(el)).innerText)
})
frames.sort((a, b) => parseInt(frameNameMap.get(a.id).match(/\d+/)[0]) - parseInt(frameNameMap.get(b.id).match(/\d+/)[0]));

let result = '## \n';
for (const frame of frames) {
  result += `- [ ] [[${ea.targetView.file.path}#^frame=${frame.id}|${frameNameMap.get(frame.id)}]]<br>![[${ea.targetView.file.path}#^frame=${frame.id}]]\n`
}
result += `%% kanban:settings
\`\`\`
{"kanban-plugin":"basic"}
\`\`\`
%%`

let fileName = await ea.targetView.file.path.replace('.md', `.outline-kanban.md`)
let file = app.vault.getAbstractFileByPath(fileName);
 
if (file) {
    if (result) {
        app.vault.modify(file, result);
    }
} else {
    file = await app.vault.create(fileName, result)
}
app.fileManager.processFrontMatter(file, fm => {
    fm["kanban-plugin"] = `baseic`
})

let leaf;
app.workspace.iterateAllLeaves(l => {
  if (!leaf) {
    let viewState = l.getViewState()
    console.log(viewState.state?.file)
    if (viewState.state?.file === file.path) {
      leaf = l
    }
  }
})

if (!leaf)
leaf = await app.workspace.getLeftLeaf()
await app.workspace.setActiveLeaf(leaf, { focus: true })
setTimeout(() => {
  leaf.setViewState({
    type: "kanban",
    state: { file: file.path },
  })
}, 100)
app.workspace.leftSplit.expand()
  // app.plugins.plugins["obsidian-kanban"].setKanbanView(leaf)


