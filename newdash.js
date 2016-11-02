var socket = io('', {
	'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionAttempts': 50
});

$(document).ready(function() {

	checksignedin();

	$('#signinform').submit(function(event) {
		event.preventDefault();
		var name = $('#username').val();
		var pwd = $('#password').val();
		signin(name,pwd);
	});
	socket.on('connection', function(data){
		console.log("socket connected at "+ new Date().toGMTString());
	});
	socket.on('error', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
	socket.on('disconnect', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
	socket.on('connect_timeout', function(data){
		console.log("socket timeout at "+ new Date().toGMTString());
	});
	socket.on('connect_error', function(data){
		console.log("socket connect error at "+ new Date().toGMTString());
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
		$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
		newshowTopLevelStats(data);
	});
	socket.on('skillGroupStats', function(ddata) {
		for(var i in ddata)
		{
			newshowTopLevelStats(ddata[i]);
		}
	});
});

$(window).on('beforeunload',function () {
	socket.close();
});

function newshowTopLevelStats(data) {
	var rowid;
	var ttable = document.getElementById("topTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createTopRow(ttable, data.did, data.name);
	}
	newshowTopMetrics(rowid,data);
}

function newshowTopMetrics(rowid, data) {
	var tcanpc = " (0%)";
	var tcunpc = " (0%)";

	if(data.tco != 0)
	{
		tcanpc = " ("+Math.round((data.ntcan/data.tco)*100)+"%)";
		tcunpc = " ("+Math.round((data.ntcun/(data.ntcun+data.tco))*100) +"%)";
	}

	rowid.cells[1].outerHTML = NF.printConcurrency(data.cconc);
	rowid.cells[2].outerHTML = NF.printSL(data);
	rowid.cells[3].innerHTML = data.ciq;
	rowid.cells[4].innerHTML = toHHMMSS(data.lwt);
	rowid.cells[5].innerHTML = data.ntco;
	rowid.cells[6].innerHTML = data.tac;
	rowid.cells[7].innerHTML = data.ntcan;
	rowid.cells[8].innerHTML = data.ntcuq;
	rowid.cells[9].innerHTML = data.ntcua;
	rowid.cells[10].innerHTML = data.ntcun + tcunpc;
	rowid.cells[11].outerHTML = NF.printASA(data.asa);
	rowid.cells[12].outerHTML = NF.printACT(data.act);
	rowid.cells[13].innerHTML = data.acc;
	rowid.cells[14].innerHTML = data.oaway;
	rowid.cells[15].innerHTML = data.oavail+data.oaway;	// total logged in
}

function exportMetrics() {
	console.log("Exporting top-level metrics");
	tableToCsvFile("topTable");
}
