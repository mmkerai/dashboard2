// acronyms used
// conc - concurrency
// cph - chats per hour
// ciq - chats in queue
// lwt - longest waiting time
// tco - chats offered (chats answered plus chats unanswered)
// tcan - total chats answered
// tcuq - total chats unanswered/abandoned in queue
// tcua - total chats unanswered/abandoned after assigned
// tcun - total chats unavailable
// tac - total active chats
// asa - average speed to answer
// act - average chat time
// acc - available chat capacity
// aaway - total number of agents away
// aavail - total number of agents available
// status - current status 0 - logged out, 1 - away, 2 - available
// tcs - time in current status


//********************************* Set up Express Server 
http = require('http');
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);
var bodyParser = require('body-parser');
//var cookieParser = require('cookie-parser');
//var session = require("express-session");
//app.use(cookieParser());
//app.use(session({resave: true, saveUninitialized: true, secret: 'LMIDashboardCodebyMMK', cookie: { maxAge: 600000 }}));
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
var GMAILS = process.env.GMAILS; // list of valid emails
var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var VALIDACCESSNETWORKS = JSON.parse(process.env.VALIDACCESSNETWORKS) || {};  // JSON string with valid public ISP addresses { "83.83.95.62": "Mark Troyer (LMI) Home Office", "10.10.10.1": "LogMeIn UK Office", "10.10": "H3G internal Network"};
if (AID == 0 || APISETTINGSID == 0 || KEY == 0) {
	console.log("AID = "+AID+", APISETTINGSID = "+APISETTINGSID+", KEY = "+KEY);
	console.log("BoldChat API Environmental Variables not set in HEROKU App.  Please verify..");
	process.exit(1);
}

//********************************* Callbacks for all URL requests
app.get(PAGEPATH, function(req, res){
	var ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.connection.remoteAddress;
	if (VALIDACCESSNETWORKS[ip])  // TODO:  Add in Access Control via White List
	{
		console.log("IP Addrees: "+ip+" was on the white list.");
	}
	else 
	{
		console.log("IP Address: "+ip+" was NOT on the white list.");
	}
	
	debugLog("Cookies",req.cookies);
	debugLog("Session",req.session);
	res.sendFile(__dirname + '/dashboard.html');
});

app.get('/agents.html', function(req, res){
	res.sendFile(__dirname + '/agents.html');
});
app.get('/index.css', function(req, res){ 
	res.sendFile(__dirname + '/index.css');
});
app.get('/dashboard.js', function(req, res){
	res.sendFile(__dirname + '/dashboard.js');
});
app.get('/favicon.ico', function(req, res){
	res.sendFile(__dirname + '/favicon.ico');
});

//********************************* Global class for chat data
var ChatData = function(chatid, dept, started) {
		this.chatID = chatid;
		this.dept = dept;
		this.started = started;
		this.answered = 0;
		this.ended = 0;
		this.closed = 0;
		this.operator = 0;		
};
	
//********************************* Global variables for chat data
var LoggedInUsers = new Array();
var AllLiveChats = new Object();
var	Departments = new Object();	// array of dept ids and dept name objects
var	DepartmentsByName = new Object();	// array of dept names and ids
var	Folders = new Object();	// array of folder ids and folder name objects
var	Operators = new Object();	// array of operator ids and name objects
var	OperatorsByName = new Object();	// array of operator ids and name objects
var	WaitingTimes = new Object();	// array of chat waiting times objects
var	Teams = new Object();	// array of team names
var ApiDataNotReady;	// Flag to show when data has been received from API so that data can be processed
var Timenow;			// global for current time
var Overall = new Object({conc: 0,
							sla: 0,
							cph: 0,
							ciq: 0,
							lwt: 0,
							tco: 0,
							tac: 0,
							tcan: 0,
							tcuq: 0,
							tcua: 0,
							tcun: 0,
							tcaban: 0,
							asa: 0,
							act: 0,
							acc: 0,
							oaway: 0,
							oavail: 0});		// top level stats

