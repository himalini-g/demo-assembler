
var modal = document.getElementById("enter-label");

// Get the button that opens the modal
var modalButton = document.getElementById("add-label");
var labelText = document.getElementById("label-text-input");

// Get the <span> element that closes the modal
var span = document.getElementById("modal-text-close");
// var modalText = document.getElementById("modal-text");
console.log(modal, )
// When the user clicks the button, open the modal 
modalButton.onclick =function(){
  console.log("helli")
  modal.style.display = "block";
  // modalText.innerHTML = "hello, please enter a new label";
}


// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
  labelmanager.unmount();
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
    labelmanager.unmount();

  }
}


class Labels{
  constructor(){
    this.labels = {};
    this.labelDisplayDivID = "label-display";
    this.graphDisplayDivID = "graph-display";
    this.graphWidth  = 960;
    this.graphHeight = 500;
    this.labels = [];
    this.graph = null;
  }
  addLabel(uncleanedLabel){
    var label = uncleanedLabel.replace(/[^a-z0-9]/gi, '');
    var successful = true;
    if(label in this.labels){
      return [false, "cannot add a label that already exists"];
    }
    this.labels[label] = null;
    this.render();
    return [true, null];
    
  }
  editLabel(){

  }
  deleteLabel(){

  }
  render(){
    var labelDisplayDiv = document.getElementById(this.labelDisplayDivID)
    labelDisplayDiv.innerHTML = "";
    Object.entries(this.labels).forEach(([label, _]) => {
      var button = document.createElement( 'button' );
      button.innerHTML = label
      labelDisplayDiv.appendChild(button)
    });
    this.graph = new Graph(this.graphDisplayDivID);
    
    
  }
  unmount(){
    if(this.graph !== null){
      this.graph.destroy()
    }

  }
}


