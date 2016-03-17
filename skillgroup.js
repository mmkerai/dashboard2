var socket = io.connect();
var sgid;

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

	socket.on('skillGroupStats', function(ddata){

		for(var i in ddata)
		{
			if(ddata[i].name == sgid)
				showTopLevelStats(ddata[i]);
		}
	});	
});
	
	socket.on('departmentStats', function(ddata){

		for(var i in ddata)
		{
			if(ddata[i].skillgroup == sgid) 	// show dept if in this skill group
				showDeptLevelStats(ddata[i]);
		}
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

function showDeptLevelStats(data) {
	var rowid;
	var ttable = document.getElementById("topTable");

	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		var sgrowid = document.getElementById(data.skillgroup);
		rowid = createDeptRow(ttable,sgrowid.rowIndex,data.skillgroup,data.did,data.name);
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
	rowid.cells[15].innerHTML = data.oavail;
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

function createDeptRow(tableid,index,sg,did,name) {

	row = tableid.insertRow(index+1);
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	row.cells[0].outerHTML = "<td onClick=\"showDepartment('"+did+"','"+name+"')\">"+name+"</td>";
	
	return row;
}

function showDepartment(did,dname) {
	console.log("Show Dept : "+dname);
	var deptpage = NewWin("department.html?did="+did, "Department "+dname+" Dashboard");

}

function NewWin(htmlfile, name)		// open a new window
{
	WIDTH = 1200;
	HEIGHT = 768;
	var left = (screen.width/2)-(WIDTH/2);
	var top = (screen.height/2)-(HEIGHT/2)-64;
	var winpop = window.open(htmlfile, name,
				'toolbar=yes,location=no,status=no,menubar=yes,scrollbars=yes,resizable=yes,width='+WIDTH+',height='+HEIGHT+',top='+top+',left='+left);
	winpop.focus();
	return winpop;
}

function toHHMMSS(seconds) {
    var sec_num = parseInt(seconds, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}
