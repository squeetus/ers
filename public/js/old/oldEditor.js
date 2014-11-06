/*
    Emergency Response System Floorplan Editor
*/

//Grab container width and height for stage sizing
var height = $("#stage").height();
var width  = $("#stage").width();
var nodes = {}; //Our array of nodes
var edges = {}; //The array of edges
var offsetX = 0; //Offset values from dragging stage
var offsetY = 0; //Offset values from dragging stage
var currentNode = null; //The latest or selected node
var is_hovering = false; //Used to process only node clicks
var counter = 0; //Counter used to increment/name nodes
var roomCounter = 0; //Counter used for room naming
var zoomLevel = 1; //Canvas zoom level
var linkerNode; //Node to be linked from
var targetNode; //Target node to be linked to
var node_img_size = 32;
var node_text_offset = 15;
var node_radius = 15;
var edge_guide_width = 25;
var default_room_height = 40;
var default_room_width = 40;
var node_count = 0;
var edge_count = 0;
var bgLayer = null;
var loaded = false;
var imgObj = null; //Stage image
var bounds = initBounds();
var rootLayer;
var graphSnapshot = {};
var lastDist = 0; //Last dragged distance (for touch-zoom)
var nodeImage = {"room": "roomtool.png", "elevator": "elevatortool.png", "stair": "stairtool.png", "fire": "firetool.png", "entrance": "entrancetool.png"}; //Node image names

//Create new stage
var stage = new Kinetic.Stage({
    container: 'stage',
    width: width,
    height: height,
    draggable: true,
    lastDragDistance: 0,
    scale: {x: 1.0, y: 1.0},
    startX: 0,
    startY: 0
});

stage.startX = 0; //Stage's starting position
stage.startY = 0;
stage.linkStart = null; //Possible node link candidates
stage.linkEnd = null;
rootLayer = new Kinetic.Layer();
stage.tmpLayer = new Kinetic.Layer();
stage.guideDrag = false; //Flag for whether or not a link attempt is being made (guidenode dragging)
stage.add(rootLayer);

//Stage drag offset
stage.on(touchstart, function(e){
    if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};
    stage.startX = stage.x();
    stage.startY = stage.y();
}).on(touchend, function(e){
    offsetX = stage.x();
    offsetY = stage.y();
    console.log(offsetX, offsetY);
    stage.lastDragDistance = Math.sqrt(Math.pow(offsetX - stage.startX, 2) + Math.pow(offsetY - stage.startY, 2));
    stage.startX = stage.x();
    stage.startY = stage.y();
}).on(touchmove, function(e){
    console.log(stage.getAbsolutePosition());

    //Prevent negative node coordinates
    if(stage.getAbsolutePosition().x > 0) {
        stage.x(0);
    }

    if(stage.getAbsolutePosition().y > 0) {
        stage.y(0);
    }
});

// **** Zoom methods *****
stage.getContent().addEventListener("mousewheel", wheelZoom, false);
stage.getContent().addEventListener('touchmove', function(evt) {
    console.log("Touchmove");

    var touch1 = evt.touches[0];
    var touch2 = evt.touches[1];

    if(touch1 && touch2) {
      var dist = getDistance({
        x: touch1.clientX,
        y: touch1.clientY
      }, {
        x: touch2.clientX,
        y: touch2.clientY
      });

      if(!lastDist) {
        lastDist = dist;
      }

      var scale = stage.getScale().x * dist / lastDist;
      $("#scale").html(scale);
      stage.scale({x: scale, y: scale});
      stage.draw();
      lastDist = dist;
    }
  }, false);

  stage.getContent().addEventListener('touchend', function(evt) {
    lastDist = 0;
  }, false);

// **** Stage tap interaction ****
$(stage.getContent()).on(tap, function(evt) {
    handleStageTap(evt);
});

//Euclidean distance
function getDistance(p1, p2) {
return Math.sqrt(Math.pow((p2.x - p1.x), 2) + Math.pow((p2.y - p1.y), 2));
}

