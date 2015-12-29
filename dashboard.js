var socket = io.connect();
var auth2;
var Gid_token;
var profile;

function onSignIn(googleUser) {
// Useful data for your client-side scripts:
	profile = googleUser.getBasicProfile();
//	console.log("ID: " + profile.getId()); // Don't send this directly to your server!
//	console.log("Name: " + profile.getName());
//	console.log("Image URL: " + profile.getImageUrl());
	console.log("Email: " + profile.getEmail());

	// The ID token you need to pass to your backend:
	Gid_token = googleUser.getAuthResponse().id_token;
	socket.emit('authenticate', {token: Gid_token, email: profile.getEmail()});
}

$(document).ready(function() {

  	$("#g-signout").hide();

	socket.on('authResponse', function(data){
		$("#g-signout").show();
		$("#gname").text(profile.getName());
		$("#gprofile-image").attr({src: profile.getImageUrl()});
		$("#error").text("");
	});

	socket.on('errorResponse', function(data){
		$("#error").text(data);
	});
	
	socket.on('statusResponse', function(data){
		$("#status").text(data);
	});
	socket.on('overallStats', function(data){
		$("#otca").text(data.tca);
		$("#otcu").text(data.tcu);
		$("#otcaban").text(data.tcaban);
		$("#otac").text(data.tac);
		$("#ocwait").text(data.cwait);
		$("#oasa").text(Math.round(data.asa));
		$("#oact").text(Math.round(data.act));
		$("#oamc").text(Math.round(data.amc));
		$("#oaway").text(data.oaway);
		$("#oavail").text(data.oavail);
	});
	socket.on('departmentStats', function(ddata){
		var ttable = document.getElementById("topTable");
//		for(cnt = 0; cnt < Object.keys(ddata).length; cnt++)
		var row, col, rowid;
		for(var i in ddata)
		{
			rowid = document.getElementById(ddata[i].name);
			if(rowid === null)		// row doesnt exist so create one
			{
				row = ttable.insertRow();	// there is already a header row and top row
				col = row.insertCell(0);
				row.id = ddata[i].name;
				col.outerHTML = "<th scope='row'>Dept "+ddata[i].name+"</th>";
				col = row.insertCell(1).innerHTML = ddata[i].tca;
				col = row.insertCell(2).innerHTML = ddata[i].tcu;
				col = row.insertCell(3).innerHTML = "n/a";
				col = row.insertCell(4).innerHTML = ddata[i].tac;
				col = row.insertCell(5).innerHTML = ddata[i].cwait;
				col = row.insertCell(6).innerHTML = ddata[i].asa;
				col = row.insertCell(7).innerHTML = ddata[i].act;
				col = row.insertCell(8).innerHTML = ddata[i].amc;
				col = row.insertCell(9).innerHTML = ddata[i].oaway;
				col = row.insertCell(10).innerHTML = ddata[i].oavail;
			}
			else
			{
				rowid.cells[1].innerHTML = ddata[i].tca;
				rowid.cells[2].innerHTML = ddata[i].tcu;
				rowid.cells[3].innerHTML = "n/a";
				rowid.cells[4].innerHTML = ddata[i].tac;
				rowid.cells[5].innerHTML = ddata[i].cwait;
				rowid.cells[6].innerHTML = ddata[i].asa;
				rowid.cells[7].innerHTML = ddata[i].act;
				rowid.cells[8].innerHTML = ddata[i].amc;
				rowid.cells[9].innerHTML = ddata[i].oaway;
				rowid.cells[10].innerHTML = ddata[i].oavail;
			}
		}
	});
		
});

function signOut() {
	auth2 = gapi.auth2.getAuthInstance();
	if(auth2 === 'undefined')
		console.log("auth2 is undefined");
	
	auth2.signOut().then(function () {
		console.log('User signed out.');
		$("#g-signout").hide();

	if(Gid_token !== 'undefined')
		socket.emit('un-authenticate', {token: Gid_token, email: profile.getEmail()});
	});
}
