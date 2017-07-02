var socket = io('', {
	'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionAttempts': 50
});

var did;
var DeptOperators = new Array();

$(document).ready(function() {
did = getURLParameter("did");

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
	socket.on('connect_error', function(data){
		console.log("socket connect error at "+ new Date().toGMTString());
	});
	socket.on('error', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
 	socket.on('authErrorResponse', function(data){
		$("#message1").text(data);
		$("#deptTable").hide();
		$("#signinform").show();
	});

 	socket.on('errorResponse', function(data){
		$("#message1").text(data);
	});

	socket.on('authResponse', function(data){
		saveCookie("username", data.name, 1);	// save as cookie for 1 day
		saveCookie("password", data.pwd, 1);
		$('#message1').text("");
		$('#myname').text(data.name);
		$("#signinform").hide();
		$("#deptTable").show();
		socket.emit('deptOperatorsRequest',"");
		socket.emit('join room',"department_room");
		socket.emit('join room',"operator_room");
	});

	socket.on('deptOperatorsResponse', function(ddata){
		DeptOperators = ddata[did];	// get dept operators
	});

	socket.on('departmentStats', function(ddata){
		for(var i in ddata)
		{
			if(ddata[i].did == did) 	// show dept
				showOperatorStats(ddata[i]);
		}
	});

	socket.on('operatorStats', function(ddata){
		$("#ctime").text("Last refreshed: "+new Date().toLocaleString());

		for(var i in ddata)
		{
			if(DeptOperators.indexOf(ddata[i].oid) != -1)		// only of this operator belongs to this dept
			{
				if(ddata[i].status == 0 && ddata[i].tcan == 0)	// if logged out and have not answered some chats today
					continue;
				else
					showOperatorStats(ddata[i]);
			}
		}
	});
});

$(window).on('beforeunload',function () {
	socket.close();
});

function showCsat(oid,dname) {
	window.open("csat.html?oid="+oid, '_blank');
}

function showDeptCsat(did,dname) {
	window.open("csat.html?did="+did, '_blank');
}

function updateCustomStatus(oid) {
	socket.emit("updateCustomStatus", oid);
}

function exportMetrics() {
	console.log("Exporting operator metrics");
	tableToCsvFile("deptTable");
}
