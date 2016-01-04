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

	socket.on('overallStats', function(data){
		$("#ocon").text(data.conc);
		$("#osla").text(data.sla);
		$("#ocph").text(data.cph);
		$("#ociq").text(data.ciq);
		$("#olwt").text(data.lwt);
		$("#ooff").text(data.tco);
		$("#otac").text(data.tac);
		$("#oacom").text(data.tca);
		$("#ouiq").text(data.tcuq);
		$("#ouas").text(data.tcua);
		$("#ocunavail").text(data.tcun);
		$("#oasa").text(data.asa);
		$("#oact").text(data.act);
		$("#oaccap").text(data.acc);
		$("#oaway").text(data.aaway);
		$("#oavail").text(data.aavail);
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
				col = row.insertCell(1).innerHTML = ddata[i].conc;
				col = row.insertCell(2).innerHTML = ddata[i].sla;
				col = row.insertCell(3).innerHTML = ddata[i].cph;
				col = row.insertCell(4).innerHTML = ddata[i].ciq;
				col = row.insertCell(5).innerHTML = ddata[i].lwt;
				col = row.insertCell(6).innerHTML = ddata[i].tco;
				col = row.insertCell(7).innerHTML = ddata[i].tac;
				col = row.insertCell(8).innerHTML = ddata[i].tca;
				col = row.insertCell(9).innerHTML = ddata[i].tcuq;
				col = row.insertCell(10).innerHTML = ddata[i].tcua;
				col = row.insertCell(11).innerHTML = ddata[i].tcun;
				col = row.insertCell(12).innerHTML = ddata[i].asa;
				col = row.insertCell(13).innerHTML = ddata[i].act;
				col = row.insertCell(14).innerHTML = ddata[i].acc;
				col = row.insertCell(15).innerHTML = ddata[i].aaway;
				col = row.insertCell(16).innerHTML = ddata[i].aavail;
			}
			else
			{
				rowid.cells[1].innerHTML = ddata[i].conc;
				rowid.cells[2].innerHTML = ddata[i].sla;
				rowid.cells[3].innerHTML = ddata[i].cph;
				rowid.cells[4].innerHTML = ddata[i].ciq;
				rowid.cells[5].innerHTML = ddata[i].lwt;
				rowid.cells[6].innerHTML = ddata[i].tco;
				rowid.cells[7].innerHTML = ddata[i].tac;
				rowid.cells[8].innerHTML = ddata[i].tca;
				rowid.cells[9].innerHTML = ddata[i].tcuq;
				rowid.cells[10].innerHTML = ddata[i].tcua;
				rowid.cells[11].innerHTML = ddata[i].tcun;
				rowid.cells[12].innerHTML = ddata[i].asa;
				rowid.cells[13].innerHTML = ddata[i].act;
				rowid.cells[14].innerHTML = ddata[i].acc;
				rowid.cells[15].innerHTML = ddata[i].aaway;
				rowid.cells[16].innerHTML = ddata[i].aavail;
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
