
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
var	Folders = new Object();	// array of folder ids and folder name objects
var	Operators = new Object();	// array of operator ids and name objects
var	ChatWindows = new Object();	// array of window ids and name objects
var	ChatButtons = new Object();	// array of button ids and name objects
var	Websites = new Object();	// array of website ids and name objects
var	Invitations = new Object();	// array of invitation ids and name objects
var StaticDataNotReady;	// Flag to show when all static data has been downloaded so that chat data download can begin
var ChatDataNotReady;	// Flag to show when all chat data has been downloaded so that csv file conversion can begin
var Allchatsjson;	// chat message objects
var Nextloop;	
var Separator = "|";	// separator char used to separate each chat message in transcript and custom fields

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
		Departments[dlist[i].DepartmentID] = dlist[i].Name;
	}
	console.log("No of Depts: "+Object.keys(Departments).length);
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

function operatorsCallback(dlist) {
	for(var i in dlist) 
	{
		Operators[dlist[i].LoginID] = dlist[i].Name;
	}
	console.log("No of Operators: "+Object.keys(Operators).length);
}

function windowsCallback(dlist) {
	for(var i in dlist) 
	{
		ChatWindows[dlist[i].SetupItemID] = dlist[i].Name;
	}
	console.log("No of Chat Windows: "+Object.keys(ChatWindows).length);
}

function buttonsCallback(dlist) {
	for(var i in dlist) 
	{
		ChatButtons[dlist[i].SetupItemID] = dlist[i].Name;
//		console.log("button id: "+dlist[i].SetupItemID + " name: "+dlist[i].Name);
	}
	console.log("No of Chat Buttons: "+Object.keys(ChatButtons).length);
}

function websitesCallback(dlist) {
	for(var i in dlist) 
	{
		Websites[dlist[i].SetupItemID] = dlist[i].Name;
	}
	console.log("No of Websites: "+Object.keys(Websites).length);
}

function invitationsCallback(dlist) {
	for(var i in dlist) 
	{
		Invitations[dlist[i].SetupItemID] = dlist[i].Name;
	}
	console.log("No of Invitations: "+Object.keys(Invitations).length);
}

function getDepartmentNameFromID(id) {
	return(Departments[id]);
}

function getFolderNameFromID(id) {
	return(Folders[id]);
}

function getOperatorNameFromID(id) {
	return(Operators[id]);
}

function getWindowNameFromID(id) {
	if(ChatWindows[id] === undefined) return id;		
	return(ChatWindows[id]);
}

function getButtonNameFromID(id) {
	if(ChatButtons[id] === undefined) return("\"=\"\"" + id + "\"\"\"");		
	return(ChatButtons[id]);
}

function getWebsiteNameFromID(id) {
	if(Websites[id] === undefined) return id;		
	return(Websites[id]);
}

function getInvitationNameFromID(id) {
	if(Invitations[id] === undefined) return id;		
	return(Invitations[id]);
}

// cleans text field of tags and newlines using regex
function cleanText(mytext) {
	var clean = mytext.replace(/<\/?[^>]+(>|$)/g, "");	// take out html tags
	var clean2 = clean.replace(/(\r\n|\n|\r)/g,"");	// take out new lines
	return(clean2);
}

getStaticData('getDepartments', 0, deptsCallback);
getStaticData("getOperators", 0, operatorsCallback);
getStaticData("getFolders", 0, foldersCallback);
getStaticData("getSetupItems", "FolderType=14", windowsCallback);
getStaticData("getSetupItems", "FolderType=12", buttonsCallback);
getStaticData("getSetupItems", "FolderType=19", websitesCallback);
getStaticData("getSetupItems", "FolderType=29", invitationsCallback);

