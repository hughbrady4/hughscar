// import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.9.2/firebase-app.js';

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

const firebaseApp = firebase.initializeApp(firebaseConfig);
const auth = firebaseApp.auth();


// Initialize Firebase
// initializeApp(firebaseConfig);
firebaseApp.analytics();

var worker;
let mMap;
let mRequestId;
const mRiderQueue = new Map();
let mDriverMarker;
let mInfoWindow;
let mUser;
let mUserLat;
let mUserLng;

const messaging = firebaseApp.messaging();

messaging.onMessage((payload) => {
   console.log("Message: ", payload);
});


const PICKUP_ADDRESS_FIELD = document.getElementById("pickup_address");
const DEST_ADDRESS_FIELD = document.getElementById("dest_address");
const RIDER_PHONE_FIELD = document.getElementById("rider_phone");

const ONLINE_BTN = document.createElement("button");
ONLINE_BTN.classList.add("btn");
ONLINE_BTN.classList.add("btn-primary");
ONLINE_BTN.classList.add("custom-map-control-button");
ONLINE_BTN.innerHTML = "Go Online";
ONLINE_BTN.onclick = function() {

   let driver = {
      updated: firebase.database.ServerValue.TIMESTAMP,
      //last_loc: {lat: mUserLat, lng: mUserLng },
      status: "online",
   };

   let driverRef = firebase.database()
      .ref("drivers/" + firebase.auth().currentUser.uid);
   driverRef.set(driver);

   requestLocation();

   // Notification.requestPermission().then(function(result) {
   //    console.log(result);
   // });

};





const OFFLINE_BTN = document.createElement("button");
OFFLINE_BTN.classList.add("btn");
OFFLINE_BTN.classList.add("btn-primary");
OFFLINE_BTN.innerHTML = "Go Offline";
OFFLINE_BTN.classList.add("custom-map-control-button");
OFFLINE_BTN.onclick = function() {

   let driver = {
      updated: firebase.database.ServerValue.TIMESTAMP,
      last_loc: {lat: mUserLat, lng: mUserLng },
      status: "offline",
   };

   let driverRef = firebase.database()
      .ref("drivers/" + firebase.auth().currentUser.uid);
   driverRef.set(driver);

};

const BTN_LOC = document.createElement("button");
BTN_LOC.classList.add("btn");
BTN_LOC.classList.add("btn-primary");
BTN_LOC.classList.add("custom-map-control-button");
BTN_LOC.innerHTML = "Location";
BTN_LOC.onclick = function() {
  requestLocation();


}

