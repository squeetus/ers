<html>
<head>
    <style>
        #bldgForm{
            padding: 15px 0 15px 0;
        }
        #statusBox{
            position: absolute;
            top: 85%;
            left: 50%;
            text-align: center;
            width: 300px;
            margin-left: -150px;
        }
        #listing td{
            vertical-align: middle !important;
        }
    </style>
</head>
<body>

<nav class="navigation">
    @section('navigation')
    @include('menus/main')
    @show
</nav>

<!-- Form data -->
<div class="container">
    <div class="page-header">
        <h2>Floors</h2>
    </div>

    <button type="button" id="formBtn" toggle=0 class="btn btn-primary "><span id="status" class="glyphicon glyphicon-plus-sign"></span>New Floor</button>
    <div id="statusBox" class="alert alert-success" style="display: none;"></div><br /><br />
    @include('forms/floor')

    <!-- Table skeleton with headers -->
    <table id="listing" class="table table-striped">
        <thead>
        <tr>
            <th>#</th>

            <!--<th>Name</th>-->
        </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
</div>

</body>
</html>

<script type="text/javascript">
    var floors = [];
    
    $(document).ready(function(){
        //Bind event handlers for various buttons
        bindEventHandlers();

        //Grab all of the floors from the database and put them into the table
        getFloors();
    });

    function bindEventHandlers(){
	var bldg_id = "{{ $bldg_id }}";

        //This is the button that toggles the showing/hiding of the form
        $("#formBtn").click(function(){
            if($(this).attr('toggle') == 0){
                $(this).find("span#status").attr("class", "glyphicon glyphicon-minus-sign");
                $("#floorForm").show(200, "linear");
                $(this).attr('toggle', 1);
            }
            else{
                $(this).find("span#status").attr("class", "glyphicon glyphicon-plus-sign");
                $("#floorForm").hide(200, "linear");
                $(this).attr('toggle', 0);
            }
        });

        //Form submission

	//Add a basement floor
        $("#newBasementFloor").click(function(){
            if(confirm("Are you sure you want to add a basement floor to this building? \n (Floors without any data will not be saved!)")){
		var newFloor = "";
		
		if(typeof floors !== 'undefined' && floors.length > 0) {
	            var current = floors[0];
	
	     	    if(current >= 1) {
		        newFloor = -1;
		    } else if(current < 0) {
		        newFloor = parseFloat(current)-1;
		    } else {
		        //No need for basement floors 
		    }
		} else {
		    newFloor = -1; 
		}

		floors.unshift(newFloor);
        
		var tr = "<tr>";
		tr += "<td>" + newFloor + "</td>";
		tr += "<td><div style='width: 100px; margin: 0 auto;' ><button key=" + newFloor + " class=\"floorplan btn btn-success btn-sm btn-block\">Edit</button>";
                tr += "<button key=\"" + newFloor + "\"class=\"delete btn btn-danger btn-sm btn-block\">Delete</button></div></td>";
                tr += "</tr>";
                $("#listing > tbody").prepend(tr);

		$('button.floorplan').click(function(){
                    document.location.href = "{{{ URL::to('/floors') }}}" + "/" + bldg_id + "/" + $(this).attr('key');
                });

		$('button.delete').click(function(){
		    if(confirm("Delete floor?")) {
   		        deleteFloor($(this).attr("key"));
                        var row = $(this).closest('tr');
		        $(row).remove();
		    }
		});

	    }    
        });

        //Add a floor
        $("#newFloor").click(function(){
	    if(confirm("Are you sure you want to add a floor to this building? \n (Floors without any data will not be saved!)")) {
		var newFloor = "";
		
		if (typeof floors !== 'undefined' && floors.length > 0) {
		    var current = floors[floors.length-1];
		    
		    if (current < 0) {
			newFloor = 1;
	            } else {
		        newFloor = parseFloat(current)+1;
		    }

		    floors.push(newFloor);

		} else {
		    newFloor = 1;
		    floors.push(newFloor);
		} 
		
		var tr = "<tr>";
                tr += "<td>" + newFloor + "</td>";
                tr += "<td><div style='width: 100px; margin: 0 auto;' ><button key=" + newFloor + " class=\"floorplan btn btn-success btn-sm btn-block\">Edit</button>";
                tr += "<button key=\"" + newFloor + "\"class=\"delete btn btn-danger btn-sm btn-block\">Delete</button></div></td>";
                tr += "</tr>";
                $("#listing > tbody").append(tr);

		$('button.floorplan').click(function(){
                    document.location.href = "{{{ URL::to('/floors') }}}" + "/" + bldg_id + "/" + $(this).attr('key');
                });
		
		$('button.delete').click(function(){
		    if(confirm("Delete floor?")) {
		        deleteFloor($(this).attr("key"));
                        var row = $(this).closest('tr');
		        $(row).remove();
		    }
		});

	    }
        });
    }

    function deleteFloor(floor_id) {	
	    for(var i = 0; i < floors.length; i++ ) {
		if(floors[i] == floor_id) {
		    floors = floors.splice(i,1);
		    getFloors();
		}
	    }

if(floors.length == 1 && floors[0] == floor_id)
	floors = [];

	    var url = "{{{ URL::to('/floors') }}}" + "/deleteFloor/" + "{{ $bldg_id }}" + "/" + floor_id;
            $.ajax({
            	url:  url,
                type: "POST",
                success: function(data){
                    $("#statusBox").attr("class", "alert alert-success").html("Floor deleted").fadeIn(400).delay(1500).fadeOut(400);
                }
            });
    }

    function getFloors(){

        //Get id for building
        var bldg_id = "{{ $bldg_id }}";
        var url =  "{{{ URL::to('/floors/getFloors') }}}" + "/" + bldg_id;

        $.ajax({
            url:  url,
            type: "POST",
            success: function(data){

                $("#listing").find("> tbody").empty();

                var json = JSON.parse(data);

                for(row in json){
                    var tr = "<tr>";
                    tr += "<td>" + json[row].floor + "</td>";
		
		    floors.push(json[row].floor);

                    tr += "<td><div style='width: 100px; margin: 0 auto;' ><button key=" + json[row].floor + " class=\"floorplan btn btn-success btn-sm btn-block\">Edit</button>";
                    tr += "<button key=\"" + json[row].floor + "\"class=\"delete btn btn-danger btn-sm btn-block\">Delete</button></div></td>";
                    tr += "</tr>";
                    $("#listing > tbody").append(tr);
                }

                $('button.floorplan').click(function(){
                    document.location.href = "{{{ URL::to('/floors') }}}" + "/" + bldg_id + "/" + $(this).attr('key');
                });

                $('button.delete').click(function(){
                    if(confirm("Delete floor?")) {
			deleteFloor($(this).attr('key'));
	            	var row = $(this).closest('tr');
			$(row).remove();
                    }
                });

            },
            error: function(jqXHR, textStatus, errorThrown){

            }
        });
    }
</script>
