/* 	COMMAND_CENTER 
	DAVID BURLINSON
				*/	

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
            
var container, stats;
var camera, controls, scene, renderer;
var gui;
var cross;
var mouseX = 0, mouseY = 0;
var screen, header;
var edges_obj=[];
var edges=[];
var buildings=[];
var edge_size=0;
var nodes=[];
var nodes_obj=[];
var node_size=0;
var responders=[];
var responders_obj=[];
var responders_size=0;
var transforms=[];
var floor=1;
//var windowHalfX = window.innerWidth / 2;
//var windowHalfY = window.innerHeight / 2;
var cameraPosition={
    X:6000,
    Y:10000,
    Z:6000
};
var mesh, texture;
var deg=0;
var worldWidth = 256, worldDepth = 256,
                worldHalfWidth = worldWidth / 2, worldHalfDepth = worldDepth / 2;  
var clock = new THREE.Clock();
var ter;
var thisBuilding = null;
var intervalId = null;            
var maxFloor = 0;

//Set up 
createscreen();
        
function createscreen()
{
    var container=document.getElementById('container');      
    var content = document.createElement('div');      

    //Database connection buttons
    var basic= document.createElement('div');
    //basic.innerHTML='<input type="image" src="img/DB.png" onclick="DB();" id="Db" width="80" height="80" />';
    basic.innerHTML+='<br /><form><select id="building_list" onchange="building(this.value)"><option value="-1">Building List</option></select></form>';
    basic.style.float = "left";
    content.appendChild(basic);
    
    //Controls
    var view=document.createElement('div');
    view.id="controls";
    view.style.visibility = "hidden";
    view.innerHTML='<input type="image" src="img/Up.png" onclick="up();" id="up" width="80" height="80" padding-right="50" disabled/><input type="image" src="img/Down.png" onclick="down();" id="down" width="80" height="80" disabled/><input type="image" src="img/2-D.png" onclick="two_d();" id="2-D" width="80" height="80"/><input type="image" src="img/3-D.jpg" onclick="three_d();" id="3-D" width="80" height="80"/>';
    view.style.padding = "10px 50px 10px 50px";
    view.style.float= "left";
    content.appendChild(view);
            
    //Info table
    var info=document.createElement('div');
    info.id="infoPanel";
    info.style.float="left";
    info.innerHTML = "FLOOR: ";
    info.style.visibility = "hidden";
    //responder.innerHTML='<table style="width:200px"><tr><th>Name</th><th>Building Location</th><th>Room</th><th>Target Building</th><th>Room</th></tr><tr><th>hh</th><th>wdward</th><th>437</th><th>wdward</th><th>214</th></tr><tr></table>';
    //responder.style.visibility = "hidden";
    content.appendChild(info);
    
    screen = document.createElement('div');  
    screen.id="screen";    
    document.body.appendChild(screen); 
    
    $("#screen").height($(document).height()-400);
    $("#screen").width($(document).width() - 100);

    container.appendChild(content);

    //Set up renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( (window.innerWidth-160), (window.innerHeight-450) );
    renderer.setClearColor(0xcccccc, 1);

}

$(document).ready(function() {
    DB();
});

//Populate the dropdown list with building values from database
function DB() {
    if(buildings.length == 0){
    	$.ajax({
            type: "POST",
            url: "../../command_center/getBuildings",
            success: function(data){
            	var json = JSON.parse(data);
             	var select= document.getElementById("building_list");
                        
         	//set an option for each building found
                for(var i = 0; i < json.length; i++){                        
                    var option=document.createElement('option');
                            
                    var tembuild={      
                    	ID:0,
                        Name:''
		    };
                    tembuild.ID=json[i]["id"];
                    tembuild.Name=json[i]["name"];
                    buildings.push(tembuild);   //Add building to the array
                           
                    option.value=json[i]["id"];
                    option.innerHTML=json[i]["name"];
                    select.appendChild(option);
                }
            },
            error: function() {
            	alert("Error connecting to database");
            }   
        });
    }
}   // DB()

