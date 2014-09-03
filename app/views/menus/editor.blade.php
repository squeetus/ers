{{ HTML::script('js/jquery-1.11.0.min.js') }}
{{ HTML::script('js/jquery-ui-1.10.4.min.js') }}
{{ HTML::style('bootstrap/css/bootstrap.css') }}
{{ HTML::style('css/jquery-ui-1.10.4.min.css') }}
{{ HTML::script('bootstrap/js/bootstrap.min.js') }}
{{ HTML::script('js/kinetic-v5.1.0.min.js') }}

<title>ERS Command</title>

<style>
    #menu img{
        width: 28;
        height: 28;
    }

</style>

<nav class="navbar navbar-default navbar-fixed-top" role="navigation">
    <div class="navbar-header">
        <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#mainMenu">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
        </button>
</div>
    <div class="collapse navbar-collapse" id="mainMenu">
        <ul id="menu" class="nav navbar-nav" style="margin-left: 10px;">
            <li><a href="{{{ URL::to('/floors')."/".$bldg_id }}}"><span id="floors" class="glyphicon glyphicon-th-large"></span></a></li>
            <li><a href="#"><span id="bg" class="glyphicon glyphicon-picture"></span></a></li>
            <li><a href="#"><span id="save" class="glyphicon glyphicon-floppy-disk"></span></a></li>
            <li><a href="#"><img id="path" class="tool" src="{{ asset('img/pathtool.png') }}" /></a></li>
            <li><a href="#"><img id="link" class="tool" src="{{ asset('img/linktool.png') }}" /></a></li>
            <li><a href="#"><img id="node" class="tool" src="{{ asset('img/junctiontool.png') }}"/></a></li>
            <li><a href="#"><img id="room" class="tool" src="{{ asset('img/roomtool.png') }}" /></a></li>
            <li><a href="#"><img id="entrance" class="tool" src="{{ asset('img/entrancetool.png') }}" /></a></li>
            <li><a href="#"><img id="fire" class="tool" src="{{ asset('img/firetool.png') }}" /></a></li>
            <li><a href="#"><img id="elevator" class="tool" src="{{ asset('img/elevatortool.png') }}"/></a></li>
            <li><a href="#"><img id="stair" class="tool" src="{{ asset('img/stairtool.png') }}" /></a></li>

        </ul>
    </div><!-- /.navbar-collapse -->

</nav>
