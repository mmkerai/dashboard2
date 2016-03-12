var socket = io.connect();
var did;
var DeptOperators = new Array();

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
					showOpStats(ddata[i]);
			}
		}
	});
	
});

function showOpStats(data) {
	var rowid;
	var ttable = document.getElementById("deptTable");
	rowid = document.getElementById(data.name);
	if(rowid === null)		// row doesnt exist so create one
	{
		rowid = createRow(ttable, data.oid, data.name);
	}
	showMetrics(rowid,data);
}

function showMetrics(rowid, data) {

	var act;
	if(data.tct > 0)
		act = Math.round(data.tct/data.tcan);
	
	rowid.cells[1].innerHTML = ChatStatus[data.status];
	rowid.cells[2].innerHTML = toHHMMSS(data.tcs);
	rowid.cells[3].innerHTML = data.ccap;
	rowid.cells[4].innerHTML = data.activeChats.length;
	rowid.cells[5].innerHTML = data.ccap - data.activeChats.length;
	rowid.cells[6].innerHTML = data.tcan;
	rowid.cells[7].innerHTML = data.cph;
	rowid.cells[8].innerHTML = toHHMMSS(act);
	rowid.cells[9].innerHTML = data.cconc;

}

function createRow(tableid, id, name) {
	
	row = tableid.insertRow();	// there is already a header row and top row
	row.id = name;
	var cols = tableid.rows[0].cells.length;
	for(var i=0; i < cols; i++)
	{
		row.insertCell(i);
	}
	row.cells[0].outerHTML = "<th onClick=\"showDepartments('"+name+"')\">"+name+"</th>";
	return row;
}

function createDeptRow(tableid,index,sg,name) {

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
}

