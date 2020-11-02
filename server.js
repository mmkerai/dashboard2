/* RTA Dashboard for H3G.
 * This script should run on Heroku
 */
// Version 2.31 19 October 2020
// This version changes CSAT so they are shown as raw values
/* acronyms used in this script
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
// tcc - total chats completed
// asa - average speed to answer
// act - average chat time
// acc - available chat capacity
// mcc - max chat capacity
// oaway - total number of agents away less in custom status
// ocustomst - total number of agents in custom status
// oavail - total number of agents available
// status - current status 0 - logged out, 1 - away, 2 - available
// tcs - time in current status
// tcta - total time of all chats
// tct - total chat time (in atleast 1 chat)
// mct - multi chat time (time in more than 1 chat)
// csla - no of chats within sla
*/

//****** Set up Express Server and socket.io
var http = require('http');
var https = require('https');
var cors = require('cors');
var app = require('express')();
app.use(cors());
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var fs = require('fs');
var crypto = require('crypto');
var bodyParser = require('body-parser');
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
}));



//********** Get port used by Heroku or use a default
var PORT = Number(process.env.PORT || 3000);
server.listen(PORT);
console.log("Server started on port " + PORT);

//******* Get BoldChat API Credentials
console.log("Reading API variables from config.json file...");
var EnVars;
var AID;
var SETTINGSID;
var KEY;
var SLATHRESHOLD, INQTHRESHOLD;	// chat in q threshold for double checking (in case trigger missed)
var MAXCHATCONCURRENCY;
var STARTDAY, CUSTOMST, CUSTOMST_ID;
var AUTHUSERS = new Object();	// list of logins from env variables
var AuthUsers = new Object();	// user login list
var RATELIMIT;	// rate limit in millisec.
var TriggerDomain = "https://h3gdashboard-dev.herokuapp.com";		// used to validate the signature of push data ***CHANGE***

/*
try {
	EnVars = JSON.parse(fs.readFileSync('config.json', 'utf8'));
	AID = EnVars.AID || 0;
	SETTINGSID = EnVars.APISETTINGSID || 0;
	KEY = EnVars.APIKEY || 0;
	API_SHARED_SECRET = EnVars.API_SHARED_SECRET || 0;
	SLATHRESHOLD = EnVars.SLATHRESHOLDS || 30;
	INQTHRESHOLD = EnVars.INQTHRESHOLD || 300;	 // 5 mins
	MAXCHATCONCURRENCY = EnVars.MAXCHATCONCURRENCY || 2;
	STARTDAY = EnVars.STARTOFDAY || { "hours": 0, "minutes": 0 };	// contains hours and minutes (UTC)
	CUSTOMST = EnVars.CUSTOMST || "Approaching Shrinkage";
	AUTHUSERS = EnVars.AUTHUSERS || {};
	RATELIMIT = EnVars.RATELIMIT || 60000;	// default is 60 seconds
}
catch (e) {
	if (e.code === 'ENOENT') {
		console.log("Config file not found, Reading Heroku Environment Variables"); */
		AID = process.env.AID || 0;
		SETTINGSID = process.env.APISETTINGSID || 0;
		KEY = process.env.APIKEY || 0;
		API_SHARED_SECRET = process.env.API_SHARED_SECRET || 0;
		SLATHRESHOLD = process.env.SLATHRESHOLDS || 30;
		INQTHRESHOLD = process.env.INQTHRESHOLD || 300;
		MAXCHATCONCURRENCY = process.env.MAXCHATCONCURRENCY || 2;
		STARTDAY = JSON.parse(process.env.STARTOFDAY) || { "hours": 0, "minutes": 0 }; // default is midnight
		CUSTOMST = process.env.CUSTOMST || "Approaching Shrinkage";
		AUTHUSERS = JSON.parse(process.env.AUTHUSERS) || {};
		RATELIMIT = process.env.RATELIMIT || 60000;
	// }
	// else
	// 	console.log("Error code: " + e.code);
// }

if (AID == 0 || SETTINGSID == 0 || KEY == 0) {
	console.log("BoldChat API Environmental Variables not set. Terminating!");
	process.exit(1);
}

if (STARTDAY.hours > 23 || STARTDAY.hours < 0 || STARTDAY.minutes > 59 || STARTDAY.minutes < 0) {
	console.log("Start of day time invalid - must from 00:00 to 23:59");
	process.exit(1);
}
console.log("Start of Day: " + STARTDAY.hours + ":" + STARTDAY.minutes + " UTC");
console.log("Dashboard API Rate Limit: " + RATELIMIT);

var au = [];
au = AUTHUSERS.users;
for (var i in au) {
	var uname = au[i].name;
	var pwd = au[i].pwd;
	AuthUsers[uname] = pwd;
//	console.log("User: " + uname + " saved");
}
console.log(Object.keys(AuthUsers).length + " user credentials loaded");
console.log("Config loaded successfully");

//****** Callbacks for all URL requests
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/dashboard.html');
});
app.get('/*.html', function (req, res) {
	res.sendFile(__dirname + req.path);
});
app.get('/h3g_utils.js', function (req, res) {
	res.sendFile(__dirname + '/h3g_utils.js');
});
app.get('/thresholds.js', function (req, res) {
	res.sendFile(__dirname + '/thresholds.js');
});
app.get('/h3g_dashboard.css', function (req, res) {
	res.sendFile(__dirname + '/h3g_dashboard.css');
});
app.get('/dashboard.js', function (req, res) {
	res.sendFile(__dirname + '/dashboard.js');
});
app.get('/skillgroup.js', function (req, res) {
	res.sendFile(__dirname + '/skillgroup.js');
});
app.get('/department.js', function (req, res) {
	res.sendFile(__dirname + '/department.js');
});
app.get('/favicon.ico', function (req, res) {
	res.sendFile(__dirname + '/favicon.ico');
});
app.get('/threelogo.png', function (req, res) {
	res.sendFile(__dirname + '/threelogo.png');
});
app.get('/monitor.js', function (req, res) {
	res.sendFile(__dirname + '/monitor.js');
});
app.get('/jquery-2.1.3.min.js', function (req, res) {
	res.sendFile(__dirname + '/jquery-2.1.3.min.js');
});
app.get('/bootstrap.min.css', function (req, res) {
	res.sendFile(__dirname + '/bootstrap.min.css');
});
app.get('/csat.js', function (req, res) {
	res.sendFile(__dirname + '/csat.js');
});
 
process.on('uncaughtException', function (err) {
	var estr = 'Exception: ' + err;
	console.log(estr);
//	postToArchive(estr);		// use for debugging purposes
});

//********************************* Global class exceptions
// Counters used for dashboard functionality
var Exception = function () {
	this.chatsStarted = 0;
	this.chatsAnswered = 0;
	this.chatReassigned = 0;
	this.chatsClosed = 0;
	this.chatsWinClosed = 0;
	this.opStatusChanged = 0;
	this.chatsAbandoned = 0;
	this.chatsBlocked = 0;
	this.noCsatInfo = 0;
	this.signatureInvalid = 0;
	this.chatAnsweredNotInList = 0;
	this.chatClosedNotInList = 0;
	this.longWaitChats = 0;
	this.longWaitChatUpdate = 0;
	this.APIJsonError = 0;
	this.noJsonDataMsg = 0;
	this.ApiRerequests = 0;
};
// exceptions/counters used by API middleware functionality
var MWexception = function () {
	this.getDepartment = 0;
	this.getSkillgroup = 0;
	this.getOperator = 0;
	this.getDepartmentOperators = 0;
	this.getOperatorSkills = 0;
	this.getAllChats = 0;
	this.getChatUpdates = 0;
	this.rateLimitError = 0;
};
//******* Global class for csat data
// Not used from Oct 2020. Replaced with raw CSAT fields
var Csat = function () {
	this.surveys = 0;
	this.NPS = 0;
	this.FCR = 0;
	this.OSAT = 0;
	this.Resolved = 0;
};

//******* Global class for chat data
var ChatData = function (chatid, dept, sg) {
	this.chatID = chatid;
	this.departmentID = dept;
	this.skillgroup = sg;
	this.operatorID = 0;	// operator id of this chat
	this.status = 0;	// 0 is closed, 1 is waiting (started), 2 is active (answered)
	this.started = 0;		// times ISO times must be converted to epoch (milliseconds since 1 Jan 1970)
	this.answered = 0;			// so it is easy to do the calculations
	this.ended = 0;
	this.closed = 0;
	this.winclosed = 0;
	this.disposition_cat = "";	// category wrap up field
	this.disposition_stat = "";	// status wrap up field
	this.disposition_cf1 = "";	// customfield1 wrap up field
	this.disposition_cf2 = "";	// customfield2 wrap up field
	this.statustype = 0;	// as per chatstatustype field in BC
	this.NPS = null;		// value from 0 - 10
	this.resolved = "";		// values Yes or No
	this.rateadvisor = null;	// values 0 - 10
};

//******** Global class for dashboard metrics
var DashMetrics = function (did, name, sg) {
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
	this.tcc = 0;		// chats closed
	this.tac = 0;
	this.tcan = 0;
	this.tcuq = 0;
	this.tcua = 0;
	this.tcun = 0;
	this.tcaban = 0;
	this.asa = 0;
	this.tata = 0;	// total time to answer for all answered chat (used to calc asa)
	this.tcta = 0;	// total chat time for all chats for all closed chats (used to calc act)
	this.act = 0;
	this.acc = 0;
	this.oaway = 0;
	this.ocustomst = 0;
	this.oavail = 0;
//	this.csat = new Csat();	// update Oct 2020 - show raw csat per chat not at op or dept level
};

