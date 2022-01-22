
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
var firebaseConfig = {
   apiKey: "AIzaSyCj2ojD-AObyfiP-aTl6eRMnZNt2TrX__w",
   authDomain: "hughscar-6ac7d.firebaseapp.com",
   databaseURL: "https://hughscar-6ac7d-default-rtdb.firebaseio.com",
   projectId: "hughscar-6ac7d",
   storageBucket: "hughscar-6ac7d.appspot.com",
   messagingSenderId: "597937667152",
   appId: "1:597937667152:web:8e3b6b57ffd011e5036555",
   measurementId: "G-9MPTSJEV3K"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();
//console.log(firebase);

var data = {lat: null, lng: null, name: null, timestamp: null};
var startTime = new Date().getTime();
var userLocs = firebase.database().ref("user-locs");

function readRequests() {
   let user = firebase.auth().currentUser;
   if (!user) {
      errorMessage("Login required to view requests");
      return;
   }

   let openRequests = firebase.database()
      .ref("/ride-requests/").orderByChild("/startedAt/");

   openRequests.on('child_added', (data) => {
      console.log(data.val());
      const newRow = document.createElement("tr");
      newRow.id = data.key;

      const newCol1 = document.createElement("td");
      // const newCol2 = document.createElement("td");
      const newCol3 = document.createElement("td");
      const newCol4 = document.createElement("td");

      newCol1.innerHTML = data.val().request_date;
      // newCol2.innerHTML = data.val().request_time;
      newCol3.innerHTML = data.val().point_A_address;
      newCol4.innerHTML = data.val().status;

      newRow.appendChild(newCol1);
      // newRow.appendChild(newCol2);
      newRow.appendChild(newCol3);
      newRow.appendChild(newCol4);

      newRow.addEventListener('click', () => {

         let key = data.key;
         let driverName = data.val().username;

         // errorMessage(key);
         errorMessage(data.val());

         window.open("/request_edit.html?request=" + key);

         console.log(data.val());
      });
      document.getElementById("user-list-table").appendChild(newRow);
   });

   openRequests.on('child_removed', (data) => {
      console.log(data.val());
      document.getElementById("user-list-table")
         .removeChild(document.getElementById(data.key));
   });


}

function initAuth() {

   let ui = new firebaseui.auth.AuthUI(firebase.auth());

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            // Return type determines whether we continue the redirect automatically
            // document.getElementById('firebaseui-auth-container').className.replace("show", "");
            // document.getElementById('signin-heading').className.replace("show", "");
            // readPendingRequests();
            return false;
         },
         uiShown: function() {
            //document.getElementById('loader').style.display = 'none';
         }
      },
      signInFlow: 'popup',
      signInOptions: [
         firebase.auth.EmailAuthProvider.PROVIDER_ID,
         firebase.auth.GoogleAuthProvider.PROVIDER_ID,
         firebase.auth.PhoneAuthProvider.PROVIDER_ID
      ],
      //tosUrl: '<your-tos-url>',
      //privacyPolicyUrl: '<your-privacy-policy-url>'
   };

   firebase.auth().onAuthStateChanged((user) => {
      if (user) {
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.className = authContainer.className.replace("show", "");
         // let logoutButton = document.getElementById('logout_button');
         // logoutButton.className = authContainer.className.replace("show", "");
         const logoutButton = document.createElement("button");
         logoutButton.id = "logout_button";
         logoutButton.textContent = "Sign out";
         logoutButton.classList.add("button");
         logoutButton.addEventListener('click', () => {
            firebase.auth().signOut();
         });


         readRequests();
      } else {

         document.getElementById('firebaseui-auth-container').className = "show";
         ui.start('#firebaseui-auth-container', uiConfig);


         // let logoutButton = document.getElementById('logout_button');
         // logoutButton.className = "show";
      }
   });


}

function errorMessage(message) {
   // Get the snackbar DIV
   let sb = document.getElementById("snackbar");
   sb.innerHTML = message;
   console.log(message);
   // Add the "show" class to DIV
   sb.className = "show";

   // After 3 seconds, remove the show class from DIV
   setTimeout(function(){ sb.className = sb.className.replace("show", ""); }, 3000);
}
