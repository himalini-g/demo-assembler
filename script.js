function setup(passedSVG=null){
 
    layerthumbnails = new SvgUI( layerDivID);
    
   
}
var disableReRenderAssemblage = false
async function rerenderAssemblage(){
    if(!disableReRenderAssemblage){
        disableReRenderAssemblage = true;
        assemblerElement = await assemblerSetup(thumbnailsobj.export(), labelmanager.export(), assemblageWidth, assemblageHeight, tileScale).then(
            () => disableReRenderAssemblage = false
        );
    }
    console.log(disableReRenderAssemblage);
    
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
    constructor(layerDivID){
      
      
        this.layerDivID = layerDivID;
    
        this.destroyLambda = () => {
            var layerContainer = document.getElementById(this.layerDivID);
            layerContainer.innerHTML = ""
        }
   
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

        if(sessionStorage.getItem(this.sessionStorageKey)){
            this.loadFile(JSON.parse(sessionStorage.getItem(this.sessionStorageKey)));
        }
    }

    removeLabel(label){
        Object.entries(this.thumbnails).forEach(([_, nail]) => {
            nail.removeLabel(label);
            nail.reRender();
        });
        svg.removeLabel(label);
        svg.reRender();
    }
    loadFile(project){

        Object.entries(project.drawings).forEach(([key, svgJSON], index) => {
            // var svgElement = SVGElement(width, height, width, height, "svg", index.toString());
            var svgClass =  new Svg(null, svgJSON.name,  constructionLayer, layerInfo, outlineLayer, orientLayer , invalidCSS);
            svgClass.fromJSON(svgJSON);
      
            this.addThumbnail(svgClass);
        });
        
        labelManagerFromJSON(project.labels, labelmanager.width, labelmanager.height)


    }
    addThumbnail(svg){
        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", id);
    
        
        svg.unmount();
        svg.addNewElement(thumbnailElemNS);
        svg.element = thumbnailElemNS;
        this.thumbnails[thumbnailElemNS.id] = svg;


    }
    
    
    export(){
        return Object.entries(this.thumbnails).map(([_, svg]) => svg);
    }
    downloadProject(){
            var exportName = "project_file"
            var project = {
                labels: labelmanager.export(),
                drawings: this.thumbnails,
            }
            //https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser

            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
            sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(project));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", exportName + ".json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
    }
}


function reflectOverX(){
    svg.reflectOverX(Math.trunc(height));
}
function reflectOverY(){
    svg.reflectOverY(Math.trunc(width));
}

function downloadAssemblage(){
    if(assemblerElement){
        downloadSVG(assemblerElement, "assemblage")
    }
}
async function parseJsonFile(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = event => resolve(JSON.parse(event.target.result))
      fileReader.onerror = error => reject(error)
      fileReader.readAsText(file)
    })
  }
function loadPlants(){
    if(!disableReRenderAssemblage){
        $.getJSON("library/plants.json", function(json) {
            plantsJSON = json; // this will show the info it in firebug console
            console.log(plantsJSON)
            thumbnailsobj.loadFile(plantsJSON, toParse=false);
            rerenderAssemblage();
        });

    }
   
}
function loadOrgans(){
    if(!disableReRenderAssemblage){
        $.getJSON("library/organs.json", function(json) {
            organsJSON = json; // this will show the info it in firebug console
            console.log(organsJSON)
            thumbnailsobj.loadFile(organsJSON, toParse=false);
            rerenderAssemblage();
        });

    }
    
}
function loadRobots(){
    if(!disableReRenderAssemblage){
        $.getJSON("library/robots.json", function(json) {
            robotsJSON = json; // this will show the info it in firebug console
            console.log(robotsJSON)
            thumbnailsobj.loadFile(robotsJSON, toParse=false);
            rerenderAssemblage();
        });
    
    }
    
}


function saveTile(){
  
    var [b, errorString] = svg.canExport();
    if(!b){
        console.log(errorString);
        openModal(errorString);
        return;
    }
    reset();
}

function reset(){
    thumbnailsobj.addThumbnail(svg);
    layerthumbnails.destroy();
    setup();
}

var tileCounter = 0;

const pixelsInInch = 200;
const assemblageWidthInches= 4;
const assemblageHeightInches = 5; 

const tileScale = 0.3;


const assemblageWidth = Math.trunc(pixelsInInch * assemblageWidthInches);
const assemblageHeight = Math.trunc(pixelsInInch * assemblageHeightInches);
const width = 6 * pixelsInInch;
const height = 6 * pixelsInInch;
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
const invalidCSS = "invalid"
var svgElement = null;
var svg = null;
var select = null;
var layerthumbnails = null;
var selectpointsmode = null;
var orientlinemode = null;
var assemblerElement =  assemblerSetup([], {}, assemblageWidth, assemblageHeight, tileScale);
const layerInfo = 
[
    {
        name: outlineLayer,
        color: "#A000F0",
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


function downloadProject(){
    thumbnailsobj.downloadProject();
}


if (typeof(module) !== "undefined") {
    module.exports.layerInfo = layerInfo;
    module.exports.SVGElement = SVGElement;
}