//Insert new node (elevator, junction, etc.)
function insertNode(linkerNode, targetNode){
    //Add linker node to node array
    nodes[linkerNode.id] = linkerNode;

    //Create edge between linker node and target node
    var edge_id = linkerNode.id + "_" + targetNode.id;
    var edge = new Edge(linkerNode, targetNode, edge_id);

    edges[edge_id] = edge;

    //Add edge to connecting nodes' edge lists
    linkerNode.edges[edge.id] = edge.id;
    targetNode.edges[edge.id] = edge.id;

    //Update the current node
    currentNode = linkerNode;

    //Reset linker node to null
    linkerNode = null;
    targetNode = null;

    //Remove guide line/node
    stage.guideNode.destroy();
    stage.guideLine.destroy();

    rootLayer.draw();
    stage.tmpLayer.destroy();
}

//Cancel node insertion
function cancelLink(){
    //Delete all visual guides
    stage.guideNode.destroy();
    stage.guideLine.destroy();
    linkerNode.visual.destroy();
    linkerNode.delete();
    counter--;
    rootLayer.draw();
    stage.tmpLayer.destroy();
}

//Join two existing nodes
function joinNodes(startNode, endNode) {
    //Create edge between linker node and target node
    var edge_id = startNode.id + "_" + endNode.id;
    var edge = new Edge(startNode, endNode, edge_id);
    var alt_edge_id = endNode.id + "_" + startNode.id;

    edges[edge_id] = edge;

    startNode.edges[edge.id] = edge.id;
    endNode.edges[edge.id] = edge.id;

    currentNode = endNode;

    startNode = null;
    endNode = null;

    stage.linkStart.visual.fill("#2B64FF");
    stage.linkEnd.visual.fill("#2B64FF");

    stage.linkStart = null;
    stage.linkEnd   = null;

    rootLayer.draw();
}


//Split an edge when inserting node
function splitEdge(linkerNode, targetEdge, x , y) {
    console.log("Splitting edge");

    //Place new node at target location on edge
    var n = targetEdge.splitEdge(x, y);

    //Link the new nodes
    insertNode(linkerNode, n);
}

//Draw guide for attaching special nodes to path
function drawGuide(x1, y1, x2, y2, id, type){

    var x = x1;
    var y = y1;

    //Create guidenode
    stage.guideNode = new Kinetic.Circle({
        x: x1,
        y: y1,
        radius: node_radius,
        fill: '#525252',
        draggable: true,
        opacity: 0.8
    });

    //Create guideline
    stage.guideLine = new Kinetic.Line({
        points: [x, y, x2, y2],
        stroke: '#525252',
        dash: [10, 5],
        strokeWidth: 2,
    });

    stage.guideNode.on('dragstart', function(e){
        //console.log("Starting");
        stage.add(stage.tmpLayer);
        stage.guideNode.stopDrag();
        stage.guideNode.moveTo(stage.tmpLayer);
        stage.guideLine.moveTo(stage.tmpLayer);
        stage.guideNode.startDrag();
        stage.guideLine.points([x, y, stage.guideNode.x(), stage.guideNode.y()]);
        rootLayer.draw();

    }).on(touchmove, function(e){

        stage.guideDrag = true;
        var touchPos = stage.getPointerPosition();

        var mouseX = touchPos.x / stage.scale().x - stage.getAbsolutePosition().x / stage.scale().x + stage.getOffset().x;
        var mouseY = touchPos.y / stage.scale().y - stage.getAbsolutePosition().y / stage.scale().y + stage.getOffset().y;

        stage.guideLine.points([x, y, stage.guideNode.x(), stage.guideNode.y()]);

        //console.log(touchPos);

        var point = {x: mouseX, y: mouseY};

        var tmpNode = rootLayer.getIntersection(touchPos);

        if(tmpNode != null){
            //console.log(tmpNode);
        }

        //***PROCESS MOVEMENT DURING LINKING PHASE (PREVIOUS MOUSE MOVEMENT STATE IS EVALUATED)

        if(targetNode != null && targetNode.visual != null && targetNode.visual.className == "Line"){
            targetNode.guideDot.hide();
        }

        //If the node hovered over is the same as the current target node...
        if(targetNode != null && tmpNode != null && tmpNode.id == targetNode.id) {

            //Highlight closest point if existing target node is a line
            if(targetNode.visual != null && targetNode.visual.className == "Line"){
                var closestPoint = targetNode.findClosestPointOnLineFrom(mouseX, mouseY);
                targetNode.guideDot.x(closestPoint.x);
                targetNode.guideDot.y(closestPoint.y);
                targetNode.guideDot.show();
            }

        } else if(tmpNode != null) {
            //New target node
            targetNode = tmpNode;

        } else if(tmpNode == null){
            targetNode = null;
        }

        //If shape is not null, set it
        if(tmpNode != null && tmpNode.id != linkerNode.id){

             if(tmpNode.className == "Circle" || tmpNode.className == "Image"){
                targetNode = nodes[tmpNode.id];
                //console.log("Target node: ", targetNode);
             }

             else if(tmpNode.className == "Line") {
                targetNode = edges[tmpNode.id];

                //Highlight closest point
                //console.log("Closest point: ", targetNode.findClosestPointOnLineFrom(mouseX, mouseY));
             }
        }


    }).on('dragend', function(e){
        stage.guideLine.points([x1, y1, stage.guideNode.x(), stage.guideNode.y()]);
        rootLayer.draw();
    });

    //Display guide node + line
    rootLayer.add(stage.guideLine);
    rootLayer.add(stage.guideNode);
    rootLayer.draw();
    stage.guideLine.moveToBottom();
    stage.guideNode.startDrag(); //Kick off drag event
}