function getStaticData (method, params, fcallback) {
	
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
				alert("API Error: "+JSON.stringify(json));
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
	
function getAllInactiveChats() {
	io.sockets.emit('chatcountResponse', "Total no. of chats: "+Allchatsjson.length);
	if(ChatDataNotReady)
	{
		setTimeout(getAllInactiveChats, 1000);	// poll every second until all ajaxs are complete
		return;
	}

	// build the csv header using the first chat object
	var chatobject = Allchatsjson[0];
	csvtext = "";
	for(var key in chatobject)
	{
		csvtext = csvtext + key + ",";
	}
	
	// convert each object to a comma separated line
	for(var i=0; i < Allchatsjson.length; i++)
	{
		csvline = convertToCsv(Allchatsjson[i]);	
		csvtext = csvtext + "\r\n" + csvline;	// add lines and build txt file
	}

	// we got all data in csv text file so return it back to the client
	io.sockets.emit('doneResponse', csvtext);
}

// this converts each chat object received from API to a csv line where some ids are replaced with actual names
// e.g. operator id 123456789012 is replaced with [LMI] Manji Kerai
function convertToCsv(chatdata) {		
	var nestedobj = new Object();
	var chatline = "";

	for(var key in chatdata)	// add the key values
	{
		if(key === "RowNumber")		// to get around bug in the API
			continue;
	
		if(typeof chatdata[key] == 'object' && chatdata[key] != null) // if value is another nested json object
		{
			nestedobj = chatdata[key];
//			console.log("Nested Object: "+key+" value: "+JSON.stringify(chatdata[key]));
			if(Object.keys(nestedobj).length == 0)		// blank object
			{
				chatline = chatline +"n/a,";		// set it to not applicable
			}
			else
			{
				chatline = chatline +"\"";	// opening quote
				for(var nkey in nestedobj)
				{
					chatline = chatline + nkey +"="+nestedobj[nkey] + "&";
				}
				chatline = chatline +"\",";	// closing quote
			}
		}
		else
		{
			var value;
			if(chatdata[key] != null && chatdata[key].length > 1)		// if more than a char in length
			{
				if(key === "DepartmentID")
					value = getDepartmentNameFromID(chatdata[key]);
				else if(key === "InitialDepartmentID")
					value = getDepartmentNameFromID(chatdata[key]);
				else if(key === "FolderID")
					value = getFolderNameFromID(chatdata[key]);
				else if(key === "OperatorID")
					value = getOperatorNameFromID(chatdata[key]);
				else if(key === "ChatWindowDefID")
					value = getWindowNameFromID(chatdata[key]);
				else if(key === "ChatButtonDefID")
					value = getButtonNameFromID(chatdata[key]);
				else if(key === "WebsiteDefID")
					value = getWebsiteNameFromID(chatdata[key]);
				else if(key === "InvitationTemplateVariantID")
					value = getInvitationNameFromID(chatdata[key]);
				else if(key === "EndedBy" && chatdata[key] !== null)
						value = getOperatorNameFromID(chatdata[key]);
				else if(isNaN(chatdata[key]))
					value = "\"" + cleanText(chatdata[key]) + "\"";
				else
					value = "\"=\"\"" + chatdata[key] + "\"\"\"";
			}
			else
				value = chatdata[key];		// must be null or 1 character long
			
			chatline = chatline + value +",";
		}
	}
	return(chatline);					
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
				console.log("Next loop "+Nextloop);
				if(Nextloop < 100)	// safety so that it does not go into infinite loop
					loadNext(next);
			}
		});
		// in case there is a html error
		response.on('error', function(err) {
		// handle errors with the request itself
		console.error("Error with the request: ", err.message);
		StaticDataNotReady--;
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
	socket.on('getChatReport', function(data){
		if(StaticDataNotReady)
		{
			io.sockets.emit('errorResponse', "Static data not ready");
			return;
		}

		io.sockets.emit('chatcountResponse', "Getting all chat info from "+ Object.keys(Folders).length +" folders");
		Allchatsjson = new Array();
		Nextloop = 0;
		ChatDataNotReady = 0;
		for(var fid in Folders)
		{
			var parameters = "FolderID="+fid+"&FromDate="+data.fd+"&ToDate="+data.td;
			getInactiveChats(parameters);
		}
		getAllInactiveChats();	// colate of API responses and process
	});
});

