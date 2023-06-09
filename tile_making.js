class Svg {
    constructor(element, name, activeLayer, layerInfo, outlineLayer, orientLayer, invalidCSS ) {
        this.name = name
        this.uniqueID = 1;
        this.element = element;
        this.tempElems = [];
        this.layerSelected = activeLayer;
        this.layers = {};
        this.text = {};
		this.labels = {};
        this.layerColors = {};
        this.layerInfo = layerInfo;
        this.layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
        this.outlineLayerName = outlineLayer;
        this.orientLayerName = orientLayer;
        this.errors = {};
        this.invalidCSS = invalidCSS;
    }
	canExport(){
		var b = true;
		var errorString = "";
		var outlineIDs = Object.entries(this.layers[this.outlineLayerName]);
		var errorDict = {}
		if(outlineIDs.length == 0){
            errorString += `<p> There's no boundary for this tile!
			Please select the 'border' layer and draw a boundary</p> `;
			b = false;
        };
		var orientIDs = Object.entries(this.layers[this.orientLayerName]);
		if(orientIDs.length == 0){
            errorString +=  `<p> There's no orientation annotations for 
			this tile! Please select the 'orient' layer and draw at least
			one orientation line </p> `;
			b = false;
        };
		var errors =  Object.entries(this.errors);
		if(errors.length > 0){
			errorString += `<ul><p> The following annotation lines have an issue: <p>`
		}
		errors.forEach(([id, issue]) =>{
			errorDict[issue] = null;
			b = false;
		});
		Object.entries(errorDict).map(([errorStr, _])=>{
			errorString += errorStr;
		})
		if(errors.length > 0){
			errorString += `</ul>`

		}
		return [b, errorString];
	}
    reflectOverX(y = 0){
        const vector = {
            x: 0,
            y: y
        }
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.reflectOverX();
                line.moveByVector(vector);
                line.reRender();
            });
        });
    
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.reflectOverX();
            elem.moveByVector(vector);
            elem.reRender();
        })
    }
    reflectOverY(x = 0){
        const vector = {
            y: 0,
            x: x
        }
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.reflectOverY();
                line.moveByVector(vector);
                line.reRender();
            });
        });
    
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.reflectOverY();
            elem.moveByVector(vector);
            elem.reRender();
        })
    }
    removeLabel(label){
        Object.entries(this.text).forEach(([key, text]) => {
            if(text.txt == label){
                text.destroy();
                delete this.text[key];
            }
        })
        this.reRender();
    }
	getOutlineID(){
		var outlineIDs = Object.entries(this.layers[this.outlineLayerName]);
        if(outlineIDs.length == 0){
            return null;
        }
		return outlineIDs[0][0];
	}
    errorCheckOrient(){
        var outlineIDs = Object.entries(this.layers[this.outlineLayerName]);
        if(outlineIDs.length == 0){
            return;
        }
        var outline = outlineIDs[0][1];

        var points = JSON.parse(JSON.stringify(outline.points));
        var closePoint = outline.closePoint;
        if(closePoint == null){
            console.error("outline does not have a close point");
            return;
        }
        points.push(closePoint);
      
        var outlineLineSegments = [];
        for(var i = 0; i < points.length - 1; i++){
            var p1 = points[i];
            var p2 = points[i + 1];
            outlineLineSegments.push([p1, p2]);
        }
        const orientLineSegments = Object.entries(this.layers[this.orientLayerName]).map(([id, line])=>{
            return line;
        });
        orientLineSegments.forEach(orientLine => {
            var newError = false;
            
            outlineLineSegments.forEach(outlineSegment =>{
                if(doIntersect(orientLine.points[0],orientLine.points[1],  outlineSegment[0], outlineSegment[1])
                    || pointInPolygon(orientLine.points[0], points)
                    || pointInPolygon(orientLine.points[1], points)){
                    this.errors[orientLine.id] = `<li> The orientation lines cannot
					be inside the the border for the tile.
					Please adjust the orientation line or the border with the 'select' tool. </li> `;
                    orientLine.addCSS(this.invalidCSS)
                    newError = true;
                } 
                if(!newError && orientLine.id in this.errors){
                    delete this.errors[orientLine.id];
                    orientLine.removeCSS(this.invalidCSS)
                }
            })
        })
    }
    errorCheckOutline(){
        if(this.layerSelected != this.outlineLayerName ){
            return;
        }
        var outlineIDs = Object.entries(this.layers[this.outlineLayerName]);
        if(outlineIDs.length == 0){
            return;
        }
        var outline = outlineIDs[0][1];
		const outlineID = outlineIDs[0][0];

        var points = JSON.parse(JSON.stringify(outline.points));
        var closePoint = outline.closePoint;
        if(closePoint == null){
            console.error("outline does not have a close point");
            return;
        }
        points.push(closePoint);
        var lineSegments = [];
        for(var i = 0; i < points.length - 1; i++){
            var p1 = points[i];
            var p2 = points[i + 1];
            lineSegments.push([p1, p2]);
        }
        for(var i = 0; i < lineSegments.length; i++){
            for(var counter = 0; counter < lineSegments.length; counter ++){
                var j = (i + counter) % lineSegments.length;
                if((j != i - 1 && j != i && j != i + 1) && !(i == 0 && j == lineSegments.length - 1) && !(j == 0 && i == lineSegments.length - 1)){
                    const l1 = lineSegments[i];
                    const l2 = lineSegments[j];
                    if(doIntersect(l1[0], l1[1], l2[0], l2[1])){
                        outline.addCSS(this.invalidCSS)
						this.errors[outlineID] =  `<li> The border cannot intersect itself. 
						Please adjust the border with the 'select' tool.  </li> `;
                        return;
                    }
                }
            }
        }
        outline.removeCSS(this.invalidCSS);
		if(outlineID in this.errors){
			delete this.errors[outlineID];
		}
    }
	unmount(){
		Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.destroy();
            });
        });
        this.tempElems.forEach(elem =>{
            elem.destroy();
        });
		this.tempElems = [];
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.destroy();
        });
		return this.errors;
		
	}
    addNewElement(parentElement){
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.addToParentElement(parentElement);
            });
        });
        this.tempElems.forEach(elem =>{
            elem.addToParentElement(parentElement);
        });
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.addToParentElement(parentElement);
        });
    }
    clearLayer(layerName){
        var ids = Object.keys(this.layers[layerName]);
        this.deleteIDs(ids);
    }
    
    validID(){
        var ID = this.uniqueID;
        this.uniqueID += 1;
        return ID;
    }
 
    getLayer(layerName){
        return Object.entries(this.layers[layerName]).map(([_, line]) => line);
    }
    addText(point, text, pointIsRelative=false, lineID, isLabel=false){
        var color = this.layerColors[this.layerSelected];
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = relativeMousePosition(point, this.element);
        }
        var textObj;
        if(isLabel){
            textObj = new TextSVG(relativePoint, this.genLabelId(lineID), text, color, "end");
        } else {
            textObj = new TextSVG(relativePoint, this.genTextID(lineID), text, color);
        }
        
        textObj.addToParentElement(this.element);
        this.text[textObj.id] = textObj;
        return textObj;
    }
    addLine(point, pointIsRelative=false, closed=false){
        var color = this.layerColors[this.layerSelected];
        var line = new Line(this.validID(), closed, color);
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = relativeMousePosition(point, this.element);
        }
        
        line.appendPoint(relativePoint);
        line.addToParentElement(this.element);
        this.layers[this.layerSelected][line.id] = line;
        return line.id;
    }
 
    reRender(){
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.reRender();
            });
        });
        this.tempElems.forEach(elem =>{
            elem.reRender();
        });
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.reRender();
        })
    }
    getLabels(){
        var labels = {};
        Object.entries(this.layers[this.orientLayerName]).forEach(([id, line]) => {
            var text = this.getText(id);
            if(text.label != null){
                labels[line.id] = text.label.txt;
            } else {
                labels[line.id] = "";
            }
        });
        return labels;
    }
    getOrientLayer(layer){
        return Object.entries(this.layers[layer]).map(([id, line]) => {
            return {
                id: id,
                points: line.points
            };
        })

    }
    getLayerAssembler(layer){
        return Object.entries(this.layers[layer]).map(([_, line]) => {
            return line.points;
        })
    }
    getLine(lineID){
        return this.layers[this.layerSelected][lineID];
    }
    genLabelId(lineID){
        return lineID + "_label";
    }
    genTextID(lineID){
        return lineID + "_text";
    }
    getText(lineID){
        var text= {
            length: null,
            label: null
        }
        if(this.genTextID(lineID) in this.text){
            text.length = this.text[this.genTextID(lineID)];
        }
        if(this.genLabelId(lineID) in this.text){
            text.label = this.text[this.genLabelId(lineID)];
        }
        return text;
    }
    updateSvgPath(point, lineID, pointIsRelative=false) {
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = relativeMousePosition(point, this.element);
        }
        this.layers[this.layerSelected][lineID].appendPoint(relativePoint);
        return lineID;
    }
    clearTemp(){
        this.tempElems.forEach(elem => elem.destroy());
        this.tempElems = [];
    }

    moveLines(lines, vec){
        lines.map(line => {
            line.moveByVector(vec)
        });
        lines.forEach(line  => {
            if(this.genTextID(line.id) in this.text){
                this.text[this.genTextID(line.id)].moveByVector(vec);
            }
            if(this.genLabelId(line.id) in this.text){
                this.text[this.genLabelId(line.id)].moveByVector(vec);
            }
        })
    }
    getLinesInPoint(point){
        var selected = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine]) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine);
            }
            return acc;
        }, []);
        return selected;
    }
    getLinesInRect(rect){
        var selected = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
            if(curLine.inRect(rect)){
                acc.push(curLine)
            }
            return acc;
        }, []);
        return selected;
    }
    getClosestLine(point){
        var relativePoint = relativeMousePosition(point, this.element);
        var closestLine = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
            var distance = minDistanceToLine(relativePoint, curLine.points);
            if( distance < acc.distance ){
                acc.distance = distance;
                acc.line = curLine;
            }
            return acc;
        }, {distance: Infinity, line: null});
        return closestLine;
    }
    computeAverage(lineID){
        var points = this.getLine(lineID).points;
        var pointSum = {
            x: points[0].x + points[1].x, 
            y: points[0].y + points[1].y
        }
        var x =points[0].x - points[1].x
        var y = points[0].y - points[1].y
        const length = Math.sqrt(x * x + y * y);
        const angle = Math.trunc(math.atan2(y, x) * 180 / Math.PI);
        // console.log(angle);
        const average = {
            x: pointSum.x / 2.0,
            y: pointSum.y / 2.0
        }  
        return [average, length, angle];
    }
    deleteIDs(IDs){
        IDs.forEach(id =>{
            if(id in this.errors){
                delete this.errors[id];
            }
            if(this.genTextID(id) in this.text){
                this.text[this.genTextID(id)].destroy();
                delete this.text[this.genTextID(id)];
            }
            if(this.genLabelId(id) in this.text){
                this.text[this.genLabelId(id)].destroy();
                delete this.text[this.genLabelId(id)];
            }
            if(id in this.layers[this.layerSelected]){
                this.layers[this.layerSelected][id].destroy();
                delete this.layers[this.layerSelected][id];
            }
        });
    }
    checkMembership(ID){
        if(ID in this.layers[this.layerSelected]){
            return true;
        }
        return false;
    }
   
    fromJSON(jsonObj){        
        this.name = jsonObj.name
        this.uniqueID = jsonObj.uniqueID 
        this.tempElems = [];
        this.layers = {};
        this.text = {};
		this.layerColors = {};
        this.layerInfo = jsonObj.layerInfo;
        this.layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
        Object.entries(jsonObj.layers).forEach(([layerKey, layerJSON]) => {
            Object.entries(layerJSON).forEach(([lineID, lineJSON]) =>{
                var line = new Line("");
                line.jsonToObj(lineJSON);
                this.layers[layerKey][lineID] = line;

            });
        });
        Object.entries(jsonObj.text).forEach(([textID, textJSON]) =>{
            var text = new TextSVG(textJSON.point, "", textJSON.text);
            this.text[textID] = text;
            text.fromJSON(textJSON);

        });

		this.layerSelected = jsonObj.layerSelected;
        this.outlineLayerName = jsonObj.outlineLayerName;
        this.orientLayerName =jsonObj.orientLayerName; 
		this.errors = jsonObj.errors;
		this.invalidCSS = jsonObj.invalidCSS;
    }
    
}

