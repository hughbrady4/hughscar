
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
let firebaseConfig = {
   apiKey: "AIzaSyCj2ojD-AObyfiP-aTl6eRMnZNt2TrX__w",
   authDomain: "hughscar-6ac7d.firebaseapp.com",
   databaseURL: "https://hughscar-6ac7d-default-rtdb.firebaseio.com",
   projectId: "hughscar-6ac7d",
   storageBucket: "hughscar-6ac7d.appspot.com",
   messagingSenderId: "597937667152",
   appId: "1:597937667152:web:8e3b6b57ffd011e5036555",
   measurementId: "G-9MPTSJEV3K"
};

const SERVICE_AREA_BOUNDS = {
   north: 34.23570153604349,
   south: 31.52826999601207,
   west: -101.33952345209524,
   east: -92.57243360834524,
};


let mMap;
let mUserLat;
let mUserLng;
let mPickupMarker;
let mDrivers = new Map();
let mDirectionsService;
let mDirectionsRenderer;
let mLocationButton;
let mRequestInProgress = false;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();
//console.log(firebase);


function initApp() {
   userMessage("Welcome!");
   initMap();
   initAuth();


   const pickupAddressField = document.getElementById("pickup");

   pickupAddressField.addEventListener("change", () => {

      let geoCoder = new google.maps.Geocoder();
      let address = pickupAddressField.value;

      console.log(address);
      //console.log(label);

      geoCoder.geocode({ address: address }, (results, status) => {
         if (status === "OK") {
            if (results[0]) {
               console.log(results[0]);
               pickupAddressField.value = results[0].formatted_address;
               setPickupMarker(results[0].geometry.location, false);
            }
         } else {
            userMessage(status);
         }
      });
   });

}


function getRideRequests() {

   let rideControlRecord = firebase.database().ref("/ride-requests-by-user/")
                      .child(mUser.uid);

   // rideControlRecord.on('child_added', (snapshot) => {

   rideControlRecord.get().then((snapshot) => {

      if (snapshot.exists()) {
         let key = snapshot.key;
         //userMessage("Ride request in progress: " + key);
         mRequestInProgress = true;

         //disable request button
         mLocationButton.disabled = true;
         setPickupMarker(snapshot.val().point_A);
         mPickupMarker.draggable = false;
         document.getElementById("link-request").disabled = true;
         document.getElementById("pickup").readOnly = true;
         document.getElementById("pickup").value = snapshot.val().point_A_address;


         let isDriver = snapshot.val().is_driver;
         userMessage(isDriver);

         if (isDriver == true) {
           $("#link-drive").show();

         } else {
            $("#link-drive").hide();
         }
      } else {
         //if (mRequestInProgress == false) {
         requestLocation();
         //}
      }

   }).catch((error) => {
      userMessage(error);
   });

}


function getDrivers() {

   let driversRecord = firebase.database().ref("/drivers")
      .orderByChild("status").equalTo("online");
   //console.log(mUser.uid);
   //console.log(driversRecord);

   driversRecord.on('child_added', (snapshot) => {
      if (snapshot.exists()) {

         console.log(snapshot.key);
         console.log(snapshot.val().last_loc);

         let key = snapshot.key;
         let driver_loc = snapshot.val().last_loc;

         mDriverMarker = new google.maps.Marker({
            position: driver_loc,
            map: mMap,
            icon: "/images/icons8-car-24.png"
         });

         mDrivers.set(key, mDriverMarker);
         routePickup();
      }
   });

   driversRecord.on('child_changed', (snapshot) => {
      if (snapshot.exists()) {
         console.log(snapshot.key);
         console.log(snapshot.val().last_loc);

         let key = snapshot.key;
         let driverLoc = snapshot.val().last_loc;

         let marker = mDrivers.get(key);
         marker.setPosition(driverLoc);

         routePickup();
      }
   });

   driversRecord.on('child_removed', (snapshot) => {
      if (snapshot.exists()) {
         console.log(snapshot.key);
         console.log(snapshot.val().last_loc);

         let key = snapshot.key;
         let driverLoc = snapshot.val().last_loc;

         let marker = mDrivers.get(key);

         marker.setMap(null);
         mDrivers.delete(key);

         routePickup();
      }
   });

}