//Populate the edge[] and node[] arrays for the current building
function building(value) {
    $("#controls").css("visibility","visible");
    $("#building_list").css("visibility","hidden");	

    var formData = "id="+value;     //building id
    thisBuilding = value;
    maxFloor=0;    

    //Get Edge data
    $.ajax({
        type: "POST",
        url: "../../command_center/getEdges/"+value,
        success: function(data){
            var json = JSON.parse(data);
            edges.length=0;
                        
            //Add each edge to the edges array
            for(var i = 0; i < json.length; i++){
                var temedge={
                    ID:0,
                    SX:0,
                    SY:0,
                    SZ:0,
                    EX:0,
                    EY:0,
                    EZ:0,
                    floor:0,
                    type:''
                };
                
		temedge.type=json[i]["type"];
                temedge.SX=json[i]["start_x"];
      		temedge.SY=json[i]["start_y"];
               	temedge.SZ=json[i]["start_z"];
                temedge.EX=json[i]["end_x"];
                temedge.EY=json[i]["end_y"];
                temedge.EZ=json[i]["end_z"];
                temedge.ID=json[i]["id"];
                temedge.floor=json[i]["floor"];
                edges.push(temedge);
                edge_size++;
	    }
        }
    });
                
    //Get Node data
    $.ajax({
        type: "POST",
        url: "../../command_center/getNodes/"+value,
        success: function(data){
            var json = JSON.parse(data);
            nodes.length=0;
                    
            //Add each node to the nodes array
            for(var i = 0; i < json.length; i++){
            	var temnode={
                    ID:0,
                    X:0,
                    Y:0,
                    Z:0,
                    type:0,
                    floor:0,
                    width:0,
                    height:0,
                    name:0
                };
                        
                temnode.ID=json[i]["id"];
                temnode.X=json[i]["X"];
                temnode.Y=json[i]["Y"];
                temnode.Z=json[i]["Z"];
                temnode.type=json[i]["type"];
                temnode.floor=json[i]["floor"];
                temnode.width=json[i]["width"];
                temnode.height=json[i]["height"];
		temnode.name=json[i]["name"];
                nodes.push(temnode);
                node_size++;
		if(maxFloor<json[i]["floor"])maxFloor=json[i]["floor"];
	//	if(temnode.type == "Stairs" || temnode.type == "Elevator")
		    //console.log(temnode.name);
            }
      //transform(); 
 }
    });
}   // building()

