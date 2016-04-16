var socket = io.connect();
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
	});
	
	socket.on('skillGroupStats', function(ddata) {
		SkillGroups = ddata;
		for(var i in ddata)
		{
			showTopLevelStats(ddata[i]);
		}
	});
});

function showSkillGroup(skill,sname) {
//	console.log("Show Depts for skill group: "+sname);
	window.open("skillgroup.html?sgid="+sname, '_blank');
}

function exportMetrics() {
	console.log("Exporting top-level metrics");
	tableToCsvFile("topTable");
}