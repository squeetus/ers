<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

<html>
    <head>
        <style>
            body, html{
                padding: 0;
                margin: 0;
		height: 100%;
            }
            #menu li{
                padding-right: 10px;
                font-size: 30px;
                color: #525252;
            }

            #statusBox{
                position: absolute;
                z-index: 9999;
                top: 85%;
                left: 50%;
                text-align: center;
                width: 300px;
                margin-left: -150px;
            }

            .highlighted{
                border-bottom: 2px solid #525252;
            }

            #stage{
                position: absolute;
                top: 58px;
                left: 0;
                width: 768px;
                height: 800px;
                cursor:crosshair;
                z-index: 2;
                background: #F3F3F3;
		background-image:url("{{ asset('img/grid_img.png') }}");
		background-repeat:repeat;
            }

            #contextMenu{
                display: none;
            }

            #roomFormBox {
                border-radius: 4px;
                background-color: #fff;
                width: 150px;
                min-height: 150px;
                display:  none;
                position: absolute;
                z-index: 999;
                padding: 10px 10px 10px;
                border: 1px solid #f8f8f8;
                text-align: center;
            }

            #imgBox {
                display: none;
                position: absolute;
                background-color: #fff;
                min-width: 200px;
                height: 80px;
                z-index: 3;
                padding: 10px 10px 10px;
                border: 1px solid #f8f8f8;
                box-shadow:2px 2px 5px rgba(0, 0, 0, 0.5);
            }
            #infobar {
                position: fixed;
                bottom: 0;
                height: 30px;
                width: 100%;
                background-color: #f8f8f8;
                border-top: 1px solid #e7e7e7;
                z-index: 3;
            }

            #infobar span {
                padding-right: 80px;
            }

            #nodeMenu, #edgeMenu {
                border-radius: 4px;
                background-color: #fff;
                min-width: 10px;
                top: 80px;
                left: 20px;
                min-height: 10px;
                display:  none;
                z-index: 4;
                position: absolute;
                opacity: 0.8;
                padding: 10px 10px 10px;
                border: 1px solid #f8f8f8;
                text-align: center;
            }

            #nodeMenu #eleName, #strName, #roomName, #roomZ, #delBtn {
                display: none;
            }

            #nodeMenu #nodeMenuTitle{
                font-weight: bold;
            }

            #nodeMenu .form-group label {
                display: inline;
                float: left;
            }
	    
 	    .no-copy {
  		-webkit-user-select: none;
	    }

        </style>
    </head>
    <body>
        <nav class="navigation">
                @section('navigation')
                @include('menus/editor')
                @show
        </nav>

        <div id="imgBox">
                <form id="imgForm">
                <div class="form-group">
		  <table><tr><td>
                      <input id ="img" type="file" name ='image' value="Load image"  style="padding-bottom: 5px;"/>
                    </td><td>
		      <button type="button" id="scaleUp" class="btn btn-default">^</button>
		    </td><td rowspan="2">
	 	      <button type="button" id="rotate" class="btn btn-default">ROT8</button>
		    </td></tr><tr><td>
		      <div class="btn-group">
                        <button id="imgUpload" class="btn btn-primary">Upload</button>
                        <button type="button" id="imgCancel" class="btn btn-warning">Cancel</button>
                        <button type="button" id="imgDelete" class="btn btn-danger">Delete</button>
                      </div>
		    </td><td>
		      <button type="button" id="scaleDown" class="btn btn-default">v</button>
	  	    </td></tr>
		  </table>
                </div>
                </form>
        </div>

        <div id="stage" class="no-copy"></div>

        <div id="nodeMenu">
            <h5 id="nodeMenuTitle">Room Info</h5>

            <div class="form-group">
                <input type="text" class="form-control" id="name" placeholder="Name" />
            </div>

            <div class="form-group">
                <input type="text" name="z" class="form-control" id="nodeZ" placeholder="Z-Coord" value=""/>
            </div>

            <div class="form-group">
                <input type="text" name="width" class="form-control" id="nodeWidth" placeholder="Width" value=""/>
            </div>

            <div class="form-group">
                <input type="text" name="height" class="form-control" id="nodeHeight" placeholder="Height" value=""/>
            </div>

            <div class="btn-group">
                <button id="updateBtn" class="btn btn-primary">Update</button>
                <button id="cancelBtn" class="btn btn-warning">Cancel</button>
                <button id="delBtn" class="btn btn-danger">Delete</button>
            </div>
        </div>

        <div id="edgeMenu">
            <label for="width-spinner">Path width (max: 100):</label><input id="width-spinner" name="value">
            <div class="btn-group">
		<button id="edgeDelBtn" class="btn btn-danger">Delete</button>
                <button id="edgeCloseBtn" class="btn btn-primary">Close</button>
            </div>
        </div>

        <div id="infobar">
            <span id="nodeCount"><strong>Nodes:</strong> 0</span>
            <span id="edgeCount"><strong>Edges:</strong> 0</span>
            <span id="scale"><strong>Scale:</strong> 1</span>
            <span id="xPos"><strong>X: </strong></span>
            <span id="yPos"><strong>Y: </strong></span>
	</div>
        <div id="statusBox" class="alert alert-success" style="display: none;"></div>
    </body>
