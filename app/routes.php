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

Route::post('/tmpFloorplanUpload', function(){
    $file = Input::file('image');
    $destinationPath = "tmp/";

    //Create unique filename based on current time (in ms)
    $filename = "tmp_" . round(microtime(true) * 1000);
    $extension = '.'.$file->getClientOriginalExtension();
    Input::file('image')->move($destinationPath, $filename.$extension);

    //Return path of image
    echo "http://localhost/ers/public/tmp/".$filename.$extension;
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
    //$img_url = $decoded["image"];
    //$width   = $decoded["width"];
    //$height  = $decoded["height"];
    $counter = $decoded["node_count"];
    $floor_id = $id;

echo $bldg_fk . " " . $floor_id . "\n";

if($result = DB::select("select count(*) as count from edges where building_fk = ?", array($bldg_fk))) {
echo $result[0]->count . "\n";
} else {
echo "problem \n";
}
    //remove existing floor data from DB
    DB::delete("delete from nodes where floor = ? and building_fk = ?", array($floor_id, $bldg_fk));
    //DB::delete("delete from edges where floor = ? and building_fk = ?", array($floor_id, $bldg_fk));

echo "deleted from floor, building\n";

    //insert nodes
    $nodes = $decoded["nodes"];
    $edges = $decoded["edges"];

    foreach($nodes as $node) {
        $name = "";
        $type = "node";

        if ($node["type"] != "node" && $node["type"] != "Hallway") {
            //$name = $node["attr"]["name"];
            $name = $node["name"];
	    $type = $node["type"];
        }

        if($node["type"] != "room") {
	    DB::insert("insert into nodes (x_pos, y_pos, z_pos, floor, node_id, name, type, building_fk) values (?, ?, ?, ?, ?, ?, ?, ?)", array($node["x"], $node["y"], $node["z"], $floor_id, $node["id"], $name, $type,$bldg_fk));
        } else {
	    $width = $node["width"];
	    $height = $node["height"];

            DB::insert("insert into nodes (x_pos, y_pos, z_pos, floor, node_id, name, type, width, height, building_fk) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", array($node["x"], $node["y"], $node["z"], $floor_id, $node["id"], $name, $type, $width, $height, $bldg_fk));
        }
    }

if($result = DB::select("select count(*) as count from edges where building_fk = ?", array($bldg_fk))) {
echo $result[0]->count . "\n"; 
} else {
echo "problem \n";
}

$count = 0;
    //insert edges
    foreach($edges as $edge) {
	$count++;
        DB::insert("insert into edges (start_node_fk, end_node_fk, floor, edge_width, building_fk) values (?, ?, ?, ?, ?)", array($edge["startNode"], $edge["endNode"], $floor_id, $edge["edgeWidth"], $bldg_fk));
    }

echo $count . " added.\n";
});

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

    //	$metadata["image"] = $result[0]->image_url;
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
    if($result = DB::select("select start_node_fk, end_node_fk, edge_width from edges where floor = ? and building_fk = ?", array($floor_id, $bldg_id))) {
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
