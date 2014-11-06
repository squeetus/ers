<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/

Route::post('/tmpFloorplanUpload/{bldg_id}/{floor_id}', function($bldg_id, $floor_id){
    $file = Input::file('image');
    //$exif = exif_read_data($file);
    //if(!empty($exif['Orientation'])) {
	//$image = imagecreatefromjpeg($file);
	//switch ($exif['Orientation']) {
	    //case 3:
		//$image = imagerotate($image, 180, 0);
                //break;

            //case 6:
                //$image = imagerotate($image, -90, 0);
                //break;

            //case 8:
                //$image = imagerotate($image, 90, 0);
                //break;
	//}
    //} else {
	//echo "No exif data. ";
    //}
	
    $destinationPath = "tmp/";

    //Create unique filename based on current time (in ms)
    //$filename = "tmp_" . round(microtime(true) * 1000);
    $filename = $bldg_id."_".$floor_id."_floorplan";
    $extension = '.'.$file->getClientOriginalExtension();
    Input::file('image')->move($destinationPath, $filename.$extension);


    //Return path of image
    $url = "../../tmp/".$filename.$extension;
    echo $url;
});

Route::post('/tmpFloorplanDelete/{bldg_id}/{floor_id}', function($bldg_id, $floor_id){
    $destinationPath = "tmp/";
    $filename = $bldg_id."_".$floor_id."_floorplan";
    $extension = '.jpg';
    echo $destinationPath.$filename.$extension;
    unlink($destinationPath.$filename.$extension);
});

Route::get('/', function()
{
	return View::make('landing');
});

Route::get('/landing', function()
{
    return View::make('landing');
});

Route::get('/floors/{id}', function($id){
    return View::make('floors', array('bldg_id' => $id));
});

Route::get('/responder/{id}', function($id){
    return View::make('responderView', array('bldg_id' => $id));
});

Route::get('/floors/{bldg_id}/{floor_id}', function($bldg_id, $floor_id)
{
    return View::make('floorplan', array('bldg_id' => $bldg_id, 'floor_id' => $floor_id));
});

Route::get('/buildings', function(){
    return View::make('buildings');
});

Route::get('/people', function(){
    return View::make('people');
});

Route::get('/command_center', function() {
    return View::make('command_center');
});

/********************************************
    Routes for the 'responder' view go here
********************************************/
Route::post('/responder/register', function(){
    $data = Input::get('data');
    $decoded = json_decode($data, true);
    $bldg_fk = $decoded["bldg_fk"];
    $floor_fk = $decoded["floor_fk"];
    $x = $decoded["x"];
    $y = $decoded["y"];
    $r_id = $decoded["r_id"];

    //Remove existing data for this user
    DB::delete("delete from responder where r_id = ?", array($r_id));

    DB::insert("insert into responder (x_pos, y_pos, floor_fk, building_fk, r_id) values (?, ?, ?, ?, ?)", array($x,$y,$floor_fk,$bldg_fk,$r_id));

    echo "success";
});



/********************************************
    Routes for the 'people' view go here
********************************************/

Route::post('/people/addPerson', function(){
    $fname = Input::get('fname');
    $lname = Input::get('lname');
    $email = Input::get('email');
    $phone = Input::get('phone');
    DB::insert('insert into people (fname, lname, phone, email) values (?, ?, ?, ?)', array("$fname", "$lname", "$phone", "$email"));
});

Route::post('/people/deletePerson', function(){
    $id = Input::get('person');
    if(DB::delete("delete from people where id=?", array($id))){
	echo "Person deleted";
    } else {
    	echo "Failure: ".$id;
    }
});

Route::get('/people/getPeople', function(){
    $response = array();

    $result = DB::select("select * from people");
    $cnt = 0;
    foreach($result as $row){
        $response[$cnt]['id']    = $row->id;
        $response[$cnt]['fname'] = $row->fname;
        $response[$cnt]['lname'] = $row->lname;
        $response[$cnt]['email'] = $row->email;
        $response[$cnt]['phone'] = $row->phone;
        $cnt++;
    }

    echo json_encode($response);
});

