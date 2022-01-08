
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

var mUser;
var userLat = 32.89232732227711;
var userLng = -96.95597853022022;
var map;
var userLoc;
let driverMarkers = [];
let userMarkers = [];
let infoWindows = [];
let infoWindow;
var lastZoom;
const SERVICE_AREA_BOUNDS = {
   north: 34.23570153604349,
   south: 31.52826999601207,
   west: -101.33952345209524,
   east: -92.57243360834524,
};
const SW = {
  lat: 31.52826999601207,
  lng: -101.33952345209524,
}
const NE = {
  lat: 34.23570153604349,
  lng: -92.57243360834524,
}

let browserLocation;

function checkUser(user) {
   let userId = user.uid;
   firebase.database().ref('/admin/' + userId).once('value')
      .then((snapshot) => {
          console.log(snapshot.val());
          if (snapshot.exists()) {
            // document.getElementById('btn-request-maintenance').classList.add("show");
            // document.getElementById('btn-driver-maintenance').classList.add("show");
          } else {
            let btnRequests = document.getElementById('btn-request-maintenance');
            let btnDrivers = document.getElementById('btn-driver-maintenance');

            // document.getElementById('btn-request-maintenance').classList.remove("show");
            // document.getElementById('btn-driver-maintenance').classList.remove("show");
            let container = document.getElementById('main-controls-container');

            container.removeChild(btnRequests);
            container.removeChild(btnDrivers);
          }
     });

     firebase.database().ref('/drivers/' + userId).once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
              let btnDriverApp = document.getElementById('btn-driver-app');
              let container = document.getElementById('main-controls-container');

              container.removeChild(btnDriverApp);
            console.log(snapshot.val());
          }
       });
}

function requestRide() {

   window.open("/request_ride.html");
}

function requestDrive() {

   window.open("/driver.html");
}

function driverMaintenance() {

   window.open("/driver_maintenance.html");
}

function requestMaintenance() {

   window.open("/request_maintenance.html");
}

function sendMessage() {
   const messaging = firebase.messaging();
   messaging.requestPermission()
   .then(function() {
      console.log("Yay!");
      return messaging.getToken();
   })
   .then(function(token) {
      console.log(token);
   })
   .catch(function(err) {
      console.log(err);

   });

   messaging.onMessage((payload) => {
      console.log("Message: ", payload);
   });

 }

function readPendingRequests() {
   let user = firebase.auth().currentUser;
   if (!user) {
      errorMessage("Login required to request pickup");
      return;
   }

   let openRequests = firebase.database().ref("/ride-requests-by-user/" + user.uid);
   openRequests.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
         errorMessage("Existing request found")
      }
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

function calcDistance() {

  let origins = [];
  let destinations = [];

   for (let i = 0; i < userMarkers.length; i++) {
      origins.push(userMarkers[i].getPosition());
      destinations.push(userMarkers[i].getPosition());
   }

   let distanceRequest = {
      origins: origins,
      destinations: destinations,
      travelMode: 'DRIVING',
      avoidHighways: false,
      avoidTolls: false,
   }

   distanceService.getDistanceMatrix(distanceRequest,  (response, status) => {
      if (status == 'OK') {

         for (let k = 0; k < infoWindows.length; k++) {
            infoWindows[k].close();
         }
         infoWindows.length = 0;

         let origins = response.originAddresses;
         let destinations = response.destinationAddresses;

         for (let i = 0; i < origins.length; i++) {
            let results = response.rows[i].elements;
            let infoString = "";

            for (var j = 0; j < results.length; j++) {

               if (i != j) {

                  let element = results[j];
                  if (element.status == "OK") {
                    let distance = element.distance.text;
                    let distanceValue = element.distance.value;
                    let duration = element.duration.text;
                    let value = element.duration.value;

                    let from = origins[i];
                    let to = destinations[j];

                    //let strDistance0 = "From: " + origins[i];
                    let strDistance1 = "<p>To: " + destinations[j] +
                                      ", " + distance + ", " + duration + "</p>";

                    infoString += strDistance1;
                  } else infoString += "<p>" + element.status + "</p>";
               }
            }

            const infoWindow = new google.maps.InfoWindow({
               content: infoString,
            });

            infoWindow.open(map, userMarkers[i]);
            infoWindows.push(infoWindow);
         }
      } else {
         errorMessage(status);
      }
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

function setZoomSlow(level) {
   let iters = level - map.getZoom();
   let zoom = map.getZoom();
   for (let i = 0; i < Math.abs(iters); i++) {
      if (iters < 0) {
         setTimeout(function(){ map.setZoom(--zoom); }, i * 200);
      } else {
         setTimeout(function(){ map.setZoom(++zoom); }, i * 200);
      }
   }
}

function savePosition(position) {
   userLat = position.coords.latitude;
   userLng = position.coords.longitude;
   timeStamp = position.timestamp;

   let userLocRef = userLocs.push();
   userLocRef.set({
      lat: userLat,
      lng: userLng,
      timestamp: timeStamp,
   });
}

function writeRequest() {

   let user = firebase.auth().currentUser;
   if (!user) {
      errorMessage("Login required to request pickup");
      return;
   }
   let route = directionsRenderer.getDirections().routes[0];

   let rideRequests = firebase.database().ref("ride-requests");
   let rideRequestKey = rideRequests.push().key;
   let updates = {};
   updates["/ride-requests/" + rideRequestKey] = {
      rider_uid: user.uid,
      status: "open",
      startedAt: firebase.database.ServerValue.TIMESTAMP,
      bounds: route.bounds.toJSON(),
      start_location: route.legs[0].start_location.toJSON(),
      start_address: route.legs[0].start_address,
      end_location: route.legs[route.legs.length-1].end_location.toJSON(),
      end_address: route.legs[route.legs.length-1].end_address,

   };

   updates["/ride-requests-by-user/" + user.uid + "/" + rideRequestKey] = {
      status: "open",
      startedAt: firebase.database.ServerValue.TIMESTAMP,
      bounds: route.bounds.toJSON(),
      start_location: route.legs[0].start_location.toJSON(),
      start_address: route.legs[0].start_address,
      end_location: route.legs[route.legs.length-1].end_location.toJSON(),
      end_address: route.legs[route.legs.length-1].end_address,
   };

   //let rideRequestsByUser = firebase.database().ref("ride-requests-by-user/" + user.uid);
   //let rideRequestByUserRef = rideRequestsByUser.push();

   return firebase.database().ref().update(updates);



}

function initAuth() {

   let ui = new firebaseui.auth.AuthUI(firebase.auth());

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            // Return type determines whether we continue the redirect automatically
            document.getElementById('firebaseui-auth-container').classList.remove("show");
            document.getElementById('main-controls-container').classList.add("show");

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
         mUser =  user;
         document.getElementById('firebaseui-auth-container').classList.remove("show");
         document.getElementById('main-btn-grp').classList.add("show");
         checkUser(user)
      } else {
         document.getElementById('firebaseui-auth-container').classList.add("show");
         document.getElementById('main-btn-grp').classList.remove("show");
         // document.getElementById('btn-request-maintenance').classList.remove("show");
         // document.getElementById('btn-driver-maintenance').classList.remove("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });
}

function signOut() {
  firebase.auth().signOut();
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
