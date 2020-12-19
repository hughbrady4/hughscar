(function myApp() {

  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyD2SZnYCwa5WsDnbl6vkxZTPiZuLccSnxw",
    authDomain: "osweb-94883.firebaseapp.com",
    databaseURL: "https://osweb-94883.firebaseio.com",
    projectId: "osweb-94883",
    storageBucket: "osweb-94883.appspot.com",
    messagingSenderId: "367839583936"
  };
  firebase.initializeApp(config);



  // Initialize the FirebaseUI Widget using Firebase.
  var ui = new firebaseui.auth.AuthUI(firebase.auth());
  var uiConfig = {
    callbacks: {
      signInSuccessWithAuthResult: function(authResult, redirectUrl) {
        // User successfully signed in.
        // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle.
        //document.getElementById('firebaseui-auth-container').style.display = 'none';
        return false;
      },
      uiShown: function() {
        // The widget is rendered.
        // Hide the loader.
        document.getElementById('loader').style.display = 'none';
      }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: 'popup',
    //signInSuccessUrl: '<url-to-redirect-to-on-success>',
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      firebase.auth.EmailAuthProvider.PROVIDER_ID,

      firebase.auth.GoogleAuthProvider.PROVIDER_ID
      //firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      //firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      //firebase.auth.GithubAuthProvider.PROVIDER_ID,
      //firebase.auth.PhoneAuthProvider.PROVIDER_ID
    ],
    // Terms of service url.
    //tosUrl: '<your-tos-url>',
    // Privacy policy url.
    //privacyPolicyUrl: '<your-privacy-policy-url>'
  };


  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
    // User is signed in.
      document.getElementById('loader').style.display = 'none';

      document.getElementById('welcome').style.display = 'block';

      //document.getElementById('btn-signout').style.display = 'block';

      document.getElementById('link-signOut').style.display = 'inline-block';

      name = user.displayName;
      email = user.email;
      photoUrl = user.photoURL;
      emailVerified = user.emailVerified;
      uid = user.uid;  // The user's ID, unique to the Firebase project. Do NOT use
                 // this value to authenticate with your backend server, if
                 // you have one. Use User.getToken() instead.
      console.log("  Name: " + name);
      $("#welcome").html("Hello " + name);
      console.log("  Url: " + photoUrl);
      $("#profile-picture").attr("src", photoUrl);

    } else {
    // No user is signed in.


    photoUrl = "blank-profile-picture-973460_640.png";
    $("#profile-picture").attr("src", photoUrl);
    console.log("  Url: " + photoUrl);


    document.getElementById('loader').style.display = 'block';

    document.getElementById('welcome').style.display = 'none';

    //document.getElementById('btn-signout').style.display = 'none';
    document.getElementById('link-signOut').style.display = 'none';

    ui.start('#firebaseui-auth-container', uiConfig);
    }
  });



  //const btnLogout = document.getElementById('btn-signout');

  //btnLogout.addEventListener('click', e => {

  //      firebase.auth().signOut();
  //      console.log("GoodBye!");


  //});


  const linksignOut = document.getElementById('link-signOut');

  linksignOut.addEventListener('click', e => {

    firebase.auth().signOut();
    console.log("GoodBye!");

  });




}());