function handleStageTap(evt) {
    //console.log("Target: ", evt);
    var touchPos = stage.getPointerPosition();

    //Get relative coordinates for proper placement scaling when zoomed
    var x = touchPos.x / stage.scale().x - stage.getAbsolutePosition().x / stage.scale().x + stage.getOffset().x;
    var y = touchPos.y / stage.scale().y - stage.getAbsolutePosition().y / stage.scale().y + stage.getOffset().y;

    //Don't place a node if the movement of the stage was significant (pan)
    if(stage.lastDragDistance > 10) {
        //console.log(stage.lastDragDistance);
        stage.lastDragDistance = 0;
        return;
    }

    //Handle node link
    if(stage.guideDrag) {
        stage.guideDrag = false;

        //Link nodes
        if(targetNode != null && targetNode.visual != undefined) {

            if(targetNode.visual.className == "Circle" || targetNode.visual.className == "Image"){
                console.log("Linking");
                insertNode(linkerNode, targetNode);
            }
            else if(targetNode.visual.className == "Line"){
                splitEdge(linkerNode, targetNode, targetNode.guideDot.x(), targetNode.guideDot.y());
            }

        } else {
            cancelLink();
        }

        return;
    }

    //Logic for path tool
    if(selectedTool == "path") {

        //Place our tail node if none have been placed
        if (currentNode == null && (node_count == 0 || counter == 0) && evt.target != 'Kinetic.Circle' && evt.target != 'Kinetic.Line') {

            //Place starting node
            var id = "n" + node_count;
            var node = new Node(x, y, id, "node");

            //Add node to our node list
            nodes[id] = node;

            //Set the node that was just placed to be the current node
            currentNode = node;

            //console.log(rootLayer.getChildren());

        } else if (currentNode != null && evt.target != 'Kinetic.Circle' && evt.target != 'Kinetic.Line' && !is_hovering) {


            if(rootLayer.getIntersection(touchPos)) return;

            counter++; //New node

            var id = "n" + node_count;

            var node = new Node(x, y, id, "node");

            //Add node to the node list
            nodes[id] = node;

            //Create a new edge between the current node and this newly placed node and add to to the edge list
            var edge_id = currentNode.id + "_" + node.id;
            var edge = new Edge(currentNode, node, edge_id);
            edges[edge_id] = edge;

            //Add edge to connecting nodes' edge lists
            currentNode.edges[edge.id] = edge.id;
            node.edges[edge.id] = edge.id;

            //Update the current node
            currentNode = node;
        }
    }

    //Logic for new path junction (node)
    //if(selectedTool == "node" || selectedTool == "room" || selectedTool == "elevator" || selectedTool == "stair") {
    if(selectedTool != undefined && selectedTool != "path") {
        //Place starting node
        if (evt.target != 'Kinetic.Circle' && !is_hovering) {
            counter++;

            var id = "n" + node_count;

            var node = new Node(x, y, id, selectedTool);

            //Add node to our node list
            //nodes[id] = node;

            linkerNode = node;
            console.log("Tapped");
            //Draw the guide
            drawGuide(x, y, x, y, id, selectedTool);
        }
    }

}


