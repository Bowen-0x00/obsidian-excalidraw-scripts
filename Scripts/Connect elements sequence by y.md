/*
```javascript
*/
let settings = ea.getScriptSettings();

if(!settings["startArrowHead"] || !settings["endArrowHead"]) {
	settings = {
    "startArrowHead" : {
      value: "none",
      description: "Set start arrow head",
      valueset: ["none", "arrow", "bar", "circle", "circle_outline", "triangle", "triangle_outline", "diamond", "diamond_outline"]
    },
    "endArrowHead" : {
      value: "arrow",
      description: "Set end arrow head",
      valueset: ["none", "arrow", "bar", "circle", "circle_outline", "triangle", "triangle_outline", "diamond", "diamond_outline"]
    }
	};
	await ea.setScriptSettings(settings);
}

let startArrowHead = settings["startArrowHead"].value;
let endArrowHead = settings["endArrowHead"].value;
if (startArrowHead == "none") startArrowHead = null
if (endArrowHead == "none") endArrowHead = null
const elements = ea.getViewSelectedElements().filter(el => !(el.type == "text" && el.containerId));


const groups = ea.getMaximumGroups(elements);
console.log('Connect elements_multi')
const els = []
for (group of groups) {
  const el = ea.getLargestElement(group)
  els.push(el)
}
  
els.sort(function(a, b){return a.y-b.y});

ea.style.strokeColor = els[0].strokeColor;
// ea.style.strokeWidth = els[0].strokeWidth;
ea.style.strokeWidth = 2;
ea.style.strokeStyle = els[0].strokeStyle;
ea.style.strokeSharpness = "round";
ea.style.roughness = 0;

arrows = []
ea.copyViewElementsToEAforEditing(els);
for (let i = 1; i < els.length; i++) {
  arrows.push(ea.connectObjects(
    els[i-1].id,
    "bottom",
    els[i].id,
    "top", 
    {
      endArrowHead: endArrowHead,
      startArrowHead: startArrowHead, 
      numberOfPoints: 1,
      padding: 0.1
    }
  ));
}
await ea.addElementsToView(false,false,true);