function requestLocation() {
  if (navigator.geolocation) {
     navigator.geolocation.getCurrentPosition((position) => {
        mUserLat = position.coords.latitude;
        mUserLng = position.coords.longitude;
        console.log(mUserLat);
        console.log(mUserLng);

        //if map is initialized, then set pickup marker
        if (mMap != null) {
           mMap.setCenter({lat: mUserLat, lng: mUserLng });
           mMap.setZoom(13);
           setPickupMarker({lat: mUserLat, lng: mUserLng }, true);
         }
         //addUserMarker({lat: mUserLat, lng: mUserLng });
      }, (error) => {
         userMessage("Failed to get geolocation from browser");
         console.log(error.message);
      });
   } else {
      userMessage("Failed to get geolocation from browser");
   }
}

function setPickupMarker(atLatLng, geoCode) {

   if (mPickupMarker == null) {
      mPickupMarker = new google.maps.Marker({
         label: "A",
         animation: google.maps.Animation.DROP,
         draggable: true,
         position: atLatLng,
         map: mMap,
      });

      mPickupMarker.addListener("mouseover", (event) => {
         //mPickupMarker.setLabel(null);
         //mPickupMarker.setAnimation(google.maps.Animation.BOUNCE);
      });

      mPickupMarker.addListener("mouseout", (event) => {
         //mPickupMarker.setAnimation(null);
         //mPickupMarker.setLabel("A");
      });
      mPickupMarker.addListener("dragend", (event) => {
         //addressField.value = marker.getPosition();
         geoCodeMarker(document.getElementById("pickup"), mPickupMarker.getPosition());
         routePickup();
      });

      // mPickupMarker.addListener("position_changed", (event) => {
      //    routePickup();
      //
      // });



   } else {
      mPickupMarker.setPosition(atLatLng);
      mPickupMarker.setMap(mMap);
   }

   if (geoCode) {
      geoCodeMarker(document.getElementById("pickup"), atLatLng);
   }

   routePickup();

}


function routePickup() {

   let origins = [];

   mDrivers.forEach((item, i) => {
      origins.push(item.position);

   });

   console.log(origins);

   if (mDrivers.get("F4twFRaFGsMOsQQXyQFgkPPR3Id2") != null && mPickupMarker != null) {

      let driverPosition = mDrivers.get("F4twFRaFGsMOsQQXyQFgkPPR3Id2").position;

      let request = {
         origin: driverPosition,
         destination: mPickupMarker.getPosition(),
         //waypoints: waypts,
         //optimizeWaypoints: true,
         travelMode: 'DRIVING',
         //drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
      };

      mDirectionsService.route(request, (response, status) => {
         if (status == 'OK') {
            mDirectionsRenderer.setDirections(response);
            mDirectionsRenderer.setMap(mMap);
            $("#link-request").show();
            console.log(response.routes[0].legs[0].duration);
            let driverInfowindow = new google.maps.InfoWindow({
               map: mMap,
               anchor: mDriverMarker,
               content: "Oh hello, I'm currently online and " + response.routes[0].legs[0].duration.text + " away.",
               position: driverPosition,
            });
            driverInfowindow.open(mMap);



         }
      });
   } else {
      mDirectionsRenderer.setMap(null);
   }
}

function geoCodeMarker(addressField, atLatLng) {
   let geoCoder = new google.maps.Geocoder();

   //console.log(addressField);
   //console.log(atLatLng);

   geoCoder.geocode({ location: atLatLng }, (results, status) => {
      if (status === "OK") {
         if (results[0]) {
            //console.log(addressField);
            addressField.value = results[0].formatted_address;
         } else {
            addressField.value = null;
         }
      } else {
        userMessage(status);

      }
   });

}


