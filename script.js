
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
        this.layerInfo = layerInfo;
        this.layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
    }
    clearLayer(layerName){
        var ids = Object.keys(this.layers[layerName]);
        this.deleteIDs(ids);
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
    constructor(svg, selectpoints){
        this.outlineID = null;
        this.svg = svg;
        this.selectpoints = selectpoints;
        this.selectingPoints = false;

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
            return;
        }
        
        this.svg.getLine(this.outlineID).removePoint();
        this.svg.updateSvgPath(e, this.outlineID);
       
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
function downloadSVG(element=null, fileName=null){
    if(element == null){
        element = svg.element;
        fileName = svg.name;
    }
    console.log(element);
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, element.outerHTML], {type:"image/svg+xml;charset=utf-8"});
    var downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(svgBlob);
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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
    constructor(svg, selectpoints){
        this.svg = svg;
     
        this.baseID = null;
        this.orientDict = {};
        this.selectpoints = selectpoints;
        this.selectingPoints = false;
    }
    reComp(lineID){
        if(!(lineID in this.orientDict)){
            return;
        }
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
        // weird line edge cases
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.baseID = null;
            delete this.orientDict[this.baseID];
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
            this.selectpoints.initSelection( this.baseID);
        }
        else if(this.baseID != null && this.svg.getLine(this.baseID).points.length <= 1){
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
        }
       
    }
    mouseMoveHandler(e){
 
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.baseID = null;
       
            delete this.orientDict[this.baseID];
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
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.baseID = null;
            delete this.orientDict[this.baseID];
        }
        if(this.baseID != null ){
            this.selectpoints.initSelection(this.baseID);
        }
    }
}


function setup(passedSVG=null){
    var svgElementNS = SVGElement(width, height, width, height, svgClass, svgID);
    var svgContainer = document.getElementById("svg-container");
    
    svgContainer.innerHTML = "";
    svgContainer.appendChild(svgElementNS);
    svgElement = document.getElementById(svgID);
    mode = document.getElementById("mode");

    svg = new Svg(svgElement, LAYERSELECTED, layerInfo);
    if(passedSVG != null){
        svg = passedSVG;
        svg.element = svgElement;
        svg.reRender();
    }
    selectpointsmode = new SelectPoints(svg);
    var orientlinemode = new OrientLineMode(svg, selectpointsmode);
    selectpointsmode.orientlinemode = orientlinemode;
    select = new Select(svg, selectpointsmode);
    layerthumbnails = new SvgUI(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon,  selectedCSS);
    var outlinemode = new OutlineMode(svg, selectpointsmode);
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
            select.deleteSelected();
        }
    });
}

function rerenderAssemblage(){
    assemblerElement = assemblerSetup(thumbnailsobj.export());
}


function SVGElement(boxWidth=600 , boxHeight=400,viewBoxWidth = 100, viewBoxHeight=75,  htmlClass="svg", id){
    var xmlns = "http://www.w3.org/2000/svg";
    var svgElem = document.createElementNS(xmlns, "svg");
    svgElem.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgElem.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgElem.setAttributeNS(null, "viewBox", "0 0 " + boxWidth + " " + boxHeight);
    svgElem.setAttributeNS(null, "width", viewBoxWidth);
    svgElem.setAttributeNS(null, "height", viewBoxHeight);
    svgElem.setAttributeNS(null, "id", id);
    svgElem.setAttributeNS(null, "class", htmlClass)
    return svgElem;
}
function makeDiv(id, text="", classCSS=""){
    
    var block_to_insert = document.createElement( 'div' );
    block_to_insert.id = id;
    
    block_to_insert.innerHTML = text;
    block_to_insert.setAttributeNS(null, "class",  classCSS);

    return block_to_insert;
}
function makeButton(text){
    var button = document.createElement( 'button' );
    button.innerHTML = text
    return button
}

