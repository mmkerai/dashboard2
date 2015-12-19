var fromDate;
var toDate;

function initialiseValues() {
	$('#error').text("");
	$('#chatcount').text("");
}

$(document).ready(function() {
	var socket = io.connect();
	var csvfile = null;

	$('#api').submit(function(event) {
		event.preventDefault();
		initialiseValues();
		socket.emit('startDashboard', {});
	});
	
	socket.on('errorResponse', function(data){
		$("#error").text(data);
	});
	socket.on('chatcountResponse', function(data){
		console.log("Data received");
		$("#chatcount").text(data);
	});
	socket.on('overallStats', function(data){
		$("#otca").text(data.tca);
		$("#otcu").text(data.tcu);
		$("#otcaban").text(data.tcaban);
		$("#otac").text(data.tac);
		$("#ocwait").text(data.cwait);
		$("#oasa").text(data.asa);
		$("#oact").text(data.act);
		$("#oamc").text(data.amc);
		$("#oaway").text(data.taway);
		$("#oavail").text(data.tavail);
	});
		
});

