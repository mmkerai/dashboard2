var socket = new io.connect('', {
	'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionAttempts': 50
});
var did;
var ShowDept = new Object();	// used for toggling department metrics
var Overall = new Object();
var SkillGroups = new Array();

$(document).ready(function() {

	checksignedin();

	$('#signinform').submit(function(event) {
		event.preventDefault();
		var name = $('#username').val();
		var pwd = $('#password').val();
		signin(name,pwd);
	});
		
	socket.on('connection', function(data){
		console.log("Socket connected");
    });
	socket.on('connect_timeout', function(data){
		console.log("socket timeout at "+ new Date().toGMTString());
	});

 	socket.on('authErrorResponse', function(data) {
		$("#message1").text(data);
		$("#topTable").hide();
		$("#signinform").show();
	});

 	socket.on('errorResponse', function(data) {
		$("#message1").text(data);
	});

	socket.on('authResponse', function(data) {
		saveCookie("username", data.name, 1);	// save as cookie for 1 day
		saveCookie("password", data.pwd, 1);
		$('#message1').text("");
		$('#myname').text(data.name);
		$("#signinform").hide();
		$("#topTable").show();
	});
	
	socket.on('overallStats', function(data) {		
		Overall = data;
		showTopLevelStats(data);
		$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
	});
	
	socket.on('skillGroupStats', function(ddata) {
		SkillGroups = ddata;
		for(var i in ddata)
		{
			showTopLevelStats(ddata[i]);
		}
	});
});

function exportMetrics() {
	console.log("Exporting top-level metrics");
	tableToCsvFile("topTable");
}