<form id="floorForm" action="{{{ URL::to('/floors/addFloor').'/'.$bldg_id }}}" style="display: none";>
    <fieldset>
        <div class="form-group">
        	<div id="ddl"></div>
	</div>
    </fieldset>
    <button class="btn btn-success" id="newBasementFloor" type="button">Basement Floor</button>
    <button  id="newFloor" type="button" class="btn btn-success">Floor</button>
</form>
