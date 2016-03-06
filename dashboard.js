var socket = io.connect();
var did;

$(document).ready(function() {
did = getURLParameter("did");
console.log("did is "+did);

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
	
	socket.on('overallStats', function(data){
		var tcanpc = data.tcan + " ("+Math.round((data.tcan/data.tco)*100)+"%)";
		var tcunpc = data.tcun + " ("+Math.round((data.tcun/(data.tcun+data.tco))*100) +"%)";
		$("#ocon").text(data.cconc);
		$("#osla").text(data.psla +"%");
		$("#ociq").text(data.ciq);
		$("#olwt").text(toHHMMSS(data.lwt));
		$("#ooff").text(data.tco);
		$("#otac").text(data.tac);
		$("#otcan").text(tcanpc);
		$("#ouiq").text(data.tcuq);
		$("#ouas").text(data.tcua);
		$("#ocunavail").text(tcunpc);
		$("#oasa").text(toHHMMSS(data.asa));
		$("#oact").text(toHHMMSS(data.act));
		$("#oaccap").text(data.acc);
		$("#oaway").text(data.oaway);
		$("#oavail").text(data.oavail);
	});
	
	socket.on('skillGroupStats', function(ddata){
		var ttable = document.getElementById("topTable");
		var row, col, rowid;
		for(var i in ddata)
		{
			var tcanpc = " (0%)";
			var tcunpc = "0%";
			if(ddata[i].tco != 0)
			{
				tcanpc = " ("+Math.round((ddata[i].tcan/ddata[i].tco)*100)+"%)";
				tcunpc = " ("+Math.round((ddata[i].tcun/(ddata[i].tcun+ddata[i].tco))*100) +"%)";
			}
			rowid = document.getElementById(ddata[i].name);
			if(rowid === null)		// row doesnt exist so create one
			{
				row = ttable.insertRow();	// there is already a header row and top row
				col = row.insertCell(0);
				row.id = ddata[i].name;
				col.outerHTML = "<th scope='row' onClick=\"showSkillGroup('"+ddata[i].did+"','"+ddata[i].name+"')\">"+ddata[i].name+"</th>";
				col = row.insertCell(1).innerHTML = ddata[i].cconc;
				col = row.insertCell(2).innerHTML = ddata[i].psla +"%";
				col = row.insertCell(3).innerHTML = ddata[i].ciq;
				col = row.insertCell(4).innerHTML = toHHMMSS(ddata[i].lwt);
				col = row.insertCell(5).innerHTML = ddata[i].tco;
				col = row.insertCell(6).innerHTML = ddata[i].tac;
				col = row.insertCell(7).innerHTML = ddata[i].tcan + tcanpc;
				col = row.insertCell(8).innerHTML = ddata[i].tcuq;
				col = row.insertCell(9).innerHTML = ddata[i].tcua;
				col = row.insertCell(10).innerHTML = ddata[i].tcun + tcunpc;
				col = row.insertCell(11).innerHTML = toHHMMSS(ddata[i].asa);
				col = row.insertCell(12).innerHTML = toHHMMSS(ddata[i].act);
				col = row.insertCell(13).innerHTML = ddata[i].acc;
				col = row.insertCell(14).innerHTML = ddata[i].oaway;
				col = row.insertCell(15).innerHTML = ddata[i].oavail;
			}
			else
			{
				rowid.cells[1].innerHTML = ddata[i].cconc;
				rowid.cells[2].innerHTML = ddata[i].psla +"%";
				rowid.cells[3].innerHTML = ddata[i].ciq;
				rowid.cells[4].innerHTML = toHHMMSS(ddata[i].lwt);
				rowid.cells[5].innerHTML = ddata[i].tco;
				rowid.cells[6].innerHTML = ddata[i].tac;
				rowid.cells[7].innerHTML = ddata[i].tcan + tcanpc;
				rowid.cells[8].innerHTML = ddata[i].tcuq;
				rowid.cells[9].innerHTML = ddata[i].tcua;
				rowid.cells[10].innerHTML = ddata[i].tcun + tcunpc;
				rowid.cells[11].innerHTML = toHHMMSS(ddata[i].asa);
				rowid.cells[12].innerHTML = toHHMMSS(ddata[i].act);
				rowid.cells[13].innerHTML = ddata[i].acc;
				rowid.cells[14].innerHTML = ddata[i].oaway;
				rowid.cells[15].innerHTML = ddata[i].oavail;
			}
		}
	});
	
	socket.on('departmentStats', function(ddata){
		var ttable = document.getElementById("topTable");
//		for(cnt = 0; cnt < Object.keys(ddata).length; cnt++)
		var row, col, rowid;
		if(did !== null)
		{

			for(var i in ddata)
			{
				var tcanpc = "0%";
				var tcunpc = "0%";
				if(ddata[i].tco != 0)
				{
					tcanpc = " ("+Math.round((ddata[i].tcan/ddata[i].tco)*100)+"%)";
					tcunpc = " ("+Math.round((ddata[i].tcun/(ddata[i].tcun+ddata[i].tco))*100) +"%)";
				}
				rowid = document.getElementById(ddata[i].name);
				if(rowid === null)		// row doesnt exist so create one
				{
					row = ttable.insertRow();	// there is already a header row and top row
					col = row.insertCell(0);
					row.id = ddata[i].name;
					col.outerHTML = "<th scope='row' onClick=\"showDepartment('"+ddata[i].did+"','"+ddata[i].name+"')\">"+ddata[i].name+"</th>";
					col = row.insertCell(1).innerHTML = ddata[i].cconc;
					col = row.insertCell(2).innerHTML = ddata[i].psla +"%";
					col = row.insertCell(3).innerHTML = ddata[i].ciq;
					col = row.insertCell(4).innerHTML = toHHMMSS(ddata[i].lwt);
					col = row.insertCell(5).innerHTML = ddata[i].tco;
					col = row.insertCell(6).innerHTML = ddata[i].tac;
					col = row.insertCell(7).innerHTML = ddata[i].tcan + tcanpc;
					col = row.insertCell(8).innerHTML = ddata[i].tcuq;
					col = row.insertCell(9).innerHTML = ddata[i].tcua;
					col = row.insertCell(10).innerHTML = ddata[i].tcun + tcunpc;
					col = row.insertCell(11).innerHTML = toHHMMSS(ddata[i].asa);
					col = row.insertCell(12).innerHTML = toHHMMSS(ddata[i].act);
					col = row.insertCell(13).innerHTML = ddata[i].acc;
					col = row.insertCell(14).innerHTML = ddata[i].oaway;
					col = row.insertCell(15).innerHTML = ddata[i].oavail;
				}
				else
				{
					rowid.cells[1].innerHTML = ddata[i].cconc;
					rowid.cells[2].innerHTML = ddata[i].psla +"%";
					rowid.cells[3].innerHTML = ddata[i].ciq;
					rowid.cells[4].innerHTML = toHHMMSS(ddata[i].lwt);
					rowid.cells[5].innerHTML = ddata[i].tco;
					rowid.cells[6].innerHTML = ddata[i].tac;
					rowid.cells[7].innerHTML = ddata[i].tcan + tcanpc;
					rowid.cells[8].innerHTML = ddata[i].tcuq;
					rowid.cells[9].innerHTML = ddata[i].tcua;
					rowid.cells[10].innerHTML = ddata[i].tcun + tcunpc;
					rowid.cells[11].innerHTML = toHHMMSS(ddata[i].asa);
					rowid.cells[12].innerHTML = toHHMMSS(ddata[i].act);
					rowid.cells[13].innerHTML = ddata[i].acc;
					rowid.cells[14].innerHTML = ddata[i].oaway;
					rowid.cells[15].innerHTML = ddata[i].oavail;
				}
			}
		}
	});
	
});