//**************** Global class for operator metrics
var OpMetrics = function (id, name) {
	this.oid = id;		// operator id
	this.name = name;
	this.maxcc = Number(MAXCHATCONCURRENCY);		// max chat concurrenccy
	this.cconc = 0;		// chat concurrency
	this.tcan = 0;		// total chats answered
	this.tcc = 0;	// chats closed (= answered-active)
	this.cph = 0;
	this.csla = 0;		// chats answered within SLA
	this.status = 0;	// 0 - logged out, 1 - away, 2 - available
	this.cstatus = "";	// custom status
	this.statusdtime = 0;	// start time of current status
	this.activeChats = new Array();
	this.acc = 0;	// available chat capacity - only valid if operator is available
	this.tcs = 0;	// time in current status
	this.tcta = 0;	// total chat time for all chats
	this.act = 0;	// average chat time for operator
	this.tct = 0;	// total chat time with atleast one chat
	this.mct = 0;	// multi chat time i.e. more than 1 chat
//	this.csat = new Csat();	// update Oct 2020 - show raw csat per chat not at op or dept level
	this.tat = 0; // total away time
	this.tot = 0; // total online time
	this.apc = 0; // away precentage - calculated as tat/(tot+tat)
	this.asa = 0; // asa - average speed to answer
	this.tata = 0; // total time of answered chats
};

//********************************* Global constants
const OVERALL_ROOM = "overall_room";
const SKILLGROUP_ROOM = "skillgroup_room";
const DEPARTMENT_ROOM = "department_room";
const OPERATOR_ROOM = "operator_room";
const DEPTOPERATOR_ROOM = "deptoperator_room";
const MONITOR_ROOM = "monitor_room";

//********************************* Global variables for chat data
var LoggedInUsers;	// used for socket ids
var UsersLoggedIn;	// used for unique auth users logged in
var AllChats;
var DeltaChats; // array of chats that have been updated since last getChats api call
var Departments;	// array of dept ids and dept name objects
var TempDeptList;	// used to get around BC API rate limiting error with getDepartmentOperators & getactive chats
var DeptOperators;	// array of operators by dept id
var SkillGroups;	// array of skill groups which are collection of depts
var OperatorDepts;	// array of depts for each operator
var OperatorCconc;	// chat concurrency for each operator
var OperatorSkills;	// skill group each operator belongs to
var Folders;	// array of folder ids and folder name objects
var Operators;	// array of operator ids and name objects
var CustomStatus;	// array of custom status names
var ApiDataNotReady;	// Flag to show when data has been received from API so that data can be processed
var TimeNow;			// global for current time - avoids having to call Date() each time
var StartOfDay;			// global time for start of the day before all stats are reset
var EndOfDay;			// global time for end of the day before all stats are reset
var Overall;		// top level stats
var OperatorsSetupComplete;
var GetOperatorAvailabilitySuccess;
var DepartmentOperatorsComplete;
var Exceptions;
var MWexceptions;
var LongWaitChats;
var TempFolders;
var InactiveChatsComplete;
var ActiveChatsComplete;
var UpdateMetricsIntID;
var CalculateMetricsIntID;
var LongWaitChatsIntID;
// Globals used by API MW (functionality added July 2020)
var RateLimitMessage = "Rate Limit Exceeded";
var SignatureMessage = "API Signature Invalid";
var WaitMessage = "System not ready, please try later";
var APIREQVALIDTIME = 300000;	// request time validity - prevents replay/man in the middle attacks.
var LastAPITimestamp;
var DispositionCats;	// object of wrapup category id to names
var DispositionStats;	// object of wrapup statuses id to names
var DispositionCf1s;	// object of wrapup custom field 1 id to names
var DispositionCf2s;	// object of wrapup custom field 2 id to names

// Process incoming Boldchat triggered chat data
app.post('/chat-started', function (req, res) {
	Exceptions.chatsStarted++;
	res.send("OK");
	if (validateSignature(req.body, TriggerDomain + '/chat-started')) {
		sendToLogs("Chat-started, chat id: " + req.body.ChatID + ",ChatStatusType is " + req.body.ChatStatusType);
		if (OperatorsSetupComplete)		//make sure all static data has been obtained first
			processStartedChat(req.body);
	}
});

// Process incoming Boldchat triggered chat data
app.post('/chat-answered', function (req, res) {
	Exceptions.chatsAnswered++;
	res.send("OK");
	if (validateSignature(req.body, TriggerDomain + '/chat-answered')) {
		// sendToLogs("Chat-answered, chat id: " + req.body.ChatID + ",ChatStatusType is " + req.body.ChatStatusType);
		if (OperatorsSetupComplete)		//make sure all static data has been obtained first
			processAnsweredChat(req.body);
	}
});

// Process incoming Boldchat triggered chat re-assigned message
app.post('/chat-reassigned', function (req, res) {
	Exceptions.chatReassigned++;
	res.send("OK");
	if (validateSignature(req.body, TriggerDomain + '/chat-reassigned')) {
		// sendToLogs("chat-reassigned, chat id: " + req.body.ChatID + ",ChatStatusType is " + req.body.ChatStatusType);
		if (OperatorsSetupComplete)		//make sure all static data has been obtained first
			processReassignedChat(req.body);
	}
});

// Process incoming Boldchat triggered chat data
app.post('/chat-closed', function (req, res) {
	Exceptions.chatsClosed++;
	res.send("OK");
	if (validateSignature(req.body, TriggerDomain + '/chat-closed')) {
		// sendToLogs("Chat-closed, chat id: " + req.body.ChatID + ",ChatStatusType is " + req.body.ChatStatusType);
		if (OperatorsSetupComplete)		//make sure all static data has been obtained first
			processClosedChat(req.body);
	}
});

// Process incoming Boldchat triggered chat data
app.post('/chat-window-closed', function (req, res) {
	Exceptions.chatsWinClosed++;
	res.send("OK");
	if (validateSignature(req.body, TriggerDomain + '/chat-window-closed')) {
		// sendToLogs("Chat-window-closed, chat id: " + req.body.ChatID + ",ChatStatusType is " + req.body.ChatStatusType);
		if (OperatorsSetupComplete)		//make sure all static data has been obtained first
			processWindowClosed(req.body);
	}
});

// Process incoming Boldchat triggered operator data
app.post('/operator-status-changed', function (req, res) {
	Exceptions.opStatusChanged++;
	res.send("OK");
	if (validateSignature(req.body, TriggerDomain + '/operator-status-changed')) {
		sendToLogs("operator-status-changed, operator: " + req.body.Name);
		if (OperatorsSetupComplete)		//make sure all static data has been obtained first
			processOperatorStatusChanged2(req.body);
	}
});

// code for API enhancement to make this a middleware for zoom dashboard to obtain stats
// First check we have not exceeded the rate limit
// then check request signature if valid, of all good then process it
app.get('/apiv1/getDepartment', function (req, res) {
	MWexceptions.getDepartment++;
	// sendToLogs("getDepartment Requested");
	if (!withinRateLimit()) return (res.send(RateLimitMessage));
	if (!verifyAPIMWSignature(req.query)) return (res.send(SignatureMessage));
	if (!GetOperatorAvailabilitySuccess) return (res.send(WaitMessage));	//make sure all dashboard is ready to show metrics
	// finally all good to go
	var did = req.query.did;	// save department id param
	if (did)
		res.send(JSON.stringify(Departments[did]));
	else
		res.send(JSON.stringify(Departments));
});

app.get('/apiv1/getSkillgroup', function (req, res) {
	MWexceptions.getSkillgroup++;
	// sendToLogs("getSkillgroup Requested");
	if (!withinRateLimit()) return (res.send(RateLimitMessage));
	if (!verifyAPIMWSignature(req.query)) return (res.send(SignatureMessage));
	if (!GetOperatorAvailabilitySuccess) return (res.send(WaitMessage));	//make sure all static data has been obtained first
	// finally all good to go
	var sid = req.query.sid;	// save department id param
	if (sid)
		res.send(JSON.stringify(SkillGroups[sid]));
	else
		res.send(JSON.stringify(SkillGroups));
});

app.get('/apiv1/getOperator', function (req, res) {
	MWexceptions.getOperator++;
	// sendToLogs("getOperator Requested");
	if (!withinRateLimit()) return (res.send(RateLimitMessage));
	if (!verifyAPIMWSignature(req.query)) return (res.send(SignatureMessage));
	if (!GetOperatorAvailabilitySuccess) return (res.send(WaitMessage));	//make sure all static data has been obtained first
	// finally all good to go
	var oid = req.query.oid;	// save department id param
	if (oid)
		res.send(JSON.stringify(Operators[oid]));
	else
		res.send(JSON.stringify(Operators));
});

app.get('/apiv1/getDepartmentOperators', function (req, res) {
	MWexceptions.getDepartmentOperators++;
	// sendToLogs("getDepartmentOperators Requested");
	if (!withinRateLimit()) return (res.send(RateLimitMessage));
	if (!verifyAPIMWSignature(req.query)) return (res.send(SignatureMessage));
	if (!GetOperatorAvailabilitySuccess) return (res.send(WaitMessage));	//make sure all static data has been obtained first
	// finally all good to go
	res.send(JSON.stringify(DeptOperators));
});