function initMap() {
   let zoom = 11;
   if (mUserLat == null || mUserLng == null ) {
     mUserLat = 38.2451723695606;
     mUserLng = -104.73386842314846;
     zoom = 9;
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

   mLocationButton = document.createElement("button");

   mLocationButton.textContent = "Current Location";
   mLocationButton.id = "button-location";
   mLocationButton.classList.add("custom-map-control-button");
   mMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(mLocationButton);

   mLocationButton.addEventListener("click", () => {
      requestLocation();
   });

   mDirectionsService = new google.maps.DirectionsService();

   let markerOptions = {
      visible: false,
   };

   mDirectionsRenderer = new google.maps.DirectionsRenderer({
      //panel: directionsPanel,
      markerOptions: markerOptions,
      draggable: false,
      map: mMap,
   });

}


function initAuth() {

   let ui = new firebaseui.auth.AuthUI(firebase.auth());

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            // Return type determines whether we continue the redirect automatically
            document.getElementById('firebaseui-auth-container').classList.remove("show");
            // document.getElementById('main-controls-container').classList.add("show");

            return false;
         },
         uiShown: function() {
            //document.getElementById('loader').style.display = 'none';
         }
      },
      signInFlow: 'popup',
      signInOptions: [
         //firebase.auth.EmailAuthProvider.PROVIDER_ID,
         //firebase.auth.GoogleAuthProvider.PROVIDER_ID,
         firebase.auth.PhoneAuthProvider.PROVIDER_ID
      ],
      //tosUrl: '<your-tos-url>',
      //privacyPolicyUrl: '<your-privacy-policy-url>'
   };

   firebase.auth().onAuthStateChanged((user) => {
      if (user) {
         mUser =  user;
         document.getElementById('firebaseui-auth-container').classList.remove("show");
         userMessage("You are logged in.");
         $("#link-signOut").show();
         name = user.displayName;
         email = user.email;
         photoUrl = user.photoURL;
         emailVerified = user.emailVerified;
         uid = user.uid;  // The user's ID, unique to the Firebase project. Do NOT use
                      // this value to authenticate with your backend server, if
                      // you have one. Use User.getToken() instead.
         // console.log("  Name: " + name);
         // console.log("  Url: " + photoUrl);
         // $("#profile-picture").attr("src", photoUrl);
         // $("#profile-name").text(name);
         // $("#profile-email").text(email);
         // $("#profile-card").show();

         getRideRequests();
         getDrivers();

      } else {
         document.getElementById('firebaseui-auth-container').classList.add("show");
         userMessage("You are logged out.");

         $("#link-signOut").hide();
         $("#link-request").hide();
         // photoUrl = "blank-profile-picture-973460_640.png";
         // $("#profile-picture").attr("src", photoUrl);

         //document.getElementById('main-btn-grp').classList.remove("show");
         // document.getElementById('btn-request-maintenance').classList.remove("show");
         // document.getElementById('btn-driver-maintenance').classList.remove("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });

   const linksignOut = document.getElementById('link-signOut');

   linksignOut.addEventListener('click', e => {

      firebase.auth().signOut();
      userMessage("GoodBye!");

   });

   const linkRequest = document.getElementById('link-request');

   linkRequest.addEventListener('click', e => {

      if (mPickupMarker == null) {
        userMessage("Pickup location is not set.");
        return;
      }

      let rideRequestRef = firebase.database().ref("/ride-requests/").push();
      let updates = {};

      let departureTime = new Date();

      updates["/ride-requests/" + rideRequestRef.key] = {
         rider_uid: mUser.uid,
         //user_name: user.displayName,
         status: "Ready",
         startedAt: firebase.database.ServerValue.TIMESTAMP,
         request_date: departureTime,
         //request_time: document.getElementById("time").value,
         point_A: mPickupMarker.getPosition().toJSON(),
         point_A_address: document.getElementById("pickup").value,
         //point_B: mDestinationMarker.position.toJSON(),
         //point_B_address: document.getElementById("destination").value,
      };

      updates["/ride-requests-by-user/" + mUser.uid] = {
         status: "Ready",
         rideRequestKey: rideRequestRef.key,
         // user_name: user.displayName,
         startedAt: firebase.database.ServerValue.TIMESTAMP,
         // request_date: document.getElementById("date").value,
         // request_time: document.getElementById("time").value,
         point_A: mPickupMarker.getPosition().toJSON(),
         point_A_address: document.getElementById("pickup").value,
         // point_B: mDestinationMarker.getPosition().toJSON(),
         // point_B_address: document.getElementById("destination").value,
      };

      updates["/ride-control/" + mUser.uid + "/current_request"] = rideRequestRef.key;
      updates["/ride-control/" + mUser.uid + "/status"] = "Ready";
      updates["/ride-control/" + mUser.uid + "/ready_at"] =
         firebase.database.ServerValue.TIMESTAMP;


      let result = firebase.database().ref().update(updates);


      userMessage("Request record created!");

   });




}

function signOut() {
  firebase.auth().signOut();
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