//The Node (or junction) class contains information such as its normalized location, list of edges, and an ID
function Node(x, y, id, type, attr) {
    //Node metadata
    this.x = x;
    this.y = y;
    this.nX = 0;
    this.nY = 0;
    this.type = type;
    console.log(this.type);
    this.bbox;
    this.id = id;
    this.edges = {};
    this.attr  = {"zPos": 0,
                  "name": '',
                  "width": default_room_width,
                  "height": default_room_height};

    //Increment node counter
    node_count++;

    $("#nodeCount").html("<strong>Nodes:</strong>: " + node_count);

    //Create visual representation
    this.render(x, y, node_radius);
}

//Update min and max node bounds
function setBounds(x, y) {
    bounds["minX"] = Math.min(x, bounds["minX"]);
    bounds["maxX"] = Math.max(x, bounds["maxX"]);
    bounds["minY"] = Math.min(y, bounds["minY"]);
    bounds["maxY"] = Math.max(y, bounds["maxY"]);

    console.log("Bounds: ", bounds);
}

//Set up various attributes and event bindings for shape
Node.prototype.setupNode = function (x, y) {

    //Reference to main object for event bindings
    var _self = this;
    var c = this.visual;

    c.on('mouseenter', function(e){
        is_hovering = true;
        $("#xPos").html("<strong>X: </strong>" + Math.round(c.x()));
        $("#yPos").html("<strong>Y: </strong>" + Math.round(c.y()));
	//	$("#name").html("<strong>Name: </strong>" + c.type + " " + c.id);

    }).on('mouseleave', function(e){
        is_hovering = false;
        $("#xPos").html("<strong>X: </strong>");
        $("#yPos").html("<strong>Y: </strong>");
	//	$("#name").html("<strong>Name: </strong>");
    });

    c.on(tap, function(e){
       handleNodeTap(e, _self);
    });

    c.on(dbltap, function(e){
        console.log(_self.id);
        if(selectedTool != "link"){
            showMenuForNode(c);
        }
    });

    //Drag event
    c.on(touchstart, function(e){
        //Event structure varies between mobile and desktops
        if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};
        // $("#xPos").html("<strong>X: </strong>" + c.x());
        // $("#yPos").html("<strong>Y: </strong>" + Math.round(c.y()));
    }).on(touchmove, function(e){

        var touchPos = stage.getPointerPosition();

        var newX = c.x() + offsetX * -1;
        var newY = c.y() + offsetY * -1;

        //Adjust offset based on node type
        if(_self.type != "node"){
            newX += node_img_size / 2;
            newY += node_img_size / 2;
        }

        //Update position vars of node
        _self.x = newX;
        _self.y = newY;

        $("#xPos").html("<strong>X: </strong>" + Math.round(c.x()));
        $("#yPos").html("<strong>Y: </strong>" + Math.round(c.y()));

        //Move node text
        if(_self.text != null) {
            //console.log("Setting text position");
            _self.text.x(_self.visual.x() - node_text_offset);
            _self.text.y(_self.visual.y() - node_text_offset);
        }

        //Move room BB if set
        if (_self.bbox != undefined) {
            _self.bbox.x(_self.visual.x() + _self.visual.width()/2);
            _self.bbox.y(_self.visual.y() + _self.visual.height()/2);

        }

        //Update positions of connected edges
        for(var x in _self.edges){
            edges[_self.edges[x]].setPosition();
        }

    }).on(touchend, function(e){
        if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};
        currentNode = _self;

        $("#xPos").html("<strong>X: </strong>");
        $("#yPos").html("<strong>Y: </strong>");
    });



};