class SvgUI{
    constructor(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon, selectedCSS){
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
        this.modeEventListener = {}
        this.destroyLambda = () => {
            var layerContainer = document.getElementById(this.layerDivID);
            layerContainer.innerHTML = ""
        }
        modeInfo.forEach(mode =>{
            var modeButton = document.getElementById(mode.modeButtonDivID);
            this.modeButtons[mode.modeName] = modeButton;
            var modeEventListener = this.changeModeLambda(mode.modeName,modeButton);
            modeButton.onclick = modeEventListener;
            this.modeEventListener[mode.modeName] = modeEventListener;
        })
        layerInfo.forEach(layer => {
            var thumbnailElemNS = SVGElement(width, height, thumbnailWidth, thumbnailHeight, "svg", layer.name);
            var thumbnailDIV = makeDiv(thumbnailElemNS.id + "_container", layer.name, this.thumbnailDivClass);
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
            thumbnailElement.appendChild(path);
            path.outerHTML = line.path.outerHTML;
            path.id = line.id + "_layer_thumbnail"
            return path;
        });
    }
}



class Thumbnails{
    constructor(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDiv, trashIcon, saveIcon, editIcon, resetLambda,  sessionStorageKey){
        this.thumbnailDivID = thumbnailDiv;
        this.thumbnails = {};
        this.numberID = 0;
        this.width = width;
        this.heigth =  height;
        this.thumbnailWidth =  thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.thumbnailDivClass = thumbnailDivClass;
        this.trashicon = trashIcon;
        this.saveicon = saveIcon;
        this.editicon = editIcon;
        this.thumbnailDivs = {};
        this.sessionStorageKey = sessionStorageKey;
        this.resetLambda = resetLambda;
        this.downloadProjectButton =  makeButton("project save");
        this.downloadProjectButton.onclick = this.downloadProjectLambda(); 
        // sessionStorage.removeItem(this.sessionStorageKey);
        if(sessionStorage.getItem(this.sessionStorageKey)){
            this.loadFromSessionStorage();
        }
         
    }
    loadFromSessionStorage(){
        var project = JSON.parse(sessionStorage.getItem(this.sessionStorageKey));
        Object.entries(project).forEach(([key, svgJSON], index) => {
            var svgElement = SVGElement(width, height, width, height, "svg", index.toString());
            var svgClass = new Svg(svgElement, LAYERSELECTED, layerInfo);
            svgClass.fromJSON(svgJSON)
            this.addThumbnail(svgClass);
        })
        this.render();

    }
    addThumbnail(svg){
        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", id);
        var thumbnailDIV = makeDiv(id + "_container", svg.name, this.thumbnailDivClass);
        var deleteButton = makeButton(this.trashicon +  " delete");
        
        var saveButton = makeButton(this.saveicon +  " download");
        var loadButton = makeButton(this.editicon +  "edit");
        thumbnailDIV.appendChild(thumbnailElemNS);
        thumbnailDIV.appendChild(deleteButton);
        thumbnailDIV.appendChild(saveButton);
        thumbnailDIV.appendChild(loadButton);

        $("#" + this.thumbnailDivID).append(thumbnailDIV);
        var thumbnailElement = document.getElementById(id);
        this.thumbnailDivs[thumbnailDIV.id] = thumbnailDIV;
        
        svg.element = thumbnailElement;

        this.thumbnails[thumbnailElement.id] = svg;
        

        deleteButton.onclick = this.deleteDrawingLambda(thumbnailDIV,thumbnailElement);
        saveButton.onclick = this.downloadDrawingLambda(svg);
        loadButton.onclick = this.loadDrawingLambda(thumbnailDIV,thumbnailElement, svg);
    }
    loadDrawingLambda(thumbnailDIV,thumbnailElement, svg){
        const svgDelete = this.deleteDrawingLambda(thumbnailDIV, thumbnailElement);
        const svgEdit = this.editDrawingLambda(svg);
        const svgLoad = (e) => {
            this.resetLambda();
            svgDelete();
            svgEdit();
        }
        return svgLoad;

    }
    editDrawingLambda(svg){
        const editDrawing = (e) =>{
            setup(svg);
        }
        return editDrawing

    }
    downloadDrawingLambda(svg){
        const downloadDrawing = (e) => {
            console.log(svg)
            downloadSVG(svg.element, svg.name);
        }
        return downloadDrawing;

    }
    deleteDrawingLambda(thumbnailDIV,thumbnailElement){
        const deleteDrawing = (e) => {
            delete this.thumbnails[thumbnailElement.id];
            delete this.thumbnailDivs[thumbnailDIV.id];
            this.render();
        }
        return deleteDrawing;

    }
    render(){
        var thumbnailDiv = document.getElementById(this.thumbnailDivID)
        thumbnailDiv.innerHTML = "";
        Object.entries(this.thumbnailDivs).forEach(([_, elem]) => thumbnailDiv.appendChild(elem))
        Object.entries(this.thumbnails).forEach(([_, svg]) => svg.reRender());
        thumbnailDiv.appendChild(this.downloadProjectButton);
    }
    export(){
        return Object.entries(this.thumbnails).map(([_, svg]) => svg);
    }
    downloadProjectLambda(){
        const downloadProject = () =>{
            var exportName = "project_file"
            //https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.thumbnails));
            sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(this.thumbnails));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", exportName + ".json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
        return downloadProject
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
const outlineLayer = "border";
const orientLayer = "orient";
const constructionLayer = "construction";
var LAYERSELECTED = constructionLayer;
const trashicon = `<i class="fa fa-trash" aria-hidden="true"></i>`
const clearicon = `<i class="fa fa-times" aria-hidden="true"></i>`
const savefileicon = ` <i class="fa fa-download" aria-hidden="true"></i> `
const editicon = `<i class="fa fa-pencil" aria-hidden="true"></i> `
const sessionStorageKey = "project"
var svgElement = null;
var svg = null;
var select = null;
var layerthumbnails = null;
var selectpointsmode = null;
var assemblerElement = assemblerStart();
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



setup();
var thumbnailsobj = new Thumbnails(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDivID, trashicon,savefileicon, editicon, layerthumbnails.destroyLambda, sessionStorageKey );
thumbnailsobj.render();


var xMousePos = 0;
var yMousePos = 0;
var lastScrolledLeft = 0;
var lastScrolledTop = 0;

$(document).mousemove(function(event) {
    captureMousePosition(event);
})  

    $(window).scroll(function(event) {
        if(lastScrolledLeft != $(document).scrollLeft()){
            xMousePos -= lastScrolledLeft;
            lastScrolledLeft = $(document).scrollLeft();
            xMousePos += lastScrolledLeft;
        }
        if(lastScrolledTop != $(document).scrollTop()){
            yMousePos -= lastScrolledTop;
            lastScrolledTop = $(document).scrollTop();
            yMousePos += lastScrolledTop;
        }
        // console.log("x = " + xMousePos + " y = " + yMousePos)
        window.status = "x = " + xMousePos + " y = " + yMousePos;
    });
function captureMousePosition(event){
    xMousePos = event.pageX;
    yMousePos = event.pageY;
    window.status = "x = " + xMousePos + " y = " + yMousePos;
    // console.log("x = " + xMousePos + " y = " + yMousePos)
}
function downloadAssemblage(){
    console.log("hello", assemblerElement)
    if(assemblerElement){
        downloadSVG(assemblerElement, "assemblage")
    }
}

function reset(){
    // thumbnailsobj.resetLambda = 

    thumbnailsobj.addThumbnail(svg);
    layerthumbnails.destroy();
    setup();
    thumbnailsobj.render();
}
if (typeof(module) !== "undefined") {
	module.exports.Svg = Svg;
    module.exports.layerInfo = layerInfo;
    module.exports.width = width;
    module.exports.height = height;
    module.exports.SVGElement = SVGElement;
}
