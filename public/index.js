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
let mUserLoc = {lat: 38.2451723695606, lng: -104.73386842314846};
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
let mDestInfoWindow;
let mDriverInfoWindow;

const USER_MESSAGE_HEADING = document.getElementById("h5-main-text");
const PICKUP_ADDRESS_FIELD = document.getElementById("pickup");
const DEST_ADDRESS_FIELD = document.getElementById("destination");
const LOCATION_BUTTON = document.getElementById("btn-group-location");
const LOC_DEST_BUTTON = document.getElementById("btn-group-loc-dest");
const CLEAR_BUTTON = document.getElementById("btn-group-clear");
const CLEAR_DEST_BTN = document.getElementById("btn-group-clear-dest");
const SPINNER = document.getElementById("loader");
const PROGRESS = document.getElementById("requestProgress");
const PROGRESS_BAR = document.getElementById("requestBar");
const AUTH_CONTAINER = document.getElementById('firebaseui-auth-container');

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

function authenticate() {

   AUTH_CONTAINER.classList.add("show");

   let ui = new firebaseui.auth.AuthUI(firebase.auth());
   let data;

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            // Return type determines whether we continue the redirect automatically
            //AUTH_CONTAINER.classList.remove("show");
            return false;
         },
         uiShown: function() {
         },
         // signInFailure callback must be provided to handle merge conflicts which
         // occur when an existing credential is linked to an anonymous user.
         signInFailure: function(error) {
            // For merge conflicts, the error.code will be
            // 'firebaseui/anonymous-upgrade-merge-conflict'.
            if (error.code != 'firebaseui/anonymous-upgrade-merge-conflict') {
               return Promise.resolve();
            }

            // The credential the user tried to sign in with.
            let cred = error.credential;

            let anonymousUser = mUser;
            let riderRef = firebase.database().ref("/riders").child(mUser.uid);
            return riderRef.get().then((snapshot) => {
               data = snapshot.val();
               console.log(data);
               return riderRef.set(null);
            }).then(() => {
               return firebase.auth().signInWithCredential(cred);
            }).then((userCred) => {
               // Original Anonymous Auth instance now has the new user.
               console.log(userCred.user);
               let riderRef2 = firebase.database().ref("/riders").child(userCred.user.uid);
               const updates = {};
               updates['/dest_address' ] = data.dest_address;
               updates['/formatted_address' ] = data.formatted_address;
               updates['/last_loc'] = data.last_loc;
               updates['/destination'] = data.destination;
               // updates['/status' ] = null;


               updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
               return riderRef2.update(updates);
               // return riderRef2.set(data);
            }).then(() => {
               // Delete anonymnous user.
               return anonymousUser.delete();
            }).then(() => {
               // Clear data in case a new user signs in, and the state change
               // triggers.
               data = null;
               // FirebaseUI will reset and the UI cleared when this promise
               // resolves.
               // signInSuccessWithAuthResult will not run. Successful sign-in
               // logic has to be run explicitly.
               //window.location.assign('<url-to-redirect-to-on-success>');
            }).catch((error) => {
               console.log(error.message);
            });
         }
      },
      autoUpgradeAnonymousUsers: true,
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

   ui.start('#firebaseui-auth-container', uiConfig);

}