function handleNodeTap(e, obj) {
    //Event structure varies between mobile and desktops
    if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};

    if(stage.linkStart != null && obj.id == stage.linkStart.id) {
        obj.visual.fill("#2B64FF");
        stage.linkStart = null;
        rootLayer.draw();
        return;
    } else if (stage.linkEnd != null && obj.id == stage.linkEnd.id) {
        obj.visual.fill("#2B64FF");
        stage.linkStart = null;
        rootLayer.draw();
        return;
    }

    //Handle node-to-node link event
    if(selectedTool == "link" && stage.linkStart == null) {
        stage.linkStart = obj;
        obj.visual.fill("#E3B912");
        console.log("Set stage.linkStart");
    }

    if (selectedTool == "link" && stage.linkStart != null && stage.linkStart.id != obj.id && stage.linkEnd == null) {
        var edge_id = stage.linkStart.id + "_" + obj.id;
        var alt_edge_id = obj.id + "_" + stage.linkStart.id;

        if (edges[edge_id] != null || edges[alt_edge_id] != null) {
            stage.linkStart.visual.fill("#2B64FF");
            obj.visual.fill("#2B64FF");
            console.log("Canceling join");
            stage.linkStart = null;
            stage.linkEnd = null;
            return;
        } else {
            stage.linkEnd = obj;
            obj.visual.fill("#E3B912");
            //Link nodes
            console.log("Set stage.linkEnd");

            joinNodes(stage.linkStart, stage.linkEnd);
        }
    }

    rootLayer.draw();
    currentNode = obj;
}

//Render node based on its type
Node.prototype.render = function(x, y, r){

    //Create node on canvas
    this.visual = null;

    var _self = this;

    if(this.type == "node"){
        this.visual = new Kinetic.Circle({
            x: x,
            y: y,
            radius: r,
            fill: '#2B64FF',
            stroke: '#000000',
            strokeWidth: 2,
            draggable: true
        });

        rootLayer.add(this.visual);
        this.x = this.visual.x();
        this.y = this.visual.y();

        rootLayer.draw();
        this.visual.id = this.id;
        showTextForNode(this, this.attr["name"]);
        this.setupNode(x, y, node_radius);
        console.log("rendered");
    }

    else {
        var image = new Image();

         _self.visual = new Kinetic.Image({
            x: x - (node_img_size / 2),
            y: y - (node_img_size / 2),
            image: image,
            width: node_img_size,
            height: node_img_size,
            draggable: true
        });

        rootLayer.add(_self.visual);
        rootLayer.draw();

        image.onload = function(){

            _self.setupNode(x, y, node_radius);

            //rootLayer.add(_self.visual);

            _self.x = _self.visual.x();
            _self.y = _self.visual.y();

            //rootLayer.draw();
            showTextForNode(_self, _self.attr["name"]);
            _self.visual.id = _self.id;
            console.log("rendered");
        }

        image.src = '../../img/' + this.type + 'tool.png';

        var width = this.attr["width"];
        var height = this.attr["height"];

        if(this.type== "room") {
            this.bbox = new Kinetic.Rect({
                x: x,
                y: y,
                strokeWidth: 2,
                stroke: "red",
                listening: true,
                width: width,
                height: height
            });
            this.bbox.offsetX(default_room_width/2);
            this.bbox.offsetY(default_room_height/2);
            rootLayer.add(this.bbox);
            rootLayer.draw();
        }
    }
}

//Delete node
Node.prototype.delete = function(){

    //If node is in process of being connected to another node, reset link attempt
    if(stage.linkStart != null && stage.linkStart.id == this.id) {
        stage.linkStart = null;
    } else if(stage.linkEnd != null && stage.linkEnd.id == this.id) {
        stage.linkEnd = null;
    }

    //Remove all edges that go to this node
    for(var e in this.edges){
        edges[this.edges[e]].deleteEdge();
    }

    //Remove node on screen
    this.visual.destroy();

    //Remove this node from the node list
    delete nodes[this.id];

    if(currentNode != null && currentNode.id == this.id) {
        currentNode = null;
    }

    if(this.bbox != null) {
        this.bbox.destroy();
    }

    node_count--;

    $("#nodeCount").html("<strong>Nodes:</strong>: " + node_count);

    rootLayer.draw();
}

