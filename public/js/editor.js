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
var is_adding_node = false; //Flag to stop multiple nodes being added without being linked or canceled
var addingDoor = false; //Flag to differentiate between links to a room node and a room bbox
var nodeDrag = false; //Used to stop excess taps when moving nodes
var counter = 0; //Counter used to increment/name nodes
var roomCounter = 0; //Counter used for room naming
var selectedRoom = null; //Variable used to apply transformations to a particular room
var zoomLevel = 1; //Canvas zoom level
var linkerNode; //Node to be linked from
var targetNode; //Target node to be linked to
var node_img_size = 32;
var node_text_offset = 15;
var node_radius = 15;
var edge_guide_width = 25;
var default_room_height = 75;
var default_room_width = 50;
var default_snap_tolerance = 8; //Tolerance (in pixels) for snap to grid functionality. Should be a multiple of 8 so as to work with the default image size (16) 
var node_count = 0;
var edge_count = 0;
var bgLayer = null;
var loaded = false;
var imgObj = null; //Stage image
var bounds = initBounds();
var rootLayer, nodeLayer, edgeLayer, roomLayer, tmpLayer;
var graphSnapshot = {};
var lastDistance = 0; //Last drag distance (for moving the stage)
var lastDist = 0; //Last dragged distance (for touch-zoom)
var nodeColor = {"blue": '#2B64FF', "yellow": '#E3B912'};
var nodeImage = {"Room": "roomtool.png", "Elevator": "elevatortool.png", "Stair": "stairtool.png", "Fire": "firetool.png", "Entrance": "entrancetool.png"}; //Node image names
var iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
var clickedEdge = 0;

//Console
if(typeof console === "undefined"){
      console = {};
}

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
nodeLayer = new Kinetic.Layer();
edgeLayer = new Kinetic.Layer();
roomLayer = new Kinetic.Layer();
tmpLayer = new Kinetic.Layer();
stage.tmpLayer = new Kinetic.Layer();
stage.guideDrag = false; //Flag for whether or not a link attempt is being made (guidenode dragging)
stage.add(rootLayer);
stage.add(nodeLayer);
stage.add(edgeLayer);
stage.add(roomLayer);
stage.add(tmpLayer);
edgeLayer.moveToBottom();
rootLayer.moveToBottom();
nodeLayer.moveToTop();

function redrawAll() {
  edgeLayer.batchDraw();
  nodeLayer.batchDraw();
  rootLayer.batchDraw();
  roomLayer.batchDraw();
}


var image;
//Stage drag offset
stage.on(touchstart, function(e){
    //console.log(touchstart);
    if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};
    stage.startX = stage.x();
    stage.startY = stage.y();
    lastDistance = 0;
    //disableHitGraph();
}).on(touchmove, function(e){
    //if(edgeLayer.hitGraphEnabled()||nodeLayer.hitGraphEnabled())
	//disableHitGraph();
	
    offsetX = stage.x();
    offsetY = stage.y();
    //stage.lastDragDistance = Math.sqrt(Math.pow(offsetX - stage.startX, 2) + Math.pow(offsetY - stage.startY, 2));
    lastDistance += Math.sqrt(Math.pow(offsetX - stage.startX, 2) + Math.pow(offsetY - stage.startY, 2));
    stage.startX = stage.x();
    stage.startY = stage.y();

}).on(touchend, function(e){
//    console.log(lastDist);
    //enableHitGraph();
});