function initApp() {
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

   });

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

   auth.onAuthStateChanged((user) => {
      if (user) {
         mUser = user;
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.classList.remove("show");
         // let mainContainer = document.getElementById('main_content');
         // mainContainer.classList.add("show");
         //getDriverLocation();
         getDriverStatus();

         mMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(BTN_LOC);
         // getRiders();
         $("#btn-signout").show();
         $("#btn-signin").hide();
      } else {
        while (mMap.controls[google.maps.ControlPosition.TOP_RIGHT].length > 0) {
           mMap.controls[google.maps.ControlPosition.TOP_RIGHT].pop();
        }

        $("#btn-signout").hide();
        $("#btn-signin").show();
         // let mainContainer = document.getElementById('main_content');
         // mainContainer.classList.remove("show");
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.classList.add("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });



}







function requestLocation() {
  if (navigator.geolocation) {
     navigator.geolocation.getCurrentPosition((position) => {
        mUserLat = position.coords.latitude;
        mUserLng = position.coords.longitude;

        let driverRef = firebase.database()
           .ref("drivers/" + firebase.auth().currentUser.uid).child("last_loc");
        driverRef.set({lat: mUserLat, lng: mUserLng });

      }, (error) => {
         userMessage("Failed to get geolocation from browser");
         console.log(error.message);
      });
   } else {
      userMessage("Failed to get geolocation from browser");
   }
}

function setDriverMarker(atLatLng) {

   mMap.setCenter(atLatLng);
   mMap.setZoom(13);

   if (mDriverMarker == null) {
      mDriverMarker = new google.maps.Marker({
         // label: "A",
         //animation: google.maps.Animation.DROP,
         draggable: true,
         position: atLatLng,
         icon: "/images/icons8-car-24.png",
         map: mMap,
      });

      mDriverMarker.addListener("mouseover", (event) => {
         //mDriverMarker.setLabel(null);
         //mDriverMarker.setAnimation(google.maps.Animation.BOUNCE);
      });

      mDriverMarker.addListener("mouseout", (event) => {
         //mDriverMarker.setAnimation(null);
         //mDriverMarker.setLabel("A");
      });
      mDriverMarker.addListener("dragend", (event) => {

         mUserLat = mDriverMarker.getPosition().lat();
         mUserLng = mDriverMarker.getPosition().lng();
         let driverRef = firebase.database()
            .ref("/drivers").child(mUser.uid).child("last_loc");
         driverRef.set({lat: mUserLat, lng: mUserLng });
      });


   } else {
      mDriverMarker.setPosition(atLatLng);
      //mDriverMarker.setMap(mMap);
   }

}

function addDriverLocListener() {

   let driverLocRef = firebase.database().ref("/drivers")
                      .child(mUser.uid).child("last_loc");

   driverLocRef.on('value', (driverLoc) => {
      if (driverLoc.exists()) {
         // console.log(snapshot.val());
         let newLoc = driverLoc.val();
         mUserLat = newLoc.lat;
         mUserLng = newLoc.lng;
         if (mDriverMarker != null) {
            let oldLoc = mDriverMarker.getPosition();

            if (newLoc.lat != oldLoc.lat() || newLoc.lng != oldLoc.lng()) {
               setDriverMarker(newLoc);
            }
         } else {
           setDriverMarker(newLoc);
         }

         if (mRequestId != null) {
            let requestRef = firebase.database().ref("/requests").child(mRequestId);
            const UPDATES = {};
            UPDATES['/driver_loc'] = newLoc;
            UPDATES['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
            requestRef.update(UPDATES).then(() => {
               userMessage("Request updated");
            });
         }
      }
   });
}

function getDriverStatus() {


   let driverStatusRef = firebase.database().ref("/drivers")
                     .child(mUser.uid).child("status");

   driverStatusRef.on('value', (status) => {

      while (mMap.controls[google.maps.ControlPosition.TOP_CENTER].length > 0) {
         mMap.controls[google.maps.ControlPosition.TOP_CENTER].pop();
      }

      if (status.exists()) {
         mStatus = status.val();
         console.log(mStatus);
         if (mStatus == "online") {

            addRequestIdListener();


            requestPermission();
            getMessageToken();

            if (typeof(worker) == "undefined") {
               worker = new Worker("driver_location.js");
            }

            mMap.controls[google.maps.ControlPosition.TOP_CENTER].push(OFFLINE_BTN);

            // $("#btn-group-offline").show();
            // $("#btn-group-online").hide();
            // getRequests();

         } else if (mStatus == "offline") {

            $("#btn-group-online").show();
            $("#btn-group-offline").hide();

            mMap.controls[google.maps.ControlPosition.TOP_CENTER].push(ONLINE_BTN);

            if (typeof(worker) != "undefined") {
               worker.terminate();
               worker = undefined;
            }

         } else {
            $("#btn-group-offline").show();
            $("#btn-group-online").show();
         }
      }
   });
}

function getMessageToken() {

   messaging.getToken({ vapidKey: 'BMI6z7npGh-ZhjdrInd2oRKpDpy0Keu30rBzREHZVVoCEzz5zsvOQIK3evNt8yeVP_UHKul0RJH4rBT5eCK-Gpk' }).then((currentToken) => {

      if (currentToken) {
         // Send the token to your server and update the UI if necessary
         console.log("Got Token: " + currentToken);
         let user = firebase.auth().currentUser;
         let tokenRef = firebase.database().ref("/tokens").child(user.uid);
         const updates = {};
         updates[currentToken] = true;
         updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
         return tokenRef.update(updates);

      } else {
         // Show permission request UI
         console.log('No registration token available. Request permission to generate one.');
      }
   }).catch((err) => {
      console.log('An error occurred while retrieving token. ', err);
   });

}

function requestPermission() {
  console.log('Requesting permission...');
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Notification permission granted.');
    }
  });
}





function addRequestIdListener() {

   let requestIdRef = firebase.database().ref("/drivers")
      .child(mUser.uid).child("requestId");

   requestIdRef.on('value', (requestId) => {
      if (requestId.exists()) {
         mRequestId = requestId.val();
         addDriverLocListener();

      } else {
         mRequestId = null;
      }
   });
}

function sendDriverNotice(value) {

   let img = '/images/icons8-car-24.png';
   let text = 'New Ride Request Pending' + value;
   let notification = new Notification('Ride Request', { body: text, icon: img });

}

function removeRiderMarker(snapshot) {

   let marker = mRiderQueue.get(snapshot.key);
   marker.setMap(null);
   mRiderQueue.delete(snapshot.key);

}

function addRequestRoute(snapshot) {

   let atLat = snapshot.val().pickup_lat;
   let atLng = snapshot.val().pickup_lng;
   let atLatLng = {lat: atLat, lng: atLng};

   // let marker = new google.maps.Marker({
   //    // label: "A",
   //    //animation: google.maps.Animation.DROP,
   //    draggable: false,
   //    position: atLatLng,
   //    //icon: "/images/icons8-car-24.png",
   //    map: mMap,
   // });
   //
   // mRiderQueue.set(snapshot.key, marker);
   //
   // marker.addListener("click", (event) => {
   //    //mDriverMarker.setLabel(null);
   //    mPickupAddressField.value = snapshot.val().formatted_address;
   //    //mDriverMarker.setAnimation(google.maps.Animation.BOUNCE);
   // });
   //
   // marker.addListener("mouseout", (event) => {
   //    //mDriverMarker.setAnimation(null);
   //    //mDriverMarker.setLabel("A");
   // });

}




function displayRequest(snapshot) {

   let data = snapshot.val();
   // console.log(data);

   let atLat = snapshot.val().pickup_lat;
   let atLng = snapshot.val().pickup_lng;
   let atLatLng = {lat: atLat, lng: atLng};

   let destLat = snapshot.val().dest_lat;
   let destLng = snapshot.val().dest_lng;
   let destination = {lat: destLat, lng: destLng};

   let departTime = new Date(Date.now() + 600 * 1000);

   const waypts = [];

   // for (var i = 1; i < (userMarkers.length-1); i++) {
   //    waypts.push({
   //       location: userMarkers[i].getPosition(),
   //       stopover: true,
   //    });
   // }

   var request = {
      origin: atLatLng,
      destination: destination,
      waypoints: waypts,
      optimizeWaypoints: true,
      travelMode: 'DRIVING',
      drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
   };

   directionsService = new google.maps.DirectionsService();

   directionsService.route(request, function(result, status) {
      if (status == 'OK') {

         // clearMap();
         // google.maps.event.clearListeners(map, 'dblclick');
         //
         // while (map.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
         //    map.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
         // }

         const directionsRenderer = new google.maps.DirectionsRenderer({
            //panel: directionsPanel,
            draggable: false,
            map: mMap,
         });

         // directionsArr.push(directionsRenderer);


         // directionsRenderer.setMap(map);
         directionsRenderer.setDirections(result);

         // //add accept button
         // const acceptButton = document.createElement("button");
         // acceptButton.textContent = "Accept";
         // acceptButton.classList.add("button");
         // acceptButton.addEventListener("click", () => {
         //    writeAccept(snapshot);
         //
         //
         // });
         // map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(acceptButton);

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

function signOut() {

   firebase.auth().signOut();
   userMessage("GoodBye!");

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
