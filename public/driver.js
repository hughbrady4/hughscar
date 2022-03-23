
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

let mMap;
let mInfoWindow;
let mUser;
let mUserLat;
let mUserLng;

function initApp() {
   let ui = new firebaseui.auth.AuthUI(firebase.auth());

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            return false;
         },
         uiShown: () => {
           //document.getElementById('loader').style.display = 'none';
        }
      },
      signInFlow: 'popup',
      signInOptions: [
         // firebase.auth.EmailAuthProvider.PROVIDER_ID,
         // firebase.auth.GoogleAuthProvider.PROVIDER_ID,
         firebase.auth.PhoneAuthProvider.PROVIDER_ID
      ],
      //tosUrl: '<your-tos-url>',
      //privacyPolicyUrl: '<your-privacy-policy-url>'
   };

   firebase.auth().onAuthStateChanged((user) => {
      if (user) {
         mUser = user;
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.classList.remove("show");
         // let mainContainer = document.getElementById('main_content');
         // mainContainer.classList.add("show");
         getDriverControl();
      } else {
         // let mainContainer = document.getElementById('main_content');
         // mainContainer.classList.remove("show");
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.classList.add("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });

   let zoom = 11;
   if (mUserLat == null || mUserLng == null ) {
     mUserLat = 38.87504573180474;
     mUserLng = -104.73386842314846;
     zoom = 5;
   }

   mMap = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: {lat: mUserLat, lng: mUserLng },
      zoom: zoom,
     // restriction: {
     //    latLngBounds: SERVICE_AREA_BOUNDS,
     //    strictBounds: false,
     // }
   });

   mInfoWindow = new google.maps.InfoWindow();

   const goButton = document.createElement("button");
   goButton.textContent = "Go Online";
   goButton.classList.add("custom-map-control-button");
   mMap.controls[google.maps.ControlPosition.TOP_CENTER].push(goButton);
   goButton.addEventListener("click", () => {

      if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition((position) => {
            mDriverLat = position.coords.latitude;
            mDriverLng = position.coords.longitude;

            // let rideRequest = snapshot.val();
            // let userData = snapshot.val();
            // data.status = "accepted";

            let driver = {
               last_loc: {lat: mDriverLat, lng: mDriverLng },
               status: "online",
            };

            let driverRef = firebase.database().ref("drivers/" + firebase.auth().currentUser.uid);
            driverRef.set(driver);

           // let updates = {};
           // updates["/ride-requests/" + snapshot.key + "/status"] = "accepted";
           // updates["/ride-requests-by-user/" + user.uid + "/" + snapshot.key + "/status"] = "accepted";
           // updates["/ride-control/" + rideRequest.rider_uid + "/" + snapshot.key + "/status"] = "accepted";
           //
           // firebase.database().ref().update(updates);

         }, (error) => {
            errorMessage("Geolocation required to accept rides");
            console.log(error.message);
         });

      } else {
         errorMessage("Geolocation required to accept rides");
      }
   });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

function getDriverControl() {

   //createUserRecord(mUser);

   let rideControlData = firebase.database().ref("/control-data/")
                      //.child(mUser.uid)
                      //.orderByChild("status")
                      //.equalTo("started")
                      .limitToFirst(1);



   let driverControlRecord = firebase.database().ref("/driver-control/")
                      .child(mUser.uid);
                      //.equalTo("started")
                      //.limitToFirst(1);

   driverControlRecord.on('value', (snapshot) => {
      errorMessage("Oh");
      if (snapshot.exists()) {

         let status = snapshot.val().status;
         console.log(snapshot);
         // let statusField = document.getElementById("status");
         // statusField.innerHTML = status;
         // if (status == "New Request") {
         //    setUI4Input();
         // } else if (status == "Ready") {
         //    setUI4Ready(snapshot.val().current_request);
         // } else if (status == "canceled") {
         //    setUI4Input(childKey, childData);
         // } else if (status == "accepted") {
         //    setUI4DriverInRoute(childKey);
         // }

         // snapshot.forEach((childSnapshot) => {
         //    let childKey = childSnapshot.key;
         //    let childData = childSnapshot.val();
         //    console.log(childKey);
         //    let status = childData;
         //    console.log(status);
         //
         //
         //    if (status == "New Request") {
         //       setUI4Input(childKey, childData);
         //    } else if (status == "Ready") {
         //       setUI4Ready(childKey, childData);
         //    } else if (status == "canceled") {
         //       setUI4Input(childKey, childData);
         //    } else if (status == "accepted") {
         //       setUI4DriverInRoute(childKey);
         //    }
         //
         //
         //  });


      } else {
         let driverControlKey = firebase.database().ref("/driver-control/")
                              .child(mUser.uid);

         driverControlKey.set({
            status: "Online",
            startedAt: firebase.database.ServerValue.TIMESTAMP,
         });
         //setUI4Input(rideRequestKey);
      }
   });

}

function displayRequest(snapshot) {

   let data = snapshot.val();
   console.log(data);

   let departTime = new Date(Date.now() + 600 * 1000);
   let origin = data.point_A;
   let destination = data.point_B;

   const waypts = [];

   // for (var i = 1; i < (userMarkers.length-1); i++) {
   //    waypts.push({
   //       location: userMarkers[i].getPosition(),
   //       stopover: true,
   //    });
   // }

   var request = {
      origin: origin,
      destination: destination,
      waypoints: waypts,
      optimizeWaypoints: true,
      travelMode: 'DRIVING',
      drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
   };

   directionsService = new google.maps.DirectionsService();

   directionsService.route(request, function(result, status) {
      if (status == 'OK') {

         clearMap();
         google.maps.event.clearListeners(map, 'dblclick');

         while (map.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
            map.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
         }

         const directionsRenderer = new google.maps.DirectionsRenderer({
            //panel: directionsPanel,
            draggable: false,
            map:map,
         });

         directionsArr.push(directionsRenderer);


         directionsRenderer.setMap(map);
         directionsRenderer.setDirections(result);

         //add accept button
         const acceptButton = document.createElement("button");
         acceptButton.textContent = "Accept";
         acceptButton.classList.add("button");
         acceptButton.addEventListener("click", () => {
            writeAccept(snapshot);


         });
         map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(acceptButton);

      } else {
        errorMessage(status);
      }
   });

   // let loader = document.getElementById("loader");
   // loader.className = "show";

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

function clearRoute() {
   for(let i = 0; i < directionsArr.length; i++) {
      directionsArr[i].setMap(null);
   }
   directionsArr.length = 0;

}

function initMap() {




   // initAuth();


}

function readPendingRequests() {
   let user = firebase.auth().currentUser;
   if (!user) {
      errorMessage("Login required to request pickup");
      return;
   }

   //let openRequests = firebase.database().ref("/ride-requests/");

   // openRequests.once('value').then((snapshot) => {
   //    if (snapshot.val()) {
   //
   //    } else {
   //
   //    }
   // });

   let openRequests = firebase.database()
      .ref("/ride-requests/")
      .orderByChild("status")
      .equalTo("open")
      .limitToFirst(1);


   openRequests.on('child_added', (snapshot) => {
      console.log(snapshot.key);
      displayRequest(snapshot);
   });

   openRequests.on('child_removed', (snapshot) => {

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

function requestLocation1(myMap) {
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
   mUserLat = position.coords.latitude;
   mUserLng = position.coords.longitude;
   timeStamp = position.timestamp;

   let userLocRef = userLocs.push();
   userLocRef.set({
      lat: mUserLat,
      lng: mUserLng,
      timestamp: timeStamp,
   });
}

function writeAccept(snapshot) {

   let user = firebase.auth().currentUser;
   if (!user) {
      errorMessage("Login required to accept pickup");
      return;
   }

   if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
         mDriverLat = position.coords.latitude;
         mDriverLng = position.coords.longitude;

         let rideRequest = snapshot.val();
         // let userData = snapshot.val();
         // data.status = "accepted";

         let rideMatched = {
            driver_uid: user.uid,
            rider_uid: rideRequest.rider_uid,
            // ride_request_key: snapshot.key,
            rider_location: rideRequest.point_A,
            rider_address: rideRequest.point_A_address,
            driver_location: {lat: mDriverLat, lng: mDriverLng },


         };

         console.log(rideMatched);

         let rideMathchedRef = firebase.database().ref("rides-matched/" + snapshot.key);
         rideMathchedRef.set(rideMatched);

         let updates = {};
         updates["/ride-requests/" + snapshot.key + "/status"] = "accepted";
         updates["/ride-requests-by-user/" + user.uid + "/" + snapshot.key + "/status"] = "accepted";
         updates["/ride-control/" + rideRequest.rider_uid + "/" + snapshot.key + "/status"] = "accepted";

         firebase.database().ref().update(updates);

      }, (error) => {
         errorMessage("Geolocation required to accept rides");
         console.log(error.message);

      });
   } else {
      errorMessage("Geolocation required to accept rides");
   }
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
