{{ HTML::script('js/jquery-1.11.0.min.js') }}
{{ HTML::style('bootstrap/css/bootstrap.css') }}
{{ HTML::script('bootstrap/js/bootstrap.min.js') }}

<title>ERS Command</title>

<style>
    body{
        padding-top: 70px;
    }
    span.glyphicon{
        margin-right: 5px;
    }

</style>

<nav class="navbar navbar-default navbar-fixed-top" role="navigation">
    <!-- Brand and toggle get grouped for better mobile display -->
    <div class="navbar-header">
        <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#mainMenu">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
        </button>
        <a class="navbar-brand" href="{{{ URL::to('/landing') }}}">ERS Command</a>
    </div>

    <!-- Collect the nav links, forms, and other content for toggling -->
    <div class="collapse navbar-collapse" id="mainMenu">
        <ul class="nav navbar-nav">
            <li {{{ Route::getCurrentRoute()->getPath() === "buildings" ? "class=active" : "" }}}><a href="{{{ URL::to('/buildings') }}}"><span class="glyphicon glyphicon-home"></span>Buildings</a></li>
            <li {{{ Route::getCurrentRoute()->getPath() === "people" ? "class=active" : "eh" }}}><a href="{{{ URL::to('/people') }}}"><span class="glyphicon glyphicon-user"></span>People</a></li>
            <li><a href="#"><span class="glyphicon glyphicon-wrench"></span>Admin</a></li>
            <li><a href="#"><span class="glyphicon glyphicon-log-out"></span>Logout</a></li>
        </ul>
    </div><!-- /.navbar-collapse -->
</nav>