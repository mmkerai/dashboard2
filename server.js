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
var	DepartmentsById = new Object();	// array of dept ids and dept name objects
var	DepartmentsByName = new Object();	// array of dept names and ids
var	Folders = new Object();	// array of folder ids and folder name objects
var	OperatorsById = new Object();	// array of operator ids and name objects
var	OperatorsByName = new Object();	// array of operator ids and name objects
var	ChatWindows = new Object();	// array of window ids and name objects
var	ChatButtons = new Object();	// array of button ids and name objects
var	Websites = new Object();	// array of website ids and name objects
var	Invitations = new Object();	// array of invitation ids and name objects
var	Teams = new Object();	// array of team names
var StaticDataNotReady;	// Flag to show when all static data has been downloaded so that chat data download can begin
var ChatDataNotReady;	// Flag to show when all chat data has been downloaded so that csv file conversion can begin
var Allchatsjson;	// chat message objects
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

function deptsCallback(dlist) {
	for(var i in dlist) 
	{
		DepartmentsByName[dlist[i].Name] = {name: dlist[i].DepartmentID};
		DepartmentsById[dlist[i].DepartmentID] = {name: dlist[i].Name, 
													tca: 0, 
													tac: 0,
													cwait: 0,
													await: 0,
													asa: 0,
													act: 0,
													amc: 0,
													aaway: 0,
													aavail: 0};
	}
	console.log("No of Depts: "+Object.keys(DepartmentsByName).length);
}

function operatorsCallback(dlist) {
	for(var i in dlist) 
	{
		OperatorsByName[dlist[i].Name] = {name: dlist[i].LoginID};
		OperatorsById[dlist[i].LoginID] = {name: dlist[i].Name,
											status: 0,
											tcs: 0,
											cslots: 0,
											active: new Object(),
											asa: 0,
											act: 0,
											amc: 0};																					
	}
	console.log("No of Operators: "+Object.keys(OperatorsByName).length);
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
	return(DepartmentsById[id].name);
}

function getFolderNameFromID(id) {
	return(Folders[id]);
}

function getOperatorNameFromID(id) {
	return(OperatorsById[id].name);
}

// cleans text field of tags and newlines using regex
function cleanText(mytext) {
	var clean = mytext.replace(/<\/?[^>]+(>|$)/g, "");	// take out html tags
	var clean2 = clean.replace(/(\r\n|\n|\r)/g,"");	// take out new lines
	return(clean2);
}

getUnpagedData('getDepartments', 0, deptsCallback);
getUnpagedData("getOperators", 0, operatorsCallback);
getUnpagedData("getFolders", 0, foldersCallback);

// calls extraction API and receives JSON objects unpaged (i.e. without the "next" field)
function getUnpagedData(method, params, fcallback) {
	
	StaticDataNotReady++;		// flag to show we are waiting for data as all calls are asynchronous
	BC_API_Request(method, params, function (response) {
		var str = '';
		//another chunk of data has been received, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});
		//the whole response has been received, take final action.
		response.on('end', function () {
			StaticDataNotReady--;
			var jsonObj = JSON.parse(str);
//			console.log("Response received: "+str);
			var data = new Array();
			data = jsonObj.Data;
			if(data == null)
			{
				console.log("API Error: "+JSON.stringify(json));
				return;		// exit out if error json message received
			}
			fcallback(data);
		});
		// in case there is a html error
		response.on('error', function(err) {
        // handle errors with the request itself
        console.error("Error with the request: ", err.message);
		StaticDataNotReady--;
		});
	});
}

