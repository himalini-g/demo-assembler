
var svgHTML = "<svg class=\"svg\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"svgElement\" x=\"0px\" y=\"0px\" width=\"600px\" height=\"400px\" viewBox=\"0 0 600 400\" enable-background=\"new 0 0 600 400\" xml:space=\"preserve\"></svg>"


var drawMode = "draw";
var selectMode = "select";
var selectPointsMode = "select points";
var setMode = drawMode;
var pressed = false;
var dragged = false;
var outlineLayer = "outline";
var orientLayer = "orient";
var constructionLayer = "construction";
var layerSelected = constructionLayer;
var svgElement = null;
var mode = null;
var layer = null;
var svg = null;
var select = null;
var selectpointsmode = null;
var outlinemode = null;
var orientlinemode = null;
var constructionmode = null;
var thumbnails = [];

const layerInfo = 
[
    {
        name: outlineLayer,
        color: "#FF0000",
    },
    {
        name: orientLayer,
        color: "#00FF00",
    },
    {
        name: constructionLayer,
        color: "#000000",
    }
]
class Svg {
    constructor(element, activeLayer, layerInfo) {
        this.name = "svg"
        this.uniqueID = 1;
        this.element = element;
        this.tempElems = [];
        this.layerSelected = activeLayer;
        this.layers = {};
        this.layerColors = {};
        layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
    }
    setElement(element){
        this.element = element;
    }
    setLayer(layer){
        this.layerSelected = layer;
    }
    activeLayer(){
        return this.layerSelected;
        
    }
    removeLinePoint(lineID, index=null){
        var key = this.activeLayer();
        this.layers[key][lineID].removePoint(index);

    }
    relativeMousePosition(point){
        var parentRect = this.element.getBoundingClientRect();
        return {
            x: point.pageX - parentRect.left,
            y: point.pageY - parentRect.top
        }
    }
    validID(){
        var ID = this.uniqueID;
        this.uniqueID += 1;
        return ID;
    }
    addTempElem(elem){
        this.tempElems.push(elem);
    }
    addLine(point, pointIsRelative=false){
        var key = this.activeLayer();
        var color = this.layerColors[key];
        var line = new Line(this.validID(), false, color);

        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        

        line.appendPoint(relativePoint);
        this.element.appendChild(line.path);
        this.layers[key][line.getID()] = line;
  
        return line.getID();
    }
    getAllIDs(){
        var key = this.activeLayer();
        var allIDs = Object.keys(this.layers[key]).map(lineID => lineID);
        return allIDs;
    }
    reRender(){
        this.element.innerHTML = ""
        for (const [_, value] of Object.entries(this.layers)) {
            Object.entries(value).map(([_, line]) => {
                this.element.appendChild(line.path);
                line.reRender();
            });
        }
        this.tempElems.forEach(elem =>{
            this.element.appendChild(elem);
        });
    }
    // getLinePoints(lineIDs){
    //     var key = this.activeLayer();
    //     return Object.entries(this.layers[key]).map(([_, line]) => {
    //         return line.getPoints();
    //     })

    // }
    getLayerAssembler(layer){
        return Object.entries(this.layers[layer]).map(([_, line]) => {
            return line.getPointsArray();
        })
    }
    updateSvgPath(point, lineID, pointIsRelative=false) {
        var key = this.activeLayer();
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        this.layers[key][lineID].appendPoint(relativePoint);
        return lineID;
       
    }
    clearTemp(){
        this.tempElems = [];
    }
    lineRerender(lineID){
        var key = this.activeLayer();
        var line = this.layers[key][lineID];
        line.reRender();

    }
    movePointInLine(lineID, index, vec){
 
        var key = this.activeLayer();
        var line = this.layers[key][lineID];
        line.movePoint(index, vec);

    }

