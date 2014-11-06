{{ HTML::script('js/jquery-1.11.0.min.js') }}
{{ HTML::style('bootstrap/css/bootstrap.css') }}
{{ HTML::script('bootstrap/js/bootstrap.min.js') }}

<title>ERS Responder View</title>

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
        <a class="navbar-brand" href="{{{ URL::to('/') }}}">ERS Command</a>
    </div>

    <!-- Collect the nav links, forms, and other content for toggling -->
    <div class="collapse navbar-collapse" id="responderMenu">
        <ul class="nav navbar-nav">
            <li><a href="#"><span id="up" class="glyphicon glyphicon-arrow-up"> Up</span></a></li>
            <li><a href="#"><span id="down" class="glyphicon glyphicon-arrow-down"> Down</span></a></li>
        </ul>
    </div><!-- /.navbar-collapse -->
</nav>