class OutlineMode{
    constructor(svg, selectpoints, outlineLayer){
        this.name = outlineLayer;
        this.svg = svg;
        this.selectpoints = selectpoints;
        this.selectingPoints = false;
		this.compliance = () => true;
		this.text = null
    }
	addTextToLastPoint(){
		if(this.text !== null){
			this.text.destroy();
		}
		// constructor(point, ID, txt, fill="#0000ff")
		const outlineID = this.svg.getOutlineID();
		var points = this.svg.getLine(outlineID).points;
		this.text = this.svg.addText(points[points.length - 1], "last point", true, outlineID);
	}
    mouseDownHandler(e){
        this.selectingPoints = this.selectpoints.clickInPoint(e);
        if(this.selectingPoints){
            this.selectpoints.mouseDownHandler(e);
            return;
        }

        if(this.svg.getOutlineID() === null){
            this.svg.addLine(e, false, true);
            this.selectpoints.reset();
            this.selectpoints.initSelection(this.svg.getOutlineID() );
        }
        this.svg.updateSvgPath(e, this.svg.getOutlineID());
		this.addTextToLastPoint();
    }
    mouseMoveHandler(e){
        if(this.selectingPoints){
            this.selectpoints.mouseMoveHandler(e);
            return;
        }
        
        this.svg.getLine(this.svg.getOutlineID()).removePoint();
        this.svg.updateSvgPath(e, this.svg.getOutlineID());
		this.compliance();
		this.addTextToLastPoint();
    }
    mouseUpHandler(){
        if(this.selectingPoints){
            this.selectpoints.mouseUpHandler();
            return;
        }
        if(this.svg.getOutlineID() !== null){
            this.selectpoints.initSelection(this.svg.getOutlineID());
        }
    }
}
function relativeMousePosition(point, element){
    var parentRect = element.getBoundingClientRect();
    var p = {
        x: point.x - parentRect.left,
        y: point.y - parentRect.top
    }
    return p;
}
function downloadSVG(element=null, fileName=null){
    if(element == null){
        element = svg.element;
        fileName = svg.name;
    }

    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, element.outerHTML], {type:"image/svg+xml;charset=utf-8"});
    var downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(svgBlob);
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
} 


