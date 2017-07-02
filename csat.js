var socket = io('', {
	'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionAttempts': 50
});

var did, sgid, oid;
var DeptOperators = new Array();

$(document).ready(function() {
sgid = getURLParameter("sgid");
did = getURLParameter("did");
oid = getURLParameter("oid");

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
	socket.on('error', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
	socket.on('disconnect', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
 	socket.on('errorResponse', function(data){
		$("#message1").text(data);
	});
	socket.on('deptOperators', function(data){
		DeptOperators = data[did];	// get dept operators
	});
	if(sgid != null)
	{
		socket.on('skillGroupStats', function(data){
			$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
			for(var i in data)
			{
				if(sgid == data[i].skillgroup)		// only if this is the skillgroup
					showCsatStats(data[i]);
			}
		});
		socket.on('departmentStats', function(data){
			for(var i in data)
			{
				if(sgid == data[i].skillgroup)		// if this department is in this skillgroup
					showCsatStats(data[i]);
			}
		});	
	}
	else if(did != null)
	{
		socket.on('departmentStats', function(data){
			$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
			for(var i in data)
			{
				if(did == data[i].did)		// only if this is the department
					showCsatStats(data[i]);
			}
		});	
		socket.on('operatorStats', function(data){
			for(var i in data)
			{
				if(DeptOperators.indexOf(data[i].oid) != -1 && data[i].csat.surveys > 0)	// there are surveys
					showCsatStats(data[i]);
			}
		});
	}
	else if(oid != null)	// show individual operator only
	{
		socket.on('operatorStats', function(data){
			$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
			for(var i in data)
			{
				if(oid == data[i].oid)		// only if this operator belongs to this dept
					showCsatStats(data[i]);
			}
		});
	}
 	socket.on('authErrorResponse', function(data) {
		$("#message1").text(data);
		$("#csatTable").hide();
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
		$("#csatTable").show();
		socket.emit('deptOperatorsRequest',"");
		socket.emit('join room',"skillgroup_room");
		socket.emit('join room',"department_room");
		socket.emit('join room',"operator_room");
	});
});

$(window).on('beforeunload',function () {
	socket.close();
});

function exportMetrics() {
	console.log("Exporting Csat metrics");
	tableToCsvFile("csatTable");
}