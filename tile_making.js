class Svg {
    constructor(element, name, activeLayer, layerInfo, outlineLayer, orientLayer, invalidCSS ) {
        this.name = name
        this.uniqueID = 1;
        this.element = element;
        this.tempElems = [];
        this.layerSelected = activeLayer;
        this.layers = {};
        this.text = {};
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
    errorCheckOrient(){
        console.log("hello")
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
                if(doIntersect(orientLine.points[0],orientLine.points[1],  outlineSegment[0], outlineSegment[1])){
                    this.errors[orientLine.id] = "uh oh, your orientation line is inside the boundary for the drawing. Please move it to be external";
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
            console.log(this.layerSelected, this.layerName);
            return;
        }
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
                        return;
                    }
                }
            }
        }
        outline.removeCSS(this.invalidCSS)
    }
    changeElement(parentElement){
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.destroyParent(this.element.id);
                line.addToParentElement(parentElement);
            });
        });
        this.tempElems.forEach(elem =>{
            elem.destroyParent(this.element.id);
            elem.addToParentElement(parentElement);
        });
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.destroyParent(this.element.id);
            elem.addToParentElement(parentElement);
        });
        this.element = parentElement;
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
    addText(point, text, pointIsRelative=false, lineID){
        var color = this.layerColors[this.layerSelected];
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = relativeMousePosition(point, this.element);
        }
        var textObj = new TextSVG(relativePoint,  this.genTextID(lineID),  text, color)
        textObj.addToParentElement(this.element);
        this.text[textObj.id] = textObj;
        return textObj.id;
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
 
    getLayerAssembler(layer){
        return Object.entries(this.layers[layer]).map(([_, line]) => {
            return line.points;
        })
    }
    getLine(lineID){
        return this.layers[this.layerSelected][lineID];
    }
    genTextID(lineID){
        return lineID + "_text";
    }
    getText(lineID){
        if(this.genTextID(lineID) in this.text){
            return [true, this.text[this.genTextID(lineID)]];
        }
        return [false, this.text[this.genTextID(lineID)]]
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
        })
    }
    getLinesInPoint(point){
        var selected = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine]) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine)
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
        var x = Math.abs(points[0].x - points[1].x)
        var y = Math.abs(points[0].y - points[1].y)
        const length = Math.sqrt(x * x + y * y);
        const average = {
            x: pointSum.x / 2.0,
            y: pointSum.y / 2.0
        }  
        return [average, length];
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
                this.element.appendChild(line.path);
            });
        });
        Object.entries(jsonObj.text).forEach(([textID, textJSON]) =>{
            var text = new TextSVG(textJSON.point, "", textJSON.text);
            this.text[textID] = text;
            text.fromJSON(textJSON);
            this.element.appendChild(text.text);
        })
    }
    
}

class OutlineMode{
    constructor(svg, selectpoints, outlineLayer){
        this.outlineID = null;
        this.layerName = outlineLayer;
        this.svg = svg;
        this.selectpoints = selectpoints;
        this.selectingPoints = false;
        this.errorcolor = "#FF0000"
        this.error = false;
    }
    mouseDownHandler(e){
        this.selectingPoints = this.selectpoints.clickInPoint(e);
        if(this.selectingPoints){
            this.selectpoints.mouseDownHandler(e);
            return;
        }

        if(!this.svg.checkMembership(this.outlineID)){
            this.outlineID = this.svg.addLine(e, false, true);
            this.selectpoints.reset();
            this.selectpoints.initSelection( this.outlineID);
        }
        this.svg.updateSvgPath(e, this.outlineID);
    }
    mouseMoveHandler(e){
        if(this.selectingPoints){
            this.selectpoints.mouseMoveHandler(e);
            this.svg.errorCheckOutline();
            return;
        }
        
        this.svg.getLine(this.outlineID).removePoint();
        this.svg.updateSvgPath(e, this.outlineID);
        this.svg.errorCheckOutline();
        
       
    }
    mouseUpHandler(){
        if(this.selectingPoints){
            this.selectpoints.mouseUpHandler();
            return;
        }
        if(this.svg.checkMembership(this.outlineID)){
            this.selectpoints.initSelection(this.outlineID);
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
    constructor(svg, selectpoints){
        this.svg = svg;
        this.baseID = null;
        this.selectpoints = selectpoints;
        this.selectingPoints = false;
    }
    reComp(lineID){
        const [average, length] =  this.svg.computeAverage(lineID);
        this.svg.getLine(lineID).removePoint();
        var [b, text] = this.svg.getText(lineID);
        if(b){
            text.point = average;
            text.txt = Math.trunc(length).toString();
        }
        this.svg.updateSvgPath(average, lineID, true);
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
        }
    }
    mouseUpHandler(){
        if(this.selectingPoints){
            this.selectpoints.mouseUpHandler();
            return;
        }
        // edge case checking;
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.baseID = null;
            return;
        } else if(this.baseID == null){
            return;
        }

        this.selectpoints.initSelection(this.baseID);  
        if(this.svg.getLine(this.baseID).points.length < 2){
            
            this.svg.deleteIDs([this.baseID]);
            this.baseID = null;
        } else if(this.svg.getLine(this.baseID).points.length == 2){
            var [average, length]  = this.svg.computeAverage(this.baseID);
            this.svg.updateSvgPath(average, this.baseID, true);
            this.svg.addText(average, Math.trunc(length).toString(), true, this.baseID);
            this.baseID = null;
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
