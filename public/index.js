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

let mMap;
let mStatus;
let mUserLat;
let mUserLng;
let mPickupMarker;
let mDrivers = new Map();
let mDirectionsService;
let mDirectionsRenderer;
let mLocationButton;
let mRequestInProgress = false;
let mRideRequestRef;

const mMainHeadingField = document.getElementById("h5-main-text");
const PICKUP_ADDRESS_FIELD = document.getElementById("pickup");

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

function initApp() {

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

   initAuth();

   PICKUP_ADDRESS_FIELD.addEventListener("change", () => {

      let geoCoder = new google.maps.Geocoder();
      let address = PICKUP_ADDRESS_FIELD.value;

      console.log(address);
      //console.log(label);

      geoCoder.geocode({ address: address }, (results, status) => {
         if (status === "OK") {
            if (results[0]) {
               console.log(results[0].geometry.location);
               let loc = results[0].geometry.location;
               mUserLat = loc.lat();
               mUserLng = loc.lng();

               //PICKUP_ADDRESS_FIELD.value = results[0].formatted_address;

               let location = {
                  updated: firebase.database.ServerValue.TIMESTAMP,
                  last_loc: {lat: mUserLat, lng: mUserLng },
                  formatted_address: results[0].formatted_address,
                  status: "ready",
               };

               let riderRef = firebase.database()
                  .ref("/riders").child(firebase.auth().currentUser.uid);
               riderRef.set(location);

               //setPickupMarker(results[0].geometry.location, false);
            }
         } else {
            userMessage(status);
         }
      });
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
         $("#btn-signout").show();
         $("#transportservice-content-container").show();

         name = user.displayName;
         email = user.email;
         photoUrl = user.photoURL;
         emailVerified = user.emailVerified;
         uid = user.uid;

         getUserStateRecord();
         getDriverRecord();
         //getDrivers();

      } else {
         document.getElementById('firebaseui-auth-container').classList.add("show");
         userMessage("You are logged out.");

         $("#btn-signout").hide();
         // $("#btn-request").hide();
         $("#transportservice-content-container").hide();
         // photoUrl = "blank-profile-picture-973460_640.png";
         // $("#profile-picture").attr("src", photoUrl);

         //document.getElementById('main-btn-grp').classList.remove("show");
         // document.getElementById('btn-request-maintenance').classList.remove("show");
         // document.getElementById('btn-driver-maintenance').classList.remove("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });

}

function requestRide() {

   let riderRef = firebase.database()
      .ref("/riders").child(firebase.auth().currentUser.uid)
      .child("status");
   riderRef.set("pending");

}


function cancelRequest() {

   let riderRef = firebase.database()
      .ref("/riders").child(firebase.auth().currentUser.uid)
      .child("status");
   riderRef.set("ready");

}


function clearRecord() {

   let riderRef = firebase.database()
      .ref("/riders").child(firebase.auth().currentUser.uid);
   riderRef.set(null);

}



function getDriverRecord() {

   let driverRecord = firebase.database().ref("/drivers/")
                      .child(mUser.uid);

   driverRecord.on('value', (snapshot) => {
      console.log(snapshot.val());
      if (snapshot.exists()) {
         $("#link-drive").show();
         //$("#col-drive").css("display", "inline");
      } else {
         $("#link-drive").hide();
         //$("#col-drive").css("display", "none");

      }
   });

 }

function getUserStateRecord() {

   let controlRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("status");

   // rideControlRecord.on('child_added', (snapshot) => {

   controlRecord.on('value', (snapshot) => {

      console.log(snapshot.val());
      mStatus = snapshot.val();

      if (mStatus == null) {
         $("#btn-group-cancel").hide();
         $("#btn-group-request").hide();
         $("#btn-group-location").show();
         $("#btn-group-clear").hide();

         PICKUP_ADDRESS_FIELD.readOnly = false;
         mMainHeadingField.innerHTML = "Whare are you?";

      } else if (mStatus == "ready") {
         $("#btn-group-cancel").hide();
         $("#btn-group-request").show();
         $("#btn-group-location").hide();
         $("#btn-group-clear").show();

         PICKUP_ADDRESS_FIELD.readOnly = false;
         mMainHeadingField.innerHTML = "Click request button for pickup.";

      } else if (mStatus == "pending") {
         $("#btn-group-cancel").show();
         $("#btn-group-request").hide();
         $("#btn-group-location").hide();
         $("#btn-group-clear").hide();

         PICKUP_ADDRESS_FIELD.readOnly = true;
         mMainHeadingField.innerHTML = "You're pickup request is pending.";

      } else {
         $("#btn-group-cancel").hide();
         $("#btn-group-request").hide();
         $("#btn-group-location").hide();
         $("#btn-group-clear").hide();
         PICKUP_ADDRESS_FIELD.readOnly = true;
         mMainHeadingField.innerHTML = "Oops, something went wrong.";

      }

   });


   let riderLocRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("last_loc");

   riderLocRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         // console.log(snapshot.val());
         let newLoc = snapshot.val();
         if (mPickupMarker != null) {
            let oldLoc = mPickupMarker.getPosition();

            if (newLoc.lat != oldLoc.lat() || newLoc.lng != oldLoc.lng()) {
               setPickupMarker(newLoc);
            }
         } else {
           setPickupMarker(newLoc);
         }
      } else {
         if (mPickupMarker != null) {
            mPickupMarker.setMap(null);
            mPickupMarker = null;
         }
      }
   });

   let riderAddressRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("formatted_address");

   riderAddressRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         // console.log(snapshot.val());
         let newAddress = snapshot.val();
         document.getElementById("pickup").value = newAddress;

      } else {
         PICKUP_ADDRESS_FIELD.value = null;
      }
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
         //routePickup();
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

         //routePickup();
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

         //routePickup();
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

        let rider = {
           updated: firebase.database.ServerValue.TIMESTAMP,
           last_loc: {lat: mUserLat, lng: mUserLng },
           status: "ready",
        };

        let riderRef = firebase.database()
           .ref("/riders").child(firebase.auth().currentUser.uid);
        riderRef.set(rider);


        geoCodeCoordinates({lat: mUserLat, lng: mUserLng});
        //if map is initialized, then set pickup marker
        // if (mMap != null) {
        //
        //    setPickupMarker({lat: mUserLat, lng: mUserLng }, true);
        //  }
         //addUserMarker({lat: mUserLat, lng: mUserLng });
      }, (error) => {
         userMessage("Failed to get geolocation from browser");
         console.log(error.message);
      });
   } else {
      userMessage("Failed to get geolocation from browser");
   }
}