Route::post('people/editField', function(){

    $value = strip_tags(Input::get('value'));
    $field = Input::get('field');
    $id    = Input::get('key');

    DB::update("update people set $field=? where id=?", array($value, $id));
});

/********************************************
    Routes for the 'floorplan' view go here
********************************************/

Route::post('floors/saveFloorplan/{id}', function($id){
    $data = Input::get('data');

    $decoded = json_decode($data, true);

    $bldg_fk = $decoded["bldg_fk"];
    $img_url = $decoded["image"];
    //$width   = $decoded["width"];
    //$height  = $decoded["height"];
    $counter = $decoded["node_count"];
    $floor_id = $id;
    $zPos = 0;
    $floorSpacing = 150;

    //remove existing floor data from DB
    DB::delete("delete from nodes where floor = ? and building_fk = ?", array($floor_id, $bldg_fk));
    //DB::delete("delete from edges where floor = ? and building_fk = ?", array($floor_id, $bldg_fk));

    //insert nodes
    $nodes = $decoded["nodes"];
    $edges = $decoded["edges"];

    foreach($nodes as $node) {
        $name = "";
        $type = "Hallway";

        if ($node["type"] != "Hallway") {
            //$name = $node["attr"]["name"];
            $name = $node["name"];
	    $type = $node["type"];
        }

	if ($floor_id > 0) {
	    $zPos = $floorSpacing * $floor_id;
	} else {
	    $zPos = $floorSpacing * $floor_id + $floorSpacing;
	}
	

        if($node["type"] != "Room") {
	    DB::insert("insert into nodes (x_pos, y_pos, z_pos, floor, node_id, name, type, building_fk) values (?, ?, ?, ?, ?, ?, ?, ?)", array($node["x"], $node["y"], $zPos, $floor_id, $node["id"], $name, $type,$bldg_fk));
        } else {
	    $width = $node["width"];
	    $height = $node["height"];

//$node["z"]
            DB::insert("insert into nodes (x_pos, y_pos, z_pos, floor, node_id, name, type, width, height, building_fk) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", array($node["x"], $node["y"], $zPos, $floor_id, $node["id"], $name, $type, $width, $height, $bldg_fk));
        }
    }

    //insert edges
    foreach($edges as $edge) {
        DB::insert("insert into edges (start_node_fk, end_node_fk, floor, edge_width, building_fk, offsetX, offsetY) values (?, ?, ?, ?, ?, ?, ?)", array($edge["startNode"], $edge["endNode"], $floor_id, $edge["edgeWidth"], $bldg_fk, $edge["offsetX"], $edge["offsetY"]));
    }

});

Route::post('floors/getNumFloors/{bldg_id}', array('as' => 'getNumFloors', function($bldg_id) {
    $result = "";
    $data = "";
    $numFloors = 0;
    $floors = array();

    if($result = DB::select("select count(DISTINCT floor) as num from nodes where building_fk = ?", array($bldg_id))){
	$numFloors = $result[0]->num;
    }

    if($result = DB::select("select DISTINCT floor from nodes where building_fk = ?", array($bldg_id))){
	foreach($result as $row){
	    array_push($floors, $row->floor);
	}
    }
 
    $data = array("numFloors"=>$numFloors, 
		  "floors"=>$floors);

    echo json_encode($data);
}));

