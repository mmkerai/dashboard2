// acronyms used
// tcaban - total chats abandoned
// tca - total chats answered
// tcu - total chats unanswered
// tac - total active chats
// cwait - no of chats waiting
// awt - average waiting time
// asa - average speed to answer
// act - average chat time
// amc - average message count
// taway - total number of agents away
// tavail - total number of agents available
// status - current status 0 - logged out, 1 - away, 2 - available
// cslots - chat slots
// tcs - time in current status
// achats - active chats


//********************************* Set up Express Server 
http = require('http');
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);
	users = {};
var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

//********************************* Get port used by Heroku
var PORT = Number(process.env.PORT || 3000);
server.listen(PORT);

//********************************* Get BoldChat API Credentials stored in Heroku environmental variables
var AID = process.env.AID || 0;
var APISETTINGSID = process.env.APISETTINGSID || 0;
var KEY = process.env.KEY || 0;
var PAGEPATH = process.env.PAGEPATH || "/"; //  Obsecur page path such as /bthCn2HYe0qPlcfZkp1t
var ACCESSPASSWORD = process.env.ACCESSPASSWORD|| "02210"; // Single password for all
var VALIDACCESSNETWORKS = JSON.parse(process.env.VALIDACCESSNETWORKS) || {};  // JSON string with valid public ISP addresses { "83.83.95.62": "Mark Troyer (LMI) Home Office", "10.10.10.1": "LogMeIn UK Office", "10.10": "H3G internal Network"};
if (AID == 0 || APISETTINGSID == 0 || KEY == 0) {
	console.log("AID = "+AID+", APISETTINGSID = "+APISETTINGSID+", KEY = "+KEY);
	console.log("BoldChat API Environmental Variables not set in HEROKU App.  Please verify..");
	process.exit(1);
}

//********************************* Callbacks for all URL requests
app.get(PAGEPATH, function(req, res){
	var ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.connection.remoteAddress;
	if (VALIDACCESSNETWORKS[ip])	{  // TODO:  Add in Access Control via White List
		console.log("IP Addrees: "+ip+" was on the white list.");
	} else {
		console.log("IP Address: "+ip+" was NOT on the white list.");
	}
	res.sendFile(__dirname + '/index.html');
});

app.get('/index.css', function(req, res){ 
	res.sendFile(__dirname + '/index.css');
});
app.get('/index.js', function(req, res){
	res.sendFile(__dirname + '/index.js');
});
app.get('/favicon.ico', function(req, res){
	res.sendFile(__dirname + '/favicon.ico');
});

//********************************* Global variables for chat data
var	Departments = new Object();	// array of dept ids and dept name objects
var	DepartmentsByName = new Object();	// array of dept names and ids
var	Folders = new Object();	// array of folder ids and folder name objects
var	Operators = new Object();	// array of operator ids and name objects
var	OperatorsByName = new Object();	// array of operator ids and name objects
var	ChatWindows = new Object();	// array of window ids and name objects
var	ChatButtons = new Object();	// array of button ids and name objects
var	Websites = new Object();	// array of website ids and name objects
var	Invitations = new Object();	// array of invitation ids and name objects
var	Teams = new Object();	// array of team names
var ApiDataNotReady = 0;	// Flag to show when data has been received from API so that data can be processed
var Nextloop;	
var Overall = new Object({tcaban: 0, 
							tca: 0,
							tcu: 0,
							tac: 0,
							cwait: 0,
							awt: 0,
							asa: 0,
							act: 0,
							amc: 0,
							taway: 0,
							tavail: 0}
						);		// top level stats

// Get all of the incoming Boldchat triggered data
app.post('/chat-start-answer-close', function(req, res){
//	logMessage = "Event: Chat Status Changed ("+req.body.ChatID+")";
	res.send({ "result": "success" });
	io.sockets.emit('errorResponse', req.body);
	console.log("Event: Chat Status Changed: " +req.body);
});

// Set up code for outbound BoldChat API calls.  All of the capture callback code should ideally be packaged as an object.
var fs = require('fs');
eval(fs.readFileSync('hmac-sha512.js')+'');
var https = require('https');

function BC_API_Request(api_method,params,callBackFunction) {
	var auth = AID + ':' + APISETTINGSID + ':' + (new Date()).getTime();
	var authHash = auth + ':' + CryptoJS.SHA512(auth + KEY).toString(CryptoJS.enc.Hex);
	var options = {
		host : 'api.boldchat.com', 
		port : 443, 
		path : '/aid/'+AID+'/data/rest/json/v1/'+api_method+'?auth='+authHash+'&'+params, 
		method : 'GET'
	};
	https.request(options, callBackFunction).end();
}