class ConstructionMode {
    constructor(svg){
        this.curLineID = null;
        this.svg = svg;
    }
    mouseDownHandler(e){
        this.curLineID = this.svg.addLine(e);
    }
    mouseMoveHandler(e){
        this.svg.updateSvgPath(e, this.curLineID);
    }
    mouseUpHandler(){

    }
}

class OrientLineMode{
    constructor(svg, selectpoints, name){
		this.name = name;
        this.svg = svg;
        this.baseID = null;
        this.selectpoints = selectpoints;
        this.selectingPoints = false;
		this.compliance = () => true;
    }
    assignLabel(lines, label){
        if(this.svg.layerSelected == this.name){
            lines.forEach(line => {
                var [average, _, _] =  this.svg.computeAverage(line.id);
                var text = this.svg.getText(line.id);
                if(text.label != null){
                    
                    text.label.txt = label
                    text.label.reRender();
                } else {
                    this.svg.addText(average, label, true, line.id, true);
                }
            })
        }
    }
    reComp(lineID){
        const [average, length, degrees] =  this.svg.computeAverage(lineID);
        this.svg.getLine(lineID).removePoint();
        var text = this.svg.getText(lineID);
        if(text.length != null){
            text.length.point = average;
            text.length.txt = Math.trunc(length).toString() + ", " + degrees.toString() + "x"  + Math.trunc(average.x) + "y"  + Math.trunc(average.y);
        } 

        if(text.label != null){
            text.label.point = average;
            text.label.reRender();
        }
    
        this.svg.updateSvgPath(average, lineID, true);
		this.compliance();
    }
    mouseDownHandler(e){
        // weird line edge cases
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.svg.deleteIDs([this.baseID]);
            this.baseID = null;
        }
        
