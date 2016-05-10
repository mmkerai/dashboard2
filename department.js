var socket = new io.connect('', {
	'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionAttempts': 50
});
var did;
var DeptOperators = new Array();
var Operators = new Array();

$(document).ready(function() {
did = getURLParameter("did");

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
		$("#deptTable").hide();
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
		$("#deptTable").show();
	});
	
	socket.on('deptOperators', function(ddata){

		DeptOperators = ddata[did];	// get dept operators
	});
	
	socket.on('operatorStats', function(ddata){

		for(var i in ddata)
		{
			if(DeptOperators.indexOf(ddata[i].oid) != -1)		// only of this operator belongs to this dept
			{
				if(ddata[i].status == 0 && ddata[i].tcan == 0)	// if logged out and have not answered some chats today
					continue;
				else	
				{
					Operators.push(ddata[i]);
					showOperatorStats(ddata[i]);
				}
			}
		}
	});	
});

function showOperatorStats(data) {
	var rowid;
	var ttable = document.getElementById("deptTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createOperatorRow(ttable, data.oid, data.name);
	}
	showOperatorMetrics(rowid,data);
}

function createOperatorRow(tableid, id, name) {
	
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

/*function createDeptRow(tableid,index,sg,name) {

	var sgid = "SG"+sg.replace(/\s/g,"");		// prefix tbody element id with SG so doesnt clash with toplevelmetrics row
	var tb = document.getElementById(sgid);
	if(tb === null)
	{
		tb = tableid.appendChild(document.createElement('tbody'));
		tb.id = sgid;
	}
	row = tb.insertRow();
//	row = tableid.insertRow(index+1);
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	row.cells[0].outerHTML = "<td onClick=\"showOperators('"+name+"')\">"+name+"</td>";
	$("#"+sgid).hide();		// start of hiding it
	ShowDept[sg] = false;
			
	return row;
}*/

function exportMetrics() {
	console.log("Exporting operator metrics");
	tableToCsvFile("deptTable");
}