</html>

<script type="text/javascript">

    //This event handler ensures that the footer stays properly positioned on iPads 
    //(The on-screen keyboard was previously interfering with the fixed:bottom css)
    $(document).on('blur', 'input, textarea', function() {
   	setTimeout(function() {
            window.scrollTo(document.body.scrollLeft, document.body.scrollTop);
   	}, 0);
    });

    var floorId = "{{{ $floor_id }}}"; //The current floor
    var bldgId = "{{{ $bldg_id }}}"
    var selectedTool; //Currently selected tool
    var img;
    var spinner;
    //Aliases for input events based on device type
    var touchstart = isTouchDevice() ? "touchstart" : "dragstart";
    var touchmove  = isTouchDevice() ? "dragmove"   : "dragmove";
    var touchend   = isTouchDevice() ? "dragend"   : "dragend";
    var tap        = isTouchDevice() ? "tap"        : "click";
    var dbltap     = isTouchDevice() ? "dbltap"     : "dblclick";

    //Disable scrolling on mobile device
    document.body.addEventListener('touchmove', function(event) {
      event.preventDefault();
    }, false);

    //Disable right-click context menu when cursor is inside the canvas
    document.getElementById("stage").addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });

    //Highlight selected tool
    $(document).ready(function(){
        $(".tool").click(function(e){
            $(".tool").parent().removeClass("highlighted");
            $(this).parent().toggleClass("highlighted");
            selectedTool = $(this).attr("id");
        });

        spinner = $( "#width-spinner" ).spinner({
            min: 2,
            max: 100,
            spin: function(event, ui) {
                pathSpinnerChange(event, ui);
            },
            change: function(event, ui) {
                pathSpinnerChange(event, ui);
            }
        });
    });

    function pathSpinnerChange(event, ui){
        var edge_id = $("#edgeMenu").attr("edge_id");
        console.log(edge_id);
        edges[edge_id].guideLine.strokeWidth($( "#width-spinner" ).spinner("value"));
        edgeLayer.draw();
    }

    function bboxSpinnerChange(event, ui){
        var node_id = $("#nodeMenu").attr("node_id");
        var node = nodes[node_id];
        var width = $( "#nodeWidth" ).spinner("value");
        var height =  $( "#nodeHeight" ).spinner("value");
        node.bbox.width(width);
        node.bbox.height(height);
        node.attr["width"] = width;
        node.attr["height"] = height;
        node.bbox.offsetX(node.bbox.width()/2);
        node.bbox.offsetY(node.bbox.height()/2);
        rootLayer.draw();
    }
    //Load floor data
    $(window).on('load',function(){
        loadData();
    });

    $("#save").click(function(e){
        saveData();
    });

    //Show background form upload box
    $("#bg").click(function(e){
        //console.log("Showing upload box");
        $("#imgBox").css({"left": 85, "top": $("#bg").position().top + 80}).fadeIn(250);
    });

    //Upload temp floorplan image to server
    $("#imgForm").submit(function(e){
        e.preventDefault();

	//Prevent upload if there is no image
	if($("#img").val()=='')	return;
	
        var formData = new FormData($('#imgForm')[0]);
	$.ajax({
            //url: "{{{ URL::to('/tmpFloorplanUpload/') }}}",
            url: "../../tmpFloorplanUpload/"+bldgId+"/"+floorId,
	    type: 'POST',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,

            success: function(result)
            {
 		//makeAlert(result);
                loadImage(result);
            },
	    error: function(e) {
		//makeAlert(e);
	    }
        });
        $("#imgBox").fadeOut(250);
    });

    function loadImage(uri) {
	$.ajax({
            url: uri,
            success: function(data) {

            	if(imgObj == null){
            	    imgObj = new Image();
            	    //console.log("Image object is null");
            	    //Resize stage to fit image
            	    imgObj.onload = function() {
                    	img = new Kinetic.Image({
                    	    image: imgObj,
                    	    x: 0,
			    y: 0
                   	 });
                    	bgLayer = new Kinetic.Layer({listening: false});
		    	bgLayer.add(img);
                    	stage.add(bgLayer);
                    	bgLayer.moveToBottom();
            	    }
	    	    imgObj.src = uri;
	    	} else {
            	    //console.log("Setting source");
            	    imgObj.src = uri;
            	    bgLayer.draw();
                }
	    },
	    error: function(data) {
		console.log("Ignore 404 warning. (No background image)");
	    }
	});
    }
   

    $("#updateBtn").click(function(e){
        //Get node that summoned the form
        var node_id = $("#nodeMenu").attr("node_id");
        console.log(node_id);
        var node = nodes[node_id];

        //Assign the input values to it based on type
        node.attr["zPos"] = $("#nodeZ").val();
        if(node.type != "node") {
            node.attr["name"] = $("#name").val();

            if(node.text == null) {
                showTextForNode(node, node.attr["name"]);
            }
            else {
                node.text.text(node.attr["name"]);
            }

	    nodeLayer.draw();
            //rootLayer.draw();
        }

        //Hide this form
//        $("#nodeMenu input").hide();
//        $("#nodeMenu button").hide();
        $("#nodeMenu").hide();

        //Clear inputs
        $("#nodeMenu input").val("");
    });

    function showTextForNode(node, text) {
        node.text = new Kinetic.Text({
            x: node.visual.x() - node_text_offset,
            y: node.visual.y() - node_text_offset,
            text: node.attr["name"],
            fontSize: 16,
            fontFamily: 'sans-serif',
            fill: 'black'
        });
        //rootLayer.add(node.text);
        //rootLayer.draw();
	nodeLayer.add(node.text);
	nodeLayer.batchDraw();
    }

    $("#delBtn").click(function(e){
        var id = $("#nodeMenu").attr("node_id");
        nodes[id].delete();
        $("#nodeMenu").attr("node_id", "");
        $("#nodeMenu").hide();
    });

    $("#cancelBtn").click(function(e){
        //Hide this form
        $("#nodeMenu input").hide();
        $("#nodeMenu button").hide();
        $("#nodeMenu").hide();
    });

    $("#edgeDelBtn").click(function(e){
	var id = $("#edgeMenu").attr("edge_id");
	edges[id].deleteEdge();
	$("#edgeMenu").attr("edge_id", "");
	$("#edgeMenu").hide();
    });	

    $("#edgeCloseBtn").click(function(e){
        $("#edgeMenu").hide();
    });

    $("#imgCancel").click(function(e){
        $("#imgBox").fadeOut(250);
    });

    $("#imgDelete").click(function(e){
        imgObj.src = "";
        bgLayer.removeChildren();
        img.destroy();
        bgLayer.draw();
	img = null;

	//Access delete image function in routes
	$.ajax({
            //url: "{{{ URL::to('/tmpFloorplanUpload/') }}}",
            url: "../../tmpFloorplanDelete/"+bldgId+"/"+floorId,
            type: 'POST',
            //data: formData,
            cache: false,
            contentType: false,
            processData: false,

            success: function()
            {
                makeAlert("Background Image Deleted",0);
            },
            error: function(e) {
                makeAlert(e);
            }
        });

	$("#img").val("");
        $("#imgBox").fadeOut(250);
    });

    $("#scaleUp").click(function(e){
	if(img != null){
	    var scale = img.scale();
	    if(scale.x < 6 && scale.y < 6) {
	        scale.x++;
	    	scale.y++;
	    }
	    img.scale({x:scale.x,y:scale.y});
	    bgLayer.draw();
	} else {
	    console.log("No image to scale");
	} 
    });

    $("#scaleDown").click(function(e){
        if(img != null){
            var scale = img.scale();
	    if(scale.x > 1 && scale.y > 1) {
	    	scale.x--;
	    	scale.y--;
	    } else {

	    }
            img.scale({x:scale.x,y:scale.y});
            bgLayer.draw();
        } else {
            console.log("No image to scale");
        } 
    });

    var angle = 0;
    $("#rotate").click(function(e){
	if(img != null) {
	    //if(angle == 360)
		//angle = 90;
	    //else
	        //angle += 90;

	    //if(angle == 90 || angle == 270)
	    	img.offset({x:img.width()/2,y:img.height()/2});
	    //else
		//img.offset({x:img.height()/2,y:img.width()/2});
	    img.rotate(90);
	    //if(angle == 180 || angle == 360)
		//img.move({x:img.width()/2,y:img.height()/2});
	    //else
		if(angle == 0){
		img.move({x:img.height()/2,y:img.width()/2});
		angle = -1;
		}
	    bgLayer.draw();
	    //img.offset({x:0,y:0});	    
	    //makeAlert(angle + " " + img.offset().x + " " + img.offset().y, 2);
	}
    });


    function isTouchDevice(){
        return typeof window.ontouchstart !== 'undefined';
    }

</script>

{{ HTML::script('js/Tocca.min.js') }}
{{ HTML::script('js/editor.js') }}
