
class Svg {
    constructor(element, activeLayer, layerInfo) {
        this.name = "svg"
        this.uniqueID = 1;
        this.element = element;
        this.tempElems = [];
        this.layerSelected = activeLayer;
        this.layers = {};
        this.text = {};
        this.layerColors = {};
        layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
    }
    clearLayer(){
        console.log("hello!")
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
    getActiveLayer(){
        return Object.entries(this.layers[this.layerSelected]).map(([_, line]) => line);
    }

    addText(point, text, pointIsRelative=false, lineID){
        var color = this.layerColors[this.layerSelected];
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        var textELement = new TextSVG(relativePoint,  this.genTextID(lineID),  text, color)
        this.element.appendChild(textELement.text);
        this.text[textELement.id] = textELement;
        return textELement.id;
    }
    addLine(point, pointIsRelative=false, closed=false){
        var color = this.layerColors[this.layerSelected];
        var line = new Line(this.validID(), closed, color);
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        
        line.appendPoint(relativePoint);
        this.element.appendChild(line.path);
        this.layers[this.layerSelected][line.id] = line;
  
        return line.id;
    }
    getAllIDs(){
        var allIDs = Object.keys(this.layers[this.layerSelected]).map(lineID => lineID);
        return allIDs;
    }
    reRender(){
        this.element.innerHTML = ""
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                this.element.appendChild(line.path);
                line.reRender();
            });
        });
        this.tempElems.forEach(elem =>{
            this.element.appendChild(elem);
        });
        Object.entries(this.text).forEach(([_, elem])=> {
            this.element.appendChild(elem.text);
            elem.reRender();
        })
    }
 
    getLayerAssembler(layer){
        return Object.entries(this.layers[layer]).map(([_, line]) => {
            return line.getPointsArray();
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
            relativePoint = this.relativeMousePosition(point);
        }
        this.layers[this.layerSelected][lineID].appendPoint(relativePoint);
        return lineID;
    }
    clearTemp(){
        this.tempElems = [];
    }

    moveLines(lineIDs, vec){
        lineIDs.map(id => this.layers[this.layerSelected][id].moveByVector(vec));
        lineIDs.forEach(id  => {
            if(this.genTextID(id) in this.text){
                this.text[this.genTextID(id)].moveByVector(vec);
            }
        })
    }
    getLinesInPoint(point){
        var selectedIDs = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine]) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine.id)
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getLinesInRect(rect){
        var selectedIDs = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
            if(curLine.inRect(rect)){
                acc.push(curLine.id)
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getClosestLine(point){
        var relativePoint = this.relativeMousePosition(point);
        var closestLine = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
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
            length: null,
            computeNormals(points){
                var pointSum = {
                    x: points[0].x + points[1].x, 
                    y: points[0].y + points[1].y
                }
                var x = Math.abs(points[0].x - points[1].x)
                var y = Math.abs(points[0].y - points[1].y)
                this.length = Math.sqrt(x * x + y * y);
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
                return [this.average, this.normals, length]
            },
            setNormalToRetrieve(index){
                this.normalIndex = index;
            },
            retrieveAverageNormalLength(){
                return [this.average, this.normals[this.normalIndex], this.length];
            },
        }
        var [_, normals] = pickDir.computeNormals(this.getLine(lineID).points);
        var distNormal2 = dist2(relativePoint, normals[1]);
        var distNormal1 = dist2(relativePoint, normals[0]);
        if(distNormal1 < distNormal2){
            pickDir.setNormalToRetrieve(0);
            return pickDir;
        }
        pickDir.setNormalToRetrieve(1);
        return pickDir;
    }
    deleteIDs(IDs){
        IDs.forEach(id =>{
            if(this.genTextID(id) in this.text){
                delete this.text[this.genTextID(id)];
            }
            if(id in this.layers[this.layerSelected]){
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
    }
    mouseDownHandler(e){
        if(!this.svg.checkMembership(this.outlineID)){
            this.outlineID = this.svg.addLine(e, false, true);
        }
        this.svg.updateSvgPath(e, this.outlineID);
    }
    mouseMoveHandler(e){
        this.svg.getLine(this.outlineID).removePoint();
        this.svg.updateSvgPath(e, this.outlineID);
    }
    mouseUpHandler(){
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

class OrientLineMode{
    constructor(svg){
        this.svg = svg;
        this.baseLength = null;
        this.baseID = null;
        this.orientDict = {};
    }
    reComp(lineID){
        const pickDir = this.orientDict[lineID];
        pickDir.computeNormals(this.svg.getLine(lineID).points);
        var [average, normal, length] = pickDir.retrieveAverageNormalLength();
        this.svg.getLine(lineID).removePoint();
        this.svg.getLine(lineID).removePoint();
        var [b, text] = this.svg.getText(lineID);
        if(b){
            text.point = average;
            text.txt = Math.trunc(length).toString();
        }
        
        this.svg.updateSvgPath(average, lineID, true);
        this.svg.updateSvgPath(normal, lineID, true);
    }
    mouseDownHandler(e){
        if(this.baseID == null){
            this.baseID = this.svg.addLine(e);
            this.svg.updateSvgPath(e, this.baseID);
        }
        else if(this.baseID != null && this.baseLength <= 1){
            this.svg.updateSvgPath(e, this.baseID);
        }
        else{
            const pickDir = this.svg.generatePerp(this.baseID, e);
            this.orientDict[this.baseID] = pickDir;
            var [average, normal, length] = pickDir.retrieveAverageNormalLength();
            this.svg.updateSvgPath(average, this.baseID, true);
            this.svg.updateSvgPath(normal, this.baseID, true);
            this.svg.addText(average, Math.trunc(length).toString(), true, this.baseID);
            this.baseID = null;
            this.baseLength = null;
        }
       
    }
    mouseMoveHandler(e){
        if(this.baseID != null){
            this.svg.getLine(this.baseID).removePoint();
            this.svg.updateSvgPath(e, this.baseID);
        }
    }
    mouseUpHandler(){
        if(this.baseID != null){
            this.baseLength = this.svg.getLine(this.baseID).points.length;
        }
    }
}


function setup(){
    var svgElementNS = SVGElement(width, height, width, height, svgClass, svgID);
    if(layerthumbnails != null){
        layerthumbnails.destroy()
    }
    var svgContainer = document.getElementById("svg-container");
    svgContainer.innerHTML = "";
    svgContainer.appendChild(svgElementNS);
    svgElement = document.getElementById(svgID);
    mode = document.getElementById("mode");
    if(svg){
        thumbnailsobj.addThumbnail(svg);
    }
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
    svg = new Svg(svgElement,layerSelected, layerInfo);
    var orientlinemode = new OrientLineMode(svg);
    select = new Select(svg, new SelectPoints(svg, orientlinemode));
    layerthumbnails = new SVGLayerThumbnails(layerInfo, svg, select, width, height, thumbWidth, thumbHeight, thumbnailClass, layerDivID);
    var outlinemode = new OutlineMode(svg);
    var constructionmode = new ConstructionMode(svg);
    var eventMap = {};

    eventMap[drawMode] = {};
    eventMap[selectMode] = {};
    eventMap[drawMode][constructionLayer] = constructionmode;
    eventMap[drawMode][outlineLayer] = outlinemode;
    eventMap[drawMode][orientLayer] = orientlinemode;
    eventMap[selectMode][constructionLayer] = select;
    eventMap[selectMode][outlineLayer] = select;
    eventMap[selectMode][orientLayer] = select;
    
    svgElement.addEventListener("mousedown", function (e) {
        pressed = true;
        eventMap[setMode][layerSelected].mouseDownHandler(e);
    });
    
    svgElement.addEventListener("mousemove", function (e) {
        if(pressed){
            eventMap[setMode][layerSelected].mouseMoveHandler(e);
        }
    });
    
    svgElement.addEventListener("mouseup", function () {
        pressed = false;
        eventMap[setMode][layerSelected].mouseUpHandler();
        layerthumbnails.reRenderActiveLayer();
    });
    svgElement.addEventListener("dblclick", function (e) {
        if(setMode == selectMode){
            select.doubleClickHandler(e);
        }
        // Double-click detected
    });
    $(document).keyup(function(e){
        if(e.key === "Backspace") {
            select.deleteSelected()
        }
    });
    thumbnailsobj.render();
}

function rerenderAssemblage(){
    assemblerSetup(thumbnailsobj.export());
}

function downloadSVG(){
    svg.downloadSVG();
}

function changeMode(){
    console.log(mode.value);
    select.resetSelection();
    setMode = mode.value;
}
function click(e){
}
function SVGElement(boxWidth=600 , boxHeight=400,viewBoxWidth = 100, viewBoxHeight=75,  htmlClass="thumbnail", id){
    var xmlns = "http://www.w3.org/2000/svg";
    var svgElem = document.createElementNS(xmlns, "svg");
    svgElem.setAttributeNS(null, "viewBox", "0 0 " + boxWidth + " " + boxHeight);
    svgElem.setAttributeNS(null, "width", viewBoxWidth);
    svgElem.setAttributeNS(null, "height", viewBoxHeight);
    svgElem.setAttributeNS(null, "id", id);
    svgElem.setAttributeNS(null, "class", htmlClass)
    return svgElem;
}
function makeDiv(id, text=""){
    var block_to_insert = document.createElement( 'div' );
    block_to_insert.id = id;
    block_to_insert.innerHTML = text;

    return block_to_insert;
}
function makeButton(text){
    var button = document.createElement( 'button' );
    button.innerHTML = text
    return button
}
function layerChange(e){
    console.log(e.target.id);
    select.resetSelection();
    layerSelected = e.target.id;
    svg.layerSelected = layerSelected;
}
function clearLayer(e){
    console.log(e);
}
class SVGLayerThumbnails{
    constructor(layerInfo, svg, select, width, height, thumbWidth, thumbHeight, thumbnailClass, layerDivID){
        this.svg = svg;
        this.select = select;
        this.layerElements = {};
        this.width = width;
        this.heigth =  height;
        this.thumbWidth =  thumbWidth;
        this.thumbHeight = thumbHeight;
        this.thumbnailClass = thumbnailClass;
        this.layerDivID = layerDivID;
        this.layerDivElement =  document.getElementById(this.layerDivID)
        layerInfo.forEach(layer => {
            var thumbnailElemNS = SVGElement(width, height, thumbWidth, thumbHeight, thumbnailClass, layer.name);
            var thumbnailDIV = makeDiv(thumbnailElemNS.id + "_container", layer.name);
            var clearButton = makeButton("clear layer");
            thumbnailDIV.appendChild(thumbnailElemNS);
            thumbnailDIV.appendChild(clearButton);
            this.layerDivElement.append(thumbnailDIV);
            var thumbnailElem = document.getElementById(layer.name);
            this.layerElements[layer.name] = thumbnailElem;
            thumbnailElem.addEventListener("mousedown", layerChange, false);
            clearButton.onclick = clearLayer;
        });
    }
    destroy(){
        var layerContainer = document.getElementById(this.layerDivID);
        layerContainer.innerHTML = ""
    }
    reRenderActiveLayer(){
        var lineElems = this.svg.getActiveLayer();
        var thumbnailElement = this.layerElements[this.svg.layerSelected]
        thumbnailElement.innerHTML = "";
        lineElems.forEach(line => {
            var path =  document.createElementNS('http://www.w3.org/2000/svg', 'path');
            thumbnailElement.appendChild(path)
            path.outerHTML = line.path.outerHTML;
            path.id = line.id + "_layer_thumbnail"
            return path;
        });
        console.log(thumbnailElement);
    }
}

class Thumbnails{
    constructor(width, height, thumbWidth, thumbHeight, thumbnailClass, thumbnailDiv){
        this.thumbnailDiv = thumbnailDiv;
        this.thumbnails = {};
        this.numberID = 0;
        this.width = width;
        this.heigth =  height;
        this.thumbWidth =  thumbWidth;
        this.thumbHeight = thumbHeight;
        this.thumbnailClass = thumbnailClass;
    }
    generateThumbnailElement(){

        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbWidth, this.thumbHeight, this.thumbnailClass, id);
        $("#" + this.thumbnailDiv).append(thumbnailElemNS);
        var thumbnail_element = document.getElementById(id);        
        return thumbnail_element;
    }
    addThumbnail(svg){
        var thumbnailElement = this.generateThumbnailElement();
        svg.element = thumbnailElement;
        this.thumbnails[thumbnailElement.id] = svg;
    }
    render(){
        Object.entries(this.thumbnails).forEach(([_, svg]) => svg.reRender());
    }
    export(){
        return Object.entries(this.thumbnails).map(([_, svg]) => svg);
    }
}

var width = 600;
var height = 400;
var thumbHeight = Math.ceil(height / 4);
var thumbWidth = Math.ceil(width / 4);
var thumbnailClass = "thumbnail"
var thumbnailDivID = "thumbnail-container"
var layerDivID = "layer-container"
var svgID = "svgElement";
var svgClass = "svg";
var drawMode = "draw";
var selectMode = "select";
var setMode = drawMode;
var pressed = false;
var outlineLayer = "outline";
var orientLayer = "orient";
var constructionLayer = "construction";
var layerSelected = constructionLayer;
var svgElement = null;
var mode = null;
var svg = null;
var select = null;
var layerthumbnails = null;
var thumbnailsobj = new Thumbnails(width, height, thumbWidth, thumbHeight, thumbnailClass, thumbnailDivID);

setup();
if (typeof(module) !== "undefined") {
	module.exports.Svg = Svg;
    module.exports.layerInfo = layerInfo;
}
