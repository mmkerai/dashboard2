var socket = io.connect();

function downloadChats()
{
	var data = new Object();
	$("#message").text("Creating csv file");
	socket.emit('downloadChats', data);
}

$(document).ready(function() {

	checksignedin();

	$('#signinform').submit(function(event) {
		event.preventDefault();
		var name = $('#username').val();
		var pwd = $('#password').val();
		signin(name,pwd);
	});
		
 	socket.on('authErrorResponse', function(data){
		$("#error").text(data);
		$("#topTable").hide();
		$("#signinform").show();
	});

 	socket.on('errorResponse', function(data){
		$("#error").text(data);
	});

	socket.on('authResponse', function(data){
		saveCookie("username", data.name, 1);	// save as cookie for 1 day
		saveCookie("password", data.pwd, 1);
//		console.log("Save cookie: "+data.name+" and pwd "+data.pwd);
		$('#error').text("");
		$('#myname').text(data.name);
		$("#signinform").hide();
		$("#topTable").show();
	});

	socket.on('chatsCsvResponse', function(data){
		var csvfile;
		
		$("#result").text("Download csv file");
		var filedata = new Blob([data],{type: 'text/plain'});
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