// set up SVG for D3
class Graph{
  constructor(divID){
    this.width = 960;
    this.height = 500;
    this.colors =  d3.scale.category10();
    this.graphSvg = d3.select("#" + divID)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
    console.log(this.graphSvg);
    this.nodes = [
      {id: 0},
      {id: 1},
      {id: 2},
      {id: 3},
      {id: 4}
    ],
    this.lastNodeId = 4,
    this.links = [
      {source: this.nodes[0], target: this.nodes[1]},
      {source: this.nodes[1], target: this.nodes[2] }
    ];
  
    // line displayed when dragging new nodes
    this.drag_line = this.graphSvg.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0');

    // handles to link and node element groups
    this.path = this.graphSvg.append('svg:g').selectAll('path');
    this.circle = this.graphSvg.append('svg:g').selectAll('g');

    // mouse event this.
    this.selected_node = null;
    this.selected_link = null;
    this.mousedown_link = null;
    this.mousedown_node = null;
    this.mouseup_node = null;
    this.force = d3.layout.force()
    .nodes(this.nodes)
    .links(this.links)
    .size([this.width, this.height])
    .linkDistance(150)
    .charge(-50)
    .on('tick', () =>  this.tick(this.path))
    this.graphSvg.on('mousedown', (e) => this.mousedown(e))
    .on('mousemove',() => this.mousemove())
    .on('mouseup', () => this.mouseup());
    this.restart();
  

  }
  mousedown( ) {
    // prevent I-bar on drag

    // because :active only works in WebKit?

    this.graphSvg.classed('active', true);
  
    if(this.mousedown_node || this.mousedown_link) return;
  
    this.restart();
  }
  destroy(){
    console.log("destroying");
    d3.select("svg").remove();
    
  }
  mousemove() {
    if(!this.mousedown_node) return;
    
    this.drag_line.attr('d', 'M' + this.mousedown_node.x + ',' + this.mousedown_node.y + 'L' + d3.mouse(this.graphSvg.node())[0] + ',' + d3.mouse(this.graphSvg.node())[1]);
  
    this.restart();
  }
  mouseup() {
    if(this.mousedown_node) {
      // hide drag line
      this.drag_line
        .classed('hidden', true)
    }
  
    // because :active only works in WebKit?
    this.graphSvg.classed('active', false);
  
    // clear mouse event vars
    this.resetMouseVars();
  }
  resetMouseVars() {
    this.mousedown_node = null;
    this.mouseup_node = null;
    this.mousedown_link = null;
  }
  tick() {
    // draw directed edges with proper padding from node centers

    this.path.attr('d', function(d) {
      var deltaX = d.target.x - d.source.x,
          deltaY = d.target.y - d.source.y,
          dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
          normX = deltaX / dist,
          normY = deltaY / dist,
          sourcePadding = 12,
          targetPadding = 12,
          sourceX = d.source.x + (sourcePadding * normX),
          sourceY = d.source.y + (sourcePadding * normY),
          targetX = d.target.x - (targetPadding * normX),
          targetY = d.target.y - (targetPadding * normY);
      return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });
  
    this.circle.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  }
  circleMouseUp(d){
    
    if(!this.mousedown_node) return;

    // needed by FF
    this.drag_line
      .classed('hidden', true)
      .style('marker-end', '');

    // check for drag-to-self
    this.mouseup_node = d;
    if(this.mouseup_node === this.mousedown_node) { this.resetMouseVars(); return; }

    // unenlarge target node
    this.circle.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });

    // add link to graph (update if exists)
    // NB: links are strictly source < target; arrows separately specified by booleans
    var source, target;

    source = this.mousedown_node;
    target = this.mouseup_node;

    var link;
    link = this.links.filter(function(l) {
      return (l.source === source && l.target === target);
    })[0];

    if(!link) {
      link = {source: source, target: target};
      this.links.push(link);
    }

    // select new link
    this.selected_link = link;
    this.selected_node = null;
    this.restart();
    

  }
  pathMouseDown(d){
    this.mousedown_link = d;
    if(this.mousedown_link === this.selected_link) this.selected_link = null;
    else this.selected_link = this.mousedown_link;
    this.selected_node = null;
    this.restart();

  }
  circleMouseDown(d){
    // select node
    this.mousedown_node = d;
    if(this.mousedown_node === this.selected_node) this.selected_node = null;
    else this.selected_node = this.mousedown_node;
    this.selected_link = null;

    // reposition drag line
  
    this.drag_line
      .classed('hidden', false)
      .attr('d', 'M' + this.mousedown_node.x + ',' + this.mousedown_node.y + 'L' + this.mousedown_node.x + ',' + this.mousedown_node.y);

    this.restart();
  }
  restart() {
    
  
    this.path = this.path.data(this.links);
  
    // update existing links
  
    this.path.classed('selected', (d) =>  { return d === this.selected_link; })
  
  
    // add new links
    this.path.enter().append('svg:path')
      .attr('class', 'link')
      .classed('selected', (d) =>  { return d === this.selected_link; })
      .on('mousedown', (d) =>this.pathMouseDown(d));
  
    // remove old links
    this.path.exit().remove();
  
  
    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    this.circle = this.circle.data(this.nodes, function(d) { return d.id; });
  
    // update existing nodes (reflexive & selected visual states)
    this.circle.selectAll('circle')
      .style('fill', (d) => { return (d === this.selected_node) ? d3.rgb(this.colors(d.id)).brighter().toString() : this.colors(d.id); })
  
    // add new nodes
    var g = this.circle.enter().append('svg:g');

    var mousedown_node = this.mousedown_node
    g.append('svg:circle')
      .attr('class', 'node')
      .attr('r', 12)
      .style('fill', (d) =>  { return (d === this.selected_node) ? d3.rgb(this.colors(d.id)).brighter().toString() : this.colors(d.id); })
      .style('stroke', (d) =>  { return d3.rgb(this.colors(d.id)).darker().toString(); })
      .on('mouseover', function(d) {
        if(!mousedown_node || d === mousedown_node) return;
        // enlarge target node
        d3.select(this).attr('transform', 'scale(1.1)');
      })
      .on('mouseout', function(d) {
        if(!mousedown_node || d === mousedown_node) return;
        // unenlarge target node
        d3.select(this).attr('transform', '');
      })
      .on('mousedown', (d) => this.circleMouseDown(d))
      .on('mouseup', (d) => this.circleMouseUp(d));
  
    // show node IDs
    g.append('svg:text')
        .attr('x', 0)
        .attr('y', 4)
        .attr('class', 'id')
        .text(function(d) { return d.id; });
  
    // remove old nodes
    this.circle.exit().remove();
  
    // set the graph in motion
   this.force.start();
  }
}



var labelmanager = new Labels();
function addLabel(){
  labelmanager.addLabel(labelText.value);
  labelText.value = "";
}

// var graph = new Graph('body');
console.log("hello")