//Every two nodes has an edge between it. The edge class represents the line being drawn between those nodes
function Edge(startNode, endNode, id) {

    //Start and endpoint nodes
    this.startNode = startNode;
    this.endNode = endNode;

    //Edge ID
    this.id = id;

    edge_count++;

    $("#edgeCount").html("<strong>Edges:</strong> " + edge_count);

    this.setupLine();
}

Edge.prototype.setupLine = function () {
    //"use strict";

    var _self = this;

    var startOffset = 0;
    var endOffset = 0;

    if(this.startNode.type != "node") {
        startOffset = this.startNode.visual.width() / 2;
    }

    if (this.endNode.type != "node"){
        endOffset = this.endNode.visual.width() / 2;
    }

    var x1 = this.startNode.visual.x() + startOffset;
    var y1 = this.startNode.visual.y() + startOffset;
    var x2 = this.endNode.visual.x() + endOffset;
    var y2 = this.endNode.visual.y() + endOffset;


    //Create line and attributes
    this.visual = new Kinetic.Line({
        points: [x1, y1, x2, y2],
        stroke: '#525252',
        strokeWidth: 2,
    });

    //Create guideline
    this.guideLine = new Kinetic.Line({
        points: [x1, y1, x2, y2],
        stroke: '#000',
        strokeWidth: edge_guide_width,
        opacity: .3
    });

    //Create guide dot (shows where edges will split at)
    this.guideDot = new Kinetic.Circle({
        x: this.startNode.x,
        y: this.startNode.y,
        radius: node_radius,
        fill: "#D62029",
        listening: false
    }).hide();

    this.guideLine.on(dbltap, function(e){
        console.log("Double tapped edge");
        showMenuForEdge(_self);
    });


    this.visual.id = this.id;
    this.guideLine.id = this.id;
    this.guideDot.is_guide = true;

    rootLayer.add(this.visual);
    rootLayer.add(this.guideLine);
    rootLayer.add(this.guideDot);

    this.guideLine.moveToBottom(); //Send edges to back so nodes are on top of it
    this.visual.moveToBottom(); //Send edges to back so nodes are on top of it
    rootLayer.draw();
};

//Function for handling the reorientation of an edge
Edge.prototype.setPosition = function () {

    var startOffset = 0;
    var endOffset = 0;

    if(this.startNode.type != "node") {
        startOffset = this.startNode.visual.width() / 2;
    }

    if (this.endNode.type != "node"){
        endOffset = this.endNode.visual.width() / 2;
    }

    var x1 = this.startNode.visual.x() + startOffset;
    var y1 = this.startNode.visual.y() + startOffset;
    var x2 = this.endNode.visual.x() + endOffset;
    var y2 = this.endNode.visual.y() + endOffset;

    this.visual.points([x1, y1, x2, y2]);
    this.guideLine.points([x1, y1, x2, y2]);
};

//Method for finding the closest point on the edge, using vector projection
Edge.prototype.findClosestPointOnLineFrom = function (x, y) {

    //Calculate the closest point coordinates on the edge you are hovering near
    var edge_x0 = this.visual.points()[0];
    var edge_y0 = this.visual.points()[1];
    var edge_x1 = this.visual.points()[2];
    var edge_y1 = this.visual.points()[3];

    var closest_x;
    var closest_y;

    //Vector AP
    var APx = x - edge_x0;
    var APy = y - edge_y0;

    //Vector AB
    var ABx = edge_x1 - edge_x0;
    var ABy = edge_y1 - edge_y0;

    //Get magnitude of vector AB
    var vecAB_mag = Math.pow(ABx, 2) + Math.pow(ABy, 2);

    //Get dot product of vectors AP and AB
    var dot_APAB = APx * ABx + APy * ABy;

    //Normalized distance between the points
    var t = dot_APAB / vecAB_mag;

    //Get the closest point using t as a normalized scalar
    closest_x = edge_x0 + ABx * t;
    closest_y = edge_y0 + ABy * t;
    closest_x = Math.floor(closest_x);
    closest_y = Math.floor(closest_y);
    //console.log("Closest X:" + closest_x +", Closest Y: " + closest_y);

    return {x: closest_x, y: closest_y};
};

