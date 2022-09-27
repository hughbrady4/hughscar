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

const AUTH_CONTAINER = document.getElementById('firebaseui-auth-container');

initApp();

function initApp() {

   firebase.auth().onAuthStateChanged((user) => {

      if (user == null) {
         // AUTH_CONTAINER.classList.add("show");
         userMessage("You are logged out.");

         firebase.auth().signInAnonymously().then(() => {
            //userMessage("You are logged in anonymously.");
         }).catch((error) => {
            $("#transportservice-content-container").hide();
            let errorCode = error.code;
            let errorMessage = error.message;
            userMessage(errorMessage);
         });
         return;
      }

      AUTH_CONTAINER.classList.remove("show");
      mUser =  user;

      if (mUser.isAnonymous) {
         //userMessage("You are still logged in anonymously.");
         $("#btn-signout").hide();
         $("#btn-signin").show();
      } else {
         userMessage("You are logged in.");
         $("#btn-signout").show();
         $("#btn-signin").hide();
      }

      readRiders();


   });
}

function readRiders() {
   let user = firebase.auth().currentUser;
   if (!user) {
      userMessage("Login required to view requests");
      return;
   }

   let ridersRef = firebase.database()
      .ref("/riders")
      .orderByChild("updated");
      // .equalTo("pending");
      // .orderByChild("/startedAt/");

   ridersRef.on('child_added', (data) => {

      const newRow = document.createElement("tr");
      newRow.id = data.key;

      const newCol1 = document.createElement("td");
      const newCol2 = document.createElement("td");
      const newCol3 = document.createElement("td");
      const newCol4 = document.createElement("td");
      // const newCol5 = document.createElement("td");
      // const newCol6 = document.createElement("td");

      let formatter = new Intl.NumberFormat('en-US', {
         style: 'currency',
         currency: 'USD',

         // These options are needed to round to whole numbers if that's what you want.
         //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
         //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
      });

      // formatter.format(2500);
      let fareAmt = 0;
      if (typeof(data.val().fare) != "undefined") {
         fareAmt = data.val().fare.fare_amount;
      }

      let fareStr = formatter.format(fareAmt);

      let updated = new Date();
      updated.setTime(data.val().updated);
      dateString = updated.toLocaleString();

      newCol1.innerHTML = dateString;
      // newCol2.innerHTML = data.val().phone;
      // newCol3.innerHTML = data.val().pickup_address;
      newCol2.innerHTML = fareStr;
      newCol3.innerHTML = data.key;
      newCol4.innerHTML = data.val().anonymous;

      newRow.appendChild(newCol1);
      newRow.appendChild(newCol2);
      newRow.appendChild(newCol3);
      newRow.appendChild(newCol4);
      // newRow.appendChild(newCol5);
      // newRow.appendChild(newCol6);

      newRow.addEventListener('click', () => {

         let key = data.key;
         let driverName = data.val().username;

         window.location.href = "/request.html?request=" + key;
         // window.open("/request.html?request=" + key);


         console.log(data.val());
      });
      document.getElementById("user-list-table").appendChild(newRow);
   });

   ridersRef.on('child_removed', (data) => {
      console.log(data.val());
      document.getElementById("user-list-table")
         .removeChild(document.getElementById(data.key));
   });

}

function userMessage(message) {
   // Get the snackbar DIV
   let sb = document.getElementById("snackbar");
   sb.innerHTML = message;
   console.log(message);
   // Add the "show" class to DIV
   sb.classList.add("show");

   // After 3 seconds, remove the show class from DIV
   setTimeout(function(){ sb.classList.remove("show"); }, 3000);
}

function signOut() {

   firebase.auth().signOut();
   userMessage("GoodBye!");

}
