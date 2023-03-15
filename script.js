// import {distanceToLineSegment} from "./utils.js"

var element = document.getElementById("svgElement");
var mode = document.getElementById("mode");
var layer = document.getElementById("layer");
var drawMode = "draw"
var deleteMode = "delete"
var selectMode = "select"
var orientMode = "orient"
var setMode = drawMode;
var pressed = false;
var dragged = false;
var outlineLayer = "outline"
var orientLayer = "orient"
var constructionLayer = "construction"
var layerSelected = constructionLayer;


class Line {
    constructor(ID, lineClosed=false, stroke="#000") {
        this.fill = "none";
        this.strokeWidth = 2;
        this.stroke = stroke;
        this.points = [];
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute("fill", this.fill);
        this.path.setAttribute("stroke", this.stroke);
        this.path.setAttribute("stroke-width",this.strokeWidth);
        this.path.id = "stroke_" + ID.toString();
        this.lineClosed = lineClosed;
        this.closePoint = null;
    }

    removePoint(index){
        if(this.points.length > 0 && index >= 0 && index < this.points.length){
            this.points.pop(index);
        } else if(this.points.length == 0){
            this.closePoint = null;
        }
        return;
    }
    popPoint(){
        this.points.pop();
        if(this.points.length == 0){
            this.closePoint = null;
        }
    }
    appendPoint(point){
        this.points.push(point);
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }

        this.path.setAttribute("d", this.toString());
    }
    getID(){
        return this.path.id;
    }
    pointInRect(point){
        var lineRect = get_bbox(this.points);
        if((lineRect[0].x <= point.x && point.x <=lineRect[1].x ) && (lineRect[0].y <= point.y && point.y <= lineRect[1].y)){
            return true;
        }
        return false;

    }
    inRect(rect){
        var lineRect = get_bbox(this.points);
        if (rect[0].x == rect[1].x || rect[0].y == rect[1].y || lineRect[1].x == lineRect[0].x || lineRect[0].y == lineRect[1].y){
            return false;
        }
        // If one rectangle is on left side of other
        if (rect[0].x > lineRect[1].x || lineRect[0].x > rect[1].x) {
            return false;
        }

        // If one rectangle is above other
        if (rect[1].y < lineRect[0].y || lineRect[1].y < rect[0].y) {
            return false;
        }
     
        return true;
    }
    reRender(){
        this.path.setAttribute("d", this.toString());
    }
    moveByVector(vec){
        this.points = this.points.map(point => {
            return {
                x: point.x + vec.x, 
                y: point.y + vec.y,
            };
        })
        if(this.lineClosed){
            this.closePoint = this.points[0];
        }

    }
    getLength(){
        return this.points.length;
    }
    getPoints(){
        return this.points;
    }
    toString(){
        var svgString = this.points.reduce(function(str, point){
            str += " L" + point.x + " " + point.y;
            return str;
        }, "");
        svgString = "M" + svgString.slice(2);

        if(this.lineClosed && this.points.length > 0){
            svgString += " L" + this.closePoint.x + " " + this.closePoint.y;
        }
        return svgString;
    }
}

class Svg {
    constructor(element) {
        this.name = "svg"
        this.uniqueID = 1;
        this.element = element;
        this.parentRect = element.getBoundingClientRect();
        this.tolerance = 5.0;
        this.layers = {
            construction: [],
            orient: [],
            outline: [],
        }
        this.layerColors = {
            construction: "#000",
            outline: "#FF0000",
            orient: "#00FF00",
        }
    }
    initOutline(){
        console.log("initOutline")
        var outline = new Line(this.validID(), false, this.layerColors.outline);
        this.layers.outline.push(outline);
        this.element.appendChild(outline.path);
        return outline.getID();
    }
    activeLayer(){
        return layerSelected;
        
    }
    popLinePoint(){
        var key = this.activeLayer();
        var line = this.layers[key].pop();
        line.popPoint();
        this.layers[key].push(line);
        console.log(this.layers[key].length,  this.layers[key]);
    }
    relativeMousePosition(point){
        return {
            x: point.pageX - svg.parentRect.left,
            y: point.pageY - svg.parentRect.top
        }
    }
    validID(){
        var ID = this.uniqueID;
        this.uniqueID += 1;
        return ID;
    }
    addLine(point, pointIsRelative=false){
        var key = this.activeLayer();
        var color = this.layerColors[key];
        var line = new Line(this.validID(), true, color);

        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        

        line.appendPoint(relativePoint);
        this.element.appendChild(line.path);
        this.layers[key].push(line);
        console.log(this.layers[key].length,  this.layers[key])
        return line.getID();
    }
    getAllIDs(){
        var key = this.activeLayer();
        var allIDs = this.layers[key].map(line => line.getID());
        return allIDs;
    }
    reRender(){
        this.element.innerHTML = ""
        for (const [_, value] of Object.entries(this.layers)) {
            value.map(line => {
                this.element.appendChild(line.path);
                line.reRender();
            });
        }
    }
    