Route::post('floors/loadFloorplan/{bldg_id}/{floor_id}', array('as' => 'loadFloorplan', function($bldg_id, $floor_id) {

    $nodes = array();
    $edges = array();
    $metadata = array("max_x" => null,
			"max_y" => null,
			"min_x" => null,
			"min_y" => null);
		      	//"image" => null,
                      //"width" => null,
                      //"height" => null,
                      //"latitude" => null,
                      //"longitude" => null);

    $result = "";
    
    //Get floor metadata
    if($result = DB::select("select MAX(x_pos) as maxX, MAX(y_pos) as maxY, MIN(x_pos) as minX, MIN(y_pos) as minY from nodes where floor = ? and building_fk = ?", array($floor_id, $bldg_id))){
	$metadata["max_x"] = $result[0]->maxX;
	$metadata["max_y"] = $result[0]->maxY;
	$metadata["min_x"] = $result[0]->minX;
	$metadata["min_y"] = $result[0]->minY;

//    	$metadata["image"] = $result[0]->image_url;
    //    $metadata["width"] = $result[0]->width;
    //    $metadata["height"] = $result[0]->height;
    //    $metadata["latitude"] = $result[0]->latitude;
    //    $metadata["longitude"] = $result[0]->longitude;
    //    $metadata["counter"] = $result[0]->counter;
    } else {
        echo "Error retrieving max and min node values";
        return;
    }

    //Get nodes
    if($result = DB::select("select z_pos, x_pos, y_pos, node_id, name, type, width, height from nodes where floor = ? and building_fk = ?", array($floor_id, $bldg_id))) {
        foreach($result as $row){
            array_push($nodes, $row);
        }
    } else {
        //echo "Error retrieving nodes";
        //return;
    }

    //print_r($nodes);

    //Get edges
    if($result = DB::select("select start_node_fk, end_node_fk, edge_width, offsetX, offsetY from edges where floor = ? and building_fk = ?", array($floor_id, $bldg_id))) {
        foreach($result as $row){
            array_push($edges, $row);
        }
    } else {
	//echo "Error retrieving edges";
        //return;
    }

    //Package data
    $graph = array("meta" => $metadata,
    		   "nodes" => $nodes,
                   "edges" => $edges);

    //Return data
    echo json_encode($graph);
}));

/********************************************
Routes for the 'building' view go here
********************************************/

Route::post('buildings/addBuilding', function(){
echo "adding Building\n";
    $name = Input::get('name');
    $desc = Input::get('desc');
    $dept = Input::get('dept');
    $tele = Input::get('tele');

    //echo "has file: " . var_dump(Input::hasFile('thmb'));

    //print_r($_POST);
    print_r($_FILES);

    /* Upload image to server */
    //

    /* Insert building metadata into database */
    if(DB::insert('insert into buildings (name, description, department, phone) values (?, ?, ?, ?)', array($name, $desc, $dept, $tele))){
        /* Get id of building we just inserted to create data directory for building*/
        $res = DB::select('select id from buildings where name = ?', array("$name"));

        $id = 0;

        foreach($res as $row){
            $id = $row->id;
        }

        $newDir = Config::get('upload.buildingDataDir')."/$id";
        echo $newDir;
        mkdir($newDir);

        /*Upload image if it exists */
        if(Input::hasFile('thmb')){
            $imgPath = $newDir.'/img';
            mkdir($imgPath);
            Input::file('thmb')->move($imgPath, $id.time());
        }
    }
});

Route::post('buildings/deleteBuilding', function(){
    $id = Input::get('bldg');
    if(DB::delete("delete from buildings where id=?", array($id))){
        echo "Building deleted";
    } else {
        echo "Failure: ".$id;
    }
});

Route::get('buildings/getBuildings', function(){
    $response = array();

    $result = DB::select("select * from buildings");

    $cnt = 0;

    foreach($result as $row){
        $response[$cnt]['id']    = $row->id;
        $response[$cnt]['name']  = $row->name;
        $response[$cnt]['phone'] = $row->phone;
        $response[$cnt]['desc']  = $row->description;
        $response[$cnt]['dept']  = $row->department;
        $response[$cnt]['thumb'] = $row->thumb;
        $cnt++;
    }

    echo json_encode($response);
});

/********************************************
Routes for the 'floors' view go here
********************************************/

Route::post('floors/addFloor/{id}', function($id){

    $name = Input::get('name');
    echo "Name: ".$name;
    /* Insert floor metadata into database */
    if(DB::insert("insert into floors (building_fk, name) values (?, ?)", array($id, $name))){
        echo "Floor created";
    }
});

Route::post('floors/getFloors/{id}', function($id){
    $response = array();

    //$result = DB::select("select * from floors where building_fk = ?", array($id));
    $result = DB::select("select distinct floor from nodes where building_fk = ? order by floor asc", array($id));

    $cnt = 0;

    foreach($result as $row){
        //$response[$cnt]['id']    = $row->id;
        $response[$cnt]['floor']  = $row->floor;
        $cnt++;
    }
    echo json_encode($response);
});

