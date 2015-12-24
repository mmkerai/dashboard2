var socket = io.connect();
var auth2;
var id_token;
var profile;

function onSignIn(googleUser) {
// Useful data for your client-side scripts:
	profile = googleUser.getBasicProfile();
	console.log("ID: " + profile.getId()); // Don't send this directly to your server!
	console.log("Name: " + profile.getName());
	console.log("Image URL: " + profile.getImageUrl());
	console.log("Email: " + profile.getEmail());

	// The ID token you need to pass to your backend:
	id_token = googleUser.getAuthResponse().id_token;
	window.location.('https://h3gdashboard-dev.herocu.com?idtoken='+id_token+'&email='+profile.getEmail());
};

/*
// * Initializes the Sign-In client.

var initClient = function() {
    gapi.load('auth2', function(){
        
         //* Retrieve the singleton for the GoogleAuth library and set up the
         //* client.
        
        auth2 = gapi.auth2.init({
            client_id: '7640409675-vo4hcd4ggr59sbs2sskn662ohrk3skt8.apps.googleusercontent.com'
        });

        // Attach the click handler to the sign-in button
        auth2.attachClickHandler('signin-button', {}, onSuccess, onFailure);
    });
};


// * Handle successful sign-ins.

var onSuccess = function(user) {
    console.log('Signed in as ' + user.getBasicProfile().getName());
 };


// * Handle sign-in failures.

var onFailure = function(error) {
    console.log(error);
};

$(document).ready(function() {

//	if(auth2.GoogleAuth.isSignedIn.get() == true) {
// 	socket.emit('authenticate', {idtoken: id_token, email: profile.getEmail()});
//	}
  
});

function signOut() {
	auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function () {
	  document.write('You have signed out.');
	});
}
*/