// process chat object and update all relevat dept, operator and global metrics
function processInactiveChat(chatobject) {
	if(chatobject.ChatStatusType == 1)		// abandoned chat (in prechat form )
	{
		Overall.tcaban++;	// abandoned
		return;
	}
	//department first
	deptobj = DepartmentsById[chatobject.DepartmentID];
	if(chatobject.Answered === null)		// answered not set
	{
		Overall.tcu++;
		deptobj.tcu++;
		return;
	}
	// chat answered
	Overall.tca++;
	deptobj.tca++;	// chats answered
	// now operator
	opobj = OperatorsById[chatobject.OperatorID];
	messagecount = chatobject.OperatorMessageCount + chatobject.VisitorMessageCount
	opobj.amc = ((opobj.amc * opobj.tca) + messagecount)/(opobj.tca+1);
	Overall.amc = messagecount;			// TODO - calculate correct metric
	opobj.tca++;	// chats answered
	startdate = new Date(chatobject.Started);
	ansdate = new Date(chatobject.Answered);
	enddate = new Date(chatobject.Ended);
	chattime = enddate - ansdate/1000;		// in seconds
	opobj.act = chattime;		// TODO - calculate the average
	
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
		deptobj = DepartmentsById[achats[i].DepartmentID];
		deptobj.tac++;	// chats active
		opobj = OperatorsById[achats[i].OperatorID];
		if(opobj === 'undefined') continue;		// not sure why this would every be the case
		vat opactobj = opobj.active;
/*		opact.push({chatid: achats[i].ChatID, 
							deptname: getDepartmentNameFromID(achats[i].DepartmentID),
							ctime: chattime,
							messages: achats[i].OperatorMessageCount + achats[i].VisitorMessageCount
							});*/
	}
	io.sockets.emit('overallStats', Overall);
	io.sockets.emit('departmentStats', DepartmentsById);
}

function getAllInactiveChats() {
	io.sockets.emit('chatcountResponse', "Total no. of chats: "+Allchatsjson.length);
	if(ChatDataNotReady)
	{
		setTimeout(getAllInactiveChats, 1000);	// poll every second until all ajaxs are complete
		return;
	}

	// analyse each chat and keep track of global metrics
	for(var i=0; i < Allchatsjson.length; i++)
	{
		processInactiveChat(Allchatsjson[i]);	
	}

	// we got all data in csv text file so return it back to the client
	io.sockets.emit('overallStats', Overall);

}

// this function calls API again if data is truncated
function loadNext(next) {
	var str = [];
	for(var key in next) {
		if (next.hasOwnProperty(key)) {
			str.push(encodeURIComponent(key) + "=" + encodeURIComponent(next[key]));
		}
	}
	Nextloop++;
	getInactiveChats(str.join("&"));
}

// calls extraction API and receives paged JSON objects (i.e. with the "next" field)
function getInactiveChats(params) {
	ChatDataNotReady++;		// flag to track api calls
	BC_API_Request("getInactiveChats", params, function (response) {
		var str = '';
		//another chunk of data has been received, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});
		//the whole response has been received, take final action.
		response.on('end', function () {
			ChatDataNotReady--;
			var jsonObj = JSON.parse(str);
	//			console.log("Response received: "+str);
			var chatsdata = new Array();
			var next = jsonObj.Next;
			chatsdata = jsonObj.Data;
			if(chatsdata === 'undefined' || chatsdata == null)
			{
				console.log("No data returned: "+str);
				return;		// exit out if error json message received
			}
			for(var i in chatsdata) 
			{
				Allchatsjson.push(chatsdata[i]);
			}

			if(typeof next !== 'undefined') 
			{
//				console.log("Next loop "+Nextloop);
				if(Nextloop < 100)	// safety so that it does not go into infinite loop
					loadNext(next);
			}
		});
		// in case there is a html error
		response.on('error', function(err) {
		// handle errors with the request itself
		console.error("Error with the request: ", err.message);
		ChatDataNotReady--;
		});
	});
}

// Set up callbacks
io.sockets.on('connection', function(socket){

	// Test call to see if another user by same name exists.
	socket.on('new user', function(data, callback){
		if (data in users){
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});

	//  Call BoldChat getDepartments method and update all users with returned data
	socket.on('startDashboard', function(data){
		if(StaticDataNotReady)
		{
			io.sockets.emit('errorResponse', "Static data not ready");
			return;
		}

		// set date to start of today
		var startDate = new Date();
		startDate.setHours(0,0,0,0);

		io.sockets.emit('chatcountResponse', "Getting all chat info from "+ Object.keys(Folders).length +" folders");
		Allchatsjson = new Array();
		Nextloop = 0;
		var parameters;
		for(var fid in Folders)
		{
			parameters = "FolderID="+fid+"&FromDate="+startDate.toISOString();
			getInactiveChats(parameters);
		}
		getAllInactiveChats();	// colate of API responses and process
		
		for(var did in DepartmentsById)
		{
			parameters = "DepartmentID="+did;
			getUnpagedData("getActiveChats",parameters,processActiveChats);
		}

	});
});

