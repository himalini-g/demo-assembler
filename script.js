class GlobalState{
    constructor(){
        this.tileCounter = 0;
        this.width = 800;
        this.height = 600;
        this.thumbnailHeight = Math.ceil(this.height / 4);
        this.thumbnailWidth = Math.ceil(this.width / 4);
        this.thumbnailDivClass = "thumbnail-container"
        this.thumbnailDivID = "thumbnail-container"
        this.selectedCSS = "selected-element" 
        this.layerDivID = "layer-container"
        this.svgContainerId = "svg-container"
        this.svgID = "svgElement";
        this.svgClass = "svg";
        this.drawMode = "draw";
        this.drawModeButtonID = "draw-button";
        this.selectMode = "select";
        this.selectModeButtonID = "select-button";
        this.thumbnailDivs = {};

        this.SETMODE = this.drawMode;
        this.modeInfo = [
            {
                modeName: this.drawMode,
                modeButtonDivID: this.drawModeButtonID
            },
            {
                modeName: this.selectMode,
                modeButtonDivID: this.selectModeButtonID
            },
        ]

        this.outlineLayer = "border";
        this.orientLayer = "orient";
        this.constructionLayer = "construction";
        this.constructionmode = null;
        this.outlinemode = null;


        this.pressed = false;
        
        this.LAYERSELECTED = this.constructionLayer;




        this.trashicon = `<i class="fa fa-trash" aria-hidden="true"></i>`
        this.clearicon = `<i class="fa fa-times" aria-hidden="true"></i>`
        this.savefileicon = ` <i class="fa fa-download" aria-hidden="true"></i> `
        this.editicon = `<i class="fa fa-pencil" aria-hidden="true"></i> `
        this.sessionStorageKey = "project"
        this.invalidCSS = "invalid"
        this.svgElement = null;
        this.svg = null;
        this.select = null;
        this.layerthumbnails = null;
        this.selectpointsmode = null;
        this.orientlinemode = null;
        this.select = null;

        // TODO: deal with
        this.assemblerElement = assemblerStart(this.width, this.height);
        this.layerInfo = 
        [
            {
                name: this.outlineLayer,
                color: "#A000F0",
            },
            {
                name: this.orientLayer,
                color: "#00FF00",
            },
            {
                name: this.constructionLayer,
                color: "#000000",
            }
        ]
        this.eventMap = {}
        this.layerElements = {};
        this.layerDivElements= {};
        this.modeButtons = {};
        this.modeEventListener = {};


        this.tiles = {};
        this.tileSVGID = 0;

        this.downloadProjectButton;

    }
    bindEventHandlers(){
        this.eventMap[this.drawMode] = {};
        this.eventMap[this.selectMode] = {};
        this.eventMap[this.drawMode][this.constructionLayer] = this.constructionmode;
        this.eventMap[this.drawMode][this.outlineLayer] = this.outlinemode;
        this.eventMap[this.drawMode][this.orientLayer] = this.orientlinemode;
        this.eventMap[this.selectMode][this.constructionLayer] = this.select;
        this.eventMap[this.selectMode][this.outlineLayer] = this.select;
        this.eventMap[this.selectMode][this.orientLayer] = this.select;
        
        this.mouseDown = (e) => {
            this.pressed = true;
            this.eventMap[this.SETMODE][this.LAYERSELECTED].mouseDownHandler(e);
        }
        this.mouseMove = (e) =>{
            if(this.pressed){
                this.eventMap[this.SETMODE][this.LAYERSELECTED].mouseMoveHandler(e);
            }
        }
        this.mouseUp = () =>{
            this.pressed = false;
            this.eventMap[this.SETMODE][this.LAYERSELECTED].mouseUpHandler();
            this.reRenderLayer(this.svg.layerSelected);
        }
        
        this.doubleClick = (e) => {
            if(this.SETMODE == this.selectMode){
                this.select.doubleClickHandler(e);
            }
        }
        this.mouseLeave = () => {
            this.mouseUp();
        }
        this.keyUp = (e) => {
            if(e.key === "Backspace") {
                this.select.deleteSelected();
            }
        }

        this.svgElement.addEventListener("mousedown", this.mouseDown);
        this.svgElement.addEventListener("mousemove", this.mouseMove);
        this.svgElement.addEventListener("mouseup", this.mouseUp);
        this.svgElement.addEventListener("dblclick", this.doubleClick);
        $("#" + this.svgID).mouseleave(this.mouseLeave);
        $(document).keyup(this.keyUp);
        
    }
    newTileElement(){
        this.svgElement = SVGElement(this.width ,this.height ,this.width ,this.height ,this.svgClass ,this.svgID);
        var svgContainer = document.getElementById(this.svgContainerId);
        svgContainer.innerHTML = "";
        svgContainer.appendChild(this.svgElement);
  

        this.svg = new Svg(this.svgElement , "tile_" + this.tileCounter.toString(),  this.LAYERSELECTED, this.layerInfo, this.outlineLayer, this.orientLayer ,this.invalidCSS);
        

    }
    initEditingTile(tile=null){
        if(tile == null){
            this.newTileElement();
        }
        this.selectpointsmode = new SelectPoints(this.svg);
        this.orientlinemode = new OrientLineMode(this.svg, this.selectpointsmode, this.svgElement, this.orientLayer);
        this.constructionmode = new ConstructionMode(this.svg);
        this.selectpointsmode.orientlinemode = this.orientlinemode;
        this.select = new Select(this.svg, this.selectpointsmode);
        this.outlinemode = new OutlineMode(this.svg, this.selectpointsmode, this.outlineLayer);
        const compliance = () => {
            this.svg.errorCheckOutline();
            this.svg.errorCheckOrient();
        }

        this.select.compliance = compliance;
        this.bindEventHandlers();
        this.generateWorkingTileUI();
    }
    generateWorkingTileUI(){
        var layerDivElement =  document.getElementById(this.layerDivID);
      
        this.modeInfo.forEach(mode =>{
            var modeButton = document.getElementById(mode.modeButtonDivID);
            this.modeButtons[mode.modeName] = modeButton;
            var modeEventListener = this.changeModeLambda(mode.modeName,modeButton);
            modeButton.onclick = modeEventListener;

        })
        this.layerInfo.forEach(layer => {
            var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", layer.name);

            var thumbnailDIV = makeDiv(thumbnailElemNS.id + "_container", layer.name, this.thumbnailDivClass);
            var clearButton = makeButton(this.clearicon + " clear layer");

            thumbnailDIV.appendChild(thumbnailElemNS);
            thumbnailDIV.appendChild(clearButton);
            layerDivElement.appendChild(thumbnailDIV);

            this.layerElements[layer.name] = thumbnailElemNS;
            this.layerDivElements[layer.name] = thumbnailDIV;
            thumbnailDIV.addEventListener("mousedown", this.changeLayerLambda(layer.name, thumbnailDIV ), false, );
            clearButton.onclick = this.clearLayerLambda(layer.name);

        });

        this.downloadProjectButton =  makeButton("project save");
        this.downloadProjectButton.onclick = this.downloadProjectLambda(); 
    }
    changeModeLambda(modeName, modeButton){
        const changeMode = e =>{
            Object.entries(this.modeButtons).forEach(([_, div]) =>div.classList.remove(this.selectedCSS))
            modeButton.classList.add(this.selectedCSS);
            this.select.resetSelection();
            this.SETMODE = modeName;

        }
        return changeMode;
    }
    changeLayerLambda(name, thumbnailDIV ){
        const changeSVGLayer = e =>{
            this.select.resetSelection();
            this.LAYERSELECTED = name;
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
    reRenderLayer(layerName){
        var lines = this.svg.getLayer(layerName);
        var thumbnailElement = this.layerElements[this.svg.layerSelected]
        lines.forEach(line => {
            line.addToParentElement(thumbnailElement);
        });
    }
    loadFromSessionStorage(){
        var project = JSON.parse(sessionStorage.getItem(this.sessionStorageKey));
        Object.entries(project).forEach(([key, svgJSON], index) => {
            var svgElement = SVGElement(width, height, width, height, "svg", index.toString());
            var svgClass = new Svg(svgElement,  LAYERSELECTED, layerInfo);
            svgClass.fromJSON(svgJSON)
            this.addThumbnail(svgClass);
        })
        this.tileSetRerender();

    }
    addThumbnail(){
        this.tileSVGID += 1;
        var id = this.tileSVGID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", id);
        var thumbnailDIV = makeDiv(id + "_container", this.svg.name, this.thumbnailDivClass);
        var deleteButton = makeButton(this.trashicon +  " delete");
        
        var saveButton = makeButton(this.savefileicon +  " download svg");
        var loadButton = makeButton(this.editicon +  "edit tile");
        thumbnailDIV.appendChild(thumbnailElemNS);
        thumbnailDIV.appendChild(deleteButton);
        thumbnailDIV.appendChild(saveButton);
        thumbnailDIV.appendChild(loadButton);

        $("#" + this.thumbnailDivID).append(thumbnailDIV);
        var thumbnailElement = document.getElementById(id);
        this.thumbnailDivs[thumbnailDIV.id] = thumbnailDIV;
        
        this.svg.changeElement(thumbnailElement);

        this.tiles[thumbnailElement.id] = this.svg;


        deleteButton.onclick = this.deleteDrawingLambda(thumbnailDIV,thumbnailElement);
        saveButton.onclick = this.downloadDrawingLambda(this.svg);
        loadButton.onclick = this.loadDrawingLambda(thumbnailDIV,thumbnailElement, this.svg);
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
            downloadSVG(svg.element, svg.name);
        }
        return downloadDrawing;

    }
    deleteDrawingLambda(thumbnailDIV,thumbnailElement){
        const deleteDrawing = (e) => {
            delete this.tiles[thumbnailElement.id];
            delete this.thumbnailDivs[thumbnailDIV.id];
            this.tileSetRerender();
        }
        return deleteDrawing;

    }
    tileSetRerender(){
        var thumbnailDiv = document.getElementById(this.thumbnailDivID)
        thumbnailDiv.innerHTML = "";
        Object.entries(this.thumbnailDivs).forEach(([_, elem]) => thumbnailDiv.appendChild(elem))
        Object.entries(this.tiles).forEach(([_, svg]) => svg.reRender());
        thumbnailDiv.appendChild(this.downloadProjectButton);
    }
    export(){
        return Object.entries(this.tiles).map(([_, svg]) => svg);
    }
    downloadProjectLambda(){
        const downloadProject = () =>{
            var exportName = "project_file"
            //https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.tiles));
            sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(this.tiles));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", exportName + ".json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
        return downloadProject
      }
    saveTile(){
    }

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

function downloadAssemblage(){
    if(assemblerElement){
        downloadSVG(assemblerElement, "assemblage")
    }
}


const globalState = new GlobalState();



function reset(){
    globalState.addThumbnail();
}


globalState.initEditingTile();
if (typeof(module) !== "undefined") {
    module.exports.layerInfo = layerInfo;
    module.exports.width = 800;
    module.exports.height = 600;
    module.exports.SVGElement = SVGElement;
}
