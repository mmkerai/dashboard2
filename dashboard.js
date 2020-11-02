var socket = io('', {
	'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionAttempts': 50
});

$(document).ready(function() {

	checksignedin();

	$('#signinform').submit(function(event) {
		event.preventDefault();
		var name = $('#username').val();
		var pwd = $('#password').val();
		signin(name,pwd);
	});
	socket.on('connection', function(data){
		console.log("socket connected at "+ new Date().toGMTString());
	});
	socket.on('error', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
	socket.on('disconnect', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
	socket.on('connect_timeout',function(data){
		console.log("socket timeout at "+ new Date().toGMTString());
	});
	socket.on('connect_error',function(data){
		console.log("socket connect error at "+ new Date().toGMTString());
	});
 	socket.on('errorResponse',function(data) {
		$("#message1").text(data);
	});
	socket.on('authErrorResponse', function(data){
		$("#message1").text(data);
		$("#topTable").hide();
		$("#signinform").show();
	});
	socket.on('authResponse',function(data) {
		saveCookie("username", data.name, 1);	// save as cookie for 1 day
		saveCookie("password", data.pwd, 1);
		$('#message1').text("");
		$('#myname').text(data.name);
		$("#signinform").hide();
		$("#topTable").show();
		socket.emit('join room',"overall_room");
		socket.emit('join room',"skillgroup_room");
	});	
	socket.on('overallStats',function(data) {		
		$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
		showTopLevelStats(data);
	});		
	socket.on('skillGroupStats',function(ddata) {
		for(var i in ddata)
			showTopLevelStats(ddata[i]);
	});
});

$(window).on('beforeunload',function () {
	socket.close();
});
	
function exportMetrics() {
	console.log("Exporting top-level metrics");
	tableToCsvFile("topTable");
}