var socket = io.connect();
var sgid;
var SkillGroup = new Object();
var Departments = new Array();

$(document).ready(function() {
sgid = getURLParameter("sgid");
console.log("sgid is "+sgid);

	checksignedin();

	$('#signinform').submit(function(event) {
		event.preventDefault();
		var name = $('#username').val();
		var pwd = $('#password').val();
		signin(name,pwd);
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
//		console.log("Save cookie: "+data.name+" and pwd "+data.pwd);
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
		var sgrowid = document.getElementById(data.skillgroup);
		rowid = createDeptRow(ttable,sgrowid.rowIndex,data.skillgroup,data.did,data.name);
	}
	showTopMetrics(rowid,data);
}

function createDeptRow(tableid,index,sg,did,name) {

	row = tableid.insertRow(index+1);
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	row.cells[0].outerHTML = "<td class='h3g_link' onClick=\"showDepartment('"+did+"','"+name+"')\">"+name+"</td>";
	
	return row;
}

function showDepartment(did,dname) {
//	console.log("Show Dept : "+dname);
	window.open("department.html?did="+did, '_blank');
}

function exportMetrics() {
	console.log("Exporting department metrics");
	tableToCsvFile("topTable");
}