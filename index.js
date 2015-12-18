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
	socket.on('doneResponse', function(data){
		$("#done").text("Creating csv file");
		var filedata = new Blob([data], {type: 'text/plain'});
		// If we are replacing a previously generated file we need to
		// manually revoke the object URL to avoid memory leaks.
		if (csvfile !== null)
		{
			window.URL.revokeObjectURL(csvfile);
		}

    csvfile = window.URL.createObjectURL(filedata);
 	$('#link2').attr('href', csvfile);
	$('#link2').html("Download file");
	});
		
});


