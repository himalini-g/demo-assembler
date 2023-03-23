class SelectPoints{
    constructor(svg, orientlinemode){
        this.orientlinemode = orientlinemode;
        this.svg = svg;
        this.tolerance = 2;
        this.lineID = null;
        this.circleDict = {};
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
        this.circleDict = {};
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
        if(id in this.circleDict){
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
        var circle = this.circleDict[this.circleTarget].circle;
        var index = this.circleDict[this.circleTarget].index;
        circle.moveByVector(this.moveVec);
        this.svg.getLine(this.lineID).movePoint(index, this.moveVec);
        if(layerSelected == orientLayer){
            this.orientlinemode.reComp(this.lineID);
        }

        this.svg.getLine(this.lineID).reRender();
        var [b, text] = this.svg.getText(this.lineID);
        if(b){
            text.reRender()
        }
        circle.reRender();
    }
    mouseUpHandler(){
        this.circleTarget = null;
    }
    renderPoints(){
        var points = this.svg.getLine(this.lineID).points;
        if(layerSelected == orientLayer){
            points = points.slice(0, 2);
        }
        points.forEach((point, index) => {
            var circleElement = new Circle(point, index, this.tolerance);
            this.circleDict[circleElement.id] = {
                circle: circleElement,
                index: index
            };
            this.svg.tempElems.push(circleElement.circle);
        });
        this.svg.reRender();
    }
    mouseUpHandler(e){
  
        this.lineID = null;
        this.circleDict = {};
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
        this.svg.tempElems.push(this.selectionBox);
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
        this.clickedInSelection = false;
        this.resetSelectionBox();
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
                this.svg.tempElems.push(this.selectionBox);
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
        this.selectpoints.reset();
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
    deleteSelected(){
        this.svg.deleteIDs(this.selected);
        this.resetSelection();
    }
}
if (typeof(module) !== "undefined") {
	module.exports.SelectPoints = SelectPoints;
    module.exports.Select = Select;
}