app.get('/apiv1/getOperatorSkills', function (req, res) {
	MWexceptions.getOperatorSkills++;
	// sendToLogs("getOperatorSkills Requested");
	if (!withinRateLimit()) return (res.send(RateLimitMessage));
	if (!verifyAPIMWSignature(req.query)) return (res.send(SignatureMessage));
	if (!GetOperatorAvailabilitySuccess) return (res.send(WaitMessage));	//make sure all static data has been obtained first
	// finally all good to go
	res.send(JSON.stringify(OperatorSkills));
});

app.get('/apiv1/getAllChats', function (req, res) {
	MWexceptions.getAllChats++;
	// sendToLogs("getAllChats Requested");
	if (!withinRateLimit()) return (res.send(RateLimitMessage));
	if (!verifyAPIMWSignature(req.query)) return (res.send(SignatureMessage));
	if (!GetOperatorAvailabilitySuccess) return (res.send(WaitMessage));	//make sure all static data has been obtained first
	// finally all good to go
	res.send(JSON.stringify(AllChats));
});

app.get('/apiv1/getChatUpdates', function (req, res) {
	MWexceptions.getChatUpdates++;
	// sendToLogs("getChatUpdates Requested");
	if (!withinRateLimit()) return (res.send(RateLimitMessage));
	if (!verifyAPIMWSignature(req.query)) return (res.send(SignatureMessage));
	if (!GetOperatorAvailabilitySuccess) return (res.send(WaitMessage));	//make sure all static data has been obtained first
	// finally all good to go
	for(var i in DeltaChats) {
		DeltaChats[i] = AllChats[i];
	}
	res.send(JSON.stringify(DeltaChats));
	DeltaChats = new Object();
});

// Functions below this point

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds) {
			break;
		}
	}
}

// validates the signature in the post message data to ensure it came from boldchat
// uncomment when in production
function validateSignature(body, triggerUrl) {
	/* 	var unencrypted = getUnencryptedSignature(body, triggerUrl);
		var encrypted = encryptSignature(unencrypted);
	//	console.log('unencrypted signature', unencrypted);
	//	console.log('computed signature: '+ encrypted);
	//	console.log('trigger signature: '+ body.signature);
		if(encrypted == body.signature)
			return true;		// signature matches all good
	
		var str = "Trigger signature validation error: "+triggerUrl;
		Exceptions.signatureInvalid++;
		sendToLogs(str); */
	return true;	// true while testing - change to false afterwards
}

function getUnencryptedSignature(body, triggerUrl) {
	if (!body.signed) {
		throw new Error('No signed parameter found for computing signature hash');
	}
	var signatureParamNames = body.signed.split('&');

	var paramNameValues = new Array();
	for (var i = 0; i < signatureParamNames.length; i++) {
		var signParam = signatureParamNames[i];
		paramNameValues.push(encodeURIComponent(signParam) + '=' + encodeURIComponent(body[signParam]));
	}

	var separator = triggerUrl.indexOf('?') === -1 ? '?' : '&';
	var unc = triggerUrl + separator + paramNameValues.join('&');
	var adj = unc.replace(/%20/g, '+');		// %20 to a + (old style)
	return adj.replace(/\'/g, '%27');	// ' should be encoded (old style)
}

function encryptSignature(unencryptedSignature) {
	var source = unencryptedSignature + KEY;
	var hash = crypto.createHash('sha512').update(source).digest('hex');
	return hash.toUpperCase();
}

// check if the API request is within or exceeds the rate limit to prevemnt overloading the server
function withinRateLimit() {
	if ((TimeNow - LastAPITimestamp) < RATELIMIT) {
		MWexceptions.rateLimitError++;
		return (false);		// API request is too soon
	}

	LastAPITimestamp = TimeNow;		// set to the current time
	MWexceptions.rateLimitError = 0;
	return (true);		// all good to process
}

// check if the signature in the API request is valid.
// to be valid both the timestamp has to be within 5 mins of server time and
// the signature hashes must match
function verifyAPIMWSignature(params) {
	var time = params.timestamp;
	var apisig = params.signed;
	console.log("timestamp and apisig: " + time + ", " + apisig);
	if (Math.abs(time - TimeNow) > APIREQVALIDTIME)	// make sure this is not a replay of an old request
		return (false);		// API request is too old

	var calcsig = crypto.createHash('sha256').update(time + API_SHARED_SECRET).digest('hex');
	//	console.log("Calcsig: "+calcsig);
	if (calcsig == apisig)		// the calculated signature matches what is in the API request
		return (true);		// all good to process
}

function initialiseGlobals() {
	LoggedInUsers = new Array();
	UsersLoggedIn = new Object();
	AllChats = new Object();
	DeltaChats = new Object();
	Departments = new Object();
	TempDeptList = new Array();
	SkillGroups = new Object();
	DeptOperators = new Object();
	OperatorDepts = new Object();
	OperatorCconc = new Object();
	OperatorSkills = new Object();
	Folders = new Object();
	Operators = new Object();
	CustomStatus = new Object();
	DispositionCats = new Object();	// object of wrapup category id to names
	DispositionStats = new Object();	// object of wrapup statuses id to names
	DispositionCf1s = new Object();	// object of wrapup custom field 1 id to names
	DispositionCf2s = new Object();	// object of wrapup custom field 2 id to names
	TimeNow = new Date();
	LastAPITimestamp = new Date();		// initialise the API request time
	StartOfDay = new Date();
	StartOfDay.setUTCHours(STARTDAY.hours, STARTDAY.minutes, 0, 0);
	if (StartOfDay > TimeNow)
		StartOfDay.setDate(StartOfDay.getDate() - 1)	// previous day if past midnight but before start of day time
	EndOfDay = new Date();
	EndOfDay.setTime(StartOfDay.getTime() + ((24 * 60 * 60 * 1000) - 1));	// 24 hours less one milli from start of day
	console.log("Start of Day: " + StartOfDay.toISOString());
	console.log("End of Day: " + EndOfDay.toISOString());
	Overall = new DashMetrics("Overall", "Overall");
	OperatorsSetupComplete = false;
	InactiveChatsComplete = false;
	ActiveChatsComplete = false;
	ApiDataNotReady = 0;
	Exceptions = new Exception();
	MWexceptions = new MWexception();
	GetOperatorAvailabilitySuccess = false;
	DepartmentOperatorsComplete = false;
	LongWaitChats = new Array();
	TempFolders = new Array();
}

// Set up code for outbound BoldChat API calls.  All of the capture callback code should ideally be packaged as an object.

function BC_API_Request(api_method, params, callBackFunction) {
	var auth = AID + ':' + SETTINGSID + ':' + (new Date()).getTime();
	var authHash = auth + ':' + crypto.createHash('sha512').update(auth + KEY).digest('hex');
	var options = {
		host: 'api.boldchat.com', // ***CHANGE for EU data centres***
		port: 443,
		path: '/aid/' + AID + '/data/rest/json/v1/' + api_method + '?auth=' + authHash + '&' + params,
		method: 'GET',
		secureProtocol: "TLSv1_2_method",
		agent: false
	};
	//	https.request(options, callBackFunction).on('error', function(err){console.log("API request error: "+err.stack)}).end();
	ApiDataNotReady++;		// flag to track api calls
	var getReq = https.request(options, function (res) {
		//		console.log("\nstatus code: ", res.statusCode);
		var str = "";
		res.on('data', function (data) {
			str += data;
		});
		res.on('end', function () {
			ApiDataNotReady--;
			callBackFunction(str);
		});
		res.on('error', function (err) {
			ApiDataNotReady--;
			console.log("API request error: ", err);
		});
	});
	//end the request
	getReq.end();
}

function postToArchive(postdata) {
	var options = {
		host: 'bold360demo.com',
		port: 443,
		path: '~mkerai/APItriggers/h3gexceptions.php',
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain',
			'Content-Length': Buffer.byteLength(postdata)
		}
	};
	var post_req = https.request(options, function (res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			//			console.log('Response: ' + chunk);
		});
	});
	post_req.write(postdata);
	post_req.end();
	post_req.on('error', function (err) { console.log("HTML error" + err.stack) });
}

function debugLog(name, dataobj) {
	console.log(name + ": ");
	for (key in dataobj) {
		if (dataobj.hasOwnProperty(key))
			console.log(key + ":" + dataobj[key]);
	}
}

function sendToLogs(text) {
	console.log(text);
	io.sockets.in(MONITOR_ROOM).emit('consoleLogs', text);
}

function deptsCallback(dlist) {
	var dname, newname, str, sg, ch1, ch2, ch3;
	// sort alphabetically first
	dlist.sort(function (a, b) {
		var nameA = a.Name.toLowerCase();
		var nameB = b.Name.toLowerCase();
		if (nameA < nameB) //sort string ascending
			return -1;
		if (nameA > nameB)
			return 1;
		return 0; //default return value (no sorting)
	});

	for (var i in dlist) {
		dname = dlist[i].Name;
		sg = dname.match("^\\[(.*)]");	// match square brackets at beginning
		if (sg === null) continue;		// dept name does not match a skillgroup in square brackets
		ch1 = dname.indexOf("[");
		ch2 = dname.indexOf("]");
		sg = dname.substring(ch1 + 1, ch2);	// name between the brackets
		if ((ch2 + 1) >= dname.length) continue;
		str = dname.substring(ch2 + 1);		// remainder of the name
		if (str === null) continue;		// ignore if nothing after the square brackets
		ch3 = str.match("[A-Za-z0-9]+").index;
		newname = str.substring(ch3);
		//		newname = dname;	// for testing on non three bold account
		//		console.log("Dept saved: "+newname);
		Departments[dlist[i].DepartmentID] = new DashMetrics(dlist[i].DepartmentID, newname, sg);
		TempDeptList.push(dlist[i].DepartmentID);	// using this to get around API rate limiting issue
		SkillGroups[sg] = new DashMetrics(sg, sg, "n/a");
	}
	sendToLogs("No of Depts: " + Object.keys(Departments).length);
	sendToLogs("No of Skillgroups: " + Object.keys(SkillGroups).length);

	// old way of getting dept operators but gives BC API rate limiting error
	// for (var did in Departments) {
	// 	parameters = "DepartmentID=" + did;
	// 	getApiData("getDepartmentOperators", parameters, deptOperatorsCallback, did);	// extra func param due to API
	// 	sleep(1000);
	// }
	// new way Aug 2020
	getDeptOperators();	// go get the department operators now
}

