
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

function setUI4Input() {
   clearMap();
   clearRoute();

   let loader = document.getElementById("loader");
   loader.className = loader.className.replace("show", "");

   while (map.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
      map.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
   }


   map.addListener("dblclick", (event) => {
      //map.setCenter(event.latLng);
      //map.setZoom(15);
      addUserMarker(event.latLng);
   });

   //add clear button
   const clearButton = document.createElement("button");
   clearButton.textContent = "Clear";
   clearButton.classList.add("button");
   clearButton.addEventListener("click", () => {
      if (userMarkers.length < 1) {
         errorMessage("Add a waypoint to the map");
         return;
      }
      clearMap();
   });
   map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(clearButton);

   const routeButton = document.createElement("button");
   routeButton.textContent = "Request Ride";
   routeButton.classList.add("button");
   map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(routeButton);
   routeButton.addEventListener("click", () => {
      if (userMarkers.length < 2) {
         errorMessage("Add 2 waypoints to build a route");
         return;
      }
      writeRequest();
      // requestRide();
      // buildControls("book");
   });
   //requestLocation(map);
}

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
      const newCol1 = document.createElement("td");
      const newCol2 = document.createElement("td");
      const newCol3 = document.createElement("td");
      const newCol4 = document.createElement("td");

      newCol1.innerHTML = data.val().request_date;
      newCol2.innerHTML = data.val().request_time;
      newCol3.innerHTML = data.val().point_A_address;
      newCol4.innerHTML = data.val().status;

      newRow.appendChild(newCol1);
      newRow.appendChild(newCol2);
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


}

function createDriver() {
   let uid = document.getElementById("driver-uid").value;
   let drivers = firebase.database().ref("/drivers/" + uid);

   drivers.set({
     driver_name: document.getElementById("driver-name").value,
     status: "open",
     created: firebase.database.ServerValue.TIMESTAMP,
   }).then(() => {
      errorMessage("Driver record created");
   }).catch((error) => {
      errorMessage(error);
   });
}

function loadDrivers() {
   let drivers = firebase.database().ref("driver-cur-loc");
   drivers.on('child_added',
      function(snapshot) {
         // Get that click from firebase.
         let driverRec = snapshot.val();
         console.log(driverRec);
         let driverLoc = new google.maps.LatLng(driverRec.lat, driverRec.lng);
         let atTime = new Date(driverRec.timestamp);
         console.log(atTime);

         const iconBase = "https://hughscar.com/images/";
         const icons = {
           size_16: {
             icon: iconBase + "icons8-car-16.png",
           },
           size_24: {
             icon: iconBase + "icons8-car-24.png",
           },
           size_30: {
             icon: iconBase + "icons8-car-30.png",
           },
           size_40: {
             icon: iconBase + "icons8-car-40.png",
           },
           size_48: {
             icon: iconBase + "icons8-car-48.png",
           },
           size_80: {
             icon: iconBase + "icons8-car-80.png",
           },
           size_96: {
             icon: iconBase + "icons8-car-96.png",
           },
         };


         let timeString = atTime.toLocaleString();
         const marker = new google.maps.Marker({
            icon: icons["size_24"].icon,
            animation: google.maps.Animation.DROP,
            position: driverLoc,
            map: map,
            //label: timeString,
         });
         driverMarkers.push(marker);
      });

   drivers.on('child_changed',
      function(snapshot) {
         // Get that click from firebase.
         let driverRec = snapshot.val();
         console.log(driverRec);
      });

   }

function requestLocation(myMap) {
   if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
         const pos = {
               lat: position.coords.latitude,
               lng: position.coords.longitude,
         };

         browserLocation = new google.maps.LatLng(pos);
         let bounds = new google.maps.LatLngBounds(SW, NE);
         let inArea = bounds.contains(browserLocation);

         if (inArea) {
            addUserMarker(browserLocation);
            myMap.setCenter(browserLocation);
            // lastZoom = myMap.getZoom();
            // setZoomSlow(13);
         } else {
           errorMessage("You're current location is outside service area");
         }
      }, () => {
         errorMessage("Failed to get geolocation from browser");
         //addUserMarker();
         //buildControls("waypoints");
         //console.log("Failed to get geolocation from browser");
      });
   } else {
      errorMessage("Failed to get geolocation from browser");
      //addUserMarker();
      //buildControls("waypoints");
      //console.log("Failed to get geolocation from browser");
   }
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
