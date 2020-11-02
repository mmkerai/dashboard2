// utilities for use in dashboard

var ChatStatus = ["Logged Out","Away","Available"];
var csvfile = null;
var RTAVersion = "RTA Dashboard v2.3";

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
	$('#rtaversion').text(RTAVersion);
	$('#download').hide();
//	console.log("User cookie: "+name+" and pwd "+pwd);
	if(name == null || pwd == null)
	{
		$('#myname').text("Not signed in");
		$("#topTable").hide();
		$("#csatTable").hide();
		$("#signinform").show();
	}
	else
	{
		signin(name,pwd);
	}
}

function signin(uname, pwd) {
	var data = new Object();
	data = {name: uname,pwd: pwd};
//	console.log("Data object: "+data.name+" and "+data.pwd);
	socket.emit('authenticate', data);
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

function NewWin(htmlfile)		// open a new window
{
	WIDTH = 1280;
	HEIGHT = 768;
	var left = (screen.width/2)-(WIDTH/2);
	var top = (screen.height/2)-(HEIGHT/2)-64;
	var winpop = window.open(htmlfile, '_blank',
				'toolbar=yes,location=no,status=no,menubar=yes,scrollbars=yes,resizable=yes,width='+WIDTH+',height='+HEIGHT+',top='+top+',left='+left);
	winpop.focus();
	return winpop;
}

function showSkillGroup(skill,sname) {
	window.open("skillgroup.html?sgid="+sname, '_blank');
}

// print top level table with metrics
function showTopLevelStats(data) {
	var rowid;
	var ttable = document.getElementById("topTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createTopRow(ttable, data.did, data.name);
	}
	showTopMetrics(rowid,data);
}

function showSkillGroupStats(data) {
	var rowid;
	var ttable = document.getElementById("topTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createSkillRow(ttable, data.did, data.name);
	}
	showTopMetrics(rowid,data);
}

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

function showOperatorStats(data) {
	var rowid;
	var ttable = document.getElementById("deptTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		var id = data.oid || data.did;
		rowid = createOperatorRow(ttable, id, data.name);
	}
	showOperatorMetrics(rowid,data);
}

function showCsatStats(data) {
	var rowid;
	var ttable = document.getElementById("csatTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createCsatRow(ttable, data.oid, data.name);
	}
	showCsatMetrics(rowid,data);
}

function createTopRow(tableid, id, name) {

	row = tableid.insertRow();
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	if(row.rowIndex == 1)		// not the title but next one down
		row.cells[0].outerHTML = "<th>"+name+"</th>";
	else
		row.cells[0].outerHTML = "<th class='h3g_link' onClick=\"showSkillGroup('"+id+"','"+name+"')\">"+name+"</th>";

	return row;
}

// Update 14 Oct 2020 - no more csat menu
function createSkillRow(tableid, id, name) {

	row = tableid.insertRow();
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	if(row.rowIndex == 1)		// not the title but next one down
//		row.cells[0].outerHTML = "<th class='h3g_link' onClick=\"showSkillCsat('"+id+"','"+name+"')\">"+name+"</th>";
		row.cells[0].outerHTML = "<th>"+name+"</th>";
	else
		row.cells[0].outerHTML = "<th class='h3g_link' onClick=\"showSkillGroup('"+id+"','"+name+"')\">"+name+"</th>";

	return row;
}

// Update 14 Oct 2020 - no more csat menu
function createDeptRow(tableid, id, name) {
	row = tableid.insertRow();
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	if(row.rowIndex == 1)		// not the title but next one down
//		row.cells[0].outerHTML = "<th class='h3g_link' onClick=\"showCsat('"+id+"','"+name+"')\">"+name+"</th>";
		row.cells[0].outerHTML = "<th>"+name+"</th>";
	else
		row.cells[0].outerHTML = "<th class='h3g_link' onClick=\"showDepartment('"+id+"','"+name+"')\">"+name+"</th>";

	return row;
}

// Update 14 Oct 2020 - no more csat menu
function createOperatorRow(tableid, id, name) {

	row = tableid.insertRow();	// there is already a header row and top row
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	if(row.rowIndex == 1)		// not the title but next one download
//		row.cells[0].outerHTML = "<th class='h3g_link' onClick=\"showDeptCsat('"+id+"','"+name+"')\">"+name+"</th>";
		row.cells[0].outerHTML = "<th>"+name+"</th>";
	else
//		row.cells[0].outerHTML = "<th class='h3g_link' onClick=\"showCsat('"+id+"','"+name+"')\">"+name+"</th>";
		row.cells[0].outerHTML = "<th>"+name+"</th>";
return row;
}

function createCsatRow(tableid, id, name) {

	row = tableid.insertRow();	// there is already a header row and top row
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	row.cells[0].outerHTML = "<th>"+name+"</th>";
	return row;
}

function showTopMetrics(rowid, data) {
	var tcanpc = " (0%)";
	var tcunpc = " (0%)";

	if(data.tco != 0)
	{
		tcanpc = " ("+Math.round((data.tcan/data.tco)*100)+"%)";
		tcunpc = " ("+Math.round((data.tcun/(data.tcun+data.tco))*100) +"%)";
	}

	rowid.cells[1].outerHTML = NF.printConcurrency(data.cconc);
	rowid.cells[2].outerHTML = NF.printSL(data);
	rowid.cells[3].innerHTML = data.ciq;
	rowid.cells[4].innerHTML = toHHMMSS(data.lwt);
	rowid.cells[5].innerHTML = data.tco;
	rowid.cells[6].innerHTML = data.tac;
	rowid.cells[7].outerHTML = NF.printAnswered(data);
	rowid.cells[8].innerHTML = data.tcuq;
	rowid.cells[9].innerHTML = data.tcua;
	rowid.cells[10].innerHTML = data.tcun + tcunpc;
	rowid.cells[11].outerHTML = NF.printASA(data.asa);
	rowid.cells[12].outerHTML = NF.printACT(data.act);
	rowid.cells[13].innerHTML = data.acc;
	rowid.cells[14].innerHTML = data.oaway;
	rowid.cells[15].innerHTML = data.ocustomst;
	rowid.cells[16].innerHTML = data.oavail+data.oaway+data.ocustomst;	// total logged in
}

function showOperatorMetrics(rowid, data) {
//	var act = 0;
//	if(data.tcan > 0)
//		act = Math.round(data.tct/data.tcan);

	if(typeof(data.did) !== 'undefined')	// this is for a dept not operator
	{
		st = "N/A";
		tcs = "N/A";
		mcc = "N/A";
		ac = data.tac;
		apc = "N/A"
	}
	else
	{
		st = ChatStatus[data.status]+":"+data.cstatus;
		tcs = toHHMMSS(data.tcs);
		mcc = data.maxcc;
		ac = data.activeChats.length;
		apc = Math.round(data.apc) + '%';
	}

	rowid.cells[1].outerHTML = "<th class='h3g_link' onClick=\"updateCustomStatus('"+data.oid+"')\">"+st+"</th>";
	rowid.cells[2].innerHTML = tcs;
	rowid.cells[3].innerHTML = mcc;
	rowid.cells[4].innerHTML = ac;
	rowid.cells[5].innerHTML = data.acc;
	rowid.cells[6].innerHTML = data.tcan;
	rowid.cells[7].innerHTML = data.cph;
	rowid.cells[8].outerHTML = NF.printACT(data.act);
	rowid.cells[9].outerHTML = NF.printConcurrency(data.cconc);
	rowid.cells[10].innerHTML = apc;
}

function showCsatMetrics(rowid, data) {
	var tc = data.tcc || data.tcan-data.tac;	// tcc in operator object only not in dept or skillgroup object
	if(isNaN(tc)) tc=0;

	rowid.cells[1].innerHTML = tc;	// answered - active is closed chats
	rowid.cells[2].innerHTML = data.csat.surveys;
	rowid.cells[3].innerHTML = Math.round(data.csat.FCR*100) + "%";
	rowid.cells[4].innerHTML = Math.round(data.csat.Resolved*100) + "%";
	rowid.cells[5].innerHTML = Math.round(data.csat.OSAT*10) + "%";
	// NPS calc update Aug 2020
//	rowid.cells[6].innerHTML = Math.round(data.csat.NPS*10) + "%";
	rowid.cells[6].innerHTML = data.csat.NPS.toFixed(1);
}

/* build csvfile from table to export snapshot
 */
function tableToCsvFile(dashtable) {
	var key, keys, j, i, k;
	var str = "";

	$('#download').hide();
	$("#message1").text("Preparing file for export");
	var exportData = "Dashboard Metrics Export "+new Date().toUTCString()+"\r\n";
	exportData = exportData + "\r\n";
	var ttable = document.getElementById(dashtable);
	for(var x = 0; x < ttable.rows.length; x++)
	{
		row = ttable.rows[x];
		for (var j = 0, col; col = row.cells[j]; j++)
		{
			str = str +"\""+ col.innerHTML + "\",";
		}
		str = str + "\r\n";
	}
	exportData = exportData + str +"\r\n";
	prepareDownloadFile(exportData);
}

/* build csvfile to export snapshot
 * First param is an object and second is an array of same objects
 * e.g. Overall and Skillgroups or Skillgroup and Departments
 */
function buildCsvFile(fdata, sdata) {
	var key, keys, j, i, k;
	var str = "";

	$('#download').hide();
	$("#message1").text("Preparing file for export");
	var exportData = "Dashboard Metrics Export "+new Date().toUTCString()+"\r\n";
	// add csv header using keys in first object
	exportData = exportData + "\r\n";
//	key = Object.keys(fdata);
//	keys = fdata[key];
	for(key in fdata)
	{
		exportData = exportData +key+ ",";
	}
	exportData = exportData + "\r\n";
	// now add the data
	for(i in fdata)
	{
		str = str + fdata[i] + ",";
	}
	str = str + "\r\n";
	for(j in sdata)
	{
		var obj = new Object();
		obj = sdata[j];
		for(k in obj)
		{
			str = str + obj[k] + ",";
		}
	str = str + "\r\n";
	}

	exportData = exportData + str +"\r\n";
	prepareDownloadFile(exportData);
}

/*
 *	This function makes data (typically csv format) available for download
 *  using the DOM id "download" which should be labelled "download file"
 */
function prepareDownloadFile(data)
{
	var filedata = new Blob([data], {type: 'text/plain'});
	// If we are replacing a previously generated file we need to
	// manually revoke the object URL to avoid memory leaks.
	if (csvfile !== null)
	{
		window.URL.revokeObjectURL(csvfile);
	}

    csvfile = window.URL.createObjectURL(filedata);
	$("#message1").text("Snapshot exported "+ new Date().toUTCString());
	$('#download').attr("href",csvfile);
	$('#download').show(300);
}

function showLoginForm() {
str = '<div class="form-horizontal col-xs-9 col-xs-offset-3">' +
	'<form id="signinform">'+
		'<div class="form-group">'+
			'<label class="control-label col-xs-2">Username:</label>'+
			'<div class="col-xs-3">'+
				'<input class="form-control" id="username" type="text"></input>'+
			'</div>'+
		'</div>'+
		'<div class="form-group">'+
			'<label class="control-label col-xs-2">Password:</label>'+
			'<div class="col-xs-3">'+
				'<input class="form-control" id="password" type="password"></input>'+
			'</div>'+
			'<div class="col-xs-3">'+
				'<input class="btn btn-primary" type="submit" value="Sign In"></input>'+
			'</div>'+
		'</div>'+
	'</form>'+
'</div>';

document.write(str);
}

function showDashboardHeader() {
str = '<h2><center>Chat Dashboard</center></h2>'+
	'<div class="wrapper col-xs-12">'+
	'<button type="button" id="myname" class="btn btn-primary">Not signed in</button> '+
	'<button type="button" class="btn btn-warning" onClick="clearCredentials()">Clear Credentials</button> '+
	'<button type="button" class="btn btn-info" onClick="exportMetrics()">Export</button> '+
	'<span class="col-xs-offset-1" id="message1"></span> '+
	'<a class="btn btn-success" download="RTAexport.csv" id="download">Download file</a> '+
	'<span id="rtaversion" class="pull-right"></span> '+
	'</div> '+
'<div class="wrapper col-xs-12">'+
'<span>&nbsp;</span>'+
'</div>';

document.write(str);
}

function showDashboardFooter() {
var str = '<hr size="4" noshade/>'+
	'<div class="wrapper col-xs-12">'+
	'<span id="ctime" class="pull-right"></span> '+
	'</div> ';

document.write(str);
}

//Threshold print functions
// ACT
NF.printACT = function(value) {

	if (value == 0)			// 0 so default colour
		return '<td>' + toHHMMSS(value) + '</td>';

	if(value >= this.thresholds.ACT.red) {
		return '<td class="nf-red">' + toHHMMSS(value) + '</td>';
	}

	if(value >= this.thresholds.ACT.amber) {
		return '<td class="nf-amber">' + toHHMMSS(value) + '</td>';
	}

	return '<td class="nf-green">' + toHHMMSS(value) + '</td>';
};


// ASA
NF.printASA = function(value) {

	if (value == 0)			// 0 so default colour
		return '<td>' + toHHMMSS(value) + '</td>';

	if(value >= this.thresholds.ASA.red)
		return '<td class="nf-red">' + toHHMMSS(value) + '</td>';

	if(value >= this.thresholds.ASA.amber)
		return '<td class="nf-amber">' + toHHMMSS(value) + '</td>';

	return '<td class="nf-green">' + toHHMMSS(value) + '</td>';
};

// SL
NF.printSL = function(data) {
	var slapc = 0;

	if(data.tcan != 0)
	{
		slapc = Math.round((data.csla/data.tcan)*100);
		if(slapc > 100) slapc = 100;	// can be greater than 100 if chat transfered
	}

	if (slapc == 0)			// 0 so default colour
		return '<td>' + slapc + '%</td>';

	if(slapc >= this.thresholds.SL.green)
		return '<td class="nf-green">' + slapc + '%</td>';

	if(slapc >= this.thresholds.SL.amber)
		return '<td class="nf-amber">' + slapc + '%</td>';

	return '<td class="nf-red">' + slapc + '%</td>';
};

// Concurrency
NF.printConcurrency = function(value) {

	if (value == 0)			// 0 so default colour
		return '<td>' + value + '</td>';

	if (value > this.thresholds.concurrency.green)
		return '<td class="nf-green">' + value + '</td>';

	else if ( value <= this.thresholds.concurrency.green && value >= this.thresholds.concurrency.amber )
		return '<td class="nf-amber">' + value + '</td>';

	else
		return '<td class="nf-red">' + value + '</td>';
};

// Answered
NF.printAnswered = function(data) {
	var value = 0;

	if(data.tco != 0)
		value = Math.round((data.tcan/data.tco)*100);

	tcanpc = data.tcan+" ("+value+"%)";

	if(value == 0)			// 0 so default colour
		return '<td>' + tcanpc + '</td>';

	if(value >= this.thresholds.answered.green)
		return '<td class="nf-green">' + tcanpc + '</td>';

	if(value >= this.thresholds.answered.amber)
		return '<td class="nf-amber">' + tcanpc + '</td>';

	return '<td class="nf-red">' + tcanpc + '</td>';
};

// Unanswered
NF.printUnanswered = function(value) {

	if (value == 0)			// 0 so default colour
		return '<td>' + value + '</td>';

	if(value >= this.thresholds.unanswered.red)
		return '<td class="nf-red">' + value + '</td>';

	if(value >= this.thresholds.unanswered.amber)
		return '<td class="nf-amber">' + value + '</td>';

	else
		return '<td class="nf-green">' + value + '</td>';
};
