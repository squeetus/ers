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
                top: 60px;
                left: 10px;
                width: 768px;
                height: 800px;
                cursor:crosshair;
                z-index: 2;
                background: #F3F3F3;
                background-image:url("{{ asset('img/grid_img.png') }}");
                background-repeat:repeat;
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

            .no-copy {
                -webkit-user-select: none;
            }

        </style>
    </head>
    <body>
	<script src="http://ers/js/jquery-1.11.0.min.js"></script>
	<script src="http://ers/js/jquery-ui-1.10.4.min.js"></script>
	<link media="all" type="text/css" rel="stylesheet" href="http://ers/bootstrap/css/bootstrap.css">
	<link media="all" type="text/css" rel="stylesheet" href="http://ers/css/jquery-ui-1.10.4.min.css">
	<script src="http://ers/bootstrap/js/bootstrap.min.js"></script>
	<script src="http://ers/js/kinetic-v5.1.0.min.js"></script>

	<nav class="navigation">
    	    @section('navigation')
    	    @include('menus/responder')
    	    @show
	</nav>



        <div id="stage" class="no-copy"></div>

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

    var floorId = 1; //The current floor
    var bldgId = "{{{ $bldg_id }}}"
    
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

    //Load floor data
    $(window).on('load',function(){
        loadData();
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

    function isTouchDevice(){
        return typeof window.ontouchstart !== 'undefined';
    }

    $("#up").click(function(e) {
    	moveUpFloor();
    });

    $("#down").click(function(e) {
	moveDownFloor();
    });

</script>

{{ HTML::script('js/Tocca.min.js') }}
{{ HTML::script('js/responderView.js') }}



