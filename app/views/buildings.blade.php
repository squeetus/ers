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
        #directory td{
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
        <h2>Buildings</h2>
    </div>

    <button type="button" id="formBtn" toggle=0 class="btn btn-primary "><span id="status" class="glyphicon glyphicon-plus-sign"></span>New Building</button>
    <div id="statusBox" class="alert alert-success" style="display: none;"></div>

    @include('forms/building')

    <!-- Table skeleton with headers -->
    <table id="directory" class="table table-striped">
        <thead>
        <tr>
            <th>#</th>
            <th>Image</th>
            <th>Name</th>
            <th>Department</th>
            <th>Contact #</th>
            <th>Options</th>
        </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
</div>

</body>
</html>

<script type="text/javascript">
    $(document).ready(function(){
        //Bind event handlers for various buttons
        bindEventHandlers();

        //Grab all of the people from the database and put them into the table
        getBuildings();
    });

    function bindEventHandlers(){

        //This is the button that toggles the showing/hiding of the form
        $("#formBtn").click(function(){
            if($(this).attr('toggle') == 0){
                $(this).find("span#status").attr("class", "glyphicon glyphicon-minus-sign");
                $("#bldgForm").show(200, "linear");
                $(this).attr('toggle', 1);
            }
            else{
                $(this).find("span#status").attr("class", "glyphicon glyphicon-plus-sign");
                $("#bldgForm").hide(200, "linear");
                $(this).attr('toggle', 0);
            }
        });

        //Form submission


        $("#bldgForm").submit(function(e){
            e.preventDefault();
	    if($("#name").val() == "") {
		$("#statusBox").attr("class", "alert alert-warning").html("Name required").fadeIn(400).delay(1500).fadeOut(400);
		return false;
	    }

            if(confirm("Are you sure you want to create this building?")){
                var data = $(this).serialize();
                var url =  $(this).attr("action");
                $.ajax({
                    url:  url,
                    type: "POST",
                    data: data,
                    success: function(data){

			//$("#clearBtn").trigger("click");
                        $("#formBtn").trigger("click");
                        $("#statusBox").attr("class", "alert alert-success").html("Building successfully added").fadeIn(400).delay(1500).fadeOut(400);
                        //$('#bldgForm').unbind('submit');

                        getBuildings();
                    },
                    error: function(jqXHR, textStatus, errorThrown){
			console.log(jqXHR.responseText);
                    }
                });
            }
            return false;
        });

        //Clear form contents
        $("#clearBtn").click(function(){
	    $(this).closest('form').find("input[type=text],input[type=tel],textarea").val("");
        });
    }

    function deleteBuilding(bldg_id) {
        if(confirm("Are you sure you want to delete this building?")){
            $.ajax({
                url:  "{{{ URL::to('/buildings/deleteBuilding') }}}",
                type: "POST",
                data: {"bldg": bldg_id},
                success: function(data){
                    alert(data);
                    $("#statusBox").attr("class", "alert alert-success").html("Building deleted").fadeIn(400).delay(1500).fadeOut(400);
                    getBuildings();
                },
                error: function(jqXHR, textStatus, errorThrown){

                }
            });
        }
    }

    function getBuildings(){
        $.ajax({
            url:  "{{{ URL::to('/buildings/getBuildings') }}}",
            success: function(data){

                $("#directory").find("> tbody").empty();

                var json = JSON.parse(data);

                for(row in json){

                    var thumb = json[row].thumb;

                    var img = "<img src=" + thumb + " width=125 height=125 style=\"border-radius: 125px\" />";

                    if(thumb == null){
                        thumb = '-';
                    }

                    var tr = "<tr>";
                    tr += "<td>" + json[row].id + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"phone\"  contenteditable>" + img + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"fname\" contenteditable>" + json[row].name + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"lname\"   contenteditable>" + json[row].desc + "</td>";
//                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"email\"   contenteditable>" + json[row].dept + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"phone\"  contenteditable>" + json[row].phone + "</td>";
                    tr += "<td><button key=" + json[row].id + " class=\"floorplan btn btn-success btn-sm btn-block\">Floorplan</button>";
                    tr += "<button key=\"" + json[row].id + "\"class=\"delete btn btn-danger btn-sm btn-block\">Delete</button>";
                    tr += "</tr>";
                    $("#directory > tbody").append(tr);
                }

                $('button.floorplan').click(function(){
                    document.location.href = "{{{ URL::to('/floors') }}}" + "/" + $(this).attr('key');
                });

                $('button.delete').click(function(){
                    deleteBuilding($(this).attr("key"));
                });

//                $(".editable").blur(function(){
//                    //alert(":D");
//                    $.ajax({
//                        url: "{{{ URL::to('/people/editField') }}}",
//                        type: "POST",
//                        data: {
//                            key: $(this).attr('key'),
//                            field: $(this).attr('field'),
//                            value: $(this).html()
//                        },
//                        success: function(data){
//                            $("#statusBox").attr("class", "alert alert-success").html("Entry updated").fadeIn(400).delay(1500).fadeOut(400);
//                        },
//                        error: function(jqXHR, textStatus, errorThrown){
//
//                        }
//                    });
//                });
            },
            error: function(jqXHR, textStatus, errorThrown){

            }
        });
    }
</script>
