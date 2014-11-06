/*
    Emergencg Response System Floorplan Editor
*/

//Grab container width and height for stage sizing
var height = $("#stage").height();
var width  = $("#stage").width();
var nodes = {}; //Our array of nodes
var edges = {}; //The array of edges
var offsetX = 0; //Offset values from dragging stage
var offsetY = 0; //Offset values from dragging stage
var counter = 0; //Counter used to increment/name nodes
var roomCounter = 0; //Counter used for room naming
var zoomLevel = 1; //Canvas zoom level
var node_img_size = 32;
var node_text_offset = 15;
var node_radius = 15;
var edge_guide_width = 25;
var default_room_height = 75;
var default_room_width = 50;
var node_count = 0;
var edge_count = 0;
var bgLayer = null;
var loaded = false;
var imgObj = null; //Stage image
var bounds = initBounds();
var rootLayer, nodeLayer, edgeLayer, roomLayer, tmpLayer;
var lastDistance = 0; //Last drag distance (for moving the stage)
var lastDist = 0; //Last dragged distance (for touch-zoom)
var nodeColor = {"blue": '#2B64FF', "yellow": '#E3B912'};
var nodeImage = {"Room": "roomtool.png", "Elevator": "elevatortool.png", "Stair": "stairtool.png", "Fire": "firetool.png", "Entrance": "entrancetool.png"}; //Node image names
var iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
var currentFloor = -1; //Save the value of the current floor

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
rootLayer = new Kinetic.Layer();
nodeLayer = new Kinetic.Layer();
edgeLayer = new Kinetic.Layer();
roomLayer = new Kinetic.Layer();
tmpLayer = new Kinetic.Layer();
stage.tmpLayer = new Kinetic.Layer();
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

        lastDist = dist;
    }
  }, false);

  stage.getContent().addEventListener('touchend', function(evt) {
    lastDist = 0;
  }, false);

// **** Stage tap interaction ****
//$(stage.getContent()).on(tap, function(evt) {
    //handleStageTap(evt);
//});

rootLayer.on(tap, function(evt) {
    handleLayerTap(evt);
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


function handleStageTap(evt) {
    var touchPos = getRelativePointerPosition();

    var x = touchPos.x;
    var y = touchPos.y;

    //Don't place a node if the movement of the stage was significant (pan)
    if(!iOS && lastDistance > 10) {
        lastDistance = 0;
        return;
    }

    console.log("tapped stage", evt, x, y);
}

function handleLayerTap(evt) {
    var touchPos = getRelativePointerPosition();

    //console.log("tapped root layer", evt.target, touchPos.x, touchPos.y);
    registerResponder(touchPos.x, touchPos.y, "David");
}

function registerResponder(x, y, id) {
    //console.log("registering responder");

    var info  = {"bldg_fk": bldgId,
		"floor_fk": currentFloor,
		"x": x,
		"y": y,
		"r_id": id};

    var data = JSON.stringify(info, null, 4);
    //console.log(data);

    $.ajax({
        type: "POST",
        url: "../../responder/register",//+bldgId+"/"+floorId,
	data: {"data" : data},
        success: function(data) {
            //console.log(data);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            console.log("ERROR: ", textStatus, errorThrown);
        }
    });
 
}


//The Node (or junction) class contains information such as its normalized location, list of edges, and an ID
function Node(x, y, id, type, attr) {
    //Node metadata
    this.x = x;
    this.y = y;
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

    //console.log(this.id, this.type, this.x, this.y, this.attr["name"]);
    //Increment node counter
    node_count++;

    //Create visual representation
    this.render(this.x, this.y, node_radius);
}

//Update min and max node bounds
function setBounds(x, y) {
    bounds["minX"] = Math.min(x, bounds["minX"]);
    bounds["maxX"] = Math.max(x, bounds["maxX"]);
    bounds["minY"] = Math.min(y, bounds["minY"]);
    bounds["maxY"] = Math.max(y, bounds["maxY"]);

    console.log("Bounds: ", bounds);
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
            draggable:false 
        });

        rootLayer.add(this.visual);
        //nodeLayer.add(this.visual);
        _self.x = _self.visual.x();
        _self.y = _self.visual.y();

        //nodeLayer.draw();
        rootLayer.draw();

        this.visual.id = this.id;
        showTextForNode(this, this.attr["name"]);

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
            draggable:false 
        });

        image.onload = function(){
            rootLayer.add(_self.visual);
            //nodeLayer.add(_self.visual);
            _self.x = _self.visual.x();
            _self.y = _self.visual.y();
            rootLayer.draw();

            //nodeLayer.draw();

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
            this.bbox.offsetX(default_room_width/2);
	    this.bbox.offsetY(default_room_height/2);

            this.roomGroup.add(this.bbox);
            this.bbox.parentNode = this;

            //roomLayer.add(this.bbox);
            //roomLayer.draw();

	    rootLayer.add(this.bbox);
	    rootLayer.draw();
        }
    }
}

//Delete node
Node.prototype.delete = function(){

    //Remove all edges that go to this node
    for(var e in this.edges){
        edges[this.edges[e]].deleteEdge();
    }

    //Remove this node from the node list
    delete nodes[this.id];

    if(this.bbox != null) {
        this.bbox.destroy();
        //roomLayer.batchDraw();
	rootLayer.batchDraw();
    }

    if(this.text != null) {
        this.text.destroy();
    }
this.visual.destroy();

    node_count--;

    //nodeLayer.batchDraw();
    rootLayer.batchDraw();
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

    this.setupLine();
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

    if (this.endNode.type != "Hallway" && !sentinel){
        endOffset = this.endNode.visual.width() / 2;
    }

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

    this.visual.id = this.id;
    this.guideLine.id = this.id;

    //edgeLayer.add(this.visual);
    //edgeLayer.add(this.guideLine);
    rootLayer.add(this.visual);
    rootLayer.add(this.guideLine);

    this.guideLine.moveToBottom(); //Send edges to back so nodes are on top of it
    this.visual.moveToBottom(); //Send edges to back so nodes are on top of it

    //edgeLayer.draw();
    rootLayer.draw();
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

    //edgeLayer.draw();
    rootLayer.draw();
};

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
* DATA LOAD
*
********************************************/
function loadData(floor){
    if(typeof(floor)==="undefined")floor = 1;
     
    var floorData;
    $.ajax({
        type: "POST",
        url: "../../floors/getNumFloors/"+bldgId,
        success: function(data) {
            floorData=JSON.parse(data);
	    if($.inArray(String(floor), floorData["floors"]) < 0) {
		makeAlert("Invalid floor");
		return;
 	    } else {
		rootLayer.removeChildren();
		rootLayer.draw();
		currentFloor = floor;
		nodes = {};
		edges = {};
	    }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            console.log("ERROR: ", textStatus, errorThrown);
        }
    });


    //Fetch data
    $.ajax({
        type: "POST",
        url: "../../floors/loadFloorplan/"+bldgId+"/"+floor,
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
    //try {
    //    loadImage(imageUrl);
    //} catch(e) {
    //    console.log("no image found for this building/floor combination.");
    //} 
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
    //nodeLayer.batchDraw();
    rootLayer.batchDraw();
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

function moveUpFloor() {
    loadData(currentFloor + 1);
}

function moveDownFloor() {
    loadData(currentFloor - 1);
}

function undo(){
}