function operatorsCallback(dlist) {

	// sort alphabetically first
	dlist.sort(function (a, b) {
		var nameA = a.Name.toLowerCase();
		var nameB = b.Name.toLowerCase();
		if (nameA < nameB) //sort string ascending
			return -1;
		if (nameA > nameB)
			return 1;
		return 0; //default return value (no sorting)
	});

	for (var i in dlist)    // create object only for operator who are active (not disabled)
	{
		if (dlist[i].Disabled == null)   // if disabled then object will have a date
			createNewOperatorObject(dlist[i].LoginID, dlist[i].Name);
	}
	sendToLogs("Total No of Operators: " + dlist.length);
	sendToLogs("Active Operators: " + Object.keys(Operators).length);
}

function createNewOperatorObject(opid, name) {
	Operators[opid] = new OpMetrics(opid, name);
	var conc = new Array(1440).fill(0);	// initialise with zeros
	OperatorCconc[opid] = conc;
}

function foldersCallback(dlist) {
	for (var i in dlist) {
		if (dlist[i].FolderType == 5)		// select only chat folder types
		{
			Folders[dlist[i].FolderID] = dlist[i].Name;
		}
	}
	for(var i in Object.keys(Folders))
		TempFolders[i] = Object.keys(Folders)[i];		// required for getting inactive chats later

	sendToLogs("No of Chat Folders: " + Object.keys(Folders).length);
}

function customStatusCallback(dlist) {
	for (var i in dlist) {
		CustomStatus[dlist[i].CustomOperatorStatusID] = dlist[i].Name;
		if (dlist[i].Name == CUSTOMST)
			CUSTOMST_ID = dlist[i].CustomOperatorStatusID
	}
	sendToLogs("No of Custom Statuses: " + Object.keys(CustomStatus).length);
}

function deptOperatorsCallback(dlist, did) {
	DeptOperators[did] = new Array();
	for (var i in dlist) {
		DeptOperators[did].push(dlist[i].LoginID);
	}

	sendToLogs("Operators in dept: " + did + " - " + DeptOperators[did].length);
	// success, so remove this dept id from list of dept
	var index = TempDeptList.indexOf(did);
	if(index != -1) {
		TempDeptList.splice(index, 1);
		getDeptOperators();	// check if we have completed everything
	}
}

function operatorAvailabilityCallback(dlist) {
	// StatusType 0, 1 and 2 is Logged out, logged in as away, logged in as available respectively
	var operator;
	var depts;
	for (var i in dlist) {
		operator = dlist[i].LoginID;
		if (typeof (OperatorSkills[operator]) !== 'undefined' && typeof (Operators[operator]) !== 'undefined')		// check operator id is valid
		{
			Operators[operator].status = dlist[i].StatusType;
			Operators[operator].cstatus = (dlist[i].CustomOperatorStatusID === null ? "" : CustomStatus[dlist[i].CustomOperatorStatusID]);
			if (dlist[i].StatusType != 0)						// not logged out
				Operators[operator].statusdtime = TimeNow;
			// update metrics
			if (dlist[i].StatusType == 1) {
				if (dlist[i].CustomOperatorStatusID == CUSTOMST_ID) {
					Overall.ocustomst++;
					SkillGroups[OperatorSkills[operator]].ocustomst++;
				}
				else {
					Overall.oaway++;
					SkillGroups[OperatorSkills[operator]].oaway++;
				}

				depts = new Array();
				depts = OperatorDepts[operator];
				for (var did in depts) {
					if (dlist[i].CustomOperatorStatusID == CUSTOMST_ID)
						Departments[depts[did]].ocustomst++;
					else
						Departments[depts[did]].oaway++;
				}
			}
			else if (dlist[i].StatusType == 2) {
				Overall.oavail++;
				SkillGroups[OperatorSkills[operator]].oavail++;
				depts = new Array();
				depts = OperatorDepts[operator];
				for (var did in depts) {
					Departments[depts[did]].oavail++;
				}
			}
		}
	}
	GetOperatorAvailabilitySuccess = true;		// we have everything and ready to show real time
}

function operatorCustomStatusCallback(dlist) {
	if (dlist.length > 0)	// make sure return is not null
	{
		var st = (dlist[0].CustomOperatorStatusID == null ? "" : CustomStatus[dlist[0].CustomOperatorStatusID]);
		if (Operators[dlist[0].LoginID].cstatus != st)	// if custom status has changed
		{
			Operators[dlist[0].LoginID].cstatus = st;
			Operators[dlist[0].LoginID].statusdtime = TimeNow;
		}
		sendToLogs("Operator: " + Operators[dlist[0].LoginID].name + ", Status: " + st);
	}
}

// save mapping of disposition code ids (user categories ids) to names for easy reading
function userCategoriesCallback(dlist) {
	for (var i in dlist) {
		DispositionCats[dlist[i].SetupItemID] = dlist[i].Name;
	}
	sendToLogs("No of Disposition Categories: " + Object.keys(DispositionCats).length);
}

// save mapping of disposition code ids (user status ids) to names for easy reading
function userStatusesCallback(dlist) {
	for (var i in dlist) {
		DispositionStats[dlist[i].SetupItemID] = dlist[i].Name;
	}
	sendToLogs("No of Disposition Statuses: " + Object.keys(DispositionStats).length);
}

// save mapping of disposition code ids (custom field1 ids) to names for easy reading
function userCustomField1Callback(dlist) {
	for (var i in dlist) {
		DispositionCf1s[dlist[i].SetupItemID] = dlist[i].Name;
	}
	sendToLogs("No of Disposition Custom Field 1s: " + Object.keys(DispositionCf1s).length);
}

// save mapping of disposition code ids (custom field2 ids) to names for easy reading
function userCustomField2Callback(dlist) {
	for (var i in dlist) {
		DispositionCf2s[dlist[i].SetupItemID] = dlist[i].Name;
	}
	sendToLogs("No of Disposition Custom Field 2s: " + Object.keys(DispositionCf2s).length);
}

// get dept operators - sometimes hits rate limit so need to do it this way
function getDeptOperators() {
	if(TempDeptList.length) {	// if there are more depts to do
		did = TempDeptList[0];
		parameters = "DepartmentID=" + did;
		getApiData("getDepartmentOperators", parameters, deptOperatorsCallback, did);
	}
	else
		DepartmentOperatorsComplete = true;		// set flag that all is done
}

// process started chat object and update all relevat dept, operator and global metrics
function processStartedChat(chat) {
	var deptobj = Departments[chat.DepartmentID];
	if (typeof (deptobj) === 'undefined') return false;		// a dept we are not interested in

	var tchat = AllChats[chat.ChatID];
	if (typeof (tchat) === 'undefined')	  // not yet in today's list
	{
		tchat = new ChatData(chat.ChatID, chat.DepartmentID, Departments[chat.DepartmentID].skillgroup);
	}

	tchat.started = new Date(chat.Started);
	tchat.status = 1;	// waiting to be answered
	AllChats[chat.ChatID] = tchat;		// save this chat details
	DeltaChats[chat.ChatID] = true; // chatID has been updated since last getChatUpdates
	return true;
}

// active chat means a started chat has been answered by an operator so it is no longer in the queue
function processAnsweredChat(chat) {
	var deptobj, opobj, sgobj;

	deptobj = Departments[chat.DepartmentID];
	if (typeof (deptobj) === 'undefined') return false;		// a dept we are not interested in
	sgobj = SkillGroups[deptobj.skillgroup];

	if (typeof (AllChats[chat.ChatID]) === 'undefined')	// this only happens if triggers are missed
	{
		Exceptions.chatAnsweredNotInList++;
		processStartedChat(chat);
	}

	AllChats[chat.ChatID].answered = (chat.Answered == "") ? new Date() : new Date(chat.Answered);
	AllChats[chat.ChatID].operatorID = chat.OperatorID;
	AllChats[chat.ChatID].status = 2;		// active chat
	DeltaChats[chat.ChatID] = true; // chatID has been updated since last getChatUpdates

	Overall.tcan++;	// answered chats
	sgobj.tcan++;
	deptobj.tcan++;

	opobj = Operators[chat.OperatorID];
	if (typeof (opobj) === 'undefined') return false;		// an operator that doesnt exist (may happen if created midday)
	opobj.tcan++;
	opobj.activeChats.push(chat.ChatID);

	var speed = Math.round((AllChats[chat.ChatID].answered - AllChats[chat.ChatID].started) / 1000); // calc speed to answer for this chat
	if (speed < 7200)		// make sure it is sensible 60sec * 60min * 2 hours
	{
		Overall.tata = Overall.tata + speed;
		deptobj.tata = deptobj.tata + speed;
		sgobj.tata = sgobj.tata + speed;
		opobj.tata = opobj.tata + speed;
		Overall.asa = Math.round(Overall.tata / Overall.tcan);
		deptobj.asa = Math.round(deptobj.tata / deptobj.tcan);
		sgobj.asa = Math.round(sgobj.tata / sgobj.tcan);
		opobj.asa = Math.round(opobj.tata / opobj.tcan);

		if (speed < SLATHRESHOLD)		// sla threshold in seconds
		{
			Overall.csla++;
			deptobj.csla++;
			sgobj.csla++;
			opobj.csla++;
		}
	}
	return true;
}