function debugLog(dataobj) {
	console.log("object");
	for(key in dataobj) {
		if(dataobj.hasOwnProperty(key))
			console.log(key +":"+dataobj[key]);
	}
}

function deptsCallback(dlist) {
	for(var i in dlist) 
	{
		DepartmentsByName[dlist[i].Name] = {name: dlist[i].DepartmentID};
		Departments[dlist[i].DepartmentID] = {name: dlist[i].Name, 
													tca: 0, 
													tcu: 0, 
													tac: 0,
													cwait: 0,
													await: 0,
													asa: 0,
													act: 0,
													amc: 0,
													aaway: 0,
													aavail: 0};
	}
	console.log("No of Depts: "+Object.keys(Departments).length);
}

function operatorsCallback(dlist) {
	for(var i in dlist) 
	{
		OperatorsByName[dlist[i].Name] = {name: dlist[i].LoginID};
		Operators[dlist[i].LoginID] = {name: dlist[i].Name,
											tca: 0,
											status: 0,
											tcs: 0,
											cslots: 0,
											active: new Array(),
											asa: 0,
											act: 0,
											amc: 0};																					
	}
	console.log("No of Operators: "+Object.keys(Operators).length);
}

function foldersCallback(dlist) {
	for(var i in dlist) 
	{
		if(dlist[i].FolderType == 5)		// select only chat folder types
		{
			Folders[dlist[i].FolderID] = dlist[i].Name;
//			console.log("folder id: "+dlist[i].FolderID + " name: "+dlist[i].Name);
		}
	}
	console.log("No of Chat Folders: "+Object.keys(Folders).length);
}

function getDepartmentNameFromID(id) {
	return(Departments[id].name);
}

function getFolderNameFromID(id) {
	return(Folders[id]);
}

function getOperatorNameFromID(id) {
	return(Operators[id].name);
}

// cleans text field of tags and newlines using regex
function cleanText(mytext) {
	var clean = mytext.replace(/<\/?[^>]+(>|$)/g, "");	// take out html tags
	var clean2 = clean.replace(/(\r\n|\n|\r)/g,"");	// take out new lines
	return(clean2);
}

getApiData('getDepartments', 0, deptsCallback);
getApiData("getOperators", 0, operatorsCallback);
getApiData("getFolders", 0, foldersCallback);

// process chat objects and update all relevat dept, operator and global metrics
function processInactiveChats(chats) {
	// analyse each chat and keep track of global metrics
	for(var i in chats)
	{
		if(chats[i].ChatStatusType == 1)		// abandoned chat (in prechat form )
		{
			Overall.tcaban++;	// abandoned
			continue;
		}
		//department stats
		if(chats[i].DepartmentID === null) continue;		// should never be null at this stage but I have seen it
		deptobj = Departments[chats[i].DepartmentID];
		if(chats[i].Answered === null)		// answered not set
		{
			Overall.tcu++;
			deptobj.tcu++;
			continue;
		}
		// chat answered
		Overall.tca++;
		deptobj.tca++;
		// asa and act and amc calculations
		var starttime = new Date(chats[i].Started);
		var anstime = new Date(chats[i].Answered);
		var endtime = new Date(chats[i].Ended);
		var messagecount = chats[i].OperatorMessageCount + chats[i].VisitorMessageCount
		var asa = (anstime - starttime)/1000;
		var act = (endtime - anstime)/1000;		// in seconds
		Overall.asa = ((Overall.asa * (Overall.tca - 1)) + asa)/Overall.tca;
		Overall.act = ((Overall.act * (Overall.tca - 1)) + act)/Overall.tca;
		Overall.amc = ((Overall.amc * (Overall.tca - 1)) + messagecount)/Overall.tca;
		deptobj.asa = ((deptobj.asa * (deptobj.tca - 1)) + asa)/deptobj.tca;
		deptobj.act = ((deptobj.act * (deptobj.tca - 1)) + act)/deptobj.tca;
		deptobj.amc = ((deptobj.amc * (deptobj.tca - 1)) + messagecount)/deptobj.tca;
		
		//operator stats
		if(chats[i].OperatorID === null) continue;		// operator id not set for some strange reason
		opobj = Operators[chats[i].OperatorID];
		opobj.tca++;	// chats answered
		opobj.asa = ((opobj.asa * (opobj.tca - 1)) + asa)/opobj.tca;
		opobj.act = ((opobj.act * (opobj.tca - 1)) + act)/opobj.tca;
		opobj.amc = ((opobj.amc * (opobj.tca - 1)) + messagecount)/opobj.tca;
	}
}

