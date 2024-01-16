/*
```javascript
*/
console.log("insert vertical space with width")
let api = ea.getExcalidrawAPI();
const selectedEl = ea.getViewSelectedElement();
if (!selectedEl) return
const elements = ea.getViewElements();
const moveElements = elements.filter(el => el.y > selectedEl.y && (el.x > selectedEl.x && el.x+el.width < selectedEl.x+selectedEl.width))

for (const el of moveElements) {
  el.y = el.y + selectedEl.height
}
ea.copyViewElementsToEAforEditing(moveElements);
ea.deleteViewElements([selectedEl]);
ea.addElementsToView();
new Notice("insert vertical space with width");