//2D view
function two_d(){
                if(document.getElementById("building_list").selectedIndex == 0) return;
		$("#infoPanel").css("visibility", "visible");

                responders = [];
                responders_obj = [];
                responders_size = 0;
                floor=0;
                clearInterval(intervalId);
                //building(thisBuilding);
                graph("2D");
                document.getElementById("up").disabled=false;
                document.getElementById("down").disabled=false;
		$("#infoPanel").html("Floor: 0");
            }

            //Go up a floor
            function up()
            {
		if (floor<maxFloor)
		    floor=floor+1;
		$("#infoPanel").html("Floor: " + floor);
                responders = [];
                responders_obj = [];
                responders_size = 0;
                clearInterval(intervalId);
                //building(thisBuilding);
                graph("2D");

            }
 //Go down a floor
            function down()
            {
                if (floor>0)
                    floor=floor-1;
		$("#infoPanel").html("Floor: " + floor);
                responders = [];
                responders_obj = [];
                responders_size = 0;
                clearInterval(intervalId);
                //building(thisBuilding);
                graph("2D");
            }
            
            //3D view
            function three_d()
            {
                if(document.getElementById("building_list").selectedIndex == 0) return;
                //bunnyClick();
		$("#infoPanel").css("visibility","hidden");
                responders = [];
                responders_obj = [];
                responders_size = 0;
                floor=-1;
                clearInterval(intervalId);
                //building(thisBuilding);
                graph("3D");
                document.getElementById("up").disabled=true;
                document.getElementById("down").disabled=true; 
            }
           
            // 
            function graph(mode){
                //remove all children of container div
                //while (screen.firstChild) {
                //    screen.removeChild(screen.firstChild);
                //}
		while(screen.hasChildNodes()) {
		    screen.removeChild(screen.lastChild);
		}

                ter=0;

                var min_x=5000000;
                var min_y=5000000;
                var max_x=0;
                var max_y=0;
//Adjust values for min and max {x,y} values
                for(var i = 0; i < nodes.length; i++){
                    if (nodes[i].X < min_x) min_x = nodes[i].X;
                    if (nodes[i].Y < min_y) min_y = nodes[i].Y;
                    if (nodes[i].X > max_x) max_x = nodes[i].X;
                    if (nodes[i].Y > max_y) max_y = nodes[i].Y;
                }

                var dimensions = {
                        "min_x": min_x,
                        "min_y": min_y,
                        "max_x": max_x,
                        "max_y": max_y };               

                //Normalize nodes
                for(var i = 0; i < nodes.length; i++){
                    nodes[i].X=nodes[i].X-min_x;
                    nodes[i].Y=nodes[i].Y-min_y;
                }

                //Normalize edges
                for(var i = 0; i < edges.length; i++){
                    edges[i].SX=edges[i].SX-min_x;
                    edges[i].SY=edges[i].SY-min_y;
                    edges[i].EX=edges[i].EX-min_x;
                    edges[i].EY=edges[i].EY-min_y;
                }
//Normalize boundaries
                max_x=max_x-min_x;
                max_y=max_y-min_y;
                min_x=0;
                min_y=0;

                //Set up 3.js camera
                camera = new THREE.PerspectiveCamera( 60, (window.innerWidth-220) / (window.innerHeight-80), 0.01, 1e10 );
                camera.position.z = -4000;
                //camera.position.z = Math.pow(Math.pow((max_x-min_x),2)+Math.pow((destination.Y-camera.position.y),2)+Math.pow((destination.Z-camera.position.z),2),.5);
                camera.position.x = (max_x)/2;
                camera.position.y = (max_y)/2;
		camera.rotation.z = Math.PI;	
 
                //vector??      
                var lkat=new THREE.Vector3((max_x)/2,(max_y)/2,0);
               
                //alert(camera.lookAt.x);
                //camera.lookAt(new THREE.Vector3((min_x+max_x)/2,(min_y+max_y)/2,0));
               
                //zoom/pan/rotate controls 
                controls = new THREE.TrackballControls( camera );
                
                //Set up controls 
                if(floor!=-1)    // 2D
                    controls.rotateSpeed = 0.0;
                else            // 3D
                    controls.rotateSpeed = 0.5;
                
                controls.zoomSpeed = 1.5;
                controls.panSpeed = 1.2;
                controls.noZoom = false;
                controls.noPan = false;
                controls.staticMoving = true;
                controls.dynamicDampingFactor = 0.3;
                controls.target=lkat;

                //Set up scene
                scene = new THREE.Scene();
                scene.add( camera );
                
                //Set up light
                var dirLight = new THREE.DirectionalLight( 0xffffff );
                dirLight.position.set( 200, 200, 1000 ).normalize();
                
                //camera.add( dirLight );
                //camera.add( dirLight.target );
// var material = new THREE.LineBasicMaterial({color: 0x6699FF, linewidth: 5, fog:true});
                // var lineg = new THREE.Geometry();
               
                //Display each edge 
                for(var i = 0; i < edges.length; i++){  
                    //Only display edges relevant to current floor/view
                    if(floor == edges[i].floor || floor==-1) {
                        if (edges[i].type=="Hallway")
                            var material = new THREE.LineBasicMaterial({color: 0x0000FF, linewidth: 25, fog:true});
                        else 
                            var material = new THREE.LineBasicMaterial({color: 0x999966, linewidth: 2, fog:true});
 //Create geometry with {x,y,z} of start end end points of line
                        var lineg = new THREE.Geometry();
                        lineg.vertices.push(new THREE.Vector3(edges[i].SX, edges[i].SY, edges[i].SZ));
                        lineg.vertices.push(new THREE.Vector3(edges[i].EX, edges[i].EY, edges[i].EZ));

                        //Create a line based on the geometry and material
                        var line = new THREE.Line(lineg, material);
                        scene.add(line);
                        edges_obj.push(line);
                    }
                }

                //Display each node
                for(var i = 0; i < nodes.length; i++){
                    //Only display nodes relevant to current floor/view
                    if (floor == nodes[i].floor || floor==-1) {
                        //Assign geometry based on node type
                        //      NOTE: CubeGeometry(width,height,depth,...) deprecated.  
                        if (nodes[i].type == 'Hallway')
                            var geometry = new THREE.CubeGeometry( 1, 1, 0);
                        else if(nodes[i].type == 'Room')
                            var geometry = new THREE.CubeGeometry( nodes[i].width, nodes[i].height, 10);
                        else    
                            var geometry = new THREE.CubeGeometry(15, 15, 5);

                        //Set node material based on node type
                        switch(nodes[i].type) {
                            case "Hallway":
                                var material = new THREE.MeshBasicMaterial( {color: 0x3333ff} );
                                break;
                            case "Room":
                                //var cubeTexture = THREE.ImageUtils.loadTexture('logo/room.jpg');
                                //var material = new THREE.MeshBasicMaterial({map: cubeTexture});
                                var material = new THREE.MeshBasicMaterial( {color: 0xffff33} );
                                break;
                            case "Elevator":
                                var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
                                break;
                            case "Stair":
                                var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
                                break;
                            default:
                                var material = new THREE.MeshBasicMaterial( {color: 0xfff20} );
                        }
                        
                        //var material = new THREE.MeshBasicMaterial( {color: 0xff0} );
                        //var sphere = new THREE.Mesh(new THREE.SphereGeometry(15, 15, 15), material);
                        
                        //Set position of node
                        var sphere = new THREE.Mesh( geometry, material );
                        if(nodes[i].type == 'Room'){
                            sphere.position.x=nodes[i].X+((nodes[i].width)/2)-25.0;
                            sphere.position.y=nodes[i].Y+((nodes[i].height)/2)-37.5;
                            sphere.position.z=nodes[i].Z;
                        } else {
                            sphere.position.x=nodes[i].X;
                            sphere.position.y=nodes[i].Y;
                            sphere.position.z=nodes[i].Z;
                        }
//Add node to scene
                        scene.add( sphere );
                        nodes_obj.push(sphere);
                    }
                } //for
 //Set camera 
                camera.lookAt(scene.position);  

                //Set up renderer
                //renderer = new THREE.WebGLRenderer( { antialias: false } );
                //renderer.setSize( (window.innerWidth-320), (window.innerHeight-80) );
                //renderer.setClearColor(0xcccccc, 1);
                //elid="renderer";
                //renderer.id=elid;
                //screen.appendChild( container );
                
                //Add renderer to page
		
                //var container = document.getElementById('container');
		screen.appendChild( renderer.domElement );
		console.log(renderer.domElement);
		renderer.domElement.id = "canvas";
               
                //Framerate stats 
                stats = new Stats();
                stats.domElement.style.position = 'absolute';
                stats.domElement.style.top = '55px';
                screen.appendChild( stats.domElement );
                
                //
                renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
                window.addEventListener( 'resize', onWindowResize, false );

                animate();
                responder(dimensions, mode);
            } // Graph()
           
            //Handle clicks inside renderer element
            // ???
            function onDocumentMouseDown( event ) {
                    var mouseX = ( event.clientX / window.innerWidth ) * 2 - 1;
                    var mouseY = -( event.clientY / window.innerHeight ) * 2 + 1;
                    
                    var vector = new THREE.Vector3( mouseX, mouseY, camera.near );
                    
                    // Convert the [-1, 1] screen coordinate into a world coordinate on the near plane
                    var projector = new THREE.Projector();
                    projector.unprojectVector( vector, camera );
                    
                    var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
                    
                    // See if the ray from the camera into the world hits one of our meshes
                    var intersects = raycaster.intersectObject( nodes_obj);
                    //lastIntersects = intersects;
                    
                    // Toggle rotation bool for meshes that we clicked
                    if ( intersects.length > 0 ) {
                        alert(intersects[0].position.x);                     
                    }
            }
            
            // Render loop
            function render() {
                //deg+=.005;
                //camera.position.y=cameraPosition.Y;
                //camera.position.x=cameraPosition.X*Math.cos(deg);
                //camera.position.z=cameraPosition.Z*Math.sin(deg);
                //camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
                //controls.update( clock.getDelta() );
                
                renderer.render( scene, camera );    
            }
// Window resize function
            function onWindowResize() {
                //content.style="background-color:#EEEEEE; height:"+(window.innerHeight-80)+"px"+";width:300px;float:left;";
                //screen.style= "width:"+(window.innerWidth-20)+"px";
                //header.style= "background-color:#FFA500; "+"width:"+(window.innerWidth-20)+"px";
		camera.aspect = (window.innerWidth-320) / (window.innerHeight-80);
                camera.updateProjectionMatrix();
                renderer.setSize( (window.innerWidth-320), (window.innerHeight-80) );
                controls.handleResize();
            }
            
            //Animation loop
            function animate() {
                requestAnimationFrame( animate );
                controls.update();
                renderer.render( scene, camera );
                if(ter==1)
                    render();
                stats.update();
            }

            function responder(dimensions, mode) {
                //Poll for responders
                intervalId = setInterval(function(){
                   
                    if(thisBuilding == null)
                        console.log("null");
                    else {
                    var formData = "id="+thisBuilding;
                    $.ajax({
                        type: "POST",
                        url: "../../command_center/getResponders/" + thisBuilding,
                        success: function(data){
                            //console.log(data);
                            var json = JSON.parse(data);
                                
                            //responders.length = 0;
                            //responders_size = 0;
                            //responders_obj.length = 0;                

                            //Read in each responder in this building
                            for(var i = 0; i < json.length; i++){                        
                                var temResponder={
                                    ID:0,
                                    X:0,
                                    Y:0,
                                    Z:0,
                                    floor:0,
                                    r_id:""
                                };      
                                var newResponder = true;

                                for(var j = 0; j < responders.length; j++) {
                                    if(responders[j].r_id == json[i]["r_id"]) {
                                        newResponder = false;

                                        //Update data from JSON
                                        responders[j].X=json[i]["X"]-dimensions.min_x;
                                        responders[j].Y=json[i]["Y"]-dimensions.min_y;
                                        responders[j].Z=json[i]["Z"];
                                        responders[j].floor=json[i]["floor"];
                                        responders[j].r_id=json[i]["r_id"];

					//Transform position
					//var xform = true;
					//for(var prop in transform[j]) {
					//    if(prop == 0)
					//	console.log("WOO");
					//}
					//responders[j].X=responders[j].X*(transform[j].s*transform[j].cos)+responders[j].Y*(transform[j].s*transform[j].sin)+(transform[j].x1-(transform[j].X1*transform[j].s*transform[j].cos)-(transform[j].Y1*transform[j].s*transform[j].sin));
					//responders[j].Y=responders[j].Y*(transform[j].s*transform[j].cos)-responders[j].Y*(transform[j].s*transform[j].sin)+(transform[j].x1-(transform[j].X1*transform[j].s*transform[j].cos)-(transform[j].Y1*transform[j].s*transform[j].sin));
                                    //nodes[j].Y=nodes[j].Y*(s*cos)-tempx*(s*sin)+(y1+(X1*s*sin)-(Y1*s*cos));

    //Update scene object
                                        scene.remove( responders_obj[j] );      
                                        responders_obj[j].position.x = responders[j].X;
                                        responders_obj[j].position.y = responders[j].Y;
                                        responders_obj[j].position.z = responders[j].Z; 
                                        scene.add( responders_obj[j] );
  break; //updated relevant responder
                                    }   
                                }       
                                    if(newResponder) {
                                        //console.log("adding new responder!");
                                        temResponder.ID=json[i]["id"];
                                        temResponder.X=json[i]["X"]-dimensions.min_x;
                                        temResponder.Y=json[i]["Y"]-dimensions.min_y;
                                        temResponder.Z=json[i]["Z"];
                                        temResponder.floor=json[i]["floor"];
                                        temResponder.r_id=json[i]["r_id"];
                                        responders.push(temResponder);
                                        responders_size++;

                                        var geometry = new THREE.CubeGeometry( 20, 20, 20);
                                        var material = new THREE.MeshBasicMaterial( {color: 0x7f2e6d} );
                                        var sphere = new THREE.Mesh( geometry, material );
                                        sphere.position.x=responders[i].X;
                                        sphere.position.y=responders[i].Y;
                                        sphere.position.z=responders[i].Z;
        
                                        //Add node to scene
                                        if(mode == "2D"){
                                            if(floor == json[i]["floor"]){ 
                                                scene.add( sphere );
                                                responders_obj.push(sphere);    
                                            }
                                        } else {
                                            scene.add( sphere );
                                            responders_obj.push(sphere);
                                        }
                                    }    
                            }
                        },
                        error: function() {
                           // console.log("Error connecting to database");
                        }   
                    });
                    }
                },1000);
            }