function cancelRequest(requestId) {

   let requestRef = firebase.database()
      .ref("/requests").child(requestId);

   const updates = {};
   updates['/status' ] = "canceled";
   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
   requestRef.update(updates).then(() => {

     let riderRef = firebase.database()
        .ref("/riders").child(mUser.uid);

     const updates2 = {};
     updates2['/status' ] = null;
     updates2['/request_key' ] = null;
     updates2['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
     return riderRef.update(updates2);


   }).catch((error) => {
      userMessage(error.message);
   });

}

function clearLocation(type) {

   let riderRef = firebase.database()
      .ref("/riders").child(firebase.auth().currentUser.uid);

   const updates = {};
   if (type == 'pickup') {
      updates['/last_loc' ] = null;
      updates['/formatted_address'] = null;
   } else if (type == 'destination') {
     updates['/destination' ] = null;
     updates['/dest_address'] = null;
   }
   //updates['/status'] = null;

   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

   riderRef.update(updates);

}

function computeFare() {

   if (mDuration == null || mDistance == null || mRates == null) {
      return;
   }

   let minutes = mDuration.value / 60;

   console.log(minutes);

   let miles = mDistance.value * 0.000621371;

   console.log(miles);

   let baseFare = mRates.base_rate;
   let cancelFare = mRates.cancelation_rate;
   let mileageFare = miles * mRates.mileage_rate;
   let timeFare = minutes * mRates.per_minute_rate;

   let totalFare = baseFare + mileageFare + timeFare;

   mFare = { base_amount: baseFare,  cancel_amount: cancelFare,
             mileage_amount: mileageFare,
             time_amount: timeFare, fare_amount: totalFare };

   let riderRef = firebase.database()
      .ref("/riders").child(firebase.auth().currentUser.uid);

   const updates = {};
   updates['/fare' ] = mFare;
   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

   riderRef.update(updates);


   // Create our number formatter.
   let formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: mRates.currency,

      // These options are needed to round to whole numbers if that's what you want.
      //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
      //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
   });

   // formatter.format(2500);

   let fareStr = formatter.format(totalFare);
   // console.log(formatter.format(totalFare));

   const contentString =
      '<div id="content">' +
      '<div id="siteNotice">' +
      "</div>" +
      '<h5 id="firstHeading" class="firstHeading">' + fareStr + '</h5>' +

      '<div id="bodyContent">' +
      '<button id="btn-request-ride" class="btn btn-primary" onclick="requestRide()">Request</button>' +
      "<p>Your destination is <b>" + mDistance.text + "</b> away. The trip " +
      "duration is <b>" + mDuration.text + "</b>.</p>" +
      "</div>" +
      "</div>";

   if (mDestInfoWindow != null) {
      mDestInfoWindow.close();
   }
   mDestInfoWindow = new google.maps.InfoWindow();

   mDestInfoWindow.setContent(contentString);

   console.log(mDestMarker);
   console.log(mMap);


   mDestInfoWindow.open({
      anchor: mDestMarker,
      mMap,
      shouldFocus: false,
   });

}

