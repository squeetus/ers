<html>
    <head>
        <style>
            #form{
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
                <h2>People</h2>
            </div>

            <button type="button" id="formBtn" toggle=0 class="btn btn-primary"><span id="status" class="glyphicon glyphicon-plus-sign"></span>New Person</button>
            <div id="statusBox" class="alert alert-success" style="display: none;"></div>

            @include('forms/person')

            <!-- Table skeleton with headers -->
            <table id="directory" class="table table-striped">
                <thead>
                <tr>
                    <th>#</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>Phone #</th>
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
        getPeople();
    });

    function bindEventHandlers(){

        //This is the button that toggles the showing/hiding of the form
        $("#formBtn").click(function(){
            if($(this).attr('toggle') == 0){
                $(this).find("span#status").attr("class", "glyphicon glyphicon-minus-sign");
                $("#form").show(200, "linear");
                $(this).attr('toggle', 1);
            }
            else{
                $(this).find("span#status").attr("class", "glyphicon glyphicon-plus-sign");
                $("#form").hide(200, "linear");
                $(this).attr('toggle', 0);
            }
        });

        //Form submission
        $("#submitBtn").click(function(){
            if($("#fname").val() == "") {
		$("#statusBox").attr("class", "alert alert-warning").html("Name required").fadeIn(400).delay(1500).fadeOut(400);
	    	return false;  	
	    }

	    if(confirm("Are you sure you want to add this user?")){
                $.ajax({
                    url: "{{{ URL::to('/people/addPerson') }}}",
                    type: "POST",
                    data:{
                        fname: $('#fname').val(),
                        lname: $('#lname').val(),
                        email: $('#email').val(),
                        phone: $('#phone').val()
                    },
                    success: function(data){
                        $("#formBtn").trigger("click");
                        $("#clearBtn").trigger("click");
                        $("#statusBox").attr("class", "alert alert-success").html("Person successfully added").fadeIn(400).delay(1500).fadeOut(400);
                        getPeople();
                    },
                    error: function(jqXHR, textStatus, errorThrown){

                    }
                });
            }
        });

        //Clear form contents
        $("#clearBtn").click(function(){
            var inputs = $("#form :input");

            $(inputs).each(function(){
                $(this).val("");
            });
        });
    }

    function deletePerson(person_id) {
	if(confirm("Are you sure you want to delete this person?")) {
	    $.ajax({
		url: 	"{{{ URL::to('/people/deletePerson') }}}",
		type:	"POST",
		data:	{"person": person_id},
		success: function(data){
		    alert(data);
		    $("#statusBox").attr("class","alert alert-success").html("Person Deleted").fadeIn(400).delay(1500).fadeOut(400);
		    getPeople();
		},
		error: function(jqXHR, textStatus, errorThrown){

		}
	    });
	}
    }

    function getPeople(){
        $.ajax({
            url:  "{{{ URL::to('/people/getPeople') }}}",
            success: function(data){

                $("#directory").find("> tbody").empty();

                var json = JSON.parse(data);

                for(row in json){
                    var tr = "<tr>";
                    tr += "<td>" + json[row].id + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"fname\" contenteditable>" + json[row].fname + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"lname\"   contenteditable>" + json[row].lname + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"email\"   contenteditable>" + json[row].email + "</td>";
                    tr += "<td class=\"editable\" key=\"" + json[row].id + "\" field=\"phone\"  contenteditable>" + json[row].phone + "</td>";
                    //tr += "<td><span key=\"" + json[row].id + "\"class=\"glyphicon glyphicon-remove-circle\" style=\"font-size: 1.4em;\"/></td>";
                    tr += "<td><button key=\"" + json[row].id + "\"class=\"delete btn btn-danger btn-sm btn-block\">Delete</button></td>";
		    tr += "</tr>";
                    $("#directory > tbody").append(tr);
                }

		$('button.delete').click(function(){
		    deletePerson($(this).attr("key"));
		});

                $(".editable").blur(function(){
                    //alert(":D");
                    $.ajax({
                        url: "{{{ URL::to('/people/editField') }}}",
                        type: "POST",
                        data: {
                            key: $(this).attr('key'),
                            field: $(this).attr('field'),
                            value: $(this).html()
                        },
                        success: function(data){
                            $("#statusBox").attr("class", "alert alert-success").html("Entry updated").fadeIn(400).delay(1500).fadeOut(400);
                        },
                        error: function(jqXHR, textStatus, errorThrown){

                        }
                    });
                });
            },
            error: function(jqXHR, textStatus, errorThrown){

            }
        });
    }
</script>