function setPickupMarker(atLatLng) {

   mMap.setCenter(atLatLng);
   mMap.setZoom(13);

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
         let loc = mPickupMarker.getPosition();
         mUserLat = loc.lat();
         mUserLng = loc.lng();

         let rider = {
            updated: firebase.database.ServerValue.TIMESTAMP,
            last_loc: {lat: mUserLat, lng: mUserLng },
            status: "ready",
         };

         let riderRef = firebase.database()
            .ref("/riders").child(firebase.auth().currentUser.uid);
         riderRef.set(rider);
         geoCodeCoordinates({lat: mUserLat, lng: mUserLng});
         //routePickup();
      });

   } else {
      mPickupMarker.setPosition(atLatLng);
      mPickupMarker.setMap(mMap);
   }

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
            //$("#btn-request").show();
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

function geoCodeCoordinates(atLatLng) {
   let geoCoder = new google.maps.Geocoder();

   geoCoder.geocode({ location: atLatLng }, (results, status) => {
     let riderRef = firebase.database()
        .ref("/riders").child(firebase.auth().currentUser.uid)
        .child("formatted_address");
      if (status === "OK") {
         if (results[0]) {
            riderRef.set(results[0].formatted_address);
         } else {
            //addressField.value = null;
         }
      } else {
        userMessage(status);

      }
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
