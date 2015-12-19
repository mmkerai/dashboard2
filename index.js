var fromDate;
var toDate;


function setDefaultValues() {
	$('#fromDate').val((new Date()).toISOString());
	$('#toDate').val((new Date()).toISOString());
}

function initialiseValues() {
	$('#error').text("");
	$('#chatcount').text("");
	$('#done').text("");
	$('#link2').html("");
}

$(document).ready(function() {
	setDefaultValues();
	var socket = io.connect();
	var csvfile = null;

	$('#api').submit(function(event) {
		event.preventDefault();
		initialiseValues();
		fromDate = $('#fromDate').val();
		toDate = $('#toDate').val();
		socket.emit('getChatReport', {fd: fromDate, td: toDate});
	});
	
	socket.on('errorResponse', function(data){
		$("#error").text(data);
	});
	socket.on('chatcountResponse', function(data){
		console.log("Data received");
		$("#chatcount").text(data);
	});
	socket.on('overallStats', function(data){
		var str = "Overall stats: "+ data.tcaban+" count: "+data.tca;
		$("#overall").text(str);
	});
		
});


