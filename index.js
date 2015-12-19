var fromDate;
var toDate;

function initialiseValues() {
	$('#error').text("");
	$('#chatcount').text("");
}

$(document).ready(function() {
	var socket = io.connect();
	var csvfile = null;

	$('#api').submit(function(event) {
		event.preventDefault();
		initialiseValues();
		socket.emit('startDashboard', {});
	});
	
	socket.on('errorResponse', function(data){
		$("#error").text(data);
	});
	socket.on('chatcountResponse', function(data){
		console.log("Data received");
		$("#chatcount").text(data);
	});
	socket.on('overallStats', function(data){
		$("#otca").text(data.tca);
		$("#otcu").text(data.tcu);
		$("#otcaban").text(data.tcaban);
		$("#otac").text(data.tac);
		$("#ocwait").text(data.cwait);
		$("#oasa").text(data.asa);
		$("#oact").text(data.act);
		$("#oamc").text(data.amc);
		$("#oaway").text(data.taway);
		$("#oavail").text(data.tavail);
	});
	socket.on('departmentStats', function(ddata){
		var ttable = document.getElementById("topTable");
//		for(cnt = 0; cnt < Object.keys(ddata).length; cnt++)
		for(var i in ddata)
		{
			var row = ttable.insertRow(i+2);	// there is already a header row and top row
			var col = row.insertCell(0);
			col.outerHTML = "<th scope='row'>Dept "+ddata[i].name+"</th>";
			col = row.insertCell(1);
			col.innerHTML = ddata[i].tca;
			col = row.insertCell(2);
			col.innerHTML = ddata[i].tcu;
			col = row.insertCell(3);
			col.innerHTML = "n/a";
			col = row.insertCell(4);
			col.innerHTML = ddata[i].tac;
		}
	});
		
});