// **** Zoom methods *****
stage.getContent().addEventListener("mousewheel", wheelZoom, false);
stage.getContent().addEventListener('touchmove', function(evt) {

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
        stage.batchDraw();
        //stage.draw();
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

function getRelativePointerPosition() {
	var pointer = stage.getPointerPosition();
	var pos = stage.getAbsolutePosition();
	var offset = stage.getOffset();
	var scale = stage.getScale();

	return {
		x: ((pointer.x / scale.x) - (pos.x / scale.x) + offset.x),
		y: ((pointer.y / scale.y) - (pos.y / scale.y) + offset.y)
	};
}

function customFloor(value, roundTo) {
    return Math.floor(value / roundTo) * roundTo;
}

function roundToNearest(value, roundTo) {
    return Math.round(value/roundTo) * roundTo;
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
    //stage.guideNode.destroy();
    //stage.guideLine.destroy();

    //rootLayer.draw();
    nodeLayer.draw();
    stage.tmpLayer.destroy();
}

//Cancel node insertion
function cancelLink(){
    var node = nodes[linkerNode.id];
    node.delete();
    //setNodeColor(nodeColor.blue);
    linkerNode = null;
    counter--;
    edgeLayer.draw();
    nodeLayer.draw();
    stage.tmpLayer.destroy();
    is_adding_node = false;
}

//Join two existing nodes
function joinNodes(startNode, endNode, offset) {
    offset = typeof offset !== 'undefined' ? offset : {x:0, y:0};

    //Create edge between linker node and target node
    var edge_id = startNode.id + "_" + endNode.id;
    var edge = new Edge(startNode, endNode, edge_id, offset);
    var alt_edge_id = endNode.id + "_" + startNode.id;

    edges[edge_id] = edge;

    startNode.edges[edge.id] = edge.id;
    endNode.edges[edge.id] = edge.id;

    currentNode = endNode;

    startNode = null;
    endNode = null;

    if(stage.linkStart != null) {	
        if(stage.linkStart.type == "Hallway")
    	    stage.linkStart.visual.fill(nodeColor.blue);
    	if(stage.linkEnd.type == "Hallway")
	    stage.linkEnd.visual.fill(nodeColor.blue);
    }

    stage.linkStart = null;
    stage.linkEnd   = null;

    nodeLayer.draw();
    edgeLayer.draw();
    //rootLayer.draw();
}

//Split an edge when inserting node
function splitEdge(linkerNode, targetEdge, x , y) {
    //Update the node color for all nodes
    if(linkerNode.type == "Hallway")
        linkerNode.visual.fill(nodeColor.blue);
    //setNodeColor(nodeColor.blue);

    var n = targetEdge.splitEdge(x, y);

    //Link the new nodes
    insertNode(linkerNode, n);
}

function handleStageTap(evt) {
    var touchPos = getRelativePointerPosition();

    var x = touchPos.x;
    var y = touchPos.y;

    //Don't place a node if the movement of the stage was significant (pan)
    //if(stage.lastDragDistance > 10) {
    if(!iOS && lastDistance > 10) {
        //console.log(stage.lastDragDistance);
        //stage.lastDragDistance = 0;
        lastDistance = 0;
	return;
    }

    if(selectedRoom != null)
	return;

    //Both these lines accomplish the same thing, the latter is a hacky way of doing the former.
    //For some reason, getIntersection and touchPos aren't working when the stage is moved or zoomed. 
    if(edgeLayer.getIntersection(touchPos)) return;    
	console.log(Date.now()-clickedEdge);
    if(Date.now()-clickedEdge < 150) return; 

    //Handle node link
    if(stage.guideDrag || is_adding_node) {
        stage.guideDrag = false;
	is_adding_node = false;

        //Link nodes
	if(nodeLayer.getIntersection(touchPos)) {
	    if(linkerNode.type == "Hallway")
                linkerNode.visual.fill("#2B64FF");
            tmpNode = nodeLayer.getIntersection(touchPos);
	    targetNode = nodes[tmpNode.id];
	    insertNode(linkerNode, targetNode);

	} else if (edgeLayer.getIntersection(touchPos)) {
	    tmpNode = edgeLayer.getIntersection({x:x,y:y});
	    targetNode = edges[tmpNode.id];
	    splitEdge(linkerNode, targetNode, x, y);
	} else {
	    cancelLink();
	}
        return;
    }

    //Logic for path tool
    if(selectedTool == "path") {

        //Place our tail node if none have been placed
        if (currentNode == null && (node_count == 0 || counter == 0) && evt.target != 'Kinetic.Circle' && evt.target != 'Kinetic.Line' ) {

            //Place starting node
            var id = "n" + getNextNodeId();
            var node = new Node(x, y, id, "Hallway");

            //Add node to our node list
            nodes[id] = node;

            //Set the node that was just placed to be the current node
            currentNode = node;

            //console.log(rootLayer.getChildren());

        } else if (currentNode != null && evt.target != 'Kinetic.Circle' && evt.target != 'Kinetic.Line' && !is_hovering) {


            //if(rootLayer.getIntersection(touchPos)) return;
	    if(nodeLayer.getIntersection(touchPos)) return;

            counter++; //New node

	    var id = "n" + getNextNodeId();
            var node = new Node(x, y, id, "Hallway");

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


    //Logic for new special node (room, fire extinguisher, elevator, etc)
    if(selectedTool != undefined && selectedTool != "path" && selectedTool != "link") {
	if (!is_hovering && !nodeDrag && !is_adding_node) {
            is_adding_node = true;

	    counter++;

	    var id = "n" + getNextNodeId();
	    if(selectedTool == "Node")
		selectedTool = "Hallway";
            var node = new Node(x, y, id, selectedTool);
            nodes[id] = node;
            linkerNode = node;

	    if(selectedTool == "Hallway") {
		node.visual.fill("#E3B912");
	    	nodeLayer.draw();
    	    }

	    //if(iOS) {
	    	//setNodeColor(nodeColor.yellow);
	    //} else {
		//drawGuide(x, y, x, y, id, selectedTool);
	    //}
        }
    }
}


//The Node (or junction) class contains information such as its normalized location, list of edges, and an ID
function Node(x, y, id, type, attr) {
    //Node metadata
    this.x = roundToNearest(x, default_snap_tolerance);
    this.y = roundToNearest(y, default_snap_tolerance);
    this.nX = 0;
    this.nY = 0;
    this.type = type;
    this.bbox;
    this.id = id;
    this.edges = {};
	
    if(attr == undefined) {
	this.attr  = {"zPos": 0,
                  "name": '',
                  "width": default_room_width,
                  "height": default_room_height};
    } else {
	this.attr = attr;
    }

    console.log(this.id, this.type, this.x, this.y, this.attr["name"]);
    //Increment node counter
    node_count++;

    $("#nodeCount").html("<strong>Nodes:</strong>: " + node_count);

    //Create visual representation
    this.render(this.x, this.y, node_radius);
}

Node.prototype.toJSON = function() {
    return {
        x: this.x,
        y: this.y,
        z: this.attr["zPos"],
        id: this.id,
        name: this.attr["name"],
        type: this.type,
        width: this.attr["width"],
        height: this.attr["height"]
    };
}

//Update min and max node bounds
function setBounds(x, y) {
    bounds["minX"] = Math.min(x, bounds["minX"]);
    bounds["maxX"] = Math.max(x, bounds["maxX"]);
    bounds["minY"] = Math.min(y, bounds["minY"]);
    bounds["maxY"] = Math.max(y, bounds["maxY"]);

    console.log("Bounds: ", bounds);
}

//---------------------------------------------------
// ---- Functions to bind to Node event handlers ----
//---------------------------------------------------
function hover(x,y){
    is_hovering = true;
    $("#xPos").html("<strong>X: </strong>" + Math.round(x));
    $("#yPos").html("<strong>Y: </strong>" + Math.round(y));
}
function unHover() {
    is_hovering = false;
    $("#xPos").html("<strong>X: </strong>");
    $("#yPos").html("<strong>Y: </strong>");
}

//var Delay = 300, clicks = 0, timer = null;
function nodeTap(e, node){
    //clicks++;

    //if(clicks === 1) {
        //timer = setTimeout(function() {

    console.log(is_adding_node, node.type, linkerNode);
    if(is_adding_node && node.type == "Hallway" && linkerNode != node) {
        is_adding_node = false;
        nodeDrag = false;

        setNodeColor(nodeColor.blue);

        joinNodes(linkerNode, node);

    } else {
        console.log(node.id, node.x, node.y);
        handleNodeTap(e, node);
    }
	//clicks = 0;
	//}, Delay);
    //} else {
//	clearTimeout(timer);
//	console.log("Double Click");
//	if(selectedTool != "link") {
//	    showMenuForNode(node.visual);
//	}
//	clicks = 0;
  //  }
}
function moveNode(node, touchOffset) {
	var touchPos = getRelativePointerPosition();
        var newX = touchPos.x - touchOffset.x;
        var newY = touchPos.y - touchOffset.y;

	if(!tmpLayer.hasChildren()) {
            node.visual.moveTo(tmpLayer);
	    if(node.bbox != undefined) {
		node.bbox.moveTo(tmpLayer);
		node.bbox.guideCircle.moveTo(tmpLayer);
		node.bbox.moveToBottom();
	    }
        }

	//Update position vars of node
	node.x = newX;
        node.y = newY;
        node.visual.setPosition({x:newX, y:newY});

	$("#xPos").html("<strong>X: </strong>" + (node.x));
        $("#yPos").html("<strong>Y: </strong>" + (node.y));

	//Move node text
	if(node.text != null) {
            node.text.x(node.visual.x() - node_text_offset);
            node.text.y(node.visual.y() - node_text_offset);
        }

        //Move room BB if set
        if (node.bbox != undefined) {
            node.bbox.x(node.visual.x() + node.visual.width()/2);
            node.bbox.y(node.visual.y() + node.visual.height()/2);

            node.bbox.guideCircle.x(node.bbox.x() + parseFloat(node.bbox.width()) - node.bbox.offsetX());
            node.bbox.guideCircle.y(node.bbox.y() + parseFloat(node.bbox.height()) - node.bbox.offsetY());
            roomLayer.batchDraw();
        }

        //Update positions of connected edges
        for(var x in node.edges){
            edges[node.edges[x]].setPosition();
        }

	tmpLayer.batchDraw();
}

function finalizeNodePos(node, touchOffset) {
	currentNode = node;

        var loc = node.visual.getPosition();
        var newX = roundToNearest(loc.x, default_snap_tolerance);
        var newY = roundToNearest(loc.y, default_snap_tolerance);
        node.x = newX;
        node.y = newY;
        node.visual.setPosition({x:newX, y:newY});

        //Move node text
        if(node.text != null && node.text.attrs.text != "") {
            node.text.x(node.visual.x() - node_text_offset);
            node.text.y(node.visual.y() - node_text_offset);
        }

        //Move room BB if set
        if (node.bbox != undefined) {
            node.bbox.x(node.visual.x() + node.visual.width()/2);
            node.bbox.y(node.visual.y() + node.visual.height()/2);

            node.bbox.guideCircle.x(node.bbox.x() + parseFloat(node.bbox.width()) - node.bbox.offsetX());
            node.bbox.guideCircle.y(node.bbox.y() + parseFloat(node.bbox.height()) - node.bbox.offsetY());
            roomLayer.batchDraw();
        }

        //Update positions of connected edges
        for(var x in node.edges){
            edges[node.edges[x]].setPosition();
        }

        if(tmpLayer.hasChildren()) {
            tmpLayer.batchDraw();
            node.visual.moveTo(nodeLayer);
	    if(node.bbox != undefined) {
		node.bbox.moveTo(roomLayer);
		node.bbox.guideCircle.moveTo(roomLayer);
	    }
        }

        //tmpLayer.destroy();   
        nodeLayer.batchDraw();

        $("#xPos").html("<strong>X: </strong>");
        $("#yPos").html("<strong>Y: </strong>");

        nodeDrag = false;
        //console.log(nodeDrag);
}
//------------------------------------------------
//------------------------------------------------


//Set up various attributes and event bindings for shape
Node.prototype.setupNode = function (x, y) {

    //Reference to main object for event bindings
    var _self = this;
    var c = this.visual;

    c.on('mouseenter', function(e) {
	return hover(c.x(), c.y());
    });
    c.on('mouseleave', function(e) {
	return unHover();
    });
    c.on(tap, function(e) {
	return nodeTap(e, _self);
    });
    c.on(dbltap, function(e) {
	if(selectedTool != "link") {
 	    showMenuForNode(c);
	}
	//if(e.evt != undefined) {e.evt.preventDefault()} else {e.preventDefault()};	
    });

    var touchOffset, touchPos;

    //Drag event
    c.on(touchstart, function(e){
	nodeDrag = true;
	touchPos = getRelativePointerPosition();
	touchOffset = {
	    x: Math.abs(_self.x - touchPos.x),
	    y: Math.abs(_self.y - touchPos.y)
	};
        //Event structure varies between mobile and desktops
        if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};
    }).on(touchmove, function(e) {
	return moveNode(_self, touchOffset);
    }).on(touchend, function(e){
        if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};
    	return finalizeNodePos(_self, touchOffset);
    });
};

function handleNodeTap(e, obj) {
    //Event structure varies between mobile and desktops
    if(e.evt != undefined) {e.evt.cancelBubble = true} else {e.cancelBubble = true};

    if(stage.linkStart != null && obj.id == stage.linkStart.id) {
        if(obj.type == "Hallway" )
	    obj.visual.fill("#2B64FF");
        stage.linkStart = null;
        //rootLayer.draw();
	nodeLayer.draw();
        return;
    } else if (stage.linkEnd != null && obj.id == stage.linkEnd.id) {
        if(obj.type == "Hallway")
	    obj.visual.fill("#2B64FF");
        stage.linkStart = null;
        //rootLayer.draw();
	nodeLayer.draw();
        return;
    }

    //Handle node-to-node link event
    if(selectedTool == "link" && stage.linkStart == null) {
        stage.linkStart = obj;
	console.log(obj.type);
	if(obj.type == "Hallway")
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
	    if(obj.type == "Hallway")
	    	obj.visual.fill("#E3B912");	
            //Link nodes
            console.log("Set stage.linkEnd");

            joinNodes(stage.linkStart, stage.linkEnd);
        }
    }

    //rootLayer.draw();
    nodeLayer.draw();

    currentNode = obj;
}

//Render node based on its type
Node.prototype.render = function(x, y, r){

    //Create node on canvas
    this.visual = null;

    var _self = this;

    if(this.type == "Hallway"){
        this.visual = new Kinetic.Circle({
            x: x,
            y: y,
            radius: r,
            fill: '#2B64FF',
            stroke: '#000000',
            strokeWidth: 2,
            draggable: true
        });

        //rootLayer.add(this.visual);
        nodeLayer.add(this.visual);
	_self.x = _self.visual.x();
        _self.y = _self.visual.y();
	
	nodeLayer.draw();
        //rootLayer.draw();
        
	this.visual.id = this.id;
        showTextForNode(this, this.attr["name"]);
        this.setupNode(x, y, node_radius);

        //currentNode = this;	
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

        //rootLayer.add(_self.visual);
        //rootLayer.draw();

        image.onload = function(){
            _self.setupNode(_self.visual.x(),_self.visual.y(), node_radius);

            //rootLayer.add(_self.visual);
	    nodeLayer.add(_self.visual);	
	    _self.x = _self.visual.x();
	    _self.y = _self.visual.y();
	    //rootLayer.draw();
	    
	    nodeLayer.draw();
	
            showTextForNode(_self, _self.attr["name"]);
        
	    _self.visual.id = _self.id;
       //     console.log("rendered");
        }

        image.src = '../../img/' + this.type.toLowerCase() + 'tool.png';

        var width = _self.attr["width"];
        var height = _self.attr["height"];
        
	if(this.type== "Room") {
	    this.roomGroup = new Kinetic.Group();

	    this.bbox = new Kinetic.Rect({
	        x: x,
                y: y,
                strokeWidth: 2,
                stroke: "black",
	    	fill: "grey",
                listening: true,
                width: width,
                height: height,
		guideCircle: null,
		doors: {}
            });

	    this.roomGroup.add(this.bbox);
	    this.bbox.parentNode = this; 
	    setupRoom(this.bbox);

            roomLayer.add(this.bbox);
            roomLayer.draw();
        }
    }
}

//Bind event handlers for rooms
function setupRoom(room) {
    room.offsetX(default_room_width/2);
    room.offsetY(default_room_height/2);
    
    room.guideCircle = new Kinetic.Circle({
	x: room.x() + parseFloat(room.width()) - room.offsetX(),
	y: room.y() + parseFloat(room.height()) - room.offsetY(),
	radius: 10,
	fill: 'red',
	stroke: 'black',
	strokeWidth: 2,
	draggable: true
    });

    room.parentNode.roomGroup.add(room.guideCircle);

    room.guideCircle.on("dragmove", function () {
    	var pos = this.getPosition();
        var x = pos.x;
        var y = pos.y;
        var rectX = room.x()// - room.getWidth() / 2;
        var rectY = room.y()// - room.getHeight() / 2;
	x = (x > rectX + 25 ? x : rectX + 25);
	y = (y > rectY + 36.5? y : rectY + 36.5);
	this.setPosition({x:x,y:y});	
	var w = x - rectX + 25;
	var h = y - rectY + 36.5;
	w = (w > default_room_width ? w : default_room_width);
	h = (h > default_room_height? h : default_room_height);
        room.size({width: w, height: h});
        roomLayer.draw();

	//Delete the door edges associated with this room
	//(This is a bit brute-force; it could be better to update their positions 
	//	or only delete them if the room's new position makes their position illogical)
 	if(!jQuery.isEmptyObject(room.attrs.doors)) {
	    $.each(room.attrs.doors, function(key, value) {
	    	var id = key + "_" + room.parentNode.id;
	    	var edge = edges[id];
	    	edge.deleteEdge();
		delete room.attrs.doors[key];
	    });
	} 
    });
    
    roomLayer.add(room.guideCircle);
    room.guideCircle.moveToTop();
    room.guideCircle.hide();
    roomLayer.draw(); 

    room.on(tap, function(e) {
	if(is_adding_node == false && selectedTool != "link") {

	    if(selectedRoom == null) {
	    	selectedRoom = this;
	    	selectedRoom.fill('green');
	    	this.guideCircle.moveToTop();
	    	this.guideCircle.show();
		//this.parentNode.contextToolbar.show();
            } else {
	        if(selectedRoom == this) {
            	    selectedRoom = null;
            	    this.fill('grey');
	   	    this.guideCircle.hide();
		    //this.parentNode.contextToolbar.hide();
                } else {
                    selectedRoom.fill('grey');
	    	    selectedRoom.guideCircle.hide();
		    selectedRoom = this;
		    selectedRoom.fill('green');
		    this.guideCircle.moveToTop();
		    this.guideCircle.show();
		    //this.parentNode.contextToolbar.show();
	         }
	     }
	} else {
	    //LOGIC FOR ADDING LINKS (NEW NODES OR NEW LINKS) TO ROOM BY TAPPING BBOX
	    if(stage.linkStart != null && stage.linkStart.id != room.parentNode.id) {
		nodeDrag = false;
		//console.log("ADD ME");
		var touchPos = getRelativePointerPosition();
     	        touchPos.x = roundToNearest(touchPos.x, default_snap_tolerance);
       		touchPos.y = roundToNearest(touchPos.y, default_snap_tolerance);

		//console.log(room.x(), room.y(), room.width(), room.height());

	    	var offset = {x: touchPos.x - room.parentNode.x, y: touchPos.y - room.parentNode.y};
		console.log(offset);

		var edge_id = stage.linkStart.id + "_" + room.parentNode.id;
	 	var alt_edge_id = room.parentNode.id + "_" + stage.linkStart.id;
	
		if(edges[edge_id] != null || edges[alt_edge_id] != null) {
		    //edge exists, cancel join
		    if(stage.linkStart.type != 'room')
			stage.linkStart.visual.fill(nodeColor.blue);
		    console.log("Canceling join");
		    stage.linkStart = null;
	 	    stage.linkEnd = null;
		    return;
		} else {
		    //edge doesn't exist, create it
		    stage.linkEnd = room.parentNode;
		    addingDoor = true;
		    console.log("Set stage.linkEnd");
		    
		    room.attrs.doors[stage.linkStart.id] = stage.linkStart;
 
		    joinNodes(stage.linkStart, stage.linkEnd, offset);
		    
		}

	    } else {
		console.log("DON'T ADD");
	    }
	}
    
	roomLayer.draw();    
    });

    room.on('mouseenter', function(e) {
        is_hovering = true;
    });

    room.on('mouseleave', function(e) {
	is_hovering = false;
    });
}

//Delete node
Node.prototype.delete = function(){

    nodeDrag = false;
    if(is_adding_node == true) {
        is_adding_node = false;
    	//setNodeColor(nodeColor.blue);
    }

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

    //Remove this node from the node list
    delete nodes[this.id];
    if(currentNode != null && currentNode.id == this.id) {
        currentNode = null;
    }

    if(this.bbox != null) {
        this.bbox.destroy();
	roomLayer.batchDraw();
    }

    if(this.text != null) {
	this.text.destroy();
    }
    
    this.visual.destroy();
    
    node_count--;

    $("#nodeCount").html("<strong>Nodes:</strong>: " + node_count);

    nodeLayer.batchDraw(); 
}

//Every two nodes has an edge between it. The edge class represents the line being drawn between those nodes
function Edge(startNode, endNode, id, offset) {
    offset = typeof offset !== 'undefined' ? offset : {x:0, y:0};

    //Start and endpoint nodes
    this.startNode = startNode;
    this.endNode = endNode;

    //Edge ID
    this.id = id;

    //Room offset
    this.offset = offset;
    edge_count++;
     
    $("#edgeCount").html("<strong>Edges:</strong> " + edge_count);

    this.setupLine();
}

Edge.prototype.toJSON = function() {
    return {
        startNode: this.startNode.id,
        endNode: this.endNode.id,
        //edgeWidth: this.guideLine.strokeWidth
	edgeWidth: edge_guide_width,
	offsetX: this.offset.x,
	offsetY: this.offset.y
    };
}

Edge.prototype.setupLine = function () {
    //"use strict";
    var _self = this;

    var startOffset = 0;
    var endOffset = 0;
    var sentinel = false;

    //If the edge is connected to a room bbox, treat it as a door
    if(_self.offset.x != 0 || _self.offset.y !=0) {
	sentinel = true;

	//If we are indeed adding a door to a room, update the bbox's door object
	if(_self.endNode.type == 'room') {
	    _self.endNode.bbox.attrs.doors[_self.startNode.id] = _self.startNode;
	}
    }

    if(this.startNode.type != "Hallway") {
        startOffset = this.startNode.visual.width() / 2;
    }

    if (this.endNode.type != "Hallway" && !addingDoor && !sentinel){
        endOffset = this.endNode.visual.width() / 2;
    }

    //Adjust sentinel now that the endOffset has been calculated
    if(addingDoor)
	addingDoor = false;

    var x1 = parseFloat(this.startNode.visual.x()) + startOffset;
    var y1 = parseFloat(this.startNode.visual.y()) + startOffset;
    var x2 = parseFloat(this.endNode.visual.x()) + endOffset + _self.offset.x;
    var y2 = parseFloat(this.endNode.visual.y()) + endOffset + _self.offset.y;

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
    this.guideLine.parentEdge = this;

    //Create guide dot (shows where edges will split at)
    this.guideDot = new Kinetic.Circle({
        x: this.startNode.x,
        y: this.startNode.y,
        radius: node_radius,
        fill: "#D62029",
        listening: false
    }).hide();

    this.guideLine.on(tap, function(e) {
//  	if(e.evt != undefined) {e.evt.stopPropagation()} else {e.stopPropagation()};

	clickedEdge = Date.now();
	if(is_adding_node == true) {
	    var touchPos = getRelativePointerPosition();
	    var x = roundToNearest(touchPos.x,default_snap_tolerance);
	    var y = roundToNearest(touchPos.y,default_snap_tolerance);    	    
	    is_adding_node = false;
	
	    var targetEdge = edges[this.id];
	    splitEdge(linkerNode, targetEdge, x, y);
	
	} else {
	   console.log(this.parentEdge.id);
	}

    });

    this.guideLine.on(dbltap, function(e){
        console.log("Double tapped edge");
        showMenuForEdge(_self);
    });


    this.visual.id = this.id;
    this.guideLine.id = this.id;
    this.guideDot.is_guide = true;

    //rootLayer.add(this.visual);
    //rootLayer.add(this.guideLine);
    //rootLayer.add(this.guideDot);

    edgeLayer.add(this.visual);
    edgeLayer.add(this.guideLine);
    edgeLayer.add(this.guideDot);

    this.guideLine.moveToBottom(); //Send edges to back so nodes are on top of it
    this.visual.moveToBottom(); //Send edges to back so nodes are on top of it
    //rootLayer.draw();
    edgeLayer.draw();
};

//Function for handling the reorientation of an edge
Edge.prototype.setPosition = function () {

    var startOffset = 0;
    var endOffset = 0;
    var _self = this;
    var sentinel = false;

    if(_self.offset.x > 0 && _self.offset.y > 0) {
	sentinel = true;
    }

    if(this.startNode.type != "Hallway") {
        startOffset = this.startNode.visual.width() / 2;
    }

    if (this.endNode.type != "Hallway" && !sentinel){
        endOffset = this.endNode.visual.width() / 2;
    }

    var x1 = this.startNode.visual.x() + startOffset;
    var y1 = this.startNode.visual.y() + startOffset;
    var x2 = this.endNode.visual.x() + endOffset + _self.offset.x;
    var y2 = this.endNode.visual.y() + endOffset + _self.offset.y;

    this.visual.points([x1, y1, x2, y2]);
    this.guideLine.points([x1, y1, x2, y2]);

    edgeLayer.batchDraw();
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
    //"use strict";
    counter++;
    //Create a new node;
    var id = "n" + getNextNodeId();
    var n = new Node(x, y, id,  "Hallway");
    nodes[n.id] = n;
    currentNode = n;

    //Create two new edges from this edge's start and end nodes to the new node
    var e1 = new Edge(this.startNode, n, this.startNode.id + "_" + n.id);
    var e2 = new Edge(n, this.endNode, n.id + "_" + this.endNode.id, this.offset);

    //Adjust room bbox edge list if necessary
    if(this.offset.x > 0 || this.offset.y > 0) {
	delete this.endNode.bbox.attrs.doors[this.startNode.id];
    }

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

    //If this edge is attached to a room bbox, remove it from that object too
    if( this.offset.x != 0 && this.offset.y != 0 && this.endNode.type == 'room') {
	var id = this.id.split("_");
	var id = id[0];
	console.log(id);
	delete this.endNode.bbox.attrs.doors[id];
    }

    //Remove this edge from the global edge array
    delete edges[this.id];

    edge_count--;

    $("#edgeCount").html("<strong>Edges:</strong> " + edge_count);

    //rootLayer.draw();
    edgeLayer.draw();
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
    if(n.type != "Hallway") {
        $("#nodeMenu #name").val(n.attr["name"]);
        $("#nodeMenu #name").show();
    }

    switch(n.type) {
        case "Hallway":
            $("#nodeMenu #nodeMenuTitle").html("Node info");
        break;

        case "Room":
            $("#nodeMenu #nodeMenuTitle").html("Room info");
            //$("#nodeMenu #nodeWidth").spinner({
            //    min: 2,
            //    max: 200,
            //    spin: function(event, ui) {
            //        bboxSpinnerChange(event, ui);
            //    },
            //    change: function(event, ui) {
            //        bboxSpinnerChange(event, ui);
            //    }
            //});
            //$("#nodeMenu #nodeWidth").val(n.attr["width"]);
            //$("#nodeMenu #nodeWidth").show();
            //$("#nodeMenu #nodeHeight").spinner({
            //    min: 2,
            //    max: 200,
            //    spin: function(event, ui) {
            //        bboxSpinnerChange(event, ui);
            //    },
            //    change: function(event, ui) {
            //        bboxSpinnerChange(event, ui);
            //    }
            //});
            //$("#nodeMenu #nodeHeight").val(n.attr["height"]);
            //$("#nodeMenu #nodeHeight").show();
        break;

        case "Elevator":
            $("#nodeMenu #nodeMenuTitle").html("Elevator info");
        break;

        case "Stair":
            $("#nodeMenu #nodeMenuTitle").html("Stair info");
        break;

        case "Entrance":
            $("#nodeMenu #nodeMenuTitle").html("Entry info");
        break;

        case "Fire":
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

function makeAlert(msg, type) {
    var alertType = "";
    if(msg === undefined)
	msg = "Undefined value.";
	
    switch(type) {
	case 0: 
	    alertType = "alert alert-success";
	    break;
	case 1:
	    alertType = "alert alert-info";
	    break;
	case 2: 
	    alertType = "alert alert-warning";
	    break;
	case 3:
	    alertType = "alert alert-danger";
	    break;
	default:
	    alertType = "alert alert-info";
    }

    $("#statusBox").attr("class", alertType ).html(msg.toString()).fadeIn(400).delay(1500).fadeOut(400);	
}

/*******************************************
* DATA SAVE/LOAD
*
********************************************/

function saveData(){
    //Get bounds of graph
    //calcBounds();

    //var floorWidth = bounds["maxX"];
    //var floorHeight = bounds["maxY"];

    //Get normalized values for nodes
    //calcNormalization(nodes, floorWidth, floorHeight);

    //console.log("Floor dim: ", floorWidth, floorHeight);

    var imgUrl = imgObj != null ? imgObj.src : null;

    if(node_count == 0 && imgUrl == null) {
	makeAlert("No data to save", 2);
	return;
    }

    getWidthHeight();

    var graph = {"bldg_fk": bldgId,
                 "image"  : imgUrl,
                 //"width"  : floorWidth,
                 //"height" : floorHeight,
                 "nodes"  : nodes,
                 "node_count": node_count,
                 "edges"  : edges};

    //Save our nodes, edges, and background image URL to the database

    var data = JSON.stringify(graph, null, 4);

    console.log(data);

    $.ajax({
        type: "POST",
        url: "../../floors/saveFloorplan" + "/" + floorId,
        data: {"data" : data},
        success: function(data) {
            //console.log(data);
	    makeAlert("Floorplan saved", 0);
        },
	error: function(XMLHttpRequest, textStatus, errorThrown) {
		console.log(textStatus, errorThrown);
	}
    });
}

function loadData(){

    //Fetch data
    $.ajax({
        type: "POST",
	url: "../../floors/loadFloorplan/"+bldgId+"/"+floorId,
	success: function(data) {
            //console.log(data);
            if(data != "") {
                var decoded = JSON.parse(data);
                loadGraph(decoded);
            } else {
                console.log("No data for floor");
            }
        },
	error: function(XMLHttpRequest, textStatus, errorThrown) {
	    console.log("ERROR: ", textStatus, errorThrown);
	}
    });
}

function loadGraph(data) {
    //console.log(data);

    //Add background image
    //var imageUrl = data["meta"]["image"];
    var imageUrl = "../../tmp/" + bldgId + "_" + floorId + "_floorplan.jpg"; 
    try {
	loadImage(imageUrl);
    } catch(e) {
	console.log("no image found for this building/floor combination.");
    }
    //var width = data["meta"]["width"];
    //var height = data["meta"]["height"];
    
    var max_x = data["meta"]["max_x"];
    var max_y = data["meta"]["max_y"];
    var min_x = data["meta"]["min_x"];
    var min_y = data["meta"]["min_y"];
    //console.log("meta: ", max_x, max_y, min_x, min_y); 
     
    var bounds = {minX: min_x, maxX: max_x, minY: min_y, maxY: max_y};

    //Add all the nodes
    var node_data = data["nodes"];

    counter = node_data.length;
    //node_count = node_data.length;
    //console.log(counter);

    for(var i = 0; i < counter; i++) {
        var id = node_data[i]["node_id"];
	var offset = node_data[i]["type"] != "Hallway" ? node_img_size / 2 : 0;

	//var scaledValues = scaleNodeToRange(node_data[i]["x_pos"], node_data[i]["y_pos"], bounds);
	//var x = scaledValues.x;
	//var y = scaledValues.y;

	var x = parseFloat(node_data[i]["x_pos"]);
	var y = parseFloat(node_data[i]["y_pos"]);

	var attr = {};	
        if(node_data[i]["type"] == "Room"){
            attr = {
	    	"width": node_data[i]["width"],
		"height": node_data[i]["height"],
	    	"name": node_data[i]["name"],
		"zPos": node_data[i]["z_pos"] 
	    };
            //node.bbox.offsetX(node.attr["width"] / 2);
            //node.bbox.offsetY(node.attr["height"] / 2);
       
	} else {
	    attr = {
		"zPos": 0,
                "name": '',
                "width": default_room_width,
                "height": default_room_height
	    };
 	}
	
	var node = new Node(x + offset, y + offset, id, node_data[i]["type"], attr)
        nodes[id] = node;
    }

    //roomLayer.batchDraw();

    //Load all edges
    var edge_data = data["edges"];

    for(var i = 0; i < edge_data.length; i++) {
        var start_id = edge_data[i]["start_node_fk"];
        var end_id = edge_data[i]["end_node_fk"];
        var width = edge_data[i]["edge_width"];
        var edge_id = start_id + "_" + end_id;

	var offsetX = parseFloat(edge_data[i]["offsetX"]);
	var offsetY = parseFloat(edge_data[i]["offsetY"]);
	var offset = {x:offsetX, y:offsetY};
	
	if(isNaN(offset.x))
	    offset.x = 0; 
        if(isNaN(offset.y))
	    offset.y = 0;

	var edge = new Edge(nodes[start_id], nodes[end_id], edge_id, offset);
        edges[edge_id] = edge;
        //edge.guideLine.strokeWidth(width);

        //Add edge to connecting nodes' edge lists
        nodes[start_id].edges[edge.id] = edge.id;
        nodes[end_id].edges[edge.id] = edge.id;
    }
}

function getWidthHeight() {
    $.each(nodes, function(key, value) {
	if(value.type == "Room") {
	    value["attr"].width = value.bbox.width();
	    value["attr"].height = value.bbox.height();
	}
    });
}

// Scale a given node's x and y coords to a given range
function scaleNodeToRange(x, y, bounds) {
    scaledX = ((x-bounds.minX)/(bounds.maxX - bounds.minX))*(width);
    scaledY = ((y-bounds.minY)/(bounds.maxY - bounds.minY))*(height);

    return {x: scaledX, y: scaledY};
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

function getNextNodeId() {
    while(nodes["n"+ counter] != undefined) {
	counter++;
    }
    return counter;
}

function setNodeColor(color) {
    $.each(nodes, function(key, value) {
    	if(value.type == "Hallway") {
            value.visual.fill(color);
        }
    });
    nodeLayer.batchDraw();
}

function enableHitGraph() {
makeAlert("hit graph enabled");
    edgeLayer.hitGraphEnabled(true);
    nodeLayer.hitGraphEnabled(true);
    roomLayer.hitGraphEnabled(true);
}

function disableHitGraph() {
makeAlert("hit graph disabled");
    edgeLayer.hitGraphEnabled(false);
    nodeLayer.hitGraphEnabled(false);
    roomLayer.hitGraphEnabled(false);
}


function undo(){
}
