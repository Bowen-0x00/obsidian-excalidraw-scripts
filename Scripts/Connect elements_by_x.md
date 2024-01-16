/*
```javascript
*/


settings = ea.getScriptSettings();
//set default values on first run
if(!settings["Starting arrowhead"]) {
	settings = {
	  "Starting arrowhead" : {
			value: "none",
      valueset: ["none", "arrow", "bar", "circle", "circle_outline", "triangle", "triangle_outline", "diamond", "diamond_outline"]
		},
		"Ending arrowhead" : {
			value: "triangle",
      valueset: ["none", "arrow", "bar", "circle", "circle_outline", "triangle", "triangle_outline", "diamond", "diamond_outline"]
		},
		"Line points" : {
			value: 1,
      description: "Number of line points between start and end"
		}
	};
	ea.setScriptSettings(settings);
}

const arrowStart = settings["Starting arrowhead"].value === "none" ? null : settings["Starting arrowhead"].value;
const arrowEnd = settings["Ending arrowhead"].value === "none" ? null : settings["Ending arrowhead"].value;
const linePoints = Math.floor(settings["Line points"].value);

let param = 
`{
  "gap": "20",
  "lineCenterX": "40",
  "lineRightLengthX": "50"
}`
let mindmapSetting = await utils.inputPrompt("mindmapSetting", param, param);

if (!mindmapSetting) return
mindmapSetting = JSON.parse(mindmapSetting)

const elements = ea.getViewSelectedElements().filter(el => !(el.type == "text" && el.containerId));;

groups = ea.getMaximumGroups(elements);
const els = []
for (group of groups) {
  const el = ea.getLargestElement(group)
  els.push(el)
}
  
els.sort(function(a, b){return a.x-b.x});
let leftElement = els[0]
let rightElements = els.slice(1); 
rightElements.sort(function(a, b){return a.y-b.y});

ea.style.strokeColor = els[0].strokeColor;
ea.style.strokeWidth = els[0].strokeWidth;
ea.style.strokeStyle = els[0].strokeStyle;
ea.style.strokeSharpness = "round";
ea.style.roughness = 0;

arrows = []
ea.copyViewElementsToEAforEditing(els);
for (let i = 0; i < rightElements.length; i++) {
  arrows.push(ea.connectObjects(
    leftElement.id,
    "right",
    rightElements[i].id,
    "left", 
    {
    endArrowHead: arrowEnd,
    startArrowHead: arrowStart, 
    numberOfPoints: linePoints
    }
  ));
}
ea.addElementsToView(false,false,false);
ea.selectElementsInView(elements.concat(arrows.map((id) => {return ea.getElement(id)})));
script = ea.plugin.scriptEngine.getListofScripts().filter((el) => {return el.basename == 'Mindmap format'})[0]
ea.mindmapSetting = mindmapSetting
content = await app.vault.read(script);
ea.plugin.scriptEngine.executeScript(ea.targetView, content, ea.plugin.scriptEngine.getScriptName(script), script)