// process re-assigned chat object
function processReassignedChat(chat) {

	var deptobj = Departments[chat.DepartmentID];
	if (typeof (deptobj) === 'undefined') return false;		// a dept we are not interested in
	var sgobj = SkillGroups[deptobj.skillgroup];

	if (typeof (AllChats[chat.ChatID]) === 'undefined')	// this only happens if triggers are missed
	{
		processStartedChat(chat);
		if (chat.Answered !== "" && chat.Answered !== null) {
			processAnsweredChat(chat);
		}
	}

	var tchat = AllChats[chat.ChatID];
	DeltaChats[chat.ChatID] = true; // chatID has been updated since last getChatUpdates
	if (tchat.operatorID != 0 && tchat.operatorID != '')// only adjust metrics if reassigned after answered previously
	{
		if (typeof Operators[tchat.operatorID] != 'undefined') {
			removeActiveChat(Operators[tchat.operatorID], chat.ChatID); // remove from previous op
			Operators[tchat.operatorID].tcan--;		// remove chat answereed credit from this operator
			Departments[tchat.departmentID].tcan--;		// remove chat answereed credit from this dept
			SkillGroups[tchat.skillgroup].tcan--;		// remove chat answereed credit from this skillgroup
		}
		var opobj = Operators[chat.OperatorID];
		if (typeof (opobj) === 'undefined') return false;		// an operator that doesnt exist (may happen if created midday)

		//		console.log("Previous Operator: "+Operators[tchat.operatorID].name);
		//		console.log("New Operator: "+opobj.name);
		tchat.operatorID = chat.OperatorID;		// assign new operator to this chat
		tchat.departmentID = chat.DepartmentID;	// assign new department to this chat
		opobj.tcan++;							// and give him credit
		opobj.activeChats.push(chat.ChatID);	// credit the new operator
		deptobj.tcan++;							// and dept
		sgobj.tcan++;							// and skillgroup
	}
}

// process closed chat object. closed chat is one that is started and answered.
// Otherwise go to processwindowclosed
function processClosedChat(chat) {

	var deptobj = Departments[chat.DepartmentID];
	if (typeof (deptobj) === 'undefined') return false;		// a dept we are not interested in
	var sgobj = SkillGroups[deptobj.skillgroup];

	if (typeof (AllChats[chat.ChatID]) === 'undefined')	// this only happens if triggers are missed
	{
		Exceptions.chatClosedNotInList++;
		processStartedChat(chat);
		if (chat.Answered !== "" && chat.Answered !== null) {
			processAnsweredChat(chat);
		}
	}

	AllChats[chat.ChatID].status = 0;		// inactive/complete/cancelled/closed
	AllChats[chat.ChatID].ended = (chat.Ended == "") ? new Date() : new Date(chat.Ended);
	AllChats[chat.ChatID].closed = new Date(chat.Closed);
	AllChats[chat.ChatID].disposition_cat = DispositionCats[chat.UserCategoryID];
	AllChats[chat.ChatID].disposition_stat = DispositionStats[chat.UserStatusID];
	AllChats[chat.ChatID].disposition_cf1 = DispositionCf1s[chat.CustomField1ID];
	AllChats[chat.ChatID].disposition_cf2 = DispositionCf2s[chat.CustomField2ID];
	DeltaChats[chat.ChatID] = true; // chatID has been updated since last getChatUpdates

	var opobj = Operators[AllChats[chat.ChatID].operatorID];
	if (typeof (opobj) === 'undefined') return false;	// shouldnt happen
	// remove from active chat list and update stats
	removeActiveChat(opobj, chat.ChatID);

	opobj.tcc++;		//chats closed
	Overall.tcc++;
	deptobj.tcc++;
	sgobj.tcc++;
	// add the total chat time for this chat
	var chattime = Math.round((AllChats[chat.ChatID].ended - AllChats[chat.ChatID].answered) / 1000);
	if (chattime < 18000)	// make sure it is sensible 60sec * 60min * 5 hours as some chats get left open for days
	{
		opobj.tcta = opobj.tcta + chattime;
		Overall.tcta = Overall.tcta + chattime;
		deptobj.tcta = deptobj.tcta + chattime;
		sgobj.tcta = sgobj.tcta + chattime;

		opobj.act = Math.round(opobj.tcta / opobj.tcc);
		Overall.act = Math.round(Overall.tcta / Overall.tcc);
		deptobj.act = Math.round(deptobj.tcta / deptobj.tcc);
		sgobj.act = Math.round(sgobj.tcta / sgobj.tcc);
	}
	updateCconc(AllChats[chat.ChatID]);	// update chat conc now that it is closed
	return true;
}

// process window closed chat object. This happens if visitor closes chat by closing the window
function processWindowClosed(chat) {
	var deptobj, opobj, sgobj;

	deptobj = Departments[chat.DepartmentID];
	if (typeof (deptobj) === 'undefined') return false;		// a dept we are not interested in
	sgobj = SkillGroups[deptobj.skillgroup];

	if (typeof (AllChats[chat.ChatID]) === 'undefined') // add to list
	{
		AllChats[chat.ChatID] = new ChatData(chat.ChatID, chat.DepartmentID, deptobj.skillgroup);
	}

	AllChats[chat.ChatID].status = 0;		// inactive/complete/cancelled/closed
	AllChats[chat.ChatID].statustype = chat.ChatStatusType;
	AllChats[chat.ChatID].operatorID = chat.OperatorID;
	AllChats[chat.ChatID].ended = new Date(chat.Ended);
	AllChats[chat.ChatID].closed = new Date(chat.Closed);
	DeltaChats[chat.ChatID] = true; // chatID has been updated since last getChatUpdates
	if (AllChats[chat.ChatID].winclosed == 0)		// check this is not double counting
	{
		AllChats[chat.ChatID].winclosed = new Date(chat.WindowClosed);
		if (chat.ChatStatusType == 1)		// abandoned (closed during pre chat form) chats
		{
			Exceptions.chatsAbandoned++;
			Overall.tcaban++;
			return false;
		}
		if (chat.ChatStatusType == 10 || chat.ChatStatusType == 18)		// blocked chats
		{
			Exceptions.chatsBlocked++;
		}

		if (chat.ChatStatusType == 7 || chat.ChatStatusType == 8 || (chat.ChatStatusType >= 11 && chat.ChatStatusType <= 15))	// unavailable chat 7, 8, 11, 12, 13, 14 or 15
		{
			if (chat.Answered == "" || chat.Answered == null)	// only count as unavail if not answered
			{
				Overall.tcun++;
				deptobj.tcun++;
				sgobj.tcun++;
			}
		}
		else if (AllChats[chat.ChatID].answered == 0 && AllChats[chat.ChatID].started != 0)		// chat started but unanswered and now win closed
		{
			if (chat.OperatorID == "" || chat.OperatorID == null)	// operator unassigned
			{
				Overall.tcuq++;
				deptobj.tcuq++;
				sgobj.tcuq++;
			}
			else {
				Overall.tcua++;
				deptobj.tcua++;
				sgobj.tcua++;
			}
		}
		updateCSAT(chat);
	}
	return true;
}

// process operator status changed2. This leave it for the another func to add up everything
function processOperatorStatusChanged2(ostatus) {

	var opid = ostatus.LoginID;
	if (typeof (Operators[opid]) === 'undefined') return true;
	//		createNewOperatorObject(opid,ostatus.Name);

	var oldstatus = Operators[opid].status	// save old status for later processing
	Operators[opid].status = ostatus.StatusType;	// new status - 0, 1 or 2
	if (ostatus.StatusType == 0)		// logged out
	{
		if (oldstatus == 2)  // operator was online and logged out
		{
			Operators[opid].tot += Operators[opid].tcs; // add 'online' time to total
		}
		if (oldstatus == 1)  // opeartor was away and logged out
		{
			Operators[opid].tat += Operators[opid].tcs; // add 'away' time to total
		}

		Operators[opid].cstatus = "";
		//		Operators[opid].statusdtime = 0;	// reset if operator logged out
		Operators[opid].activeChats = new Array();	// reset active chats in case there are any transferred
		return true;
	}

	if (ostatus.StatusType !== oldstatus)	// make sure this is an actual change
	{
		Operators[opid].cstatus = "";
		Operators[opid].statusdtime = TimeNow;	// reset time in current status
	}

	if (ostatus.StatusType == 1)		// if away Get the custom status via async API call as currently not available in the trigger
	{
		getApiData("getOperatorAvailability", "ServiceTypeID=1&OperatorID=" + opid, operatorCustomStatusCallback);
		if (oldstatus == 2) // from online to away
		{
			Operators[opid].tot += Operators[opid].tcs;
		}
	}
	if (ostatus.StatusType == 2 && oldstatus == 1) // changed from away to online 
	{
		Operators[opid].tat += Operators[opid].tcs; // add to total away time
	}
	// console.log('total online time: ', Operators[opid].tot)
	// console.log('total away time: ', Operators[opid].tat)
	return true;
}

