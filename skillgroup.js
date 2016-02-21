var socket = io.connect();
var did;

function readCookie(name)
{
  name += '=';
  var parts = document.cookie.split(/;\s*/);
  for (var i = 0; i < parts.length; i++)
  {
    var part = parts[i];
    if (part.indexOf(name) == 0)
      return part.substring(name.length);
  }
  return null;
}

/*
 * Saves a cookie for delay time. If delay is blank then no expiry.
 * If delay is less than 100 then assumes it is days
 * otherwise assume it is in seconds
 */
function saveCookie(name, value, delay)
{
  var date, expires;
  if(delay)
  {
	  if(delay < 100)	// in days
		  delay = delay*24*60*60*1000;	// convert days to milliseconds
	  else
		  delay = delay*1000;	// seconds to milliseconds
	  
	  date = new Date();
	  date.setTime(date.getTime()+delay);	// delay must be in seconds
	  expires = "; expires=" + date.toGMTString();		// convert unix date to string
  }
  else
	  expires = "";
  
  document.cookie = name+"="+value+expires+"; path=/";
}

/*
 * Delete cookie by setting expiry to 1st Jan 1970
 */
function delCookie(name) 
{
	document.cookie = name + "=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/";
}

function clearCredentials() {
	$('#error').text("");
	delCookie("username");
	delCookie("password");
	window.location.reload();
}

function checksignedin()
{
	var name = readCookie("username");
	var pwd = readCookie("password");
//	console.log("User cookie: "+name+" and pwd "+pwd);
	if(name == null || pwd == null)
	{
		$('#myname').text("Not signed in");
		$("#topTable").hide();
		$("#signinform").show();
	}
	else
	{
		signin(name,pwd);	
	}	
}

function signin(uname, pwd)
{
	var data = new Object();
	data = {name: uname,pwd: pwd};
//	console.log("Data object: "+data.name+" and "+data.pwd);
	socket.emit('authenticate', data);
}

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
		
		
	socket.on('departmentStats', function(ddata){
		var ttable = document.getElementById("topTable");
		var row, col, rowid;
		if(did !== null)
		{
			for(var i in ddata)
			{
				if(ddata[i].skillgroup != did) continue;	// ignore dept if not in this skill group
				var tcanpc = "0%";
				var tcunpc = "0%";
				if(ddata[i].tco != 0)
				{
					tcanpc = " ("+Math.round((ddata[i].tcan/ddata[i].tco)*100)+"%)";
					tcunpc = Math.round((ddata[i].tcun/(ddata[i].tcun+ddata[i].tco))*100) +"%";
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
					col = row.insertCell(10).innerHTML = Math.round((ddata[i].tcun/(ddata[i].tcun+ddata[i].tco))*100) +"%";
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
					rowid.cells[10].innerHTML = tcunpc;
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

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}
