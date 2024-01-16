/*
```javascript
*/
console.log("insert vertical space")
let api = ea.getExcalidrawAPI();
const selectedEl = ea.getViewSelectedElement();
if (!selectedEl) return
const elements = ea.getViewElements();
const moveElements = elements.filter(el => el.y > selectedEl.y)

for (const el of moveElements) {
  el.y = el.y + selectedEl.height
}
ea.copyViewElementsToEAforEditing(moveElements);
ea.deleteViewElements([selectedEl]);
ea.addElementsToView();
new Notice("insert vertical space");