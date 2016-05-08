var socket = new io.connect('https://h3gdashboard-dev.herokuapp.com', {
	'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionAttempts': 50
});
var sgid;
var SkillGroup = new Object();
var Departments = new Array();

$(document).ready(function() {
sgid = getURLParameter("sgid");

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

 	socket.on('authErrorResponse', function(data){
		$("#message1").text(data);
		$("#topTable").hide();
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
		$("#topTable").show();
	});

	socket.on('skillGroupStats', function(ddata){

		for(var i in ddata)
		{
			if(ddata[i].name == sgid)
			{
				SkillGroup = ddata[i];
				showTopLevelStats(ddata[i]);
			}
		}
	});	
});
	
	socket.on('departmentStats', function(ddata){

		for(var i in ddata)
		{
			if(ddata[i].skillgroup == sgid) 	// show dept if in this skill group
			{
				Departments.push(ddata[i]);
				showDeptLevelStats(ddata[i]);
			}
		}
	});	

function showDeptLevelStats(data) {
	var rowid;
	var ttable = document.getElementById("topTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createDeptRow(ttable, data.did, data.name);
	}
	showTopMetrics(rowid,data);
}

function showDepartment(did,dname) {
//	console.log("Show Dept : "+dname);
	window.open("department.html?did="+did, '_blank');
}

function exportMetrics() {
	console.log("Exporting department metrics");
	tableToCsvFile("topTable");
}