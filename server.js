// acronyms used
// cconc - chat concurrency
// cph - chats per hour
// ciq - chats in queue
// lwt - longest waiting time
// tco - chats offered (chats active, answered and abandoned)
// tac - total active chats (answered)
// tcan - total chats answered complete and active 
// tcuq - total chats unanswered/abandoned in queue
// tcua - total chats unanswered/abandoned after assigned
// tcun - total chats unavailable
// asa - average speed to answer
// act - average chat time
// acc - available chat capacity
// aaway - total number of agents away
// aavail - total number of agents available
// status - current status 0 - logged out, 1 - away, 2 - available
// tcs - time in current status
// tct - total chat time
// mct - multi chat time
// csla - no of chats within sla

//********************************* Set up Express Server 
http = require('http');
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);
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
var PAGEPATH = process.env.PAGEPATH || "/";
var AUTHUSERS = JSON.parse(process.env.AUTHUSERS) || {};
var SLATHRESHOLD = process.env.SLATHRESHOLDS;
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
app.get('/h3g_utils.js', function(req, res){
	res.sendFile(__dirname + '/h3g_utils.js');
});
app.get('/skillgroup.html', function(req, res){
	res.sendFile(__dirname + '/skillgroup.html');
});
app.get('/department.html', function(req, res){
	res.sendFile(__dirname + '/department.html');
});
app.get('/index.css', function(req, res){ 
	res.sendFile(__dirname + '/index.css');
});
app.get('/dashboard.js', function(req, res){
	res.sendFile(__dirname + '/dashboard.js');
});
app.get('/skillgroup.js', function(req, res){
	res.sendFile(__dirname + '/skillgroup.js');
});
app.get('/department.js', function(req, res){
	res.sendFile(__dirname + '/department.js');
});
app.get('/favicon.ico', function(req, res){
	res.sendFile(__dirname + '/favicon.ico');
});
app.get('/threelogo.png', function(req, res){
	res.sendFile(__dirname + '/threelogo.png');
});
app.get('/monitor.html', function(req, res){
	res.sendFile(__dirname + '/monitor.html');
});
app.get('/monitor.js', function(req, res){
	res.sendFile(__dirname + '/monitor.js');
});

//********************************* Global class exceptions
var Exception = function() {
		this.chatAnsweredIsBlank = 0;
		this.chatAnsweredNotInList = 0;
		this.chatEndedIsBlank = 0;
		this.chatClosedIsBlank = 0;		
		this.chatClosedNotInList = 0;
		this.chatsAbandoned = 0;
		this.chatsBlocked = 0;
		this.customStatusUndefined = 0;
};

//********************************* Global class for chat data
var ChatData = function(chatid, dept, sg) {
		this.chatID = chatid;
		this.departmentID = dept;
		this.skillgroup = sg;
		this.operatorID = 0;	// operator id of this chat
		this.status = 0;	// 0 is closed, 1 is waiting (started), 2 is active (answered)
		this.started = 0;		// times ISO times must be converted to epoch (milliseconds since 1 Jan 1970)
		this.answered = 0;			// so it is easy to do the calculations
		this.ended = 0;
		this.closed = 0;
};

//******************* Global class for dashboard metrics
var DashMetrics = function(did,name,sg) {
		this.did = did;		// used only for departments
		this.name = name;
		this.skillgroup = sg; // used only by departments
		this.cconc = 0;
		this.tct = 0;
		this.mct = 0;
		this.csla = 0;		// number
		this.cph = 0;
		this.ciq = 0;
		this.lwt = 0;
		this.tco = 0;
		this.tac = 0;
		this.tcan = 0;
		this.tcuq = 0;
		this.tcua = 0;
		this.tcun = 0;
		this.tcaban = 0;
		this.asa = 0;
		this.act = 0;
		this.acc = 0;
		this.oaway = 0;
		this.oavail = 0;	
};

//**************** Global class for operator metrics
var OpMetrics  = function(id,name) {
		this.oid = id;		// operator id
		this.name = name;
		this.ccap = 2;		// assume chat capacity of 2
		this.cconc = 0;		// chat concurrency
		this.tcan = 0;		// total chats answered
		this.cph = 0;
		this.csla = 0;		// chats answered within SLA
		this.status = 0;	// 0 - logged out, 1 - away, 2 - available
		this.cstatus = 0;	// custom status
		this.statusdtime = 0;	// start time of current status
		this.activeChats = new Array();
		this.acc = 0;	// available chat capacity - only valid if operator is available	
		this.tcs = 0;	// time in current status	
		this.tcta = 0;	// total chat time for all chats
		this.act = 0;	// average chat time for operator
		this.tct = 0;	// total chat time with atleast one chat
		this.mct = 0;	// multi chat time i.e. more than 1 chat
};																				

//********************************* Global variables for chat data
var LoggedInUsers;
var AllChats;
var	Departments;	// array of dept ids and dept name objects
var	DeptOperators;	// array of operators by dept id
var	SkillGroups;	// array of skill groups which are collection of depts
var	OperatorDepts;	// array of depts for each operator
var	OperatorCconc;	// chat concurrency for each operator
var OperatorSkills;	// skill group each operator belongs to
var	Folders;	// array of folder ids and folder name objects
var	Operators;	// array of operator ids and name objects
var	CustomStatus;	// array of custom status names
var ApiDataNotReady;	// Flag to show when data has been received from API so that data can be processed
var TimeNow;			// global for current time
var EndOfDay;			// global time for end of the day before all stats are reset
var Overall;		// top level stats
var	OperatorsSetupComplete;
var	GetOperatorAvailabilitySuccess;
var AuthUsers = new Object();
var UsersLoggedIn;
var Exceptions;