Route::post('floors/deleteFloor/{bldg_id}/{flr_id}', function($bldg_id, $floor_id){
    if(DB::delete("delete from nodes where building_fk = ? and floor = ?", array($bldg_id, $floor_id))){
        if(DB::delete("delete from edges where building_fk = ? and floor = ?", array($bldg_id, $floor_id)))
	echo "Floor deleted";
    }
});

/********************************************
Routes for the 'command_center' view go here
********************************************/

Route::post('command_center/getBuildings', function(){
    $response = array();
    $result = DB::select("select id, name from buildings");
    $counter = 0;

    foreach($result as $row) {
	$response[$counter]['id'] = $row->id;
	$response[$counter]['name'] = $row->name;
	$counter++;
    }

    echo json_encode($response);
});

Route::post('command_center/getNodes/{id}', function($id){
    $response = array();
    $result = DB::select("SELECT id AS id, z_pos AS Z, x_pos AS X, y_pos AS Y, type AS type, width, height, floor, name FROM nodes WHERE building_fk = ?", array($id));
    $counter = 0;

    foreach($result as $row) {
	$response[$counter]["id"] 	= $row -> id;
	$response[$counter]["X"]	= $row -> X;
        $response[$counter]["Y"]        = $row -> Y;
        //$response[$counter]["Z"]      = $row -> Z;;
        $response[$counter]["Z"]        = 150 * $row -> floor;
        $response[$counter]["type"]     = $row -> type;
        $response[$counter]["floor"]    = $row -> floor;
        $response[$counter]["width"]    = $row -> width;
        $response[$counter]["height"]   = $row -> height;
	$response[$counter]["name"] 	= $row -> name;
        $counter++;
    }

    echo json_encode($response);
});

Route::post('command_center/getEdges/{id}', function($id){
    $response = array();
    $result = DB::select("SELECT edges.type AS type, edges.id AS id, nodes.z_pos AS startz, nodes.x_pos AS startx, nodes.y_pos AS starty, edges.floor AS floor FROM edges INNER JOIN nodes ON (edges.start_node_fk=nodes.node_id AND edges.floor=nodes.floor AND edges.building_fk =".$id ." AND nodes.building_fk = ?) order by id", array($id));
    $result2 = DB::select("SELECT  edges.id AS id, nodes.z_pos AS endz, nodes.x_pos AS endx, nodes.y_pos AS endy,  edges.floor AS ffk FROM edges INNER JOIN nodes ON (edges.end_node_fk=nodes.node_id AND edges.floor=nodes.floor AND edges.building_fk = ? AND nodes.building_fk = ?) order by id", array($id, $id));
    $counter = 0;

    foreach($result as $row) {
        $response[$counter]["id"] 	= $row -> id;
        $response[$counter]["type"]     = $row -> type;
        $response[$counter]["start_x"]  = $row -> startx;
        $response[$counter]["start_y"]  = $row -> starty;
        $response[$counter]["start_z"]  = 150 * $row -> floor;
        $response[$counter]["floor"]    = $row -> floor;
        $counter++;
    }

    $counter = 0;

    foreach($result2 as $row) {
	$response[$counter]["end_x"] 	= $row -> endx;
	$response[$counter]["end_y"]	= $row -> endy;
	$response[$counter]["end_z"] 	= 150 * $row -> ffk;
	$counter++;
    }

    echo json_encode($response);
});

Route::post('command_center/getResponders/{id}', function($id){
    $response = array();
    $counter = 0;
    $result = DB::select("SELECT id AS id, x_pos AS X, y_pos AS Y, floor_fk AS floor, r_id FROM responder WHERE building_fk = ?", array($id));

    foreach($result as $row) {
	$response[$counter]["id"] 	= $row -> id;
        $response[$counter]["X"] 	= $row -> X;
	$response[$counter]["Y"] 	= $row -> Y;
        $response[$counter]["Z"] 	= 150 * $row -> floor - 10;
        $response[$counter]["floor"] 	= $row -> floor;
        $response[$counter]["r_id"] 	= $row -> r_id;
        $counter++;
    }

    echo json_encode($response);
});