    moveLines(lineIDs, vec){
        var key = this.activeLayer();
        lineIDs.map(id => this.layers[key][id].moveByVector(vec));
    }
    getLineLength(lineID){
        var key = this.activeLayer();
        return this.layers[key][lineID].getLength();

    }
    getLinePoints(lineID) {
        var key = this.activeLayer();
        return this.layers[key][lineID].getPoints();
    }
    getLinesInPoint(point){
        var key = this.activeLayer();
        var selectedIDs = Object.entries(this.layers[key]).reduce((acc, [_,curLine]) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine.getID())
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getLinesInRect(rect){
        var key = this.activeLayer();

        var selectedIDs = Object.entries(this.layers[key]).reduce((acc, [_,curLine])=> {
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
            this.outlineID = this.svg.addLine(e)
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
            this.svg.removeLinePoint(this.lineID);
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
class SelectPoints{
    constructor(svg){
        this.svg = svg;
        this.tolerance = 5;
        this.lineID = null;
        this.pointDict = {};
        this.circleTarget = null;
        this.moveVec = {
            x:0,
            y:0
        };
        this.oldCursorPosition = {
            x:0,
            y:0
        };
    }
    mouseDownHandler(e){
        this.svg.clearTemp();
        this.svg.reRender();
        if(this.lineID == null){
            var point = svg.relativeMousePosition(e);
            this.lineID = this.svg.getAllIDs()[0];
            this.renderPoints();
            this.moveVec = {
                x:0,
                y:0
            };
            this.oldCursorPosition = point;
        }
    }
    mouseMoveHandler(e){
        var circleTarget = e.target;
        var id = circleTarget.id;
        if(id in this.pointDict && this.circleTarget == null){
            this.circleTarget = id;
        }
        if(this.circleTarget !== null){
            var point = svg.relativeMousePosition(e);
            this.moveVec = {
                x: point.x -  this.oldCursorPosition.x,
                y: point.y -  this.oldCursorPosition.y,
            }
            this.oldCursorPosition = point;
            var point = this.pointDict[this.circleTarget].point;
            var index = this.pointDict[this.circleTarget].index;
            point.moveByVector(this.moveVec);
            this.svg.movePointInLine(this.lineID, index, this.moveVec);
            this.svg.lineRerender(this.lineID);
            point.reRender();

        }

    }
    renderPoints(){
       
        var points = this.svg.getLinePoints(this.lineID);
        points.forEach((point, index) => {
            var pointElem = new Point(point, index, this.tolerance);
            this.pointDict[pointElem.getID()] = {
                point: pointElem,
                index: index
            };
            this.svg.addTempElem(pointElem.circle);
        });
        this.svg.reRender();
    }
    mouseUpHandler(e){
        console.log("hello")
        this.lineID = null;
        this.pointDict = {};
        this.circleTarget = null;
        this.moveVec = {
            x:0,
            y:0
        };
        this.oldCursorPosition = {
            x:0,
            y:0
        };
        
        
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
            this.curPenMode.mouseDownHandler(average, true);
            this.curPenMode.mouseUpHandler();
            this.curPenMode.mouseDownHandler(normal, true);
            this.curPenMode.mouseUpHandler();
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
        this.svg.addTempElem(this.selectionBox);
        // this.svg.element.appendChild(this.selectionBox);
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
        console.log(e.target);
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
        console.log(e.target);
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
            this.svg.moveLines(this.selected, this.moveVec);
            this.svg.reRender();
            this.svg.addTempElem(this.selectionBox);
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

function setup(){
   
    $("#svg-container").html(svgHTML);
    svgElement = document.getElementById("svgElement");
    mode = document.getElementById("mode");
    layer = document.getElementById("layer");
    if(svg){
        thumbnails.push(svg);
     
        assemblerSetup(thumbnails);
    }
    svg = new Svg(svgElement,layerSelected, layerInfo);
    
    select = new Select(svg);
    selectpointsmode = new SelectPoints(svg);
    outlinemode = new OutlineMode(svg);
    orientlinemode = new OrientLineMode(svg);
    constructionmode = new ConstructionMode(svg);
    
    svgElement.addEventListener("mousedown", function (e) {
        pressed = true;
        if(setMode == drawMode && layerSelected == constructionLayer){
            constructionmode.mouseDownHandler(e);
        } else if(setMode == selectPointsMode){
            selectpointsmode.mouseDownHandler(e);
        } else if(setMode === selectMode){
            select.mouseDownHandler(e);
        } else if(setMode === drawMode && layerSelected == outlineLayer){
            outlinemode.mouseDownHandler(e);
        } else if(setMode == drawMode && layerSelected == orientLayer){
            orientlinemode.mouseDownHandler(e);
        }
    });
    
    svgElement.addEventListener("mousemove", function (e) {
        if(pressed){
            dragged = true;
        }
        if(pressed && setMode == drawMode && layerSelected == constructionLayer){
            constructionmode.mouseMoveHandler(e);
        } else if(pressed && setMode == selectPointsMode){
            selectpointsmode.mouseMoveHandler(e);
        } else if (pressed && setMode == selectMode){
            select.mouseMoveHandler(e);
        } else if(pressed && setMode === drawMode && layerSelected == outlineLayer){
            outlinemode.mouseDownHandler(e);
        } else if(pressed && setMode == drawMode && layerSelected == orientLayer){
            orientlinemode.mouseMoveHandler(e);
        }
    });
    
    svgElement.addEventListener("mouseup", function () {
        pressed = false;
        dragged = false;
        if(setMode == selectMode){
            select.clickedInSelection = false;
            select.resetSelectionBox();
        } else if(setMode == selectPointsMode){
            selectpointsmode.mouseUpHandler()
        } else if(setMode == drawMode && layerSelected == outlineLayer){
            outlinemode.mouseUpHandler();
        } else if( setMode == drawMode && layerSelected == orientLayer){
            orientlinemode.mouseUpHandler();
        } 
        
    });
    svgElement.addEventListener("dblclick", function () {
        if(setMode == selectMode){
            select.clickedInSelection = false;
            select.resetSelectionBox();
            select.doubleClickHandler();
        }
        // Double-click detected
    });
    renderThumbnails();
}
function rerenderAssemblage(){
    assemblerSetup(thumbnails);

}
function downloadSVG(){
    svg.downloadSVG();
}




function changeMode(){
    console.log(mode.value);
    select.resetSelection();
    setMode = mode.value;
}

function changeLayer(){
    console.log(layer.value);
    select.resetSelection();
    layerSelected = layer.value;
    svg.setLayer(layerSelected);
}
function click(){
    console.log("o_0");
}
class Thumbnails{
    constructor(){
        this.svg = svg;
        this.thumbnails = [];
    }
    addThumbnail(){

    }
}
function renderThumbnails(){

    $("#thumbnail-container").html("<div id=\"thumbnails\"></div>");
    var thumbnail_container = document.getElementById("thumbnails");
    thumbnails.forEach(function (thumbnail, i)
    {
        var id = i.toString() + "_thumbnail";
        var thumbnailHTML = "<svg onclick=\"click()\" class=\"thumbnail\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"" + id + "\"x=\"0px\" y=\"0px\" width=\"150px\" height=\"100px\" viewBox=\"0 0 600 400\" enable-background=\"new 0 0 200 200\" xml:space=\"preserve\"></svg>"
        $("#thumbnail-container").append(thumbnailHTML)
        var thumbnail_element = document.getElementById(id);
        thumbnail.setElement(thumbnail_element);
        thumbnail.reRender();
        console.log(thumbnail_container);
    })
}

setup();

if (typeof(module) !== "undefined") {
	module.exports.Svg = Svg;
    module.exports.layerInfo = layerInfo;
    module.exports.outlineLayer = outlineLayer;
    module.exports.orientLayer = orientLayer;
    module.exports.constructionLayer = constructionLayer;
}