    updateSvgPath(point, lineID=null, pointIsRelative=false) {
        var key = this.activeLayer();
        var line;
        if(lineID != null){

            var lineDict = this.activeLineDict();
            line = lineDict.get(lineID);

        }
        else {
            line = this.layers[key].pop();
            lineID = line.getID();
        }
        
       
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        line.appendPoint(relativePoint);
        this.layers[key].push(line);
        console.log(this.layers[key].length,  this.layers[key])
        return lineID;
       
    }
    activeLineDict(){
        var lineDict = new Map();
        var key = this.activeLayer();
        this.layers[key].map(line => {
            lineDict.set(line.getID(), line);
        });
        return lineDict;

    }
    moveLines(lineIDs, vec){
        var lineDict = this.activeLineDict();
        lineIDs.map(id => lineDict.get(id).moveByVector(vec));
    }
    getLineLength(lineID){
        var lineDict = this.activeLineDict();
        var line = lineDict.get(lineID);
        return line.getLength();

    }
    getLinePoints(lineID) {
        var lineDict = this.activeLineDict();
        var line = lineDict.get(lineID);
        return line.getPoints();
    }
    getLinesInPoint(point){
        var key = this.activeLayer();
        var selectedIDs = this.layers[key].reduce((acc, curLine) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine.getID())
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getLinesInRect(rect){
        var key = this.activeLayer();

        var selectedIDs = this.layers[key].reduce((acc, curLine) => {
            if(curLine.inRect(rect)){
                acc.push(curLine.getID())
            }
            return acc;
        }, []);
        return selectedIDs;
    }

    // deleteMousePressed(point){
    //     var relativePoint = this.relativeMousePosition(point);
    //     this.lines = this.activeLayer().reduce((acc, curLine) => 
    //     {
    //         var minDistance = minDistanceToLine(relativePoint, curLine.points);
           
    //         if(minDistance > this.tolerance){
              
    //             acc.push(curLine);
    //         }
    //         return acc;
    //     }, []);
    //     this.reRender();
    // }
    

    downloadSVG(){
        var preface = '<?xml version="1.0" standalone="no"?>\r\n';
        var svgBlob = new Blob([preface, this.element.outerHTML], {type:"image/svg+xml;charset=utf-8"});
        var downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(svgBlob);
        downloadLink.download = this.name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } 
}
class OutlineMode{
    constructor(svg){
        this.outlineID = null;
        this.svg = svg;
        this.penmode = null;
    }
    mouseDownHandler(e){
        if(this.outlineID == null){
            this.outlineID = this.svg.initOutline();
            this.penmode = new PenMode(this.svg, this.outlineID);
        }
        this.penmode.mouseDownHandler(e);
    }
    mouseUpHandler(e){
        this.penmode.mouseUpHandler(e);
    }
}
class PenMode{
    constructor(svg, lineID){
        this.mouseDraggedPoint = null;
        this.addedToLine = false;
        this.svg = svg;
        this.lineID = lineID;
    }
    mouseDownHandler(e, pointIsRelative=false){
        this.mouseDraggedPoint = e;
        
        if(!this.addedToLine){
            this.svg.updateSvgPath(e, this.lineID, pointIsRelative);
            this.addedToLine = true;
        } else{
            this.svg.popLinePoint();
            this.svg.updateSvgPath(e, this.lineID, pointIsRelative);
        }
    }
    mouseUpHandler(){
        this.mouseDraggedPoint = null;
        this.addedToLine = false;
    }
}
class ConstructionMode{
    constructor(svg){
        
    }
}
class OrientLineMode{
    constructor(svg){
        this.svg = svg;
        
        this.color = "#00ff00";

        this.baseLength = null;
        this.baseID = null;
        this.curPenMode = null;
    }
    generatePerp(lineId, e){
        const sumPoints = (p1, p2) =>
        {
            return  {
                x: p1.x + p2.x, 
                y: p1.y + p2.y
            };
        }
        var points = this.svg.getLinePoints(lineId);
        var pointSum = points.reduce(sumPoints, {x:0, y:0})
        var average = {
            x: pointSum.x / points.length,
            y: pointSum.y / points.length
        }
        var vector = {
            x: points[1].x - points[0].x,
            y: points[1].y - points[0].y,
        }
        var normal1 = {
            x: (vector.y * -1) + average.x,
            y: vector.x  + average.y,
        }
        var normal2 = {
            x: vector.y + average.x,
            y: (vector.x * -1)  + average.y,
        }

        var relativePoint = this.svg.relativeMousePosition(e);
        var distNormal2 = dist2(relativePoint, normal2);
        var distNormal1 = dist2(relativePoint, normal1);
        if(distNormal1 < distNormal2){
            return [average, normal1];
        }
        return [average, normal2];
    }
   