// This is called after chat is closed to save concurrency time
function updateCconc(tchat) {
	if (tchat.answered == 0)	// if not answered chat then ignore
		return;

	var sh, sm, eh, em, sindex, eindex;
	var conc = new Array();
	conc = OperatorCconc[tchat.operatorID];		// chat concurrency array

	sh = tchat.answered.getHours();
	sm = tchat.answered.getMinutes();
	eh = tchat.closed.getHours();
	em = tchat.closed.getMinutes();
	sindex = (sh * 60) + sm;	// convert to minutes from midnight
	eindex = (eh * 60) + em;	// convert to minutes from midnight
	for (var count = sindex; count <= eindex; count++) {
		conc[count]++; // save chat activity for the closed chats
	}
	OperatorCconc[tchat.operatorID] = conc;		// save it back for next time
	calculateOperatorConc(tchat.operatorID);
}

function updateCSAT(chat) {
	var chatobj = AllChats[chat.ChatID];
	if (typeof chatobj === 'undefined') return false;
	chatobj.rateadvisor = Number(chat.rateadvisor) || null;
	chatobj.NPS = Number(chat.NPS) || null;
	chatobj.resolved = chat.resolved || null;

/* Update oct 2020 - RTA dashboard in no longer doing the calculations	
	var opobj = Operators[chat.OperatorID];
	var deptobj = Departments[chat.DepartmentID];
	if (typeof (opobj) === 'undefined' || typeof (deptobj) === 'undefined') return;
	var sgobj = SkillGroups[deptobj.skillgroup];

	var nums = sgobj.csat.surveys++;
	var numd = deptobj.csat.surveys++;
	var numo = opobj.csat.surveys++;

	sgobj.csat.NPS = ((sgobj.csat.NPS * nums) + chatobj.csat.NPS) / sgobj.csat.surveys;
	sgobj.csat.OSAT = ((sgobj.csat.OSAT * nums) + chatobj.csat.OSAT) / sgobj.csat.surveys;
	sgobj.csat.FCR = ((sgobj.csat.FCR * nums) + chatobj.csat.FCR) / sgobj.csat.surveys;
	sgobj.csat.Resolved = ((sgobj.csat.Resolved * nums) + chatobj.csat.Resolved) / sgobj.csat.surveys;

	deptobj.csat.NPS = ((deptobj.csat.NPS * numd) + chatobj.csat.NPS) / deptobj.csat.surveys;
	deptobj.csat.OSAT = ((deptobj.csat.OSAT * numd) + chatobj.csat.OSAT) / deptobj.csat.surveys;
	deptobj.csat.FCR = ((deptobj.csat.FCR * numd) + chatobj.csat.FCR) / deptobj.csat.surveys;
	deptobj.csat.Resolved = ((deptobj.csat.Resolved * numd) + chatobj.csat.Resolved) / deptobj.csat.surveys;

	opobj.csat.NPS = ((opobj.csat.NPS * numo) + chatobj.csat.NPS) / opobj.csat.surveys;
	opobj.csat.OSAT = ((opobj.csat.OSAT * numo) + chatobj.csat.OSAT) / opobj.csat.surveys;
	opobj.csat.FCR = ((opobj.csat.FCR * numo) + chatobj.csat.FCR) / opobj.csat.surveys;
	opobj.csat.Resolved = ((opobj.csat.Resolved * numo) + chatobj.csat.Resolved) / opobj.csat.surveys;
*/
	return true;
}

function removeActiveChat(opobj, chatid) {
	var achats = new Array();
	achats = opobj.activeChats;
	for (var x in achats) // go through each chat
	{
		if (achats[x] == chatid) {
			achats.splice(x, 1);
			opobj.activeChats = achats;		// save back after removing
		}
	}
}
// calculate Chat per hour - done after chats are complete (closed)
function calculateCPH() {
	var tchat;
	var pastHour = TimeNow - (60 * 60 * 1000);	// Epoch time for past hour

	Overall.cph = 0;
	for (var i in Departments) {
		Departments[i].cph = 0;
		SkillGroups[Departments[i].skillgroup].cph = 0;
	}

	for (var i in Operators) {
		Operators[i].cph = 0;
	}

	for (var i in AllChats) {
		tchat = AllChats[i];
		if (tchat.closed != 0)		// chat closed
		{
			if (tchat.departmentID == 0 || tchat.skillgroup == 0)	// shouldnt be
				continue;
			if (tchat.closed >= pastHour) {
				Overall.cph++;
				Departments[tchat.departmentID].cph++;
				SkillGroups[tchat.skillgroup].cph++;
				if (typeof (Operators[tchat.operatorID]) !== 'undefined')		// make sure operator id is not missing
					Operators[tchat.operatorID].cph++;
			}
		}
	}
}

function calculateLWT_CIQ_TAC() {
	var tchat, waittime;
	var maxwait = 0;

	Overall.ciq = 0;
	Overall.tac = 0;
	// first zero out the lwt for all dept
	for (var i in Departments) {
		Departments[i].lwt = 0;
		Departments[i].ciq = 0;
		Departments[i].tac = 0;
		SkillGroups[Departments[i].skillgroup].lwt = 0;
		SkillGroups[Departments[i].skillgroup].ciq = 0;
		SkillGroups[Departments[i].skillgroup].tac = 0;
	}

	// now recalculate the lwt by dept and save the overall
	for (var i in AllChats) {
		tchat = AllChats[i];
		if (tchat.status === 1)	{	// chat not answered yet
			Overall.ciq++;
			Departments[tchat.departmentID].ciq++;
			SkillGroups[Departments[tchat.departmentID].skillgroup].ciq++;
			waittime = Math.round((TimeNow - tchat.started) / 1000);
			if (waittime > INQTHRESHOLD) {		// if this chat has been waiting a long time
				if (LongWaitChats.indexOf(tchat.chatID) == -1)	// add to list if not already in
					LongWaitChats.push(tchat.chatID);
			}

			if (Departments[tchat.departmentID].lwt < waittime)
				Departments[tchat.departmentID].lwt = waittime;

			if (SkillGroups[tchat.skillgroup].lwt < waittime)
				SkillGroups[tchat.skillgroup].lwt = waittime;

			if (maxwait < waittime)
				maxwait = waittime;
		}
		else if (tchat.status === 2) {	// active chat
			Overall.tac++;
			Departments[tchat.departmentID].tac++;
			SkillGroups[tchat.skillgroup].tac++;
		}
	}
	Overall.lwt = maxwait;
}

//use operators by dept to calc chat concurrency and available chat capacity and total chats offered
function calculateACC_CCONC() {
	var depts = new Array();
	var opobj, sgid;

	// first zero out the cconc and acc for all dept
	Overall.cconc = 0;
	Overall.acc = 0;
	Overall.tct = 0;
	Overall.mct = 0;
	for (var i in Departments) {
		Departments[i].cconc = 0;
		Departments[i].acc = 0;
		Departments[i].tct = 0;
		Departments[i].mct = 0;
		SkillGroups[Departments[i].skillgroup].cconc = 0;
		SkillGroups[Departments[i].skillgroup].acc = 0;
		SkillGroups[Departments[i].skillgroup].tct = 0;
		SkillGroups[Departments[i].skillgroup].mct = 0;
	}

	for (var i in OperatorDepts) {
		depts = OperatorDepts[i];
		if (typeof (depts) === 'undefined') continue;	// dept not recognised

		opobj = Operators[i];
		if (typeof (opobj) === 'undefined') continue;	// operator not recognised

		if (opobj.tct != 0)
			opobj.cconc = ((opobj.tct + opobj.mct) / opobj.tct).toFixed(2);

		if (opobj.statusdtime != 0)
			opobj.tcs = Math.round(((TimeNow - opobj.statusdtime)) / 1000);
		else
			opobj.tcs = 0;

		Overall.tct = Overall.tct + opobj.tct;
		Overall.mct = Overall.mct + opobj.mct;
		sgid = OperatorSkills[i];
		SkillGroups[sgid].tct = SkillGroups[sgid].tct + opobj.tct;
		SkillGroups[sgid].mct = SkillGroups[sgid].mct + opobj.mct;
		if (opobj.status == 2)		// make sure operator is available
		{
			opobj.acc = opobj.maxcc - opobj.activeChats.length
			if (opobj.acc < 0) opobj.acc = 0;			// make sure not negative
			Overall.acc = Overall.acc + opobj.acc;
			SkillGroups[sgid].acc = SkillGroups[sgid].acc + opobj.acc;
		}
		else
			opobj.acc = 0;			// available capacity is zero if not available
		// all depts that the operator belongs to
		for (var x in depts) {
			Departments[depts[x]].tct = Departments[depts[x]].tct + opobj.tct;
			Departments[depts[x]].mct = Departments[depts[x]].mct + opobj.mct;
			Departments[depts[x]].acc = Departments[depts[x]].acc + opobj.acc;
		}
	}

	// calculate TCO
	Overall.tco = Overall.tcan + Overall.tcua + Overall.tcuq;
	if (Overall.tct != 0)
		Overall.cconc = ((Overall.tct + Overall.mct) / Overall.tct).toFixed(2);

	for (var did in Departments) {
		Departments[did].tco = Departments[did].tcan + Departments[did].tcuq + Departments[did].tcua;
		if (Departments[did].tct != 0)		// dont divide by zero
			Departments[did].cconc = ((Departments[did].tct + Departments[did].mct) / Departments[did].tct).toFixed(2);
	}
	for (var sgid in SkillGroups) {
		SkillGroups[sgid].tco = SkillGroups[sgid].tcan + SkillGroups[sgid].tcuq + SkillGroups[sgid].tcua;
		if (SkillGroups[sgid].tct != 0)		// dont divide by zero
			SkillGroups[sgid].cconc = ((SkillGroups[sgid].tct + SkillGroups[sgid].mct) / SkillGroups[sgid].tct).toFixed(2);
	}
}