function initApp() {

   //default location and zoom for map
   let zoom = 9;
   // if (mUserLat == null || mUserLng == null ) {
   //   mUserLat = 38.2451723695606;
   //   mUserLng = -104.73386842314846;
   //   zoom = 9;
   // }

   mMap = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: mUserLoc,
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

   firebase.auth().onAuthStateChanged((user) => {

      if (user == null) {
         // AUTH_CONTAINER.classList.add("show");
         userMessage("You are logged out.");

         $("#btn-signout").hide();
         $("#link-drive").hide();
         $("#btn-signin").show();

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

      let riderRef = firebase.database().ref("/riders").child(user.uid);
      const updates = {};
      updates['/name' ] = user.displayName;
      updates['/email' ] = user.email;
      updates['/photo_url'] = user.photoURL;
      updates['/email_verified'] = user.emailVerified;
      updates['/phone'] = user.phoneNumber;
      updates['/anonymous' ] = user.isAnonymous;
      updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
      riderRef.update(updates).then(() => {
         getUserStateRecord();
         getDriverRecord();
      });

   });

}

function showProgressBar() {
   let width = 0;
   let id = setInterval(() => {
      if (width >= 100) {
         clearInterval(id);
         SPINNER.classList.remove("show");
         PROGRESS.classList.remove("show");
         userMessage("Sorry, no drivers found in your area.");
       } else {
          width++;
          PROGRESS_BAR.style.width = width + "%";
       }
   }, 3000);
}

function setAddress(address) {
   let geoCoder = new google.maps.Geocoder();
   //let address = PICKUP_ADDRESS_FIELD.value;

   console.log(address);

   geoCoder.geocode({ address: address }, (results, status) => {
      if (status === "OK" && results[0]) {
         // console.log(results[0].geometry.location);
         mUserLoc = results[0].geometry.location;
         mUserLat = loc.lat();
         mUserLng = loc.lng();
         return results[0].formatted_address;
      } else {
         userMessage(status);
      }
   }).then((address) => {

     let riderRef = firebase.database()
        .ref("/riders").child(firebase.auth().currentUser.uid);

     const updates = {};
     updates['/last_loc' ] = mUserLoc;
     updates['/formatted_address'] = address;
     updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

     riderRef.update(updates);

   });
}

function setDateTime(value) {

   const updates = {};
   updates['/date_time'] = value;
   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

   let riderRef = firebase.database()
      .ref("/riders").child(mUser.uid);
   riderRef.update(updates);

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

   if (mUser.isAnonymous == true) {
     userMessage("Please log in to request a ride.");
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

   requestRef.update(updates).then(() => {

     const updates2 = {};
     updates2['/status'] = "pending";
     updates2['/request_key'] = requestRef.key;
     updates2['/updated' ] = firebase.database.ServerValue.TIMESTAMP;


     let riderRef = firebase.database()
        .ref("/riders").child(firebase.auth().currentUser.uid);
     riderRef.update(updates2);

   });




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

   let controlRecord = firebase.database().ref("/control-data");

   controlRecord.get().then((snapshot) => {
      if (snapshot.exists()) {
          mRates = snapshot.val();
          console.log("Control Data: " + mRates);
      } else {
          mRates = null;
      }
      if (mRequestInProgress == false) {
         computeFare();
      }
   }).then(() => {
      console.log("Got it!");
   }).catch((error) => {
      userMessage(error);
   });


   let statusRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("status");

   // rideControlRecord.on('child_added', (snapshot) => {

   statusRecord.on('value', (snapshot) => {

      mStatus = snapshot.val();
      console.log("Status: " + mStatus);


      if (mStatus == null) {

         if (mPickupMarker != null) {
            mPickupMarker.setDraggable(true);
         }

         SPINNER.classList.remove("show");
         PROGRESS.classList.remove("show");
         // $(PROGRESS).hide();

         PICKUP_ADDRESS_FIELD.readOnly = false;
         DEST_ADDRESS_FIELD.readOnly = false;
         USER_MESSAGE_HEADING.innerHTML = "Where are you?";

      } else if (mStatus == "pending") {

         if (mPickupMarker != null) {
            mPickupMarker.setDraggable(false);
         }
         if (mDestMarker != null) {
            mDestMarker.setDraggable(false);
         }

         SPINNER.classList.add("show");
         PROGRESS.classList.add("show");

         showProgressBar();
         PICKUP_ADDRESS_FIELD.readOnly = true;
         DEST_ADDRESS_FIELD.readOnly = true;
         USER_MESSAGE_HEADING.innerHTML = "You're pickup request is pending.";

      } else if (mStatus == "accepted") {

      } else {

         if (mPickupMarker != null) {
            mPickupMarker.setDraggable(false);
         }
         PICKUP_ADDRESS_FIELD.readOnly = true;
         USER_MESSAGE_HEADING.innerHTML = "Oops, something went wrong.";

      }

   });


   let riderLocRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("last_loc");

   riderLocRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         // console.log(snapshot.val());
         let newLoc = snapshot.val();
         if (mPickupMarker != null) {
            //test if location changed, in case update was from marker itself
            let oldLoc = mPickupMarker.getPosition();
            if (newLoc.lat != oldLoc.lat() || newLoc.lng != oldLoc.lng()) {
               setPickupMarker(newLoc);
            }
         } else {
           //creates a new marker
           setPickupMarker(newLoc);
         }
      } else {
         if (mPickupMarker != null) {
            mPickupMarker.setMap(null);
            mPickupMarker = null;
         }
      }
      routeFare();

   });

   let riderAddressRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("formatted_address");

   riderAddressRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         // console.log(snapshot.val());
         let newAddress = snapshot.val();
         PICKUP_ADDRESS_FIELD.value = newAddress;
         LOCATION_BUTTON.classList.remove("show");
         CLEAR_BUTTON.classList.add("show");

      } else {
         PICKUP_ADDRESS_FIELD.value = null;
         LOCATION_BUTTON.classList.add("show");
         CLEAR_BUTTON.classList.remove("show");

      }
   });

   let destAddressRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("dest_address");

   destAddressRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         // console.log(snapshot.val());
         let newAddress = snapshot.val();
         DEST_ADDRESS_FIELD.value = newAddress;
         LOC_DEST_BUTTON.classList.remove("show");
         CLEAR_DEST_BTN.classList.add("show");
      } else {
         DEST_ADDRESS_FIELD.value = null;
         LOC_DEST_BUTTON.classList.add("show");
         CLEAR_DEST_BTN.classList.remove("show");
      }
   });

   let destinationRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("destination");

   destinationRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         // console.log(snapshot.val());
         let newLoc = snapshot.val();
         if (mDestMarker != null) {
            //test if location changed, in case update was from marker itself
            let oldLoc = mDestMarker.getPosition();
            if (newLoc.lat != oldLoc.lat() || newLoc.lng != oldLoc.lng()) {
               setDestMarker(newLoc);
            }
         } else {
            //creates a new marker
            setDestMarker(newLoc);
         }
      } else {
         if (mDestMarker != null) {
            mDestMarker.setMap(null);
            mDestMarker = null;
         }
      }
      routeFare();
   });

   let lengthRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("fare_length");

   lengthRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
          let fareLength = snapshot.val();
          mDistance = fareLength.distance;
          mDuration = fareLength.duration;
          console.log(fareLength);
      } else {
         mDistance = null;
         mDuration = null;
      }
      if (mRequestInProgress == false) {
         computeFare();
      }
   });

   let fareRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("fare");

   fareRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         mFare = snapshot.val();
      } else {
         mFare = null;
      }
   });

   let requestKeyRecord = firebase.database().ref("/riders")
                      .child(mUser.uid).child("request_key");

   requestKeyRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         if (mDestInfoWindow != null) {
            mDestInfoWindow.close();
         }
         mRequestInProgress = true;
         mRideRequestRef = snapshot.val();
         LOCATION_BUTTON.classList.remove("show");
         CLEAR_BUTTON.classList.remove("show");
         LOC_DEST_BUTTON.classList.remove("show");
         CLEAR_DEST_BTN.classList.remove("show");


         const cancelButton = document.createElement("button");
         cancelButton.textContent = "Cancel";
         cancelButton.classList.add("btn");
         cancelButton.classList.add("btn-primary");
         mMap.controls[google.maps.ControlPosition.TOP_CENTER].push(cancelButton);
         cancelButton.addEventListener("click", () => {
            cancelRequest(mRideRequestRef);
         });




         let requestRecordStatus = firebase.database().ref("/requests")
                            .child(mRideRequestRef).child("status");

         requestRecordStatus.on('value', (snapshot) => {
            if (snapshot.exists()) {
               console.log("Request status: " + snapshot.val());
               if (mStatus == "accepted") {
                 PROGRESS.classList.remove("show");
                 SPINNER.classList.add("show");

                 USER_MESSAGE_HEADING.innerHTML = "You're pickup request is accepted.";

               } else if (mStatus == "pending") {

                  if (mPickupMarker != null) {
                     mPickupMarker.setDraggable(false);
                  }
                  if (mDestMarker != null) {
                     mDestMarker.setDraggable(false);
                  }

                  SPINNER.classList.add("show");
                  PROGRESS.classList.add("show");

                  showProgressBar();
                  PICKUP_ADDRESS_FIELD.readOnly = true;
                  DEST_ADDRESS_FIELD.readOnly = true;
                  USER_MESSAGE_HEADING.innerHTML = "You're pickup request is pending.";

               }
               //routePickup();
            }
         });

         let requestDriverLoc = firebase.database().ref("/requests")
                            .child(mRideRequestRef).child("driver_loc");

         requestDriverLoc.on('value', (snapshot) => {
            if (snapshot.exists()) {
               let loc = snapshot.val();
               console.log(loc);
               routePickup(loc);
            } else {
               routePickup(null);
            }
         });




      } else {
         if (mRideRequestRef != null) {
            let requestRecord = firebase.database().ref("/requests")
                              .child(mRideRequestRef);
            requestRecord.off();
            mRideRequestRef = null;
         }
         if (mRequestInProgress == true) {
            mMap.controls[google.maps.ControlPosition.TOP_CENTER].pop();
            mRequestInProgress = false;
         }
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

      }
   });

}