        this.selectingPoints = this.selectpoints.clickInPoint(e);

        if(this.selectingPoints){
            this.selectpoints.mouseDownHandler(e);
            return;
        }

        if(this.baseID == null){
            this.selectpoints.reset();
            this.baseID = this.svg.addLine(e);
            this.svg.updateSvgPath(e, this.baseID);
            this.selectpoints.initSelection(this.baseID);
			this.compliance();
        }       
    }
    mouseMoveHandler(e){
 
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.baseID = null;
        }
        if(this.selectingPoints){
            this.selectpoints.mouseMoveHandler(e);
            return;
        }

        if(this.baseID != null){
            this.svg.getLine(this.baseID).removePoint();
            this.svg.updateSvgPath(e, this.baseID);
			this.compliance();
        }
    }
    mouseUpHandler(){
        if(this.selectingPoints){
            this.selectpoints.mouseUpHandler();
            return;
        }
  
        if(this.baseID == null){
            return;
        }

        this.selectpoints.initSelection(this.baseID);  
     
        if(this.svg.getLine(this.baseID).points.length == 2){
            var [average, length, degrees]  = this.svg.computeAverage(this.baseID);
            this.svg.updateSvgPath(average, this.baseID, true);
			
            this.svg.addText(average,  Math.trunc(length).toString() + ", " + degrees.toString() + "x"  + Math.trunc(average.x) + "y"  + Math.trunc(average.y), true, this.baseID);
            this.baseID = null;
			this.compliance();
        }
    }
}


if (typeof(module) !== "undefined") {
	module.exports.Svg = Svg;
	module.exports.OrientLineMode = OrientLineMode;
	module.exports.ConstructionMode = ConstructionMode;
	module.exports.OutlineMode = OutlineMode;
	module.exports.relativeMousePosition = relativeMousePosition;
}