    mouseDownHandler(e){
        if(this.baseID == null){
            this.baseID = this.svg.addLine(e);
            this.curPenMode = new PenMode(this.svg, this.baseID);  
            this.curPenMode.mouseDownHandler(e);
        }
        else if(this.baseID != null && this.baseLength <= 1){

            this.curPenMode.mouseDownHandler(e);
        }
        else{
            var [average, normal] = this.generatePerp(this.baseID, e);
            var perpID = this.svg.addLine(average, true);
            var perpPenMode= new PenMode(this.svg, perpID);
            perpPenMode.mouseDownHandler(normal, true);
            perpPenMode.mouseUpHandler();
            
            this.baseID = null;
            this.baseLength = null;
            this.curPenMode = null;

        }
       
    }
    mouseMoveHandler(e){
        if(this.curPenMode != null){
            this.curPenMode.mouseDownHandler(e);
        }
    }
    mouseUpHandler(){
        
        if(this.curPenMode != null){
            this.baseLength = this.svg.getLineLength(this.baseID);
            this.curPenMode.mouseUpHandler();
        }
    }
}
class Select{
    constructor(svg){
        this.svg = svg
        this.selectionCss = 'path-selection'
        this.selectionBox =  document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionBox.setAttribute('fill', 'none')
        this.selectionBox.setAttribute('stroke','gray')
        this.selectionBox.setAttribute('stroke-width', 1)
        this.selectionBox.setAttribute('stroke-dasharray', 4);
        this.svg.element.appendChild(this.selectionBox);
        this.selected = [];
        this.moveVec = {
            x:0,
            y:0
        };
        this.clickedInSelection = false;
        this.oldCursorPosition = {
            x:0,
            y:0
        };
        this.originalLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };
    }
    isSelected(){
        return this.selected.length > 0;
    }
    doubleClickHandler(e){
        this.resetSelection();
        var line = this.svg;

    }
    mouseDownHandler(e){
        // click is in the selected boxes
        if(this.isSelected() && this.clickInSelected(e)){
            this.clickedInSelection = true;
            this.startSelection(e);
        // click is outside the selection, therefore start new selection
        } else{
            this.resetSelection();
            this.startSelection(e);
        }

    }