function requestLocation(type) {
   if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
         let riderRef = firebase.database()
            .ref("/riders").child(firebase.auth().currentUser.uid);
         const updates = {};
         let lat = position.coords.latitude;
         let lng = position.coords.longitude;

         if (type == 'pickup') {
            mUserLat = lat;
            mUserLng = lng;
            //console.log(mUserLat);
            //console.log(mUserLng);
            updates['/last_loc' ] = {lat: mUserLat, lng: mUserLng };
            // updates['/status' ] = ready;
            geoCodeCoordinates({lat: mUserLat, lng: mUserLng}, 'pickup');

         } else if (type == 'destination') {
            updates['/destination' ] = {lat: lat, lng: lng };
            geoCodeCoordinates({lat: lat, lng: lng}, 'destination');

         }

         updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
         riderRef.update(updates);

      }, (error) => {
         userMessage("Failed to get geolocation from browser");
         console.log(error.message);
      });
   } else {
      userMessage("Failed to get geolocation from browser");
   }
}

function setDestMarker(atLatLng) {

   mMap.setCenter(atLatLng);
   mMap.setZoom(13);

   let animate = google.maps.Animation.DROP;
   let drag = true;
   if (mStatus == "pending") {
      drag = false;
      animate = null;

   }

   if (mDestMarker == null) {
      mDestMarker = new google.maps.Marker({
         label: "B",
         animation: animate,
         draggable: drag,
         position: atLatLng,
         map: mMap,
      });

      mDestMarker.addListener("dragend", (event) => {

         let loc = mDestMarker.getPosition();

         let destination = {lat: loc.lat(), lng: loc.lng()};

         let riderRef = firebase.database()
            .ref("/riders").child(firebase.auth().currentUser.uid);

         const updates = {};
         updates['/destination' ] = destination;
         updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

         riderRef.update(updates);
         geoCodeCoordinates(destination, 'destination');

      });

   } else {
      mDestMarker.setPosition(atLatLng);
      mDestMarker.setMap(mMap);
   }

}