function transform(){
                var x1,y1,x2,y2,X1,Y1,X2,Y2,dx,dy,dX,dY;
                
                for(var i = 0; i < maxFloor; i++) {
                    var tempTransform = {
                   	x1: 0,
                        y1: 0,
                   	X1: 0,
                   	Y1: 0,
                   	s: 0,
                   	cos: 0,
                   	sin: 0
                    };
   
		    var c=0;
                    for(var j = 0; j < nodes.length && c<2; j++)
                        if(nodes[j].floor==i && (nodes[j].type =='Stair' || nodes[j].type== 'Elevator'))
                            for(var k = 0; k < nodes.length && c<2; k++) {
				if(nodes[k].floor==(i+1) && nodes[k].name ==  nodes[j].name && c==0 && nodes[j].name != "") {
                                    x1=parseFloat(nodes[j].X);
                                    y1=parseFloat(nodes[j].Y);
                                    X1=parseFloat(nodes[k].X);
                                    Y1=parseFloat(nodes[k].Y);
                                    c++;
                                }
                                else if(nodes[k].floor==(i+1) && nodes[k].name ==  nodes[j].name && c==1) {
                                    x2=parseFloat(nodes[j].X);
                                    y2=parseFloat(nodes[j].Y);
                                    X2=parseFloat(nodes[k].X);
                                    Y2=parseFloat(nodes[k].Y);
                                    c++;
                                }
                            }
		            if(c==2) {
                                dx=x2-x1;
                                dy=y2-y1;
                                dX=X2-X1;
                                dY=Y2-Y1;
                                var s=(Math.pow((Math.pow(dx,2)+Math.pow(dy,2)),0.5)/Math.pow((Math.pow(dX,2)+Math.pow(dY,2)),0.5));
                                var cos=(dx*dX+dy*dY)/(Math.pow((Math.pow(dx,2)+Math.pow(dy,2)),0.5)*Math.pow((Math.pow(dX,2)+Math.pow(dY,2)),0.5));
                                //to do: sin sign must be corret
                                var sin=Math.pow((1-Math.pow(cos,2)),0.5); 
	                       if((dx*dY-dX*dy)<0)
                                sin=(-1)*sin;

                                for(var j = 0; j < nodes.length; j++)
                                   if(nodes[j].floor==(i+1))
                                   {var tempx=parseFloat(nodes[j].X);
                                    nodes[j].X=nodes[j].X*(s*cos)+nodes[j].Y*(s*sin)+(x1-(X1*s*cos)-(Y1*s*sin));
				    nodes[j].Y=nodes[j].Y*(s*cos)-tempx*(s*sin)+(y1+(X1*s*sin)-(Y1*s*cos));
                                   } 
				for(var j = 0; j < edges.length; j++)
					if(edges[j].floor==(i+1)) {
					var tempx=parseFloat(edges[j].SX);

				    edges[j].SX=edges[j].SX*(s*cos)+edges[j].SY*(s*sin)+(x1-(X1*s*cos)-(Y1*s*sin));
                                    edges[j].SY=edges[j].SY*(s*cos)-tempx*(s*sin)+(y1+(X1*s*sin)-(Y1*s*cos));

					tempx=parseFloat(edges[j].EX);
			            edges[j].EX=edges[j].EX*(s*cos)+edges[j].EY*(s*sin)+(x1-(X1*s*cos)-(Y1*s*sin));
                                    edges[j].EY=edges[j].EY*(s*cos)-tempx*(s*sin)+(y1+(X1*s*sin)-(Y1*s*cos));

				}

                            }
                            else if(c==1)
                            {
                                for(var j = 0; j < nodes.length; j++)
                                   if(nodes[j].floor==(i+1))
                                   {
                                    nodes[j].X=nodes[j].X+x1-X1;
                                    nodes[j].Y=nodes[j].Y+y1-Y1;
                                   } 
                            }
		
			    //update transformation matrix for this floor
			    tempTransform.x1 = (x1 == undefined ? 0 : x1);
			    tempTransform.y1 = (y1 == undefined ? 0 : y1);
			    tempTransform.X1 = (X1 == undefined ? 0 : X1);
			    tempTransform.Y1 = (Y1 == undefined ? 0 : Y1);
			    tempTransform.s = (s == undefined ? 0 : s);
			    tempTransform.cos = (cos == undefined ? 0 : cos);
			    tempTransform.sin = (sin == undefined ? 0 : sin);
			    transforms[i] = tempTransform;
                }
	console.log(transforms);
}