function showSkillGroup(skill,sname) {
	console.log("Show Depts for skill group: "+sname);
//	window.location.href = window.location.pathname+'?did='+skill;
	var deptpage = NewWin("skillgroup.html?did="+sname, "Skillgroup Dashboard");
//	var doc = deptpage.document;
//	doc.getElementById("dashheader").innerHTML = "Department: "+sname;
}

function showDepartment(dept,dname) {
	console.log("Show Depts for skill group: "+dept+","+dname);
//	window.location.href = window.location.pathname+'?did='+dept;
//	var deptpage = NewWin("department.html?did="+did, "Department Dashboard");
//	var doc = deptpage.document;
//	doc.getElementById("dashheader").innerHTML = "Department: "+dname;
}

function showTopTableHeader() {
	var ttable = document.getElementById("topTable");
	var header = ttable.createTHead();
	row = header.insertRow();
	cell = row.insertCell().innerHTML = "cell 1";	
}

function NewWin(htmlfile, name)		// open a new window
{
	WIDTH = 1280;
	HEIGHT = 768;
	var left = (screen.width/2)-(WIDTH/2);
	var top = (screen.height/2)-(HEIGHT/2)-64;
	var winpop = window.open(htmlfile, name,
				'toolbar=yes,location=no,status=no,menubar=yes,scrollbars=yes,resizable=yes,width='+WIDTH+',height='+HEIGHT+',top='+top+',left='+left);
	winpop.focus();
	return winpop;
}

