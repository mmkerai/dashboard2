var did;
var DeptOperators = new Array();
var Operators = new Array();

$(document).ready(function() {
did = getURLParameter("did");
oid = getURLParameter("oid");

	$("#g-signout").hide();
	$("#csatTable").hide();
	$("#export").hide();
	$('#download').hide();

	socket.on('connection', function(data){
		console.log("Socket connected");
    });
	socket.on('connect_timeout', function(data){
		console.log("socket timeout at "+ new Date().toGMTString());
	});
	socket.on('error', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
	socket.on('disconnect', function(data){
		console.log("socket error at "+ new Date().toGMTString());
	});
 	socket.on('errorResponse', function(data){
		$("#message1").text(data);
	});
	socket.on('deptOperators', function(data){
		DeptOperators = data[did];	// get dept operators
	});
	if(sgid != null)
	{
		socket.on('skillGroupStats', function(data){
			$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
			for(var i in data)
			{
				if(sgid == data[i].skillgroup)		// only if this is the skillgroup
				{
					showCsatStats(data[i]);
				}
			}
		});	
	}
	else if(did != null)
	{
		socket.on('departmentStats', function(data){
			$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
			for(var i in data)
			{
				if(did == data[i].did)		// only if this is the department
				{
					showCsatStats(data[i]);
				}
			}
		});	
	}
	else
	{
		socket.on('operatorStats', function(data){
			$("#ctime").text("Last refreshed: "+new Date().toLocaleString());
			for(var i in data)
			{
				if(oid == data[i].oid)		// only if this operator belongs to this dept
				{
					showCsatStats(data[i]);
				}
			}
		});
	}
	socket.on('authResponse', function(data){
		var profile = googleUser.getBasicProfile();
		$("#g-signout").show();
		$("#csatTable").show();
		$("#export").show();
		$('#download').hide();
		$("#gname").text(profile.getName());
		$("#gprofile-image").attr({src: profile.getImageUrl()});
		$("#error").text("");
		console.log("User successfully signed in");
	});
});

function exportMetrics() {
	console.log("Exporting operator metrics");
	tableToCsvFile("deptTable");
}