// go through each operator status and tally up
function calculateOperatorStatuses() {
	var depts;
	// first zero out everything
	Overall.oaway = 0;
	Overall.ocustomst = 0;
	Overall.oavail = 0;
	for (var i in Departments) {
		Departments[i].oaway = 0;
		Departments[i].ocustomst = 0;
		Departments[i].oavail = 0;
		SkillGroups[Departments[i].skillgroup].oaway = 0;
		SkillGroups[Departments[i].skillgroup].ocustomst = 0;
		SkillGroups[Departments[i].skillgroup].oavail = 0;
	}

	for (var opid in Operators) {
		depts = new Array();
		depts = OperatorDepts[opid];
		if (typeof (depts) === 'undefined') continue;	// operator depts not recognised

		if (Operators[opid].status == 2)	// available
		{
			Operators[opid].apc = (Operators[opid].tat / (Operators[opid].tot + Operators[opid].tcs + Operators[opid].tat)).toFixed(2) * 100;
			Overall.oavail++;
			SkillGroups[OperatorSkills[opid]].oavail++;
			for (var did in depts) {
				Departments[depts[did]].oavail++;
			}
			Operators[opid].s
		}
		else if (Operators[opid].status == 1 && Operators[opid].cstatus == CUSTOMST)	// shrinkage
		{
			Operators[opid].apc = ((Operators[opid].tat + Operators[opid].tcs) / (Operators[opid].tot + Operators[opid].tcs + Operators[opid].tat)).toFixed(2) * 100;
			Overall.ocustomst++;
			SkillGroups[OperatorSkills[opid]].ocustomst++;
			for (var did in depts) {
				Departments[depts[did]].ocustomst++;
			}
		}
		else if (Operators[opid].status == 1) // must be just away
		{
			Operators[opid].apc = ((Operators[opid].tat + Operators[opid].tcs) / (Operators[opid].tot + Operators[opid].tcs + Operators[opid].tat)).toFixed(2) * 100;
			Overall.oaway++;
			SkillGroups[OperatorSkills[opid]].oaway++;
			for (var did in depts) {
				Departments[depts[did]].oaway++;
			}
		}
	}
}

// this function calls API again if data is truncated
function loadNext(method, next, callback, params) {
	var str = [];
	for (var key in next) {
		if (next.hasOwnProperty(key)) {
			str.push(encodeURIComponent(key) + "=" + encodeURIComponent(next[key]));
		}
	}
	getApiData(method, str.join("&"), callback, params);
}

// calls extraction API and receives JSON objects
function getApiData(method, params, fcallback, cbparam) {
	var emsg;
	BC_API_Request(method, params, function (str) {
		var jsonObj;
		try {
			jsonObj = JSON.parse(str);
		}
		catch (e) {
			Exceptions.APIJsonError++;
			emsg = TimeNow + ": API did not return JSON message: " + str;
			sendToLogs(emsg);
			return;
		}
		var data = new Array();
		data = jsonObj.Data;
		if (data === 'undefined' || data == null) {
			if(str.indexOf("simultaneous") !== -1) {	// if we get "too many simultanoeous requests error"
				sendToLogs("Api Data Re-requests: "+Exceptions.ApiRerequests++ +"method: "+method+" Param: "+cbparam);
				setTimeout(function () {getApiData(method,params,fcallback,cbparam)},5000);
			}
			else {
				Exceptions.noJsonDataMsg++;
				emsg = TimeNow + ":" + method + ": No data: " + str;
				sendToLogs(emsg);
			}
			return;
		}
		fcallback(data, cbparam);

		var next = jsonObj.Next;
		if (typeof next !== 'undefined') {
			loadNext(method, next, fcallback, cbparam);
		}
	});
}

// calculate total chat times for concurrency for indiv operator
function calculateOperatorConc(opid) {
	var opobj = Operators[opid];
	if (typeof (opobj) === 'undefined') return;
	var chattime = 0;
	var mchattime = 0;
	var conc = new Array();
	conc = OperatorCconc[opid];
	for (var i in conc) {
		if (conc[i] > 0) chattime++;		// all chats
		for (var j = 1; conc[i] > j; j++)	// multichats
		{
			mchattime++;	// multichats
		}
	}
	opobj.tct = chattime * 60;			// minutes to seconds
	opobj.mct = mchattime * 60;		// minutes to seconds
}

// gets operator availability info
function getOperatorAvailabilityData() {
	if (!OperatorsSetupComplete || !InactiveChatsComplete) {
		console.log("Static data not ready (OA): " + ApiDataNotReady);
		setTimeout(getOperatorAvailabilityData, 2000);
		return;
	}
	getApiData("getOperatorAvailability", "ServiceTypeID=1", operatorAvailabilityCallback);
	console.log("Getting Operator Availability");
	setTimeout(checkOperatorAvailability, 60000);		// check if successful after a minute
}

// gets current active chats - used during startup only
function getActiveChatData() {
	if (!OperatorsSetupComplete) {
		console.log("Static data not ready (AC): " + ApiDataNotReady);
		setTimeout(getActiveChatData, 1000);
		return;
	}

	// Need to do this one at a time per dept to avoid the rate limit issue
	TempDeptList = new Array();
	for(var i in Departments) {
		TempDeptList.push(i);
	}

	console.log("Getting active chat info from " + Object.keys(Departments).length + " departments");
	if(TempDeptList.length) {	// make sure there are departments configured
		var did = TempDeptList[0];
		var parameters = "DepartmentID=" + did;
		getApiData("getActiveChats", parameters, allActiveChatsCallback,did);
	}
}

