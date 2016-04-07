var socket = io.connect();
var did;
var ShowDept = new Object();	// used for toggling department metrics
var Overall = new Object();
var SkillGroups = new Array();

$(document).ready(function() {

//	$('#download').hide();	
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
		$('#message1').text("");
		$('#myname').text(data.name);
		$("#signinform").hide();
		$("#topTable").show();
	});
	
	socket.on('overallStats', function(data){
		
		Overall = data;
		showTopLevelStats(data);
	});
	
	socket.on('skillGroupStats', function(ddata){

		SkillGroups = ddata;
		for(var i in ddata)
		{
			showTopLevelStats(ddata[i]);
		}
	});
	
});

function showTopLevelStats(data) {
	var rowid;
	var ttable = document.getElementById("topTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createRow(ttable, data.did, data.name);
	}
	showMetrics(rowid,data);
}

function showMetrics(rowid, data) {
	var tcanpc = " (0%)";
	var tcunpc = " (0%)";
	var slapc = "0%";
	
	if(data.tco != 0)
	{
		tcanpc = " ("+Math.round((data.tcan/data.tco)*100)+"%)";
		tcunpc = " ("+Math.round((data.tcun/(data.tcun+data.tco))*100) +"%)";
	}
	if(data.tcan != 0)
		slapc = Math.round((data.csla/data.tcan)*100) +"%";

	rowid.cells[1].innerHTML = data.cconc;
	rowid.cells[2].innerHTML = slapc;
	rowid.cells[3].innerHTML = data.ciq;
	rowid.cells[4].innerHTML = toHHMMSS(data.lwt);
	rowid.cells[5].innerHTML = data.tco;
	rowid.cells[6].innerHTML = data.tac;
	rowid.cells[7].innerHTML = data.tcan + tcanpc;
	rowid.cells[8].innerHTML = data.tcuq;
	rowid.cells[9].innerHTML = data.tcua;
	rowid.cells[10].innerHTML = data.tcun + tcunpc;
	rowid.cells[11].innerHTML = toHHMMSS(data.asa);
	rowid.cells[12].innerHTML = toHHMMSS(data.act);
	rowid.cells[13].innerHTML = data.acc;
	rowid.cells[14].innerHTML = data.oaway;
	rowid.cells[15].innerHTML = data.oavail+data.oaway;	// total logged in
}

function createRow(tableid, id, name) {
	
	row = tableid.insertRow();	
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	row.cells[0].outerHTML = "<th onClick=\"showSkillGroup('"+id+"','"+name+"')\">"+name+"</th>";

	return row;
}

function showSkillGroup(skill,sname) {
	console.log("Show Depts for skill group: "+sname);
//	NewWin("skillgroup.html?sgid="+sname);
	window.open("skillgroup.html?sgid="+sname, '_blank');
}

function exportMetrics() {
	console.log("Exporting top-level metrics");
//	buildCsvFile(Overall, SkillGroups);
	tableToCsvFile("topTable");
}