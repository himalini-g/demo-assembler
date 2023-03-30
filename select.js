class SelectPoints{
    constructor(svg){
        this.svg = svg;
        this.element = this.svg.element;
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
    initSelection( passedLineID){
        this.svg.clearTemp();
        this.svg.reRender();
        this.lineID = passedLineID;
        this.renderPoints();
        this.moveVec = {
            x:0,
            y:0
        };
    }
    mouseDownHandler(e){
    
        var circleTarget = e.target;
        var id = circleTarget.id;
        this.circleTarget = id;
        this.moveVec = {
            x:0,
            y:0
        };
        var point = relativeMousePosition(e, this.element);
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
      
        var point = relativeMousePosition(e, this.element);
        this.moveVec = {
            x: point.x -  this.oldCursorPosition.x,
            y: point.y -  this.oldCursorPosition.y,
        }
        this.oldCursorPosition = point;
        var circle = this.circleDict[this.circleTarget].circle;
        var index = this.circleDict[this.circleTarget].index;
        circle.moveByVector(this.moveVec);
        this.svg.getLine(this.lineID).movePoint(index, this.moveVec);
        if(this.svg.layerSelected == orientLayer){
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
        if(this.svg.layerSelected == orientLayer){
            points = points.slice(0, 2);
        }
        points.forEach((point, index) => {
            var circleElement = new Circle(point, index, this.tolerance);
            circleElement.addToParentElement(this.element);
            this.circleDict[circleElement.id] = {
                circle: circleElement,
                index: index
            };
            this.svg.tempElems.push(circleElement);
        });
        this.svg.reRender();
    }
    mouseUpHandler(){
    }
}

class Select{
    constructor(svg, selectpoints){
        this.svg = svg;
        this.element = this.svg.element;
        this.selectpoints = selectpoints;
        this.selectionCss = 'path-selection'
        this.selectionBox =  document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionBox.setAttribute('fill', 'none')
        this.selectionBox.setAttribute('stroke','gray')
        this.selectionBox.setAttribute('stroke-width', 1)
        this.selectionBox.setAttribute('stroke-dasharray', 4);
        this.element.appendChild(this.selectionBox);
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
        this.compliance = null;
    }
    isSelected(){
        return this.selected.length > 0;
    }
    doubleClickHandler(e){
        this.clickedInSelection = false;
        this.resetSelectionBox();
        var closestLine = svg.getClosestLine(e);
        this.resetSelection();
        this.selectingPoints = true;
        this.selected = [closestLine.line];
        this.selectpoints.initSelection(closestLine.line.id);
        
    }
    mouseDownHandler(e){
        if(this.selectingPoints){
            var inPoint = this.selectpoints.clickInPoint(e);
            if(!inPoint){
                this.selectingPoints = false;
                this.resetSelection();
                this.selectpoints.reset();
                this.startSelection(e);
            }
            this.selectpoints.mouseDownHandler(e, this.selected[0]);
            console.log("hello")
            this.compliance();
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
            this.compliance();
        } else {
            if(this.clickedInSelection){
                this.updateSelectionBox(e);
                this.updateMoveVec(e);
                this.svg.moveLines(this.selected, this.moveVec);
                this.svg.reRender();
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
        this.selected.forEach(line => line.addCSS(this.selectionCss));
    }
    clickInSelected(e){
        //click point criteria

        //selection box criteria
        if(!this.isSelected()){
            return false;
        }
        
        var point = relativeMousePosition(e, this.element);
        var potentialSelected = svg.getLinesInPoint(point);
        const found = potentialSelected.some( line => this.selected.includes(line))
        return found;
    }
    startSelection(e){
        this.moveVec = {
            x: 0, 
            y: 0,
        };
        this.oldCursorPosition = relativeMousePosition(e, this.element);
        this.selectionLeftTopCorner = relativeMousePosition(e, this.element);
        this.originalLeftTopCorner = relativeMousePosition(e, this.element);
        this.selectionBottomRightCorner = relativeMousePosition(e, this.element);
        this.setSelectionBox();

    }
    setSelectionBox(){
        this.selectionBox.setAttribute('x', this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('y', this.selectionLeftTopCorner.y);
        this.selectionBox.setAttribute('width',this.selectionBottomRightCorner.x - this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('height', this.selectionBottomRightCorner.y - this.selectionLeftTopCorner.y);
    }
    
    updateSelectionBox(e){
        var point = relativeMousePosition(e, this.element);
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
        var point = relativeMousePosition(e, this.element);
        this.moveVec = {
            x: point.x -  this.oldCursorPosition.x,
            y: point.y -  this.oldCursorPosition.y,
        }
        this.oldCursorPosition = point;

    }
    removeCSS(){
        var lines = this.svg.getLayer(this.svg.layerSelected);
        lines.forEach(line => line.removeCSS(this.selectionCss));
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
        this.svg.deleteIDs(this.selected.map(line => line.id));
        this.resetSelection();
    }
}
if (typeof(module) !== "undefined") {
	module.exports.SelectPoints = SelectPoints;
    module.exports.Select = Select;
}

