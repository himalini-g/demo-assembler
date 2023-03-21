
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
    addLine(point, pointIsRelative=false, closed=false){
        var key = this.activeLayer();
        var color = this.layerColors[key];
        var line = new Line(this.validID(), closed, color);

        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        
        line.appendPoint(relativePoint);
        this.element.appendChild(line.path);
        this.layers[key][line.id] = line;
  
        return line.id;
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
        return this.layers[key][lineID].length;

    }
    getLinePoints(lineID) {
        var key = this.activeLayer();
        return this.layers[key][lineID].points;
    }
    getLinesInPoint(point){
        var key = this.activeLayer();
        var selectedIDs = Object.entries(this.layers[key]).reduce((acc, [_,curLine]) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine.id)
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getLinesInRect(rect){
        var key = this.activeLayer();

        var selectedIDs = Object.entries(this.layers[key]).reduce((acc, [_,curLine])=> {
            if(curLine.inRect(rect)){
                acc.push(curLine.id)
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getClosestLine(point){
        var key = this.activeLayer();
        var relativePoint = this.relativeMousePosition(point);
        var closestLine = Object.entries(this.layers[key]).reduce((acc, [_,curLine])=> {
            var distance = minDistanceToLine(relativePoint, curLine.points);
            if( distance < acc.distance ){
                acc.distance = distance;
                acc.lineID = curLine.id;
            }
            return acc;
        }, {distance: Infinity, lineID: null});
        return closestLine;
    }
    generatePerp(lineID, point){
        var relativePoint = this.relativeMousePosition(point);
        const pickDir = {
            average: null,
            vector: null,
            normals: null,
            normalIndex: null,
            computeNormals(points){
                var pointSum = {
                    x: points[0].x + points[1].x, 
                    y: points[0].y + points[1].y
                }
                this.average = {
                    x: pointSum.x / 2.0,
                    y: pointSum.y / 2.0
                };
                this.vector = {
                    x: points[1].x - points[0].x,
                    y: points[1].y - points[0].y,
                };
                var normal1 = {
                    x: (this.vector.y * -1) + this.average.x,
                    y: this.vector.x  + this.average.y,
                }
                var normal2 = {
                    x: this.vector.y + this.average.x,
                    y: (this.vector.x * -1)  + this.average.y,
                }
                this.normals = [normal1, normal2];
                return [this.average, this.normals]
            },
            setNormalToRetrieve(index){
                this.normalIndex = index;
            },
            retrieveAverageNormal(){
                return [this.average, this.normals[this.normalIndex]];
            },
        }
        var [_, normals] = pickDir.computeNormals(this.getLinePoints(lineID));
        var distNormal2 = dist2(relativePoint, normals[1]);
        var distNormal1 = dist2(relativePoint, normals[0]);
        if(distNormal1 < distNormal2){
            pickDir.setNormalToRetrieve(0);
            return pickDir;
        }
        pickDir.setNormalToRetrieve(1);
        return pickDir;
    }

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
            this.outlineID = this.svg.addLine(e, false, true);
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
    constructor(svg, orientlinemode){
        this.orientlinemode = orientlinemode;
        this.svg = svg;
        this.tolerance = 2;
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
    reset(){
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
        this.svg.clearTemp();
        this.svg.reRender();

    }
    initSelection(e, passedLineID){
        this.svg.clearTemp();
        this.svg.reRender();
        this.lineID = passedLineID;
        this.renderPoints();
        this.moveVec = {
            x:0,
            y:0
        };
        var point = svg.relativeMousePosition(e);
        this.oldCursorPosition = point;

    }
    mouseDownHandler(e){
        var circleTarget = e.target;
        var id = circleTarget.id;
        this.circleTarget = id;
        this.moveVec = {
            x:0,
            y:0
        };
        var point = svg.relativeMousePosition(e);
        this.oldCursorPosition = point;
    }
    clickInPoint(e){
        var circleTarget = e.target;
        var id = circleTarget.id;
        if(id in this.pointDict){
            return true;
        }
        return false;
    }
    mouseMoveHandler(e){
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
        if(layerSelected == orientLayer){
            this.orientlinemode.reComp(this.lineID);
        }

        this.svg.lineRerender(this.lineID);
        point.reRender();
    }
    mouseUpHandler(e){
        this.circleTarget = null;
    }
    renderPoints(){
       
        var points = this.svg.getLinePoints(this.lineID);
        if(layerSelected == orientLayer){
            console.log('hello');
            points = points.slice(0, 2);
        }
        points.forEach((point, index) => {
            var pointElem = new Point(point, index, this.tolerance);
            this.pointDict[pointElem.id] = {
                point: pointElem,
                index: index
            };
            this.svg.addTempElem(pointElem.circle);
        });
        this.svg.reRender();
    }
    mouseUpHandler(e){
  
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
        this.orientDict = {};

    }
    reComp(lineID){
        const pickDir = this.orientDict[lineID];
        pickDir.computeNormals(this.svg.getLinePoints(lineID));
        var [average, normal] = pickDir.retrieveAverageNormal();
        this.svg.removeLinePoint(lineID);
        this.svg.removeLinePoint(lineID);
        this.svg.updateSvgPath(average, lineID, true);
        this.svg.updateSvgPath(normal, lineID, true);
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
            const pickDir = this.svg.generatePerp(this.baseID, e);
            this.orientDict[this.baseID] = pickDir;
            var [average, normal] = pickDir.retrieveAverageNormal();
            this.curPenMode.mouseDownHandler(average, true);
            this.curPenMode.mouseUpHandler();
            this.curPenMode.mouseDownHandler(normal, true);
            this.curPenMode.mouseUpHandler();
            this.baseID = null;
            this.baseLength = null;
            this.curPenMode = null;

        }
       
    }
    movePointHandler(e, lineID){
      

        

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
    constructor(svg, selectpoints){
        this.svg = svg;
        this.selectpoints = selectpoints;
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

        this.selectingPoints = false;
    }
    isSelected(){
        return this.selected.length > 0;
    }
    doubleClickHandler(e){
        var closestLine = svg.getClosestLine(e);
        console.log(closestLine);
        var closestLineID = closestLine.lineID;
        this.resetSelection();
        this.selectingPoints = true;
        this.selected = [closestLineID];
        this.selectpoints.initSelection(e, closestLineID);
        
    }
    mouseDownHandler(e){
        if(this.selectingPoints){
            var inPoint = this.selectpoints.clickInPoint(e);
            console.log("inpoint", inPoint);
            if(!inPoint){
                this.selectingPoints = false;
                this.resetSelection();
                this.selectpoints.reset();
                this.startSelection(e);
            }
            this.selectpoints.mouseDownHandler(e, this.selected[0]);
        } else {
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
    }
    mouseMoveHandler(e){
        if(this.selectingPoints){
            this.selectpoints.mouseMoveHandler(e);
        } else {
            if(this.clickedInSelection){
                this.updateSelectionBox(e);
                this.updateMoveVec(e);
                this.svg.moveLines(this.selected, this.moveVec);
                this.svg.reRender();
                this.svg.addTempElem(this.selectionBox);
            } else {
                this.updateSelectionBox(e);
                this.setSelectionBox();
                this.setSelectedLines();
            }

        }  
    }
    mouseUpHandler(){
        this.clickedInSelection = false;
        this.resetSelectionBox();
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
        //click point criteria

        //selection box criteria
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
    
    updateSelectionBox(e){
        var point = svg.relativeMousePosition(e);
        var [minX, maxX] = [Math.min(point.x, this.originalLeftTopCorner.x), Math.max(point.x, this.originalLeftTopCorner.x)];
        var [minY, maxY] = [Math.min(point.y, this.originalLeftTopCorner.y), Math.max(point.y, this.originalLeftTopCorner.y)];
        this.selectionLeftTopCorner = {
            x: minX,
            y: minY,
        };

        this.selectionBottomRightCorner = {
            x: maxX,
            y: maxY,
        };
    }
    updateMoveVec(e){
        var point = svg.relativeMousePosition(e);
        this.moveVec = {
            x: point.x -  this.oldCursorPosition.x,
            y: point.y -  this.oldCursorPosition.y,
        }
        this.oldCursorPosition = point;

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
    orientlinemode = new OrientLineMode(svg);
    selectpointsmode = new SelectPoints(svg, orientlinemode);
    select = new Select(svg, selectpointsmode);
    outlinemode = new OutlineMode(svg);
    
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
    svgElement.addEventListener("dblclick", function (e) {
        if(setMode == selectMode){
            select.clickedInSelection = false;
            select.resetSelectionBox();
            select.doubleClickHandler(e);
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
