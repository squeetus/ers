<form id="bldgForm" enctype="multipart/form-data" action="{{{ URL::to('/buildings/addBuilding') }}}" method="post" style="display: none";>
    <fieldset>
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" name="name" id="name" class="form-control" placeholder="Name" />
        </div>
        <div class="form-group">
            <label for="desc">Description</label>
            <input type="text" name="desc" id="desc" class="form-control" placeholder="Description" />
        </div>
        <div class="form-group">
            <label for="dept">Department</label>
            <input type="text" name="dept" id="dept" class="form-control" placeholder="Department" />
        </div>
        <div class="form-group">
            <label for="tele">Telephone</label>
            <input type="tel" name="tele" id="tele" class="form-control" placeholder="Telephone #" />
        </div>
    </fieldset>
    <input type="submit" class="btn btn-success" value="Submit">
    <button class="btn btn-danger" id="clearBtn" type="button">Clear</button>
</form>
