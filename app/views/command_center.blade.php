<!DOCTYPE html>
<html>
    <head>
            <script type="text/javascript" src="js/jquery-1.11.0.min.js"></script>
           
        <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
                <style>
                    table,th,td
                    {
                        border:1px solid black;
                        border-collapse:collapse;
                    }
                    th,td
                    {
                        padding:5px;
                    }
                    #info {
                        color: #bfd1e5;
                        position: absolute;
                        top: 10px;
                        width: 100%;
                        text-align: center;
                        z-index: 100;
                        display:block;
                    }
                    #info a, .button { color: #f00; font-weight: bold; text-decoration: underline; cursor: pointer }
		    #infoPanel {
			width:100%;
			padding:10px;
			text-align:center;
			color:#555;
			font-size:1.5em;
		    }
		    #screen {
			padding: 20px 0px 0px 40px;
			overflow:auto;
		    }
		    #canvas {
		    }
		    </style>
        
    </head>
    <body >
	<nav class="navigation">
    	    @section('navigation')
    	    @include('menus/main')
    	    @show
	</nav>

	<div id="container" class="container">
	    <div class="page-header">
		<h2>Command Center</h2>
	    </div>


	</div>

        <script src="js/three.min.js"></script>
        <script src="js/controls/TrackballControls.js"></script>
        <script src="js/loaders/VTKLoader.js"></script>
        <script src="js/Detector.js"></script>
        <script src="js/libs/stats.min.js"></script>
        <script src="js/controls/FirstPersonControls.js"></script>
        <script src='js/libs/dat.gui.min.js'></script>
        <script src="js/ImprovedNoise.js"></script>
        
	<script src="js/command_center.js"></script>
        
	<script src="js/shaders/BokehShader2.js"></script>
   </body>
</html>
