
$(document).ready(function() {

var did = decodeURIComponent(window.location.search.match(/(\?|&)did\=([^&]*)/)[2]);
var socket = decodeURIComponent(window.location.search.match(/(\?|&)socket\=([^&]*)/)[2]);
console.log("did is "+did);
console.log("socket is "+socket);

	socket.on('errorResponse', function(data){
		$("#error").text(data);
	});

	socket.on('departmentStats', function(ddata){
		var ttable = document.getElementById("topTable");
//		for(cnt = 0; cnt < Object.keys(ddata).length; cnt++)
		var row, col, rowid;
		for(var i in ddata)
		{
			var tcanpc = ddata[i].tcan + "("+Math.round((ddata[i].tcan/ddata[i].tco)*100)+"%)";
			rowid = document.getElementById(ddata[i].name);
			if(rowid === null)		// row doesnt exist so create one
			{
				row = ttable.insertRow();	// there is already a header row and top row
				col = row.insertCell(0);
				row.id = ddata[i].name;
				col.outerHTML = "<th scope='row' onClick='showDepartment("+ddata[i].did+","+ddata[i].name+")>"+ddata[i].name+"</th>";
				col = row.insertCell(1).innerHTML = ddata[i].cconc;
				col = row.insertCell(2).innerHTML = ddata[i].psla +"%";
				col = row.insertCell(3).innerHTML = ddata[i].cph;
				col = row.insertCell(4).innerHTML = ddata[i].ciq;
				col = row.insertCell(5).innerHTML = toHHMMSS(ddata[i].lwt);
				col = row.insertCell(6).innerHTML = ddata[i].tco;
				col = row.insertCell(7).innerHTML = ddata[i].tac;
				col = row.insertCell(8).innerHTML = tcanpc;
				col = row.insertCell(9).innerHTML = ddata[i].tcuq;
				col = row.insertCell(10).innerHTML = ddata[i].tcua;
				col = row.insertCell(11).innerHTML = Math.round((ddata[i].tcun/(ddata[i].tcun+ddata[i].tco))*100) +"%";
				col = row.insertCell(12).innerHTML = toHHMMSS(ddata[i].asa);
				col = row.insertCell(13).innerHTML = toHHMMSS(ddata[i].act);
				col = row.insertCell(14).innerHTML = ddata[i].acc;
				col = row.insertCell(15).innerHTML = ddata[i].oaway;
				col = row.insertCell(16).innerHTML = ddata[i].oavail;
			}
			else
			{
				rowid.cells[1].innerHTML = ddata[i].cconc;
				rowid.cells[2].innerHTML = ddata[i].psla +"%";
				rowid.cells[3].innerHTML = ddata[i].cph;
				rowid.cells[4].innerHTML = ddata[i].ciq;
				rowid.cells[5].innerHTML = toHHMMSS(ddata[i].lwt);
				rowid.cells[6].innerHTML = ddata[i].tco;
				rowid.cells[7].innerHTML = ddata[i].tac;
				rowid.cells[8].innerHTML = ddata[i].tcan;
				rowid.cells[9].innerHTML = ddata[i].tcuq;
				rowid.cells[10].innerHTML = ddata[i].tcua;
				rowid.cells[11].innerHTML = Math.round((ddata[i].tcun/(ddata[i].tcun+ddata[i].tco))*100) +"%";
				rowid.cells[12].innerHTML = toHHMMSS(ddata[i].asa);
				rowid.cells[13].innerHTML = toHHMMSS(ddata[i].act);
				rowid.cells[14].innerHTML = ddata[i].acc;
				rowid.cells[15].innerHTML = ddata[i].oaway;
				rowid.cells[16].innerHTML = ddata[i].oavail;
			}
		}
	});
		
});

function showDepartments(did,dname) {
	console.log("Show Dept: "+did+","+dname);
	var deptpage = NewWin("departments.html?did="+did, "Department Dashboard");
	var doc = deptpage.document;
	doc.getElementById("dashheader").innerHTML = "Department: "+dname;
}

function NewWin(htmlfile, name)		// open a new window
{
	WIDTH = 1200;
	HEIGHT = 512;
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
