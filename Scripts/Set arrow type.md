/*
```javascript
*/
console.log("set arrow type")
const api = ea.getExcalidrawAPI();
const selectedEls = ea.getViewSelectedElements().filter(el => el.type == "arrow");
if (!selectedEls?.length) {
  new Notice("No arrow elements slected");
  return
}
const arrowTypeHints = ["none", "arrow", "bar", "circle", "circle_outline", "triangle", "triangle_outline", "diamond", "diamond_outline"]
const arrowTypeItems = [null, "arrow", "bar", "circle", "circle_outline", "triangle", "triangle_outline", "diamond", "diamond_outline"]


const startArrowHead = await utils.suggester(
  arrowTypeHints,
  arrowTypeItems,
  "start head"
);
if (!startArrowHead) return;
const endArrowHead = await utils.suggester(
  arrowTypeHints,
  arrowTypeItems,
  "end head"
);
if (!endArrowHead) return;


selectedEls.forEach((el) => {
  el.startArrowhead = startArrowHead
  el.endArrowhead = endArrowHead
})

ea.copyViewElementsToEAforEditing(selectedEls);
ea.addElementsToView();
new Notice("set arrow type done");