// load list of authorised users and their passwords
//console.log("Authusers: "+AUTHUSERS);
var au = [];
au = AUTHUSERS.users;
for(var i in au)
{
	var uname = au[i].name;
	var pwd = au[i].pwd;
	AuthUsers[uname] = pwd;
//	console.log("User: "+uname+" saved");
}
console.log(Object.keys(AuthUsers).length +" user credentials loaded");

function sleep(milliseconds) {
  var start = new Date().getTime();
  for(var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function initialiseGlobals () {
	LoggedInUsers = new Array();
	UsersLoggedIn = new Object();
	AllChats = new Object();
	Departments = new Object();	
	SkillGroups = new Object();	
	DeptOperators = new Object();
	OperatorDepts = new Object();
	OperatorCconc = new Object();
	OperatorSkills = new Object();
	Folders = new Object();	
	Operators = new Object();
	CustomStatus = new Object();
	TimeNow = new Date();
	EndOfDay = new Date();
	EndOfDay.setUTCHours(23,59,59,999);	// last milli second of the day
	Overall = new DashMetrics("Overall","Overall");	
	OperatorsSetupComplete = false;
	ApiDataNotReady = 0;
	Exceptions = new Exception();
	GetOperatorAvailabilitySuccess = false;
}
// Process incoming Boldchat triggered chat data
app.post('/chat-started', function(req, res){
//	debugLog("Chat-started",req.body);
	sendToLogs("Chat-started, chat id: "+req.body.ChatID+",ChatStatusType is "+req.body.ChatStatusType);
	if(OperatorsSetupComplete)		//make sure all static data has been obtained first
		processStartedChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered chat data
app.post('/chat-unavailable', function(req, res){
//	debugLog("Chat-unavailable",req.body);
	sendToLogs("Chat-unavailable, chat id: "+req.body.ChatID+",ChatStatusType is "+req.body.ChatStatusType);
//	if(OperatorsSetupComplete)		//make sure all static data has been obtained first
//		processUnavailableChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered chat data
app.post('/chat-answered', function(req, res){
//	debugLog("Chat-answered",req.body);
	sendToLogs("Chat-answered, chat id: "+req.body.ChatID+",ChatStatusType is "+req.body.ChatStatusType);
	if(OperatorsSetupComplete)		//make sure all static data has been obtained first
		processAnsweredChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered chat data
app.post('/chat-closed', function(req, res){
//	debugLog("Chat-closed", req.body);
	sendToLogs("Chat-closed, chat id: "+req.body.ChatID+",ChatStatusType is "+req.body.ChatStatusType);
	if(OperatorsSetupComplete)		//make sure all static data has been obtained first
		processClosedChat(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered chat data
app.post('/chat-window-closed', function(req, res){
//	debugLog("Chat-window-closed", req.body);
	sendToLogs("Chat-window-closed, chat id: "+req.body.ChatID+",ChatStatusType is "+req.body.ChatStatusType);
	if(OperatorsSetupComplete)		//make sure all static data has been obtained first
		processWindowClosed(req.body);
	res.send({ "result": "success" });
});

// Process incoming Boldchat triggered operator data
app.post('/operator-status-changed', function(req, res){ 
//	debugLog("operator-status-changed post",req.body);
	sendToLogs("operator-status-changed, operator id: "+Operators[req.body.LoginID].name);
	if(OperatorsSetupComplete)		//make sure all static data has been obtained first
		processOperatorStatusChanged(req.body);
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

function postToArchive(postdata) {
	var options = {
		host : 'uber-electronics.com', 
		port : 443, 
		path : '/home/mkerai/APItriggers/h3gendofday.php', 
		method : 'POST',
		headers: {
 //         'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(postdata)
		}
	};
	var post_req = https.request(options, function(res){
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
//			console.log('Response: ' + chunk);
			});
		});
	post_req.write(postdata);
	post_req.end();
	console.log("End of day archived successfully");
}

function debugLog(name, dataobj) {
	console.log(name+": ");
	for(key in dataobj) 
	{
		if(dataobj.hasOwnProperty(key))
			console.log(key +":"+dataobj[key]);
	}
}

function sendToLogs(text) {
	for(var i in LoggedInUsers)
	{
		socketid = LoggedInUsers[i];
		io.sockets.connected[socketid].emit('consoleLogs', text);
	}
}

function deptsCallback(dlist) {
	var dname, newname, sg,ch1,ch2;
// sort alphabetically first
	dlist.sort(function(a,b) {
		var nameA=a.Name.toLowerCase();
		var nameB=b.Name.toLowerCase();
		if (nameA < nameB) //sort string ascending
			return -1;
		if (nameA > nameB)
			return 1;
		return 0; //default return value (no sorting)
	});
	
	for(var i in dlist)
	{
		dname = dlist[i].Name;
		sg = dname.match("\\[(.*)]");	// match square brackets
		if(sg == null) continue;		// dept name does not match a skillgroup in square brackets
		ch1 = dname.indexOf("[");
		ch2 = dname.indexOf("]");
		sg = dname.substring(ch1+1,ch2);	// name between the brackets
		newname = dname.substring(ch2+3);	// remainder of the name (skip " - ")
		Departments[dlist[i].DepartmentID] = new DashMetrics(dlist[i].DepartmentID,newname,sg);
		SkillGroups[sg] = new DashMetrics(sg,sg,"n/a");
	}
	console.log("No of Depts: "+Object.keys(Departments).length);
	sendToLogs("No of Depts: "+Object.keys(Departments).length);
	console.log("No of Skillgroups: "+Object.keys(SkillGroups).length);
	sendToLogs("No of Skillgroups: "+Object.keys(SkillGroups).length);
	for(var did in Departments)
	{
		parameters = "DepartmentID="+did;
		getApiData("getDepartmentOperators",parameters,deptOperatorsCallback,did);	// extra func param due to API
	}
}

function operatorsCallback(dlist) {
	
// sort alphabetically first
	dlist.sort(function(a,b) {
		var nameA=a.Name.toLowerCase();
		var nameB=b.Name.toLowerCase();
		if (nameA < nameB) //sort string ascending
			return -1;
		if (nameA > nameB)
			return 1;
		return 0; //default return value (no sorting)
	});

	for(var i in dlist) 
	{
		Operators[dlist[i].LoginID] = new OpMetrics(dlist[i].LoginID,dlist[i].Name);																			
		var conc = new Array(1440).fill(0);	// initialise with zeros
		OperatorCconc[dlist[i].LoginID] = conc;
	}
	console.log("No of Operators: "+Object.keys(Operators).length);
	sendToLogs("No of Operators: "+Object.keys(Operators).length);
}

function foldersCallback(dlist) {
	for(var i in dlist) 
	{
		if(dlist[i].FolderType == 5)		// select only chat folder types
		{
			Folders[dlist[i].FolderID] = dlist[i].Name;
		}
	}
	console.log("No of Chat Folders: "+Object.keys(Folders).length);
	sendToLogs("No of Chat Folders: "+Object.keys(Folders).length);
}

function customStatusCallback(dlist) {
	for(var i in dlist) 
	{
			CustomStatus[dlist[i].CustomOperatorStatusID] = dlist[i].Name;
	}
	console.log("No of Custom Statuses: "+Object.keys(CustomStatus).length);
	sendToLogs("No of Custom Statuses: "+Object.keys(CustomStatus).length);
}

function deptOperatorsCallback(dlist, dept) {
	var doperators = new Array();
	for(var i in dlist) 
	{
		doperators.push(dlist[i].LoginID);
	}
	
	DeptOperators[dept] = doperators;
	console.log("Operators in dept: "+dept+" - "+DeptOperators[dept].length);
	sendToLogs("Operators in dept: "+dept+" - "+DeptOperators[dept].length);
}

function operatorAvailabilityCallback(dlist) {
	// StatusType 0, 1 and 2 is Logged out, logged in as away, logged in as available respectively
	var operator;
	var depts;
	GetOperatorAvailabilitySuccess = true;
	for(var i in dlist)
	{
		operator = dlist[i].LoginID;
		if(typeof(OperatorSkills[operator]) !== 'undefined')		// check operator id is valid
		{
			Operators[operator].status = dlist[i].StatusType;
			Operators[operator].cstatus = (dlist[i].CustomOperatorStatusID == null ? "" : CustomStatus[dlist[i].CustomOperatorStatusID]);
			if(dlist[i].StatusType != 0)						// dont bother is logged out
				Operators[operator].statusdtime = TimeNow;
			// update metrics
			if(dlist[i].StatusType == 1)
			{
				Overall.oaway++;
				SkillGroups[OperatorSkills[operator]].oaway++;
				depts = new Array();
				depts = OperatorDepts[operator];
				for(var did in depts)
				{
					Departments[depts[did]].oaway++;
				}
			}
			else if(dlist[i].StatusType == 2)
			{
				Overall.oavail++;
				SkillGroups[OperatorSkills[operator]].oavail++;
				depts = new Array();
				depts = OperatorDepts[operator];
				for(var did in depts)
				{
					Departments[depts[did]].oavail++;
				}
			}
		}
	}
}

function operatorCustomStatusCallback(dlist) {
	if(dlist.length > 0)	// make sure return is not null
	{
		Operator[dlist[0].LoginID].cstatus = CustomStatus[dlist[0].CustomOperatorStatusID];
		sendToLogs("Operator: "+Operator[dlist[0].LoginID].name+", Status: "+CustomStatus[dlist[0].CustomOperatorStatusID)];	
	}
}

// process started chat object and update all relevat dept, operator and global metrics
function processStartedChat(chat) {
	if(chat.DepartmentID == null || chat.DepartmentID == "") return;// should never be null at this stage but I have seen it
	var deptobj = Departments[chat.DepartmentID];
	if(typeof(deptobj) === 'undefined') return;		// a dept we are not interested in

	var tchat = new ChatData(chat.ChatID, chat.DepartmentID, deptobj.skillgroup);
	tchat.started = new Date(chat.Started);
	tchat.status = 1;	// waiting to be answered
	AllChats[chat.ChatID] = tchat;		// save this chat details
}

// process unavailable chat object. Occurs when visitor gets the unavailable message as ACD queue is full or nobody available
function processUnavailableChat(chat) {
	if(chat.DepartmentID === null) return;	
	var deptobj = Departments[chat.DepartmentID];
	if(typeof(deptobj) === 'undefined') return;		// a dept we are not interested in
	var sgobj = SkillGroups[deptobj.skillgroup];
	// make sure that this is genuine and sometime this event is triggered for an old closed chat
	if((chat.Started == "" || chat.Started == null) && (chat.Answered == "" || chat.Answered == null))
	{
		deptobj.tcun++;
		sgobj.tcun++;
		Overall.tcun++;
	}
}

// active chat means a started chat has been answered by an operator so it is no longer in the queue
function processAnsweredChat(chat) {
	var deptobj, opobj, sgobj;
	
	if(chat.DepartmentID == null || chat.DepartmentID == "") return;	// should never be null at this stage but I have seen it
	if(chat.OperatorID == null || chat.OperatorID == "") return;		// operator id not set for some strange reason

	deptobj = Departments[chat.DepartmentID];
	if(typeof(deptobj) === 'undefined') return;		// a dept we are not interested in
	sgobj = SkillGroups[deptobj.skillgroup];
	opobj = Operators[chat.OperatorID];
	if(typeof(opobj) === 'undefined') return;		// an operator that doesnt exist (may happen if created midday)

	if(chat.Answered == null && chat.Answered == "")
	{
		Exceptions.chatAnsweredIsBlank++;
		return;
	}
	
	if(typeof(AllChats[chat.ChatID]) === 'undefined')	// if this chat did not exist (only happens if missed it during startup)
	{
		Exceptions.chatAnsweredNotInList++;
		return;
	}
	
	AllChats[chat.ChatID].answered = new Date(chat.Answered);
	AllChats[chat.ChatID].operatorID = chat.OperatorID;
	AllChats[chat.ChatID].status = 2;		// active chat
	
	Overall.tcan++;	// answered chats
	sgobj.tcan++;
	deptobj.tcan++;
	opobj.tcan++;

	opobj.activeChats.push(chat.ChatID);

	var speed = AllChats[chat.ChatID].answered - AllChats[chat.ChatID].started;
	if(speed < (SLATHRESHOLD*1000))		// sla threshold in milliseconds
	{
		Overall.csla++;
		deptobj.csla++;
		sgobj.csla++;
		opobj.csla++;
	}
}

// process closed chat object. closed chat is one that is started and answered.
// Otherwise go to processwindowclosed
function processClosedChat(chat) {
	var deptobj,opobj,sgobj;

	deptobj = Departments[chat.DepartmentID];
	if(typeof(deptobj) === 'undefined') return;		// a dept we are not interested in
	sgobj = SkillGroups[deptobj.skillgroup];
	opobj = Operators[chat.OperatorID];
	if(typeof(opobj) === 'undefined') return;		// an operator that doesnt exist (may happen if created during startup)

	if(chat.Ended == null || chat.Ended == "")		// should not happen
	{
		Exceptions.chatEndedIsBlank++;
		return;
	}
	if(chat.Closed == null || chat.Closed == "")	// should not happen
	{
		Exceptions.chatClosedIsBlank++;
		return;
	}
	if(typeof(AllChats[chat.ChatID]) === 'undefined')	// if this chat did not exist (only happens if missed it during startup)
	{
		Exceptions.chatClosedNotInList++;
		return;
	}
		
	AllChats[chat.ChatID].status = 0;		// inactive/complete/cancelled/closed
	AllChats[chat.ChatID].ended = new Date(chat.Ended);
	AllChats[chat.ChatID].closed = new Date(chat.Closed);

	// add the total chat time for this chat
//	sendToLogs("TCT by minute is "+(opobj.tct+opobj.mct)+", TCT by calc is "+opobj.tcta);
	var chattime = Math.round((AllChats[chat.ChatID].closed - AllChats[chat.ChatID].started)/1000);
	opobj.tcta = opobj.tcta + chattime;
	// now remove from active chat list and update stats
	var achats = new Array();
	achats = opobj.activeChats;
	for(var x in achats) // go through each chat
	{
		if(achats[x] == chat.ChatID)
		{
			achats.splice(x,1);
			opobj.activeChats = achats;		// save back after removing
		}
	}
	
	var closedchats = opobj.tcan - achats.length;	// answered chat less active
	if(closedchats > 0)
		opobj.act = Math.round(opobj.tcta/closedchats);
	
	updateCconc(AllChats[chat.ChatID]);	// update chat conc now that it is closed
}

// process window closed chat object. This happens if visitor closes chat by closing the window
function processWindowClosed(chat) {
	var deptobj,opobj,sgobj;

	if(chat.ChatStatusType == 1)		// abandoned (closed during pre chat form) chats
	{
		Exceptions.chatsAbandoned++;
		Overall.tcaban++;
		return;
	}

	deptobj = Departments[chat.DepartmentID];
	if(typeof(deptobj) === 'undefined') return;		// a dept we are not interested in
	sgobj = SkillGroups[deptobj.skillgroup];

	if(chat.ChatStatusType == 10 || chat.ChatStatusType == 18)		// blocked chats
	{
		Exceptions.chatsBlocked++;
	}
	else if(chat.ChatStatusType >= 7 && chat.ChatStatusType <= 15)		// unavailable chat
	{
		Overall.tcun++;
		deptobj.tcun++;
		sgobj.tcun++;
	}
	
	if(typeof(AllChats[chat.ChatID]) === 'undefined')		// abandoned and available chats not in list
		return;
	
	if(AllChats[chat.ChatID].answered == 0 && AllChats[chat.ChatID].started != 0)		// chat started but unanswered
	{
		if(chat.OperatorID == 0 || chat.OperatorID == null)	// operator unassigned
		{
			Overall.tcuq++;
			deptobj.tcuq++;
			sgobj.tcuq++;
		}
		else
		{
			Overall.tcua++;
			deptobj.tcua++;			
			sgobj.tcua++;			
		}
	}

	AllChats[chat.ChatID].status = 0;		// inactive/complete/cancelled/closed
	AllChats[chat.ChatID].ended = new Date(chat.Ended);
	AllChats[chat.ChatID].closed = new Date(chat.Closed);
}

// process operator status changed. or unavailable
function processOperatorStatusChanged(ostatus) {
	var depts = new Array();

	opid = ostatus.LoginID;	
	if(Operators[opid] === 'undefined') return;
	depts = OperatorDepts[opid];
	if(typeof(depts) === 'undefined') return;	// operator not recognised

	var curstatus = Operators[opid].status
	// Get the custom status via async API call as currently not available in the trigger
	getApiData("getOperatorAvailability", "ServiceTypeID=1&OperatorID="+opid, operatorCustomStatusCallback);
	// update metrics
	Operators[opid].status = ostatus.StatusType;
	if(ostatus.StatusType == 1)	// away
	{
		Operators[opid].statusdtime = TimeNow;
		Overall.oaway++;
		SkillGroups[OperatorSkills[opid]].oaway++;
		if(curstatus == 2) 		// if operator was available
		{
			Overall.oavail--;
			SkillGroups[OperatorSkills[opid]].oavail--;
		}
		for(var did in depts)
		{
			Departments[depts[did]].oaway++;
			if(curstatus == 2) 		// if operator was available
			{
				Departments[depts[did]].oavail--;
			}
		}
	}
	else if(ostatus.StatusType == 2)	// available
	{
		Operators[opid].statusdtime = TimeNow;
		Overall.oavail++;
		SkillGroups[OperatorSkills[opid]].oavail++;
		if(curstatus == 1) 		// if operator was away
		{
			Overall.oaway--;
			SkillGroups[OperatorSkills[opid]].oaway--;
		}
		for(var did in depts)
		{
			Departments[depts[did]].oavail++;
			if(curstatus == 1) 		// if operator was away
			{
				Departments[depts[did]].oaway--;
			}
		}
	}
	else if(ostatus.StatusType == 0)		// logged out
	{
	Operators[opid].statusdtime = 0;	// reset if operator logged out
		if(curstatus == 1) 		// if operator was away
		{
			Overall.oaway--;
			SkillGroups[OperatorSkills[opid]].oaway--;
		}
		else if(curstatus == 2)	// or available previously
		{
			Overall.oavail--;
			SkillGroups[OperatorSkills[opid]].oavail--;
		}
		
		for(var did in depts)
		{
			if(curstatus == 1) 		// if operator was away
			{
				Departments[depts[did]].oaway--;
			}
			else if(curstatus == 2)	// or available previously
			{
				Departments[depts[did]].oavail--;
			}
		}
	}
}

function updateCconc(tchat) {
	var sh,sm,eh,em,sindex,eindex;
	var conc = new Array();
	conc = OperatorCconc[tchat.operatorID];		// chat concurrency array
		
	sh = tchat.answered.getHours();
	sm = tchat.answered.getMinutes();
	eh = tchat.closed.getHours();
	em = tchat.closed.getMinutes();
	sindex = (sh*60)+sm;	// convert to minutes from midnight
	eindex = (eh*60)+em;	// convert to minutes from midnight
	for(var count=sindex; count <= eindex; count++)
	{
		conc[count]++; // save chat activity for the closed chats
	}			
	OperatorCconc[tchat.operatorID] = conc;		// save it back for next time
}

// calculate ACT and Chat per hour - both are done after chats are complete (ended)
function calculateACT_CPH() {
	var tchat, sgid;
	var count=0,ochattime=0,cph=0;
	var dchattime = new Object();
	var dcount = new Object();
	var dcph = new Object();
	var sgchattime = new Object();	// skill group
	var sgcount = new Object();
	var pastHour = TimeNow - (60*60*1000);	// Epoch time for past hour

	for(var i in Departments)
	{
		Departments[i].act = 0;
		SkillGroups[Departments[i].skillgroup].act = 0;
		dcount[i] = 0;
		dchattime[i] = 0;
		dcph[i] = 0;
		sgcount[Departments[i].skillgroup] = 0;
		sgchattime[Departments[i].skillgroup] = 0;
	}
	
	for(var i in Operators)
	{
		Operators[i].cph = 0;
	}

	for(var i in AllChats)
	{
		tchat = AllChats[i];
		if(tchat.status == 0 && tchat.ended != 0 && tchat.answered != 0)		// chat ended
		{
			count++;
			sgid = Departments[tchat.departmentID].skillgroup;
			dcount[tchat.departmentID]++;
			sgcount[sgid]++; 
			ctime = tchat.ended - tchat.answered;
			ochattime = ochattime + ctime;
			dchattime[tchat.departmentID] = dchattime[tchat.departmentID] + ctime;	
			sgchattime[sgid] = sgchattime[sgid] + ctime;	
			if(tchat.ended >= pastHour)
			{
				cph++;
				dcph[tchat.departmentID]++;
				Operators[tchat.operatorID].cph++;
			}
		}
	}
	
	Overall.cph = cph;
	if(count != 0)	// dont divide by 0
		Overall.act = Math.round((ochattime / count)/1000);
	for(var i in dcount)
	{
		if(dcount[i] != 0)	// musnt divide by 0
			Departments[i].act = Math.round((dchattime[i] / dcount[i])/1000);
			
		Departments[i].cph = dcph[i];
	}
	
	for(var i in sgcount)
	{
		if(sgcount[i] != 0)	// musnt divide by 0
			SkillGroups[i].act = Math.round((sgchattime[i] / sgcount[i])/1000);
	}
}

function calculateASA_SLA() {
	var tchat,speed;
	var count = 0, tac = 0, anstime = 0;
	var danstime = new Object();
	var dcount = new Object();
	var dtac = new Object();
	var sganstime = new Object();
	var sgcount = new Object();
	var sgtac = new Object();

	for(var i in Departments)
	{
		Departments[i].asa = 0;
		Departments[i].tac = 0;
		dcount[i] = 0;
		danstime[i] = 0;
		dtac[i] = 0;
		SkillGroups[Departments[i].skillgroup].asa = 0;
		SkillGroups[Departments[i].skillgroup].tac = 0;
		sgcount[Departments[i].skillgroup] = 0;
		sganstime[Departments[i].skillgroup] = 0;
		sgtac[Departments[i].skillgroup] = 0;
	}
	
	for(var i in AllChats)
	{
		tchat = AllChats[i];
		if((tchat.status == 2 || tchat.status == 0) && tchat.answered != 0 && tchat.started != 0)
		{
			count++;
			dcount[tchat.departmentID]++;
			sgcount[tchat.skillgroup]++;
			speed = tchat.answered - tchat.started;				
			anstime = anstime + speed;
			danstime[tchat.departmentID] = danstime[tchat.departmentID] + speed;
			sganstime[tchat.skillgroup] = sganstime[tchat.skillgroup] + speed;
			if(tchat.status == 2)	// active chat
			{
				tac++;
				dtac[tchat.departmentID]++;
				sgtac[tchat.skillgroup]++;
			}
		}
	}
	if(count != 0)	// dont divide by 0
		Overall.asa = Math.round((anstime / count)/1000);
	Overall.tac = tac;
	
	for(var i in dcount)
	{
		if(dcount[i] != 0)	// musnt divide by 0
			Departments[i].asa = Math.round((danstime[i] / dcount[i])/1000);
		Departments[i].tac = dtac[i];
	}
	
	for(var i in sgcount)
	{
		if(sgcount[i] != 0)	// musnt divide by 0
			SkillGroups[i].asa = Math.round((sganstime[i] / sgcount[i])/1000);
		SkillGroups[i].tac = sgtac[i];
	}	
}

function calculateLWT_CIQ() {
	var tchat, waittime;
	var maxwait = 0;
	
	Overall.ciq = 0;
	// first zero out the lwt for all dept
	for(var i in Departments)
	{
		Departments[i].lwt = 0;
		Departments[i].ciq = 0;
		SkillGroups[Departments[i].skillgroup].lwt = 0;
		SkillGroups[Departments[i].skillgroup].ciq = 0;
	}
	
	// now recalculate the lwt by dept and save the overall
	for(var i in AllChats)
	{
		tchat = AllChats[i];
//		if(tchat.status == 1 && tchat.answered == 0 && tchat.started != 0 && tchat.ended == 0)		// chat not answered yet
		if(tchat.status == 1)		// chat not answered yet
		{
			Overall.ciq++;
			Departments[tchat.departmentID].ciq++;
			SkillGroups[Departments[tchat.departmentID].skillgroup].ciq++;
			waittime = Math.round((TimeNow - tchat.started)/1000);
			if(Departments[tchat.departmentID].lwt < waittime)
			{
				Departments[tchat.departmentID].lwt = waittime;
			}
			
			if(SkillGroups[tchat.skillgroup].lwt < waittime)
			{
				SkillGroups[tchat.skillgroup].lwt = waittime;
			}
			
			if(maxwait < waittime)
				maxwait = waittime;
			}
	}
	Overall.lwt = maxwait;
}

//use operators by dept to calc chat concurrency and available chat capacity
function calculateACC_CCONC_TCO() {
	var depts = new Array();
	var opobj, sgid;

	// first zero out the cconc and acc for all dept
	Overall.cconc = 0;
	Overall.acc = 0;
	Overall.tct = 0;
	Overall.mct = 0;
	for(var i in Departments)
	{
		Departments[i].cconc = 0;
		Departments[i].acc = 0;
		Departments[i].tct = 0;
		Departments[i].mct = 0;
		SkillGroups[Departments[i].skillgroup].cconc = 0;
		SkillGroups[Departments[i].skillgroup].acc = 0;
		SkillGroups[Departments[i].skillgroup].tct = 0;
		SkillGroups[Departments[i].skillgroup].mct = 0;
	}

	calculateOperatorConc();

	for(var i in OperatorDepts)
	{
		depts = OperatorDepts[i];
		if(typeof(depts) === 'undefined') continue;	// operator not recognised
		
		opobj = Operators[i];
		if(typeof(opobj) === 'undefined') continue;	// operator not recognised
		
		if(opobj.tct != 0)
			opobj.cconc = ((opobj.tct+opobj.mct)/opobj.tct).toFixed(2);
		
		if(opobj.statusdtime != 0)
		{
			opobj.tcs = Math.round(((TimeNow - opobj.statusdtime))/1000);
//			sendToLogs("Operator:status:tcs="+opobj.name+":"+opobj.status+":"+Math.round(((TimeNow - opobj.statusdtime))/1000));
		}
		
		Overall.tct = Overall.tct + opobj.tct;
		Overall.mct = Overall.mct + opobj.mct;
		sgid = OperatorSkills[i];
		SkillGroups[sgid].tct = SkillGroups[sgid].tct + opobj.tct;
		SkillGroups[sgid].mct = SkillGroups[sgid].mct + opobj.mct;
		if(opobj.status == 2)		// make sure operator is available
		{
			opobj.acc = opobj.ccap - opobj.activeChats.length;
			if(opobj.acc < 0) opobj.acc = 0;			// make sure not negative
			Overall.acc = Overall.acc + opobj.acc;
			SkillGroups[sgid].acc = SkillGroups[sgid].acc + opobj.acc;
		}
		else
			opobj.acc = 0;			// available capacity is zero if not available
		// all depts that the operator belongs to
		for(var x in depts)
		{
			Departments[depts[x]].tct = Departments[depts[x]].tct + opobj.tct;
			Departments[depts[x]].mct = Departments[depts[x]].mct + opobj.mct;
			Departments[depts[x]].acc = Departments[depts[x]].acc + opobj.acc;
		}
	}
	
	//	console.log("****tct and mct is " +otct+","+omct+");
	Overall.tco = Overall.tcan + Overall.tcuq + Overall.tcua;
	if(Overall.tct != 0)
		Overall.cconc = ((Overall.tct+Overall.mct)/Overall.tct).toFixed(2);

	for(var did in Departments)
	{
		Departments[did].tco = Departments[did].tcan + Departments[did].tcuq + Departments[did].tcua;
		if(Departments[did].tct != 0)		// dont divide by zero
			Departments[did].cconc = ((Departments[did].tct+Departments[did].mct)/Departments[did].tct).toFixed(2);
	}
	for(var sgid in SkillGroups)
	{
		SkillGroups[sgid].tco = SkillGroups[sgid].tcan + SkillGroups[sgid].tcuq + SkillGroups[sgid].tcua;
		if(SkillGroups[sgid].tct != 0)		// dont divide by zero
			SkillGroups[sgid].cconc = ((SkillGroups[sgid].tct+SkillGroups[sgid].mct)/SkillGroups[sgid].tct).toFixed(2);
	}	
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
function getApiData(method, params, fcallback, cbparam) {
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
			var jsonObj;
			try {
				jsonObj = JSON.parse(str);
			}
			catch (e){
				console.log("API or JSON error");
				return;
			}
			var data = new Array();
			var next = jsonObj.Next;
			data = jsonObj.Data;
			if(data === 'undefined' || data == null)
			{
				console.log("No API data returned: "+str);
				sendToLogs("No API data returned: "+str);
				return;		// exit out if error json message received
			}
			fcallback(data, cbparam);

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

// calculates conc for all inactive chats (used during start up only)
function calculateInactiveConc() {
	if(ApiDataNotReady)
	{
		console.log("Chat data not ready (CiC): "+ApiDataNotReady);
		setTimeout(calculateInactiveConc, 1000);
		return;
	}
	calculateOperatorConc();
}

// calculate total chat times for concurrency
function calculateOperatorConc() {
	var opobj = new Object();
	var chattime, mchattime;
	var conc;
	
	for(var op in OperatorCconc)
	{
		opobj = Operators[op];
		if(typeof(opobj) === 'undefined')
		{
			console.log("undefined operator");
			continue;
		}
		chattime=0;
		mchattime=0;	
		conc = new Array();
		conc = OperatorCconc[op];
		for(var i in conc)
		{
			if(conc[i] > 0) chattime++;		// all chats
			if(conc[i] > 1) mchattime++;	// multichats
		}
		opobj.tct = chattime*60;			// minutes to seconds
		opobj.mct = mchattime*60;		// minutes to seconds
	}
}

// gets operator availability info 
function getOperatorAvailabilityData() {
	if(ApiDataNotReady || OperatorsSetupComplete === false)
	{
		console.log("Static data not ready (OA): "+ApiDataNotReady);
		setTimeout(getOperatorAvailabilityData, 2000);
		return;
	}
	getApiData("getOperatorAvailability", "ServiceTypeID=1", operatorAvailabilityCallback);
	setTimeout(checkOperatorAvailability,60000);		// check if successful after a minute
}

// gets current active chats 
function getActiveChatData() {
	if(ApiDataNotReady || OperatorsSetupComplete === false)
	{
		console.log("Static data not ready (AC): "+ApiDataNotReady);
		setTimeout(getActiveChatData, 1000);
		return;
	}
	
	for(var did in Departments)	// active chats are by department
	{
		parameters = "DepartmentID="+did;
		getApiData("getActiveChats",parameters,allActiveChats);
		sleep(200);
	}
}

// setup dept and skills by operator for easy indexing
function setUpDeptAndSkillGroups() {
	if(ApiDataNotReady)
	{
		console.log("Static data not ready (setD&SG): "+ApiDataNotReady);
		setTimeout(setUpDeptAndSkillGroups, 1000);
		return;
	}

	var ops, depts;
	for(var did in Departments)
	{
		ops = new Array();
		ops = DeptOperators[did];
		for(var k in ops)
		{
			depts = OperatorDepts[ops[k]];
			if(typeof(depts) === 'undefined')
				depts = new Array();

			depts.push(did);	// add dept to list of operators
			OperatorDepts[ops[k]] = depts;
			OperatorSkills[ops[k]] = Departments[did].skillgroup;	// not an array so will be overwritten by subsequent 
																	// values. i.e. operator can only belong to 1 skill group
		}
	}
//	debugLog("Operator skillgroups:",OperatorSkills);
	OperatorsSetupComplete = true;
}

// process all active chat objects 
function allActiveChats(chats) {
	for(var i in chats) 
	{
		if(chats[i].Started !== "" && chats[i].Started !== null)
		{
			processStartedChat(chats[i]);	// started, waiting to be answered
			if(chats[i].Answered !== "" && chats[i].Answered !== null)
				processAnsweredChat(chats[i]);	// chat was answered
		}
	}
}

// process all inactive (closed) chat objects
function allInactiveChats(chats) {
	for(var i in chats)
	{
		if(chats[i].Started !== "" && chats[i].Started !== null)
		{
			processStartedChat(chats[i]);	// started
			if(chats[i].Answered !== "" && chats[i].Answered !== null)
			{
				processAnsweredChat(chats[i]);	//  answered
				processClosedChat(chats[i]);	// and closed
			}
			else
				processWindowClosed(chats[i]);	// closed after starting before being answered
		}
		else
			processWindowClosed(chats[i]);	// closed because unavailable
	}
}

// gets today's chat data incase system was started during the day
function getInactiveChatData() {
	if(ApiDataNotReady > 0 || OperatorsSetupComplete === false)
	{
		console.log("Static data not ready (IC): "+ApiDataNotReady);
		setTimeout(getInactiveChatData, 1000);
		return;
	}

	// set date to start of today. Search seems to work by looking at closed time i.e. everything that closed after
	// "FromDate" will be included even if the created datetime is before the FromDate.
	var startDate = new Date();
	startDate.setUTCHours(0,0,0,0);

	console.log("Getting inactive chat info from "+ Object.keys(Folders).length +" folders");
	var parameters;
	for(var fid in Folders)	// Inactive chats are by folders
	{
		parameters = "FolderID="+fid+"&FromDate="+startDate.toISOString();
		getApiData("getInactiveChats", parameters, allInactiveChats);
		sleep(200);
	}	
}

function getCsvChatData() {	
	var key, value;
	var csvChats = "";
	var tchat = new Object();
	// add csv header using first object
	key = Object.keys(AllChats)[0];
	tchat = AllChats[key];
	for(key in tchat)
	{
		csvChats = csvChats +key+ ",";
	}
	csvChats = csvChats + "\r\n";
	// now add the data
	for(var i in AllChats)
	{
		tchat = AllChats[i];
		for(key in tchat)
		{
			if(key === "departmentID")
				value = Departments[tchat[key]].name;
			else if(key === "operator")
			{
				if(typeof(Operators[tchat[key]]) !== 'undefined')
					value = Operators[tchat[key]].name;
			}
			else if(!isNaN(tchat[key]))
				value = "\"=\"\"" + tchat[key] + "\"\"\"";
			else
				value = tchat[key];
			
			csvChats = csvChats +value+ ",";
		}
		csvChats = csvChats + "\r\n";
	}
	return(csvChats);	
}

// Set up socket actions and responses
io.sockets.on('connection', function(socket){
	
	//  authenticate user name and password
	socket.on('authenticate', function(user){
		console.log("authentication request received for: "+user.name);
		sendToLogs("authentication request received for: "+user.name);
		if(typeof(AuthUsers[user.name]) === 'undefined')
		{
			socket.emit('authErrorResponse',"Username not valid");
		}
		else if(AuthUsers[user.name] != user.pwd)
		{
			socket.emit('authErrorResponse',"Password not valid");
		}
		else
		{
//			console.log("Save socket "+socket.id);
			LoggedInUsers.push(socket.id);		// save the socket id so that updates can be sent
			UsersLoggedIn[socket.id] = user.name;	// save the user name for monitoring purposes
			socket.emit('authResponse',{name: user.name, pwd: user.pwd});
			sendToLogs("authentication successful: "+user.name);
		}
	});	
	
	socket.on('disconnect', function(data){
		console.log("connection disconnect");
		var index = LoggedInUsers.indexOf(socket.id);	
		if(index > -1) LoggedInUsers.splice(index, 1);	// remove from list of valid users

		if(UsersLoggedIn[socket.id] !== undefined)
			UsersLoggedIn[socket.id] = undefined;
	});
	
	socket.on('end', function(data){
		console.log("connection ended");
	});

	socket.on('downloadChats', function(data){
		console.log("Download chats requested");
		sendToLogs("Download chats requested");
		var csvdata = getCsvChatData();
		socket.emit('chatsCsvResponse',csvdata);	
		});
});

function updateChatStats() {
	var socketid;
	
	TimeNow = new Date();		// update the time for all calculations
	if(TimeNow > EndOfDay)		// we have skipped to a new day
	{
		console.log("New day started, stats reset");
		var csvdata = getCsvChatData();
		postToArchive(csvdata);
		doStartOfDay();
		setTimeout(updateChatStats, 8000);
		return;
	}
	calculateLWT_CIQ();
	calculateASA_SLA();
	calculateACT_CPH();
	calculateACC_CCONC_TCO();

	var str = "Total chats started today: "+Object.keys(AllChats).length;
	console.log(str);
	for(var i in LoggedInUsers)
	{
		socketid = LoggedInUsers[i];
		io.sockets.connected[socketid].emit('overallStats', Overall);
		io.sockets.connected[socketid].emit('skillGroupStats', SkillGroups);
		io.sockets.connected[socketid].emit('departmentStats', Departments);
		io.sockets.connected[socketid].emit('deptOperators', DeptOperators);
		io.sockets.connected[socketid].emit('operatorStats', Operators);
		io.sockets.connected[socketid].emit('consoleLogs', str);
		io.sockets.connected[socketid].emit('exceptions', Exceptions);
		io.sockets.connected[socketid].emit('usersLoggedIn', UsersLoggedIn);
	}
//	debugLog("Overall", Overall);
	setTimeout(updateChatStats, 2000);	// send update every 2 second
}

// setup all globals TODO: add teams
function doStartOfDay() {
	initialiseGlobals();	// zero all memory
	getApiData("getDepartments", 0, deptsCallback);
	sleep(1000);
	getApiData("getOperators", 0, operatorsCallback);
	sleep(1000);
	getApiData("getFolders", "FolderType=5", foldersCallback);	// get only chat folders
	sleep(1000);
	getApiData("getCustomOperatorStatuses", 0, customStatusCallback);
	sleep(1000);
	setUpDeptAndSkillGroups();
	getInactiveChatData();
	getActiveChatData();
	getOperatorAvailabilityData();
}

function checkOperatorAvailability() {
	if(GetOperatorAvailabilitySuccess)
		return;

	console.log("Getting operator availability again");
	sendToLogs("Getting operator availability again");
	getOperatorAvailabilityData();	// try again
}

doStartOfDay();		// initialise everything
setTimeout(updateChatStats,8000);	// updates socket io data at infinitum