    setSelectedLines(){
        this.selected = this.svg.getLinesInRect([this.selectionLeftTopCorner, this.selectionBottomRightCorner ]);
 
        this.removeCSS();
        for(var i = 0; i < this.selected.length; i++){
            var lineElement = document.getElementById(this.selected[i]);
            lineElement.classList.add(this.selectionCss);
        }
    }
    clickInSelected(e){
        if(!this.isSelected()){
            return false;
        }
        var point = svg.relativeMousePosition(e);
        var potentialIDs = svg.getLinesInPoint(point);
        const found = potentialIDs.some(r=> this.selected.includes(r))
        return found;


    }
    startSelection(e){
        this.moveVec = {
            x: 0, 
            y: 0,
        };
        this.oldCursorPosition = svg.relativeMousePosition(e);
        this.selectionLeftTopCorner = svg.relativeMousePosition(e);
        this.originalLeftTopCorner = svg.relativeMousePosition(e);
        this.selectionBottomRightCorner = svg.relativeMousePosition(e);
        this.setSelectionBox();

    }
    setSelectionBox(){
        this.selectionBox.setAttribute('x', this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('y', this.selectionLeftTopCorner.y);
        this.selectionBox.setAttribute('width',this.selectionBottomRightCorner.x - this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('height', this.selectionBottomRightCorner.y - this.selectionLeftTopCorner.y);
    }
    mouseMoveHandler(e){
        if(this.clickedInSelection){
            this.updateSelection(e);
            // console.log(this.moveVec, this.selected);
            this.svg.moveLines(this.selected, this.moveVec);
            this.svg.reRender();
            this.svg.element.appendChild(this.selectionBox);
        } else {
            this.updateSelection(e);
            this.setSelectionBox();
            this.setSelectedLines();
        }
    }

    updateSelection(e){
        var point = svg.relativeMousePosition(e);
        var [minX, maxX] = [Math.min(point.x, this.originalLeftTopCorner.x), Math.max(point.x, this.originalLeftTopCorner.x)];
        var [minY, maxY] = [Math.min(point.y, this.originalLeftTopCorner.y), Math.max(point.y, this.originalLeftTopCorner.y)];
  
        this.moveVec = {
            x: point.x -  this.oldCursorPosition.x,
            y: point.y -  this.oldCursorPosition.y,
        }

        this.oldCursorPosition = point;

        this.selectionLeftTopCorner = {
            x: minX,
            y: minY,
        };

        this.selectionBottomRightCorner = {
            x: maxX,
            y: maxY,
        };

    }
    removeCSS(){
        var allIDs = svg.getAllIDs();
        for(var i = 0; i < allIDs.length; i++){
            var lineElement = document.getElementById(allIDs[i]);
            lineElement.classList.remove(this.selectionCss);
        }
    }
    resetSelection(){
        this.removeCSS();
        this.selected = [];
        
    }
    resetSelectionBox(){
        this.originalLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };
        this.setSelectionBox();

    }

}

var svg = new Svg(element);
var select = new Select(svg);
var outlinemode = new OutlineMode(svg);
var orientlinemode = new OrientLineMode(svg);
// var outlinemode = new OutlineMode(penmode, svg);

function downloadSVG(){
    svg.downloadSVG();
}

element.addEventListener("mousedown", function (e) {
    pressed = true;
    if(setMode == drawMode && layerSelected == constructionLayer){
        svg.addLine(e);
    } else if(setMode === selectMode){
        select.mouseDownHandler(e);
    } else if(setMode === drawMode && layerSelected == outlineLayer){
        outlinemode.mouseDownHandler(e);
    } else if(setMode == drawMode && layerSelected == orientLayer){
        orientlinemode.mouseDownHandler(e);
    }
});

element.addEventListener("mousemove", function (e) {
    if(pressed){
        dragged = true;
    }
    if(pressed && setMode == drawMode && layerSelected == constructionLayer){
        svg.updateSvgPath(e); 
    } else if (pressed && setMode == selectMode){
        select.mouseMoveHandler(e);
    } else if(pressed && setMode === drawMode && layerSelected == outlineLayer){
        outlinemode.mouseDownHandler(e);
    } else if(pressed && setMode == drawMode && layerSelected == orientLayer){
        orientlinemode.mouseMoveHandler(e);
    }
});

element.addEventListener("mouseup", function () {
    pressed = false;
    dragged = false;
    if(setMode == selectMode){
        select.clickedInSelection = false;
        select.resetSelectionBox();
    } if(setMode == drawMode && layerSelected == outlineLayer){
        outlinemode.mouseUpHandler();
    } else if( setMode == drawMode && layerSelected == orientLayer){
        orientlinemode.mouseUpHandler();
    }
    
});
element.addEventListener("dblclick", function () {
    console.log("Double-click detected")
    // Double-click detected
});


function changeMode(){
    console.log(mode.value);
    select.resetSelection();
    setMode = mode.value;
}

function changeLayer(){
    console.log(layer.value);
    layerSelected = layer.value;
}