// setup dept and skills by operator for easy indexing. Called during start up only
function setUpDeptAndSkillGroups() {
	if (ApiDataNotReady || !DepartmentOperatorsComplete) {
		console.log("Static data not ready (setD&SG): " + ApiDataNotReady);
		setTimeout(setUpDeptAndSkillGroups, 2000);
		return;
	}

	var ops, depts;
	for (var did in Departments) {
		ops = new Array();
		ops = DeptOperators[did];
		for (var k in ops) {
			depts = OperatorDepts[ops[k]];
			if (typeof (depts) === 'undefined')
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
function allActiveChatsCallback(chats,did) {
	for (var i in chats) {
		if (chats[i].Started !== "" && chats[i].Started !== null) {
			if (processStartedChat(chats[i])) {	// started, waiting to be answered
				if (chats[i].Answered !== "" && chats[i].Answered !== null)
					processAnsweredChat(chats[i]);	// chat was answered
			}
		}
	}
	console.log(chats.length +" active chats from dept: " + Departments[did].name);
	// process the next dept
	// remove this dept id from list of depts to process
	var index = TempDeptList.indexOf(did);
	if(index != -1) {
		TempDeptList.splice(index, 1);
		if(TempDeptList.length) {	// make sure there are departments configured
			var did = TempDeptList[0];
			var parameters = "DepartmentID=" + did;
			getApiData("getActiveChats", parameters, allActiveChatsCallback,did);
		}
		else
			ActiveChatsComplete = true;		// set flag that all is done
	}
}

// If chats have been waiting to be answered a long time then trigger may be missed so
// get individual chat info. This is done every minute in case triggers are missed
function longWaitChatsTimer() {
	if (LongWaitChats.length > 0)	// check not empty
	{
		parameters = "ChatID=" + LongWaitChats.shift();	// get from FIFO
		getApiData("getChat", parameters, updateLongWaitChat);
		Exceptions.longWaitChats++;
	}
}

// Process the long wait chat in case triggers were missed
function updateLongWaitChat(chat) {

	if (typeof (AllChats[chat.ChatID]) !== 'undefined') {
		if (chat.Answered !== "" && chat.Answered !== null) {
			if (AllChats[chat.ChatID].status === 1)	// if chat was waiting to be answered
			{
				processAnsweredChat(chat);
				Exceptions.longWaitChatUpdate++;
				if (chat.Closed !== "" && chat.Closed !== null) {
					processClosedChat(chat);
				}
			}
		}
		else if (chat.WindowClosed !== "" && chat.WindowClosed !== null) {
			if (AllChats[chat.ChatID].status === 1)	// if chat was waiting to be answered now closed means unanswered
			{
				processWindowClosed(chat);
				Exceptions.longWaitChatUpdate++;
			}
		}
	} // if not answered or closed then this chat must still be in the queue so ignore
}

// process all inactive (closed) chat objects - only used during startup
function allInactiveChatsCallback(chats,fid) {
	for (var i in chats) {
		if (chats[i].Started !== "" && chats[i].Started !== null) {
			if (processStartedChat(chats[i])) {	// started
				if (chats[i].Answered !== "" && chats[i].Answered !== null) {
					if (processAnsweredChat(chats[i])) {	//  answered
						if (processClosedChat(chats[i])) {	// and closed
							if(chats[i].CustomFields !== null) {
								var chatobj = AllChats[chats[i].ChatID];	// At this point chat obj will always exist
								if(chats[i].CustomFields.NPS !== null)
									chatobj.NPS = Number(chats[i].CustomFields.NPS);
								if(chats[i].CustomFields.rateadvisor !== null)
									chatobj.rateadvisor = Number(chats[i].CustomFields.rateadvisor);
								if(chats[i].CustomFields.resolved !== null)
									chatobj.resolved = chats[i].CustomFields.resolved;
							}
						}
					}
				}
				else
					processWindowClosed(chats[i]);	// closed after starting before being answered
			}
		}
		else
			processWindowClosed(chats[i]);	// closed because unavailable or abandoned
	}
	// process the next folder
	// remove this folder id from list of folders to process
	var index = TempFolders.indexOf(fid);
	if(index != -1) {
		TempFolders.splice(index, 1);
		if(TempFolders.length) {	// if there are more folders to do
			fid = TempFolders[0];
			sendToLogs("Requesting chats for folder: "+Folders[fid]+"("+(TempFolders.length)+"/"+Object.keys(Folders).length+")");
			parameters = "FolderID=" + fid + "&FromDate=" + StartOfDay.toISOString();
			getApiData("getInactiveChats",parameters,allInactiveChatsCallback,fid);
		}
		else
			InactiveChatsComplete = true;		// set flag that all is done
	}
}

// gets today's chat data incase system was started during the day
function getInactiveChatData() {
	if (!OperatorsSetupComplete || !ActiveChatsComplete) {
		console.log("Static data not ready (IC): " + ApiDataNotReady);
		setTimeout(getInactiveChatData, 1000);
		return;
	}

	// set date to start of today. Search seems to work by looking at closed time i.e. everything that closed after
	// "FromDate" will be included even if the created datetime is before the FromDate.
	console.log("Getting inactive chat info from " + Object.keys(Folders).length + " folders");
	console.log("Start Date: " + StartOfDay.toISOString());
	var fid = TempFolders[0];		// first folder
	parameters = "FolderID=" + fid + "&FromDate=" + StartOfDay.toISOString();
	getApiData("getInactiveChats", parameters, allInactiveChatsCallback,fid);
}

function getCsvChatData() {
	var key, value;
	var csvChats = "";
	var tchat = new Object();
	// add csv header using first object
	key = Object.keys(AllChats)[0];
	tchat = AllChats[key];
	for (key in tchat) {
		csvChats = csvChats + key + ",";
	}
	csvChats = csvChats + "\r\n";
	// now add the data
	for (var i in AllChats) {
		tchat = AllChats[i];
		for (key in tchat) {
			if (key === "departmentID")
				value = Departments[tchat[key]].name;
			else if (key === "operatorID") {
				if (typeof (Operators[tchat[key]]) !== 'undefined')
					value = Operators[tchat[key]].name;
			}
			else if (!isNaN(tchat[key]))
				value = "\"=\"\"" + tchat[key] + "\"\"\"";

			else if (key === "csat")
				value = JSON.stringify(tchat[key]);

			else
				value = tchat[key];

			csvChats = csvChats + value + ",";
		}
		csvChats = csvChats + "\r\n";
	}
	return (csvChats);
}

// Set up socket actions and responses
io.on('connection', function (socket) {

	//  authenticate user name and password
	socket.on('authenticate', function (user) {
		console.log("authentication request received for: " + user.name);
		sendToLogs("authentication request received for: " + user.name);
		if (typeof (AuthUsers[user.name]) === 'undefined') {
			socket.emit('authErrorResponse', "Username not valid");
		}
		else if (AuthUsers[user.name] != user.pwd) {
			socket.emit('authErrorResponse', "Password not valid");
		}
		else {
			//	console.log("Save socket "+socket.id);
			LoggedInUsers.push(socket.id);		// save the socket id so that updates can be sent
			UsersLoggedIn[socket.id] = user.name;	// save the user name for monitoring purposes
			io.sockets.sockets[user.name] = socket.id;
			socket.emit('authResponse', { name: user.name, pwd: user.pwd });
			sendToLogs("authentication successful: " + user.name);
		}
	});

	socket.on('disconnect', function (data) {
		console.log("connection disconnect. Socket id: " + socket.id);
		var index = LoggedInUsers.indexOf(socket.id);
		if (index > -1) LoggedInUsers.splice(index, 1);	// remove from list of valid users

		if (UsersLoggedIn[socket.id] !== undefined) {
			var username = UsersLoggedIn[socket.id];
			console.log("Disconnected User: " + username);
			UsersLoggedIn[socket.id] = undefined;
			if (io.sockets.sockets[username] !== undefined)
				io.sockets.sockets[username] = undefined;
		}
	});

	socket.on('end', function (data) {
		removeSocket(socket.id, "end");
	});

	socket.on('connect_timeout', function (data) {
		removeSocket(socket.id, "timeout");
	});

	socket.on('downloadChats', function (data) {
		sendToLogs("Download chats requested");
		var csvdata = getCsvChatData();
		socket.emit('chatsCsvResponse', csvdata);
	});

	socket.on('updateCustomStatus', function (data) {
		getApiData("getOperatorAvailability", "ServiceTypeID=1&OperatorID=" + data, operatorCustomStatusCallback);
	});

	socket.on('deptOperatorsRequest', function (data) {
		socket.emit('deptOperatorsResponse', DeptOperators);
	});

	socket.on('join room', function (room) {
		if (LoggedInUsers.indexOf(socket.id) < 0)
			console.log("Security error - trying to join room without logging in");
		else {
			console.log("Joining room " + room);
			socket.join(room);
		}
	});
});

function removeSocket(id, evname) {
	sendToLogs("Socket " + evname + " at " + TimeNow);
	var index = LoggedInUsers.indexOf(id);
	if (index >= 0) LoggedInUsers.splice(index, 1);	// remove from list of valid users
}

function calculateChatStats() {

	if (!OperatorsSetupComplete) return;		//try again later

	TimeNow = new Date();		// update the time for all calculations
	if (TimeNow > EndOfDay)		// we have skipped to a new day
	{
		console.log(TimeNow.toISOString() + ": New day started, stats reset");
		var csvdata = getCsvChatData();
		//		postToArchive(csvdata);		// for debugging purposes only
		//		console.log("End of day archived successfully");
		clearInterval(UpdateMetricsIntID);
		clearInterval(CalculateMetricsIntID);
		clearInterval(LongWaitChatsIntID);
		setTimeout(doStartOfDay, 30000);	//restart after 30 seconds to give time for ajaxes to complete
		return;
	}
	//	calculateTCAN_TCUA_TCUQ();
	calculateLWT_CIQ_TAC();
	calculateCPH();
	calculateACC_CCONC();
	calculateOperatorStatuses();
}

function updateChatStats() {

	if (!OperatorsSetupComplete) return;		//try again later

	var str = TimeNow.toISOString() + ": Today's chats: " + Object.keys(AllChats).length;
	//	str = str + "\r\nClients connected: "+io.eio.clientsCount;	// useful for debuging socket.io errors
	sendToLogs(str);
	io.sockets.in(OVERALL_ROOM).emit('overallStats', Overall);
	io.sockets.in(SKILLGROUP_ROOM).emit('skillGroupStats', SkillGroups);
	io.sockets.in(DEPARTMENT_ROOM).emit('departmentStats', Departments);
	io.sockets.in(OPERATOR_ROOM).emit('operatorStats', Operators);
	io.sockets.in(MONITOR_ROOM).emit('exceptions', Exceptions);
	io.sockets.in(MONITOR_ROOM).emit('mwExceptions', MWexceptions);
	io.sockets.in(MONITOR_ROOM).emit('usersLoggedIn', UsersLoggedIn);
}

// setup all globals
function doStartOfDay() {
	initialiseGlobals();	// zero all memory
	getApiData("getDepartments", 0, deptsCallback);
	sleep(500);
	getApiData("getOperators", 0, operatorsCallback);
	sleep(2000);			// wait longer as there are thousands of operators
	getApiData("getFolders", "FolderType=5", foldersCallback);	// get only chat folders
	sleep(500);
	getApiData("getCustomOperatorStatuses", 0, customStatusCallback);
	sleep(500);
	getApiData("getSetupItems", "FolderType=20", userCategoriesCallback);
	sleep(500);
	getApiData("getSetupItems", "FolderType=21", userStatusesCallback);
	sleep(500);
	getApiData("getSetupItems", "FolderType=32", userCustomField1Callback);
	sleep(500);
	getApiData("getSetupItems", "FolderType=33", userCustomField2Callback);
	sleep(500);
	setUpDeptAndSkillGroups();
	getActiveChatData();
	getInactiveChatData();
	getOperatorAvailabilityData();
	// Everything initialised now. Just keep updating metrics every few seconds
	UpdateMetricsIntID = setInterval(updateChatStats, 4500);	// updates socket io data at infinitum
	CalculateMetricsIntID = setInterval(calculateChatStats, 4000);	// calculate metrics data at infinitum
	LongWaitChatsIntID = setInterval(longWaitChatsTimer, 30000);
}

function checkOperatorAvailability() {
	if (GetOperatorAvailabilitySuccess)
		return;

	sendToLogs("Getting operator availability again");
	getOperatorAvailabilityData();	// try again
}

doStartOfDay();		// initialise everything
