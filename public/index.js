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
let mDuration;
let mDestination;

let mDistance;
let mRates;
let mFare;
let mDestMarker;
let mDrivers = new Map();
let mDirectionsService;
let mDirectionsRenderer;
let mPickupRenderer;
let mLocationButton;
let mRequestInProgress = false;
let mRideRequestRef;

const USER_MESSAGE_HEADING = document.getElementById("h5-main-text");
const PICKUP_ADDRESS_FIELD = document.getElementById("pickup");
const DEST_ADDRESS_FIELD = document.getElementById("destination");
const LOCATION_BUTTON = document.getElementById("btn-group-location");
const LOC_DEST_BUTTON = document.getElementById("btn-group-loc-dest");
const COLUMN_1 = document.getElementById("col-1");
const CLEAR_BUTTON = document.getElementById("btn-group-clear");
const CLEAR_DEST_BTN = document.getElementById("btn-group-clear-dest");
const SPINNER = document.getElementById("loader");

const AUTH_CONTAINER = document.getElementById('firebaseui-auth-container');

 let mDestInfoWindow;
 let mDriverInfoWindow;



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

   mPickupRenderer = new google.maps.DirectionsRenderer({
      //panel: directionsPanel,
      markerOptions: markerOptions,
      draggable: false,
      map: mMap,
   });

   initAuth();

}

function initAuth() {

   // firebase.auth().signInAnonymously().then(() => {
   //    // Signed in..
   //    }).catch((error) => {
   //    var errorCode = error.code;
   //    var errorMessage = error.message;
   //    // ...
   // });

   let ui = new firebaseui.auth.AuthUI(firebase.auth());

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            // Return type determines whether we continue the redirect automatically
            AUTH_CONTAINER.classList.remove("show");
            return false;
         },
         uiShown: function() {
         }
      },
      signInFlow: 'popup',
      signInOptions: [
         //firebase.auth.EmailAuthProvider.PROVIDER_ID,
         //firebase.auth.GoogleAuthProvider.PROVIDER_ID,
         firebase.auth.PhoneAuthProvider.PROVIDER_ID,
         // requireDisplayName: true,

      ],
      //tosUrl: '<your-tos-url>',
      //privacyPolicyUrl: '<your-privacy-policy-url>'
   };

   firebase.auth().onAuthStateChanged((user) => {
      if (user) {
         mUser =  user;


         let riderRef = firebase.database().ref("/riders").child(user.uid);
         const updates = {};
         updates['/name' ] = user.displayName;
         updates['/email' ] = user.email;
         updates['/photo_url'] = user.photoURL;
         updates['/email_verified'] = user.emailVerified;
         updates['/phone'] = user.phoneNumber;
         updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
         riderRef.update(updates);

         getUserStateRecord();
         getDriverRecord();
         //getDrivers();

         AUTH_CONTAINER.classList.remove("show");
         if (mUser.isAnonymous) {
            userMessage("You are logged in anonymously.");
            $("#btn-signout").hide();
            $(COLUMN_1).hide();
         } else {
           userMessage("You are logged in.");
           $("#btn-signout").show();
           $(COLUMN_1).show();

         }

         $("#transportservice-content-container").show();



      } else {
         AUTH_CONTAINER.classList.add("show");
         userMessage("You are logged out.");
         $(COLUMN_1).hide();

         $("#btn-signout").hide();
         $("#link-drive").hide();
         // $("#btn-request").hide();
         $("#transportservice-content-container").hide();
         // photoUrl = "blank-profile-picture-973460_640.png";
         // $("#profile-picture").attr("src", photoUrl);

         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });



}

function renderUI() {

   var i = 0;
   // function move() {
   if (i == 0) {
      i = 1;
      var elem = document.getElementById("requestBar");
      var width = 1;
      var id = setInterval(frame, 1000);
      function frame() {
         if (width >= 100) {
            clearInterval(id);
            i = 0;
         } else {
            width++;
            elem.style.width = width + "%";
         }
      }
   }
}


function setAddress(address) {
   let geoCoder = new google.maps.Geocoder();
   //let address = PICKUP_ADDRESS_FIELD.value;

   console.log(address);

   geoCoder.geocode({ address: address }, (results, status) => {
      if (status === "OK") {
         if (results[0]) {
            console.log(results[0].geometry.location);
            let loc = results[0].geometry.location;
            mUserLat = loc.lat();
            mUserLng = loc.lng();

            // let location = {
            //    updated: firebase.database.ServerValue.TIMESTAMP,
            //    last_loc: {lat: mUserLat, lng: mUserLng },
            //    formatted_address: results[0].formatted_address,
            //    status: "ready",
            // };

            let riderRef = firebase.database()
               .ref("/riders").child(firebase.auth().currentUser.uid);

            const updates = {};
            updates['/last_loc' ] = {lat: mUserLat, lng: mUserLng };
            updates['/formatted_address'] = results[0].formatted_address;
            updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

            riderRef.update(updates);

         }
      } else {
         userMessage(status);
      }
   });
}


function setDestinationAddress(address) {
   let geoCoder = new google.maps.Geocoder();
   //let address = PICKUP_ADDRESS_FIELD.value;

   console.log(address);

   geoCoder.geocode({ address: address }, (results, status) => {
      if (status === "OK") {
         if (results[0]) {
            console.log(results[0].geometry.location);
            let loc = results[0].geometry.location;
            // mUserLat = loc.lat();
            // mUserLng = loc.lng();
            let destAddress = results[0].formatted_address;
            let destination = {lat: loc.lat(), lng: loc.lng()};

            // let location = {
            //    updated: firebase.database.ServerValue.TIMESTAMP,
            //    destination: {lat: mUserLat, lng: mUserLng },
            //    formatted_address: results[0].formatted_address,
            //    status: "ready",
            // };

            let riderRef = firebase.database()
               .ref("/riders").child(firebase.auth().currentUser.uid);
            // riderRef.set(location);

            const updates = {};
            updates['/destination' ] = destination;
            updates['/dest_address' ] = destAddress;
            updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

            riderRef.update(updates);

         }
      } else {
         userMessage(status);
      }
   });
}




function requestRide() {

   if (mRequestInProgress == true) {
     userMessage("Request in Progress.");
     return;
   }

   let requestRef = firebase.database()
      .ref("/requests").push();

   const updates = {};
   updates['/fare' ] = mFare;
   updates['/name' ] = mUser.displayName;
   updates['/phone'] = mUser.phoneNumber;
   updates['/pickup_lat'] = mPickupMarker.getPosition().lat();
   updates['/pickup_lng'] = mPickupMarker.getPosition().lng();
   updates['/pickup_address'] = PICKUP_ADDRESS_FIELD.value;
   updates['/rider_uid'] = mUser.uid;
   updates['/dest_lat'] = mDestMarker.getPosition().lat();
   updates['/dest_lng'] = mDestMarker.getPosition().lng();
   updates['/dest_address'] = DEST_ADDRESS_FIELD.value;

   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
   updates['/status'] = "pending";

   requestRef.update(updates);

   const updates2 = {};
   updates2['/status'] = "pending";
   updates2['/request_key'] = requestRef.key;
   updates2['/updated' ] = firebase.database.ServerValue.TIMESTAMP;



   let riderRef = firebase.database()
      .ref("/riders").child(firebase.auth().currentUser.uid);
   riderRef.update(updates2);


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