// process active chat objects and update all relevat dept, operator and global metrics
function processActiveChats(achats) {
	var deptobj, opobj;
	var atime, chattime;
	var timenow = new Date();
	var opact = [];
	Overall.tac = Overall.tac + achats.length;	// no of objects = number of active chats
	for(var i in achats) 
	{
		atime = new Date(achats[i].Answered);
		chattime = (timenow - atime )/1000;
		if(achats[i].DepartmentID === null) continue;	// not sure why this would ever be the case
		deptobj = Departments[achats[i].DepartmentID];
		deptobj.tac++;	// chats active
		if(achats[i].OperatorID === null) continue;		// not sure why this would ever be the case but it is
		opobj = Operators[achats[i].OperatorID];
//		console.log("opobj is "+achats[i].OperatorID);
		opact = opobj.active;
		opact.push({chatid: achats[i].ChatID, 
							deptname: getDepartmentNameFromID(achats[i].DepartmentID),
							ctime: chattime,
							messages: achats[i].OperatorMessageCount + achats[i].VisitorMessageCount
							});
	}
}

function updateChatStats() {
	io.sockets.emit('chatcountResponse', "Total no. of chats: "+Overall.tca + Overall.tcu + Overall.tcaban);
//	console.log("Chats so far:"+Overall.tca+" DNR:"+ApiDataNotReady);
	if(ApiDataNotReady)
	{
		setTimeout(updateChatStats, 1000);	// poll every second until all ajaxs are complete
		return;
	}

	// we got all data so return it back to the client
	io.sockets.emit('overallStats', Overall);
	io.sockets.emit('departmentStats', Departments);
//	debugLog(Overall);
}

// this function calls API again if data is truncated
function loadNext(method, next, callback) {
	var str = [];
	for(var key in next) {
		if (next.hasOwnProperty(key)) {
			str.push(encodeURIComponent(key) + "=" + encodeURIComponent(next[key]));
		}
	}
	Nextloop++;
	getApiData(method, str.join("&"), callback);
}

// calls extraction API and receives JSON objects 
function getApiData(method, params, fcallback) {
	ApiDataNotReady++;		// flag to track api calls
	BC_API_Request(method, params, function (response) {
		var str = '';
		//another chunk of data has been received, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});
		//the whole response has been received, take final action.
		response.on('end', function () {
			ApiDataNotReady--;
			var jsonObj = JSON.parse(str);
//			console.log("Response received: "+str);
			var data = new Array();
			var next = jsonObj.Next;
			data = jsonObj.Data;
			if(data === 'undefined' || data == null)
			{
				console.log("No data returned: "+str);
				return;		// exit out if error json message received
			}
			fcallback(data);

			if(typeof next !== 'undefined') 
			{
				console.log("Next loop "+Nextloop);
				if(Nextloop < 100)	// safety so that it does not go into infinite loop
					loadNext(method, next, fcallback);
			}
		});
		// in case there is a html error
		response.on('error', function(err) {
		// handle errors with the request itself
		console.error("Error with the request: ", err.message);
		ApiDataNotReady--;
		});
	});
}

// Set up callbacks
io.sockets.on('connection', function(socket){

	//  Call BoldChat getDepartments method and update all users with returned data
	socket.on('startDashboard', function(data){
		if(ApiDataNotReady)
		{
			io.sockets.emit('errorResponse', "Static data not ready");
			return;
		}

		// set date to start of today
		var startDate = new Date();
		startDate.setHours(0,0,0,0);

		console.log("Getting all chat info from "+ Object.keys(Folders).length +" folders");
		Nextloop = 0;
		var parameters;
		for(var fid in Folders)
		{
			parameters = "FolderID="+fid+"&FromDate="+startDate.toISOString();
			getApiData("getInactiveChats", parameters, processInactiveChats);
		}
		
		for(var did in Departments)
		{
			parameters = "DepartmentID="+did;
			getApiData("getActiveChats",parameters,processActiveChats);
		}
		updateChatStats();	// colate of API responses and process
	});
});