//Split an edge into two edges and insert a new node
Edge.prototype.splitEdge = function (x, y) {
    console.log("Splitting edge at " + x + "," + y);
    //"use strict";
    counter++;
    //Create a new node;
    var id = "n" + node_count;
    var n = new Node(x, y, id,  "node");
    nodes[n.id] = n;
    currentNode = n;

    //Create two new edges from this edge's start and end nodes to the new node
    var e1 = new Edge(this.startNode, n, this.startNode.id + "_" + n.id);
    var e2 = new Edge(this.endNode, n, this.endNode.id + "_" + n.id);

    edges[e1.id] = e1;
    edges[e2.id] = e2;

    //Update the node lists
    n.edges[e1.id] = e1.id;
    n.edges[e2.id] = e2.id;

    this.startNode.edges[e1.id] = e1.id;
    this.endNode.edges[e2.id] = e2.id;

    this.deleteEdge();

    return n;
};

Edge.prototype.deleteEdge = function(){
    //Remove edge from canvas
    this.visual.remove();
    this.guideLine.remove();
    this.guideDot.remove();

    //Remove this edge from it's start and end node's edge list
    delete this.startNode.edges[this.id];
    delete this.endNode.edges[this.id];

    //Remove this edge from the global edge array
    delete edges[this.id];

    edge_count--;

    $("#edgeCount").html("<strong>Edges:</strong> " + edge_count);

    rootLayer.draw();
};

function showMenuForEdge(e) {
    $("#edgeMenu").attr("edge_id", e.id);
    $("#edgeMenu #width-spinner").val(e.guideLine.strokeWidth());
    $("#edgeMenu").show();
}

//Show node menu based on type
function showMenuForNode(node){

    var n = nodes[node.id];

    $("#nodeMenu").attr("node_id", n.id);
    $("#nodeMenu input").hide();

    //Show name input for any type other than node
    if(n.type != "node") {
        $("#nodeMenu #name").val(n.attr["name"]);
        $("#nodeMenu #name").show();
    }

    switch(n.type) {
        case "node":
            $("#nodeMenu #nodeMenuTitle").html("Node info");
        break;

        case "room":
            $("#nodeMenu #nodeMenuTitle").html("Room info");
            $("#nodeMenu #nodeWidth").spinner({
                min: 2,
                max: 100,
                spin: function(event, ui) {
                    bboxSpinnerChange(event, ui);
                },
                change: function(event, ui) {
                    bboxSpinnerChange(event, ui);
                }
            });
            $("#nodeMenu #nodeWidth").val(n.attr["width"]);
            $("#nodeMenu #nodeWidth").show();
            $("#nodeMenu #nodeHeight").spinner({
                min: 2,
                max: 100,
                spin: function(event, ui) {
                    bboxSpinnerChange(event, ui);
                },
                change: function(event, ui) {
                    bboxSpinnerChange(event, ui);
                }
            });
            $("#nodeMenu #nodeHeight").val(n.attr["height"]);
            $("#nodeMenu #nodeHeight").show();
        break;

        case "elevator":
            $("#nodeMenu #nodeMenuTitle").html("Elevator info");
        break;

        case "stair":
            $("#nodeMenu #nodeMenuTitle").html("Stair info");
        break;

        case "entrance":
            $("#nodeMenu #nodeMenuTitle").html("Entry info");
        break;

        case "fire":
            $("#nodeMenu #nodeMenuTitle").html("Extinguisher info");
        break;
    }

    $("#nodeMenu #nodeZ").val(n.attr["zPos"]);
    $("#nodeMenu #nodeZ").show();
    $("#nodeMenu #delBtn").show();
    $("#nodeMenu #updateBtn").show();
    $("#nodeMenu #cancelBtn").show();
    $("#nodeMenu").show();
}

function wheelZoom(e) {
    var zoomAmount = e.wheelDeltaY*0.0001;
    stage.scale({x: stage.scale().x + zoomAmount, y: stage.scale().y+zoomAmount});
    $("#scale").html("<strong>Scale:</strong> " + stage.scale().x);
    stage.draw();
}

/*******************************************
* DATA SAVE/LOAD
*
********************************************/