// Process incoming Boldchat triggered chat data
app.post('/chat-started', function(req, res){
//	debugLog("Chat-started",req.body);
	if(ApiDataNotReady == 0)		//make sure all static data has been obtained first
		processStartedChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered chat data
app.post('/chat-unavailable', function(req, res){
	debugLog("Chat-unavailable",req.body);
	if(ApiDataNotReady == 0)		//make sure all static data has been obtained first
		processUnavailableChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered chat data
app.post('/chat-answered', function(req, res){
	debugLog("Chat-answered",req.body);
	if(ApiDataNotReady == 0)		//make sure all static data has been obtained first
		processActiveChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered chat data
app.post('/chat-closed', function(req, res){
//	debugLog("Chat-closed", req.body);
	if(ApiDataNotReady == 0)		//make sure all static data has been obtained first
		processClosedChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered operator data
app.post('/operator-status-changed', function(req, res){
//	debugLog("operator-status-changed",req.body);
	res.send({ "result": "success" });
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

function Google_Oauth_Request(token,callBackFunction) {
	var options = {
		host : 'www.googleapis.com', 
		port : 443, 
		path : '/oauth2/v3/tokeninfo?id_token='+token, 
		method : 'GET'
	};
	https.request(options, callBackFunction).end();
}

function debugLog(name, dataobj) {
	console.log(name+": ");
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
													conc: 0,
													sla: 0,
													cph: 0,
													ciq: 0,
													lwt: 0,
													tco: 0,
													tac: 0,
													tcan: 0,
													tcuq: 0,
													tcua: 0,
													tcun: 0,
													asa: 0,
													act: 0,
													acc: 0,
													oaway: 0,
													oavail: 0};
	}
	console.log("No of Depts: "+Object.keys(Departments).length);
}

function operatorsCallback(dlist) {
	for(var i in dlist) 
	{
		OperatorsByName[dlist[i].Name] = {name: dlist[i].LoginID};
		Operators[dlist[i].LoginID] = {name: dlist[i].Name,
											tcan: 0,		// total chats answered
											status: 0,
											activeChats: new Array(),
											tcs: 0};	// time in current status																				
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

// setup all globals TODO: add teams
function doStartOfDay() {
	getApiData('getDepartments', 0, deptsCallback);
	getApiData("getOperators", 0, operatorsCallback);
	getApiData("getFolders", 0, foldersCallback);
}

// process started chat object and update all relevat dept, operator and global metrics
function processStartedChat(chat) {
	// analyse each chat and keep track of global metrics
	if(chat.DepartmentID === null) return;		// should never be null at this stage but I have seen it
	deptobj = Departments[chat.DepartmentID];
	Overall.ciq++;
	deptobj.ciq++;
	var tchat = new ChatData(chat.ChatID, chat.DepartmentID, chat.Started);
	AllLiveChats[chat.ChatID] = tchat;		// save this chat details
}

// process unavailable chat object and update all relevat dept, operator and global metrics
function processUnavailableChat(chat) {
	// analyse each chat and keep track of global metrics
	Overall.tcun++;
	if(chat.DepartmentID === null) return;	
	deptobj = Departments[chat.DepartmentID];
	deptobj.tcun++;
}

// process ended chat object and update all relevat dept, operator and global metrics
// closed chat may not be started or answered but it usually is
function processClosedChat(chat) {
	var deptobj, opobj;

	if(chat.Started === null)		// started not set
	{
		Overall.tcaban++;		// it must be abandoned
		return;
	}

	if(chat.DepartmentID === null) return;		// should never be null at this stage but I have seen it
	deptobj = Departments[chat.DepartmentID];

	if(chat.Answered === null)		// chat unanswered
	{
		if(chat.OperatorID === null)	// operator unassigned
		{
			Overall.tcuq++;
			deptobj.tcuq++;
		}
		else
		{
			Overall.tcua++;
			deptobj.tcua++;			
		}
		return;	// all done 
	}

	opobj = Operators[chat.OperatorID];		// if answered there will always be a operator assigned

	var starttime = new Date(chat.Started);
	var anstime = new Date(chat.Answered);
	var endtime = new Date(chat.Ended);
	var messagecount = chat.OperatorMessageCount + chat.VisitorMessageCount
	// act calculations
	var act = (endtime - anstime)/1000;		// in seconds
	Overall.act = Math.round(((Overall.act * Overall.tcan) + act)/(Overall.tcan +1));
	deptobj.act = Math.round(((deptobj.act * deptobj.tcan) + act)/(deptobj.tcan +1));
	
	//operator stats
	if(chat.OperatorID === null) return;		// operator id not set for some strange reason
	opobj = Operators[chat.OperatorID];
	opobj.act = Math.round(((opobj.act * opobj.tcan) + act)/(opobj.tcan +1));
	if(typeof(AllLiveChats[chat.ChatID]) !== 'undefined')	// not in live chat list
	{
		Overall.tac--;		// chat was previously active so decrement
		deptobj.tac--;
		delete AllLiveChats[chat.ChatID];		// remove from live list as this has now closed
	}
	else	// must be an inactive chat so update asa
	{
		var asa = (anstime - starttime)/1000;
		Overall.asa = Math.round(((Overall.asa * Overall.tcan) + asa)/(Overall.tcan +1));
		deptobj.asa = Math.round(((deptobj.asa * deptobj.tcan) + asa)/(deptobj.tca +1));		
	}
	Overall.tcan++;
	deptobj.tcan++;
	opobj.tcan++;	// chats answered
}

// process all inactive (closed) chat objects
function allInactiveChats(chats) {
	for(var i in chats)
	{
		processClosedChat(chats[i]);
	}
}

// update active chat object and update all relevat dept, operator and global metrics
// active chats mean they have been answered so ASA can be calculated
function processActiveChat(achat) {
	var deptobj, opobj, asa;
	if(achat.DepartmentID === null) return;		// should never be null at this stage but I have seen it
	if(achat.OperatorID === null) return;		// operator id not set for some strange reason

	deptobj = Departments[achat.DepartmentID];
	opobj = Operators[achat.OperatorID];
	var anstime = new Date(achat.Answered);
	var starttime = new Date(achat.Started);
	var chattime = Math.round((Timenow - anstime)/1000);		// convert to seconds and round it
	if(achat.Answered !== null)
	{
	// update ASA value
		asa = (anstime - starttime)/1000;
		Overall.asa = Math.round(((Overall.asa * Overall.tcan) + asa)/(Overall.tcan +1));
		deptobj.asa = Math.round(((deptobj.asa * deptobj.tcan) + asa)/(deptobj.tca +1));		
	}

	Overall.tac++;		// total number of active chats
	deptobj.tac++;		// dept chats active
	opobj.tac++;		// operator active chats

	var tchat = AllLiveChats[achat.ChatID];
	if(typeof(tchat) == 'undefined')		// if this chat did not exist 
		tchat = new ChatData(achat.ChatID, achat.DepartmentID, achat.Started);
	else	// already in queue so update stats
	{
		Overall.ciq--;
		deptobj.ciq--;		
	}

	tchat.answered = achat.Answered;
	tchat.operator = achat.OperatorID;
	AllLiveChats[achat.ChatID] = tchat;		// save this chat info until closed
	
//		console.log("opobj is "+achat.OperatorID);
	opobj.activeChats.push({chatid: achat.ChatID, 
						deptname: deptobj.name,
						ctime: chattime,
						messages: achat.OperatorMessageCount + achat.VisitorMessageCount
						});
	
}

// process all active chat objects 
function allActiveChats(achats) {
	for(var i in achats) 
	{
		processActiveChat(achats[i]);
	}
}

function getOperatorAvailability(dlist) {
	// StatusType 0, 1 and 2 is Logged out, logged in as away, logged in as available respectively
	var operator;
	for(var i in dlist)
	{
		operator = dlist[i].LoginID;
//		console.log("Operator: "+operator + " StatusType is "+dlist[i].StatusType);
		if(Operators[operator] !== 'undefined')		// check operator id is valid
		{
			Operators[operator].status = dlist[i].StatusType;
			Operators[operator].tcs = Math.round((Timenow - new Date(dlist[i].Created))/1000);
			if(dlist[i].StatusType == 1)
			{
				Overall.oaway++;			
			}
			else if(dlist[i].StatusType == 2)
			{
				Overall.oavail++;
			}
		}
	}			
}

function calculateLwt() {
	var tchat, stime, waittime;
	var maxwait = 0;
	
	// first zero out the lwt for all dept
	for(var i in Departments)
	{
		Departments[i].lwt = 0;
	}
	
	// now recalculate the lwt by dept and save the overall
	for(var i in AllLiveChats)
	{
		tchat = AllLiveChats[i];
		if(tchat.answered == null)		// chat not answered yet
		{
			stime = new Date(tchat.started);
			waittime = Math.round((Timenow - stime)/1000);
			if(Departments[tchat.dept].lwt < waittime)
				Departments[tchat.dept].lwt = waittime;
			
			if(maxwait < waittime)
				maxwait = waittime;
		}
	}
	Overall.lwt = maxwait;
}

// this function calls API again if data is truncated
function loadNext(method, next, callback) {
	var str = [];
	for(var key in next) {
		if (next.hasOwnProperty(key)) {
			str.push(encodeURIComponent(key) + "=" + encodeURIComponent(next[key]));
		}
	}
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

// gets current active chats 
function getActiveChatData() {
	if(ApiDataNotReady)
	{
		console.log("Static data not ready: "+ApiDataNotReady);
		setTimeout(getActiveChatData, 1000);
		return;
	}
	
	for(var did in Departments)	// active chats are by department
	{
		parameters = "DepartmentID="+did;
		getApiData("getActiveChats",parameters,allActiveChats);
//			getApiData("getDepartmentOperators", parameters, getDeptOperators);
	}
}

// gets today's chat data incase system was started during the day
function getInactiveChatData() {
	if(ApiDataNotReady)
	{
		console.log("Static data not ready");
		setTimeout(getInactiveChatData, 1000);
		return;
	}

	// set date to start of today
	var startDate = new Date();
	startDate.setHours(0,0,0,0);

	console.log("Getting inactive chat info from "+ Object.keys(Folders).length +" folders");
	var parameters;
	for(var fid in Folders)	// Inactive chats are by folders
	{
		parameters = "FolderID="+fid+"&FromDate="+startDate.toISOString();
		getApiData("getInactiveChats", parameters, allInactiveChats);
	}	
}

// Set up callbacks
io.sockets.on('connection', function(socket){
	
	socket.on('authenticate', function(data){
		console.log("authentication request received for: "+data.email);
		if(GMAILS[data.email] === 'undefined')
		{
			console.log("This gmail is invalid: "+data.email);
			socket.emit('errorResponse',"Invalid email");
		}
		else
		{
			Google_Oauth_Request(data.token, function (response) {
			var str = '';
			//another chunk of data has been received, so append it to `str`
			response.on('data', function (chunk) {
				str += chunk;
			});
			//the whole response has been received, take final action.
			response.on('end', function () {
				var jwt = JSON.parse(str);
//				console.log("Response received: "+str);
				if(jwt.aud == GOOGLE_CLIENT_ID)		// valid token response
				{
//					console.log("User authenticated, socket id: "+socket.id);
					LoggedInUsers.push(socket.id);		// save the socket id so that updates can be sent
					socket.emit('authResponse',"success");
				}
				else
					socket.emit('errorResponse',"Invalid token");
				});
			});
		}
	});

	socket.on('un-authenticate', function(data){
		console.log("un-authentication request received: "+data.email);
		if(GMAILS[data.email] === 'undefined')
		{
			console.log("This gmail is invalid: "+data.email);
			socket.emit('errorResponse',"Invalid email");
		}
		else
		{
			console.log("Valid gmail: "+data.email);
			var index = LoggedInUsers.indexOf(socket.id);
			if(index > -1) LoggedInUsers.splice(index, 1);
		}
	});
	
	socket.on('disconnect', function(data){
		console.log("connection disconnect");
		var index = LoggedInUsers.indexOf(socket.id);	
		if(index > -1) LoggedInUsers.splice(index, 1);	// remove from list of valid users
	});
	
		socket.on('end', function(data){
		console.log("connection ended");
	});

});

function updateChatStats() {
	Timenow = new Date();		// update the time for all calculations
	calculateLwt();
	for(var i in LoggedInUsers)
	{
		socket = LoggedInUsers[i];
//		console.log("Socket id is: "+socket);
		io.sockets.connected[socket].emit('overallStats', Overall);
		io.sockets.connected[socket].emit('departmentStats', Departments);
	}
//	debugLog("Overall", Overall);
	setTimeout(updateChatStats, 3000);	// send update every second
}

ApiDataNotReady = 0;	// reset flag
doStartOfDay();
setTimeout(getInactiveChatData, 2000);
getActiveChatData();
getApiData("getOperatorAvailability", "ServiceTypeID=1", getOperatorAvailability);
setTimeout(updateChatStats,3000);