function setPickupMarker(atLatLng) {

   mMap.setCenter(atLatLng);
   mMap.setZoom(13);

   let drag = true;
   let animate = google.maps.Animation.DROP;
      if (mStatus == "pending") {
      drag = false;
      animate  = null;
   }

   if (mPickupMarker == null) {
      mPickupMarker = new google.maps.Marker({
         label: "A",
         animation: animate,
         draggable: drag,
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

         // let rider = {
         //    updated: firebase.database.ServerValue.TIMESTAMP,
         //    last_loc: {lat: mUserLat, lng: mUserLng },
         //    status: "ready",
         // };

         let riderRef = firebase.database()
            .ref("/riders").child(firebase.auth().currentUser.uid);
         // riderRef.set(rider);

         const updates = {};
         updates['/last_loc' ] = {lat: mUserLat, lng: mUserLng };
         // updates['/status' ] = ready;
         updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

         riderRef.update(updates);

         geoCodeCoordinates({lat: mUserLat, lng: mUserLng}, 'pickup');
      });

   } else {
      mPickupMarker.setPosition(atLatLng);
      mPickupMarker.setMap(mMap);
   }

}

function routeFare() {


   if (mPickupMarker != null && mDestMarker != null) {

      let request = {
         origin: mPickupMarker.getPosition(),
         destination: mDestMarker.getPosition(),
         //waypoints: waypts,
         //optimizeWaypoints: true,
         travelMode: 'DRIVING',
         //drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
      };

      mDirectionsService.route(request, (response, status) => {
         if (status == 'OK') {
            mDirectionsRenderer.setDirections(response);
            mDirectionsRenderer.setMap(mMap);
            let duration = response.routes[0].legs[0].duration;
            let distance = response.routes[0].legs[0].distance;

            let riderRef = firebase.database()
               .ref("/riders").child(firebase.auth().currentUser.uid);
            // riderRef.set(location);

            const updates = {};
            // updates['/duration' ] = duration;
            // updates['/distance' ] = distance;
            updates['/fare_length' ] = {distance: distance, duration: duration};;

            updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

            riderRef.update(updates);

            // let driverInfowindow = new google.maps.InfoWindow({
            //    map: mMap,
            //    anchor: mDriverMarker,
            //    content: "Oh hello, I'm currently online and " + response.routes[0].legs[0].duration.text + " away.",
            //    position: driverPosition,
            // });
            // driverInfowindow.open(mMap);



         }
      });
   } else {
      mDirectionsRenderer.setMap(null);
   }
}

function routePickup(driverPosition) {


   if (mPickupMarker != null && driverPosition != null) {

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
            mPickupRenderer.setDirections(response);
            mPickupRenderer.setMap(mMap);
            console.log(response.routes[0].legs[0].duration);
            let driverInfowindow = new google.maps.InfoWindow({
               map: mMap,
               anchor: mPickupMarker,
               content: "Hello, I'm currently " + response.routes[0].legs[0].duration.text + " away.",
               position: driverPosition,
            });
            driverInfowindow.open(mMap);



         }
      });
   } else {
      mPickupRenderer.setMap(null);
   }
}

function geoCodeCoordinates(atLatLng, type) {
   let geoCoder = new google.maps.Geocoder();

   geoCoder.geocode({ location: atLatLng }, (results, status) => {

      if (status === "OK") {
         if (results[0]) {
            if (type == "pickup") {
               let riderRef = firebase.database()
                  .ref("/riders").child(firebase.auth().currentUser.uid)
                  .child("formatted_address");
               riderRef.set(results[0].formatted_address);
            } else if (type == "destination") {
               let destRef = firebase.database()
                  .ref("/riders").child(firebase.auth().currentUser.uid)
                  .child("dest_address");
               destRef.set(results[0].formatted_address);
            }
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
