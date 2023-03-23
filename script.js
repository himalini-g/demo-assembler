
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
    clearLayer(layerName){
        this.layers[layerName] = {};
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
 
    getLayer(layerName){
        return Object.entries(this.layers[layerName]).map(([_, line]) => line);

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
    svg = new Svg(svgElement,LAYERSELECTED, layerInfo);
    var orientlinemode = new OrientLineMode(svg);
    select = new Select(svg, new SelectPoints(svg, orientlinemode));
    layerthumbnails = new SvgUI(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon,  selectedCSS);
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
        eventMap[SETMODE][LAYERSELECTED].mouseDownHandler(e);
    });
    
    svgElement.addEventListener("mousemove", function (e) {
        if(pressed){
            eventMap[SETMODE][LAYERSELECTED].mouseMoveHandler(e);
        }
    });
    
    svgElement.addEventListener("mouseup", function () {
        pressed = false;
        eventMap[SETMODE][LAYERSELECTED].mouseUpHandler();
        layerthumbnails.reRenderLayer(svg.layerSelected);
    });
    svgElement.addEventListener("dblclick", function (e) {
        if(SETMODE == selectMode){
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
function SVGElement(boxWidth=600 , boxHeight=400,viewBoxWidth = 100, viewBoxHeight=75,  htmlClass="svg", id){
    var xmlns = "http://www.w3.org/2000/svg";
    var svgElem = document.createElementNS(xmlns, "svg");
    svgElem.setAttributeNS(null, "viewBox", "0 0 " + boxWidth + " " + boxHeight);
    svgElem.setAttributeNS(null, "width", viewBoxWidth);
    svgElem.setAttributeNS(null, "height", viewBoxHeight);
    svgElem.setAttributeNS(null, "id", id);
    svgElem.setAttributeNS(null, "class", htmlClass)
    return svgElem;
}
function makeDiv(id, text="", classCSS=""){
    console.log(classCSS);
    var block_to_insert = document.createElement( 'div' );
    block_to_insert.id = id;
    
    block_to_insert.innerHTML = text;
    block_to_insert.setAttributeNS(null, "class",  classCSS);

    return block_to_insert;
}
function makeButton(text){
    var button = document.createElement( 'button' );
    console.log(text);
    button.innerHTML = text
    return button
}

class SvgUI{
    constructor(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon, selectedCSS){
        console.log(modeInfo);
        this.svg = svg;
        this.select = select;
        this.layerElements = {};
        this.layerDivElements= {};
        this.width = width;
        this.heigth =  height;
        this.thumbnailWidth =  thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.thumbnailDivClass = thumbnailDivClass;
        this.layerDivID = layerDivID;
        this.icon = clearicon;
        this.selectedCSS = selectedCSS
        this.layerDivElement =  document.getElementById(this.layerDivID)
        this.modeButtons = {}
        modeInfo.forEach(mode =>{
            var modeButton = document.getElementById(mode.modeButtonDivID);
            console.log(modeButton);
            this.modeButtons[mode.modeName] = modeButton;
            modeButton.onclick = this.changeModeLambda(mode.modeName,modeButton);
        })
        layerInfo.forEach(layer => {
            var thumbnailElemNS = SVGElement(width, height, thumbnailWidth, thumbnailHeight, "svg", layer.name);
            var thumbnailDIV = makeDiv(thumbnailElemNS.id + "_container", layer.name, this.thumbnailDivClass);
            console.log(this.icon);
            var clearButton = makeButton(this.icon + " clear layer");
            thumbnailDIV.appendChild(thumbnailElemNS);
            thumbnailDIV.appendChild(clearButton);
            this.layerDivElement.append(thumbnailDIV);
            var thumbnailElem = document.getElementById(layer.name);
            this.layerElements[layer.name] = thumbnailElem;
            this.layerDivElements[layer.name] = thumbnailDIV;
            this.layerDivs
            thumbnailDIV.addEventListener("mousedown", this.changeLayerLambda(layer.name, thumbnailDIV ), false, );
            clearButton.onclick = this.clearLayerLambda(layer.name);
        });
    }
    changeModeLambda(modeName, modeButton){
        const changeMode = e =>{
            Object.entries(this.modeButtons).forEach(([_, div]) =>div.classList.remove(this.selectedCSS))
            modeButton.classList.add(this.selectedCSS);
            console.log(modeButton);
            this.select.resetSelection();
            SETMODE = modeName;
            
        }
        return changeMode;
    }
    changeLayerLambda(name, thumbnailDIV ){
        const changeSVGLayer = e =>{
            this.select.resetSelection();
            LAYERSELECTED = name;
            Object.entries(this.layerDivElements).forEach(([_, div]) => div.classList.remove(this.selectedCSS))
            thumbnailDIV.classList.add(this.selectedCSS);
            this.svg.layerSelected = name;
        }
        return changeSVGLayer;
    }
    clearLayerLambda(name){
        const clearSVGLayer = (e) => {
            this.svg.clearLayer(name);
            this.svg.reRender();
            this.reRenderLayer(name);
        };
        return clearSVGLayer
    }
    destroy(){
        var layerContainer = document.getElementById(this.layerDivID);
        layerContainer.innerHTML = ""
    }
  
    reRenderLayer(layerName){
        var lineElems = this.svg.getLayer(layerName);
        var thumbnailElement = this.layerElements[this.svg.layerSelected]
        thumbnailElement.innerHTML = "";
        lineElems.forEach(line => {
            var path =  document.createElementNS('http://www.w3.org/2000/svg', 'path');
            thumbnailElement.appendChild(path)
            path.outerHTML = line.path.outerHTML;
            path.id = line.id + "_layer_thumbnail"
            return path;
        });
    }
}

class Thumbnails{
    constructor(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDiv){
        this.thumbnailDiv = thumbnailDiv;
        this.thumbnails = {};
        this.numberID = 0;
        this.width = width;
        this.heigth =  height;
        this.thumbnailWidth =  thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.thumbnailDivClass = thumbnailDivClass;
    }
    generateThumbnailElement(){

        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", id);
        $("#" + this.thumbnailDiv).append(thumbnailElemNS);
        var thumbnail_element = document.getElementById(id);        
        return thumbnail_element;
    }
    addThumbnail(svg){
        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", id);
        var thumbnailDIV = makeDiv(id + "_container", svg.name, this.thumbnailDivClass);
        var deleteButton = makeButton( "delete drawing");
        thumbnailDIV.appendChild(thumbnailElemNS);
        thumbnailDIV.appendChild(deleteButton);

        $("#" + this.thumbnailDiv).append(thumbnailDIV);
        var thumbnailElement = document.getElementById(id);
        svg.element = thumbnailElement;
        this.thumbnails[thumbnailElement.id] = svg;
        
        // var thumbnailElemNS = SVGElement(width, height, thumbnailWidth, thumbnailHeight, "svg", layer.name);
        // var thumbnailDIV = makeDiv(thumbnailElemNS.id + "_container", layer.name, this.thumbnailDivClass);
        // console.log(this.icon);
        // var clearButton = makeButton(this.icon + " clear layer");
        // thumbnailDIV.appendChild(thumbnailElemNS);
        // thumbnailDIV.appendChild(clearButton);
        // this.layerDivElement.append(thumbnailDIV);
        // var thumbnailElem = document.getElementById(layer.name);
        // this.layerElements[layer.name] = thumbnailElem;
        // this.layerDivElements[layer.name] = thumbnailDIV;
        // this.layerDivs
        // thumbnailDIV.addEventListener("mousedown", this.changeLayerLambda(layer.name, thumbnailDIV ), false, );
        // clearButton.onclick = this.clearLayerLambda(layer.name);
        
    }
    render(){
        Object.entries(this.thumbnails).forEach(([_, svg]) => svg.reRender());
    }
    export(){
        return Object.entries(this.thumbnails).map(([_, svg]) => svg);
    }
}
const width = 800;
const height = 600;
const thumbnailHeight = Math.ceil(height / 4);
const thumbnailWidth = Math.ceil(width / 4);
const thumbnailDivClass = "thumbnail-container"
const thumbnailDivID = "thumbnail-container"
const selectedCSS = "selected-element" 
const layerDivID = "layer-container"
const svgID = "svgElement";
const svgClass = "svg";
const drawMode = "draw";
const drawModeButtonID = "draw-button";
const selectMode = "select";
const selectModeButtonID = "select-button";
var SETMODE = drawMode;
const modeInfo = [
    {
        modeName: drawMode,
        modeButtonDivID: drawModeButtonID
    },
    {
        modeName: selectMode,
        modeButtonDivID: selectModeButtonID
    },
]
var pressed = false;
const outlineLayer = "outline";
const orientLayer = "orient";
const constructionLayer = "construction";
var LAYERSELECTED = constructionLayer;
const trashicon = `<i class="fa fa-trash" aria-hidden="true"></i>`
const clearicon = `<i class="fa fa-times" aria-hidden="true"></i>`
var svgElement = null;
var svg = null;
var select = null;
var layerthumbnails = null;
var thumbnailsobj = new Thumbnails(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDivID);

setup();
if (typeof(module) !== "undefined") {
	module.exports.Svg = Svg;
    module.exports.layerInfo = layerInfo;
    module.exports.width = width;
    module.exports.height = height;
}
