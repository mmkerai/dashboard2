// H3G utilities for use in dashboard and custom reports

var ChatStatus = ["Logged Out","Away","Available"];
var csvfile = null;

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
	$('#download').hide();	
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
	$("#message1").text("Snapshot export "+ new Date().toUTCString());
	$('#download').attr("href",csvfile);
	$('#download').show(300);
}