function saveData(){

    //Get bounds of graph
    calcBounds();

    var floorWidth = bounds["maxX"];
    var floorHeight = bounds["maxY"];

    //Get normalized values for nodes
    calcNormalization(nodes, floorWidth, floorHeight);

    console.log("Floor dim: ", floorWidth, floorHeight);

    var imgUrl = imgObj != null ? imgObj.src : null;

    var graph = {"bldg_fk": bldgId,
                 "image"  : imgUrl,
                 "width"  : floorWidth,
                 "height" : floorHeight,
                 "nodes"  : nodes,
                 "node_count": node_count,
                 "edges"  : edges};

    //Save our nodes, edges, floor attributes, and background image URL to the database
    var data = JSON.stringify(graph);

    console.log(data);

    $.ajax({
        type: "POST",
        url: "http://localhost/ers/public/floors/saveFloorplan" + "/" + floorId,
        data: {"data" : data},
        success: function(data) {
            console.log(data);
            $("#statusBox").attr("class", "alert alert-success").html("Floorplan saved").fadeIn(400).delay(1500).fadeOut(400);
        }
    });
}

function loadData(){

    //console.log(bldgId);
    //console.log(floorId);

    //Fetch data
    $.ajax({
        type: "POST",
        url: "http://localhost/ers/public/floors/loadFloorplan" + "/" + bldgId + "/" + floorId,
        success: function(data) {
            console.log(data);
            if(data != "") {
                var decoded = JSON.parse(data);
                loadGraph(decoded);
            } else {
                console.log("No data for floor");
            }
        }
    });
}

function loadGraph(data) {
    //console.log(data);

    //Add background image
    var imageUrl = data["meta"]["image"];
    loadImage(imageUrl);

    var width = data["meta"]["width"];
    var height = data["meta"]["height"];

    //Add all the nodes
    var node_data = data["nodes"];

    counter = node_data.length;
    node_count = data["meta"]["counter"];
    console.log(node_count, counter);

    for(var i = 0; i < node_data.length; i++) {
        console.log(node_data[i]);
        var id = node_data[i]["node_id"];
        console.log(node_data[i]["x_pos"] * width, node_data[i]["y_pos"] * height);

        var offset = node_data[i]["type"] != "node" ? node_img_size / 2 : 0;

        var node = new Node((node_data[i]["x_pos"] * width) + offset, (node_data[i]["y_pos"] * height) + offset, node_data[i]["node_id"], node_data[i]["type"]);

        if(node_data[i]["type"] == "room"){
            node.attr["width"] = node_data[i]["width"];
            node.attr["height"] = node_data[i]["height"];
            node.bbox.width(node.attr["width"]);
            node.bbox.height(node.attr["height"]);
            node.bbox.offsetX(node.attr["width"] / 2);
            node.bbox.offsetY(node.attr["height"] / 2);
        }

        node.attr["name"] = node_data[i]["name"];
        node.attr["zPos"] = node_data[i]["z_pos"];

        nodes[id] = node;
    }

    //Load all edges
    var edge_data = data["edges"];

    for(var i = 0; i < edge_data.length; i++) {
        var start_id = edge_data[i]["start_node_fk"];
        var end_id = edge_data[i]["end_node_fk"];
        var width = edge_data[i]["edge_width"];
        var edge_id = start_id + "_" + end_id;

        var edge = new Edge(nodes[start_id], nodes[end_id], edge_id);
        edges[edge_id] = edge;
        edge.guideLine.strokeWidth(width);

        //Add edge to connecting nodes' edge lists
        nodes[start_id].edges[edge.id] = edge.id;
        nodes[end_id].edges[edge.id] = edge.id;
    }
}

function calcNormalization(n, w, h) {
    $.each(n, function(key, value){
        value.nX = value.visual.x() / w;
        value.nY = value.visual.y() / h;
    });
}

function calcBounds() {

    //Re-initialize bounds
    bounds = initBounds();

    $.each(nodes, function(key, value){
        setBounds(value.x, value.y);
    });
}

function initBounds() {
    return {"minX" : Number.POSITIVE_INFINITY, "maxX" : 0, "minY" : Number.POSITIVE_INFINITY, "maxY" : 0};
}

function undo(){

}