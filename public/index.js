
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
let mDirectionsService;
let mDistanceService;

let mOrigins = [];
let mMarkers = [];
let mDriverWindows = [];

let mDirectionsRenderer;
let mPickupRenderer;
let mLocationButton;
let mRequestInProgress = false;
let mRequestId;
let mRideRequestRef;
let mDestInfoWindow;

const DRIVERS = new Map();
const INFO_WINDOWS = new Map();

const USER_MESSAGE_HEADING = document.getElementById("h5-main-text");
const PICKUP_ADDRESS_FIELD = document.getElementById("pickup");

//const DATE_TIME_FIELD = document.getElementById("datetime");
const LOCATION_BUTTON = document.getElementById("btn-group-location");
const LOC_DEST_BUTTON = document.getElementById("btn-group-loc-dest");
const CLEAR_BUTTON = document.getElementById("btn-group-clear");
const CLEAR_DEST_BTN = document.getElementById("btn-group-clear-dest");
const SPINNER = document.getElementById("loader");
const PROGRESS = document.getElementById("requestProgress");
const PROGRESS_BAR = document.getElementById("requestBar");
const AUTH_CONTAINER = document.getElementById('firebaseui-auth-container');


const DEST_ADDRESS_FIELD = document.getElementById("destination");

const BTN_PICKUP_LOC = document.getElementById("btn-location");
BTN_PICKUP_LOC.onclick = function() {

   if (mMap == null) return;

   let position = mMap.getCenter().toJSON();
   const updates = {};
   let pickupRef = firebase.database().ref("/riders").child(mUser.uid);
   updates['/pickup' ] = position;
   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
   pickupRef.update(updates).then(() => {
      userMessage("Pickup location updated ");

   });

}

const BTN_DEST_LOC = document.getElementById("btn-destination");
BTN_DEST_LOC.onclick = function() {

   if (mMap == null) return;

   let position = mMap.getCenter().toJSON();
   const updates = {};
   let destinationRef = firebase.database().ref("/riders").child(mUser.uid);
   updates['/destination' ] = position;
   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
   destinationRef.update(updates).then(() => {
      userMessage("Destination location updated ");

   });

}

const BTN_LOC = document.createElement("button");
BTN_LOC.classList.add("btn");
BTN_LOC.classList.add("btn-light");
BTN_LOC.classList.add("custom-map-control-button");
BTN_LOC.innerHTML = "<i class='material-icons md-18'>my_location</i>";
BTN_LOC.onclick = function() {
  if (navigator.geolocation) {
     navigator.geolocation.getCurrentPosition((position) => {
        let riderRef = firebase.database()
           .ref("/riders").child(firebase.auth().currentUser.uid);
        const updates = {};
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;
        updates['/last_loc' ] = {lat: lat, lng: lng };
        updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
        riderRef.update(updates).then(() => {
            userMessage("Location updated");
        });

     }, (error) => {
        userMessage("Failed to get geolocation from browser");
        console.log(error.message);
     });
  } else {
     userMessage("Failed to get geolocation from browser");
  }


}



const BTN_REQUEST = document.createElement("button");
BTN_REQUEST.classList.add("btn");
BTN_REQUEST.classList.add("btn-primary");
BTN_REQUEST.classList.add("custom-map-control-button");
BTN_REQUEST.innerHTML = "Request";
BTN_REQUEST.onclick = function() {

     if (mRequestInProgress == true) {
       userMessage("Request in Progress.");
       return;
     }

     if (mUser.isAnonymous == true) {
       userMessage("Please log in to request a ride.");
       authenticate();
       return;
     }

     let requestRef = firebase.database()
        .ref("/requests").push();

     const updates = {};
     updates['/fare' ] = mFare;
     updates['/name' ] = mUser.displayName;
     updates['/phone'] = mUser.phoneNumber;
     updates['/pickup_loc'] = mPickupMarker.getPosition().toJSON();
     updates['/pickup_lat'] = mPickupMarker.getPosition().lat();
     updates['/pickup_lng'] = mPickupMarker.getPosition().lng();
     updates['/pickup_address'] = PICKUP_ADDRESS_FIELD.value;
     //updates['/pickup_time'] = DATE_TIME_FIELD.value;
     updates['/rider_uid'] = mUser.uid;
     updates['/dest_loc'] = mDestMarker.getPosition().toJSON();
     updates['/dest_lat'] = mDestMarker.getPosition().lat();
     updates['/dest_lng'] = mDestMarker.getPosition().lng();
     updates['/dest_address'] = DEST_ADDRESS_FIELD.value;

     updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
     updates['/status'] = "pending";

     requestRef.update(updates).then(() => {

       const updates2 = {};
       // updates2['/status'] = "pending";
       updates2['/request_key'] = requestRef.key;
       updates2['/updated' ] = firebase.database.ServerValue.TIMESTAMP;


       let riderRef = firebase.database()
          .ref("/riders").child(firebase.auth().currentUser.uid);
       return riderRef.update(updates2);

     }).then(() => {
        firebase.analytics().logEvent('request_made');

        callDriver();

     });


}




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
            console.log(error);
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
      // autoUpgradeAnonymousUsers: true,
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

function calcDistance() {

   for (let k = 0; k < mDriverWindows.length; k++) {
      mDriverWindows[k].close();
   }
   mDriverWindows.length = 0;
   mDriverWindows = [];


   let destinations = [mPickupMarker.getPosition()];

   let distanceRequest = {
      origins: mOrigins,
      destinations: destinations,
      travelMode: 'DRIVING',
      avoidHighways: false,
      avoidTolls: false,
   }

   mDistanceService.getDistanceMatrix(distanceRequest,  (response, status) => {
      if (status == 'OK') {

        // for (let k = 0; k < INFO_WINDOWS.length; k++) {
        //    INFO_WINDOWS[k].close();
        // }
        // INFO_WINDOWS.length = 0;

        let origins = response.originAddresses;
        let destinations = response.destinationAddresses;

        console.log(origins);
        console.log(destinations);

        for (let i = 0; i < origins.length; i++) {
           let results = response.rows[i].elements;
           let infoString = "";
           let element = results[0];
           if (element.status == "OK") {
              let distance = element.distance.text;
              let distanceValue = element.distance.value;
              let duration = element.duration.text;
              let value = element.duration.value;

               let from = origins[i];
               let to = destinations[0];

               //let strDistance0 = "From: " + origins[i];
               let strDistance1 = "<p>To: " + destinations[0] +
                             ", " + distance + ", " + duration + "</p>";

               infoString += strDistance1;
           } else infoString += "<p>" + element.status + "</p>";

           const infoWindow = new google.maps.InfoWindow({
              content: infoString,
           });

           infoWindow.open(mMap, mMarkers[i]);
           mMarkers[i].addListener("click", () => {
              infoWindow.open({
                 anchor: mMarkers[i],
                 mMap,
                 shouldFocus: false,
              });
           });

           mDriverWindows.push(infoWindow);
        }
     } else {
        userMessage(status);
     }
  });


}

function callDriver() {

   window.open('tel:2144333268');

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
      updates['/pickup' ] = null;
      updates['/formatted_address'] = null;
   } else if (type == 'destination') {
     updates['/destination' ] = null;
     updates['/dest_address'] = null;
   }
   updates['/fare'] = null;
   updates['/fare_length'] = null;
   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

   riderRef.update(updates);

}

function computeFare() {

   if (mDuration == null || mDistance == null || mRates == null) {
      return;
   }

   let minutes = mDuration.value / 60;
   let miles = mDistance.value * 0.000621371;

   let baseFare = mRates.base_rate;
   let cancelFare = mRates.cancelation_rate;
   let mileageFare = miles * mRates.mileage_rate;
   let timeFare = minutes * mRates.per_minute_rate;

   let totalFare = baseFare + mileageFare + timeFare;

   mFare = { base_amount: baseFare,  cancel_amount: cancelFare,
             mileage_amount: mileageFare, currency: mRates.currency,
             time_amount: timeFare, fare_amount: totalFare };

   let riderRef = firebase.database()
      .ref("/riders").child(firebase.auth().currentUser.uid);

   const updates = {};
   updates['/fare' ] = mFare;
   updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

   riderRef.update(updates).then(() => {
      userMessage("Fare info updated");
   });




}

function initApp() {

   //default location and zoom for map
   let zoom = 5;
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

   mDistanceService = new google.maps.DistanceMatrixService();


   const center = { lat: 50.064192, lng: -130.605469 };
   // Create a bounding box with sides ~10km away from the center point

   const defaultBounds = {
      north: center.lat + 0.1,
      south: center.lat - 0.1,
      east: center.lng + 0.1,
      west: center.lng - 0.1,
   };

   const options = {
      // bounds: defaultBounds,
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "geometry", "icon", "name"],
      strictBounds: false,
      types: ["establishment"],


   };


   let geoCoder = new google.maps.Geocoder();
   const AUTOCOMPLETE = new google.maps.places.Autocomplete(PICKUP_ADDRESS_FIELD, options);
   const DESTCOMPLETE = new google.maps.places.Autocomplete(DEST_ADDRESS_FIELD, options);

   AUTOCOMPLETE.addListener('place_changed', () => {
      let place = AUTOCOMPLETE.getPlace();
      console.log(place.formatted_address);

      if (place.geometry) {
        let loc = place.geometry.location;
        let riderRef = firebase.database()
           .ref("/riders").child(firebase.auth().currentUser.uid);

        const updates = {};
        updates['/pickup' ] = loc.toJSON();
        updates['/formatted_address'] = place.formatted_address;
        updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
        riderRef.update(updates).then(() => {
           userMessage("Pickup address updated");
        });

      } else {

         geoCoder.geocode({ address: place.name }, (results, status) => {
            if (status === "OK" && results[0]) {
              // console.log(results[0].geometry.location);
               let loc = results[0].geometry.location;
               let riderRef = firebase.database()
                 .ref("/riders").child(firebase.auth().currentUser.uid);

               const updates = {};
               updates['/pickup' ] = loc.toJSON();
               updates['/formatted_address'] = results[0].formatted_address;
               updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
               return riderRef.update(updates).then(() => {
                  userMessage("Pickup address updated");
               });

            } else {
               userMessage(status);
            }
         }).catch((error) => {

            userMessage(error.code);

         });
      }
   });

   DESTCOMPLETE.addListener('place_changed', () => {
      let place = DESTCOMPLETE.getPlace();
      console.log(place.formatted_address);

      if (place.geometry) {
        let loc = place.geometry.location;
        let riderRef = firebase.database()
           .ref("/riders").child(firebase.auth().currentUser.uid);

        const updates = {};
        updates['/destination' ] = loc.toJSON();
        updates['/dest_address'] = place.formatted_address;
        updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
        riderRef.update(updates).then(() => {
           userMessage("Pickup address updated");
        });

      } else {

         geoCoder.geocode({ address: place.name }, (results, status) => {
            if (status === "OK" && results[0]) {
               // console.log(results[0].geometry.location);
               let loc = results[0].geometry.location;
               let riderRef = firebase.database()
                  .ref("/riders").child(firebase.auth().currentUser.uid);

               const updates = {};
               updates['/destination' ] = loc.toJSON();
               updates['/dest_address'] = results[0].formatted_address;
               updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
               return riderRef.update(updates).then(() => {
                  userMessage("Pickup address updated");
               });

            } else {
               userMessage(status);
            }
         }).catch((error) => {
            userMessage(error.code);
         });
      }
   });

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

      mMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(BTN_LOC);

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
         let adminRef = firebase.database().ref("/admin/")
                           .child(mUser.uid);
         return adminRef.get();
       }).then((admin) => {
         if (admin.exists()) {
            $("#link-queue").show();
            //$("#col-drive").css("display", "inline");
         } else {
            $("#link-queue").hide();
            //$("#col-drive").css("display", "none");
         }
      }).then(() => {
         let ratesRef = firebase.database().ref("/control-data");
         return ratesRef.get();
      }).then((rates) => {
          if (rates.exists()) {
             mRates = rates.val();
             // console.log("Rates" + mRates);
             //return Promise.resolve();
          } else {
             mRates = null;
             // return Promise.reject();
          }
          return Promise.resolve();
      }).then(() => {

         let driverRef = firebase.database().ref("/drivers/")
                           .child(mUser.uid);

         return driverRef.get();
      }).then((driver) => {
         console.log(driver.val());
         if (driver.exists()) {
            $("#link-drive").show();
            let status = driver.val().status;
            if (status == "online") {
               location.replace("https://www.hughscar.com/driver.html");
            } else {
               $("#link-drive").show();
            }
         } else {
            $("#link-drive").hide();
         }

         addRequestListener();
         addPickupListener();
         addDestListener();
         addLocListener();
         addAddressListiner();
         addDestAddrListener();
         addFareLenListener();
         addFareListener();
         // getDriverRecord();
         getDrivers2();
         return Promise.resolve();
      }).catch((error) => {
         userMessage(error.message);
      });;
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

   let request = {
      query: address,
      fields: ['name', 'geometry'],
   };

   let service = new google.maps.places.PlacesService(mMap);

   service.findPlaceFromQuery(request, function(results, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {

        let loc = results[0].geometry.location;
        let riderRef = firebase.database()
           .ref("/riders").child(firebase.auth().currentUser.uid);

        const updates = {};
        updates['/pickup' ] = loc.toJSON();
        //updates['/formatted_address'] = results[0].formatted_address;
        updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
        riderRef.update(updates).then(() => {
           userMessage("Pickup address updated");
        });

      } else {
         userMessage(status);
      }
   });

   return;
   let geoCoder = new google.maps.Geocoder();
   //let address = PICKUP_ADDRESS_FIELD.value;

   // console.log(address);

   geoCoder.geocode({ address: address }, (results, status) => {
      if (status === "OK" && results[0]) {
         // console.log(results[0].geometry.location);
         let loc = results[0].geometry.location;
         let riderRef = firebase.database()
            .ref("/riders").child(firebase.auth().currentUser.uid);

         const updates = {};
         updates['/pickup' ] = loc.toJSON();
         updates['/formatted_address'] = results[0].formatted_address;
         updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
         return riderRef.update(updates).then(() => {
            userMessage("Pickup address updated");
         });

      } else {
         userMessage(status);
      }
   }).catch((error) => {

      userMessage(error.code);

   });
}

function setDateTime(value) {

   if (value == "") {value = null}
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

            let riderRef = firebase.database()
               .ref("/riders").child(firebase.auth().currentUser.uid);
            // riderRef.set(location);

            const updates = {};
            updates['/destination' ] = loc.toJSON();
            updates['/dest_address' ] = destAddress;
            updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

            riderRef.update(updates).then(() => {
               userMessage("Destination address updated");
            });;

         }
      } else {
         userMessage(status);
      }
   });
}

function getDriverRecord() {

   let driverRecord = firebase.database().ref("/drivers/")
                      .child(mUser.uid);

   driverRecord.on('value', (driver) => {
      console.log(driver.val());
      if (driver.exists()) {
         $("#link-drive").show();
         let status = driver.val().status;
         if (status == "online") {
           //userMessage("You are currently online to drive.");
           location.replace("https://www.hughscar.com/driver.html");
         } else {
           $("#link-drive").show();

         }
         //$("#col-drive").css("display", "inline");
      } else {
         $("#link-drive").hide();
         //$("#col-drive").css("display", "none");

      }
   });



 }

function addPickupListener() {

  let pickupRef = firebase.database().ref("/riders")
                     .child(mUser.uid).child("pickup");

  pickupRef.on('value', (pickup) => {
      if (pickup.exists()) {
         // console.log(snapshot.val());
         let newLoc = pickup.val();
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
         // requestDriverLoc();
         LOCATION_BUTTON.classList.remove("show");
         CLEAR_BUTTON.classList.add("show");
         geoCodeCoordinates(newLoc, 'pickup');
      } else {
         if (mPickupMarker != null) {
            mPickupMarker.setMap(null);
            mPickupMarker = null;
         }
         //routePickup(null);
         LOCATION_BUTTON.classList.add("show");
         CLEAR_BUTTON.classList.remove("show");
      }
      calcDistance();
      routeFare();

   });
}

function addDestListener() {

  let destRef = firebase.database().ref("/riders")
                     .child(mUser.uid).child("destination");

  destRef.on('value', (destination) => {
     if (destination.exists()) {
        // console.log(snapshot.val());
        let newLoc = destination.val();
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
        LOC_DEST_BUTTON.classList.remove("show");
        CLEAR_DEST_BTN.classList.add("show");
        geoCodeCoordinates(newLoc, 'destination');

     } else {
        if (mDestMarker != null) {
           mDestMarker.setMap(null);
           mDestMarker = null;
        }
        LOC_DEST_BUTTON.classList.add("show");
        CLEAR_DEST_BTN.classList.remove("show");
     }
     routeFare();
  });

}

function addLocListener() {

   let locRef = firebase.database().ref("/riders")
                     .child(mUser.uid).child("last_loc");

   locRef.on('value', (location) => {
      if (location.exists()) {
         // console.log(snapshot.val());
         let loc = location.val();
         if (mMap != null) {
            mMap.setCenter(loc);
            mMap.setZoom(9);
         }
      }
   });
}

function addAddressListiner() {
   let addressRef = firebase.database().ref("/riders")
                .child(mUser.uid).child("formatted_address");

   addressRef.on('value', (address) => {
     if (address.exists()) {
        // console.log(snapshot.val());
        let newAddress = address.val();
        PICKUP_ADDRESS_FIELD.value = newAddress;
        // LOCATION_BUTTON.classList.remove("show");
        // CLEAR_BUTTON.classList.add("show");

     } else {
        PICKUP_ADDRESS_FIELD.value = null;
        // LOCATION_BUTTON.classList.add("show");
        // CLEAR_BUTTON.classList.remove("show");

     }
  });

}

function addDestAddrListener() {
   let destAddressRef = firebase.database().ref("/riders")
                     .child(mUser.uid).child("dest_address");

  destAddressRef.on('value', (address) => {
     if (address.exists()) {
        // console.log(snapshot.val());
        let newAddress = address.val();
        DEST_ADDRESS_FIELD.value = newAddress;
        // LOC_DEST_BUTTON.classList.remove("show");
        // CLEAR_DEST_BTN.classList.add("show");
     } else {
        DEST_ADDRESS_FIELD.value = null;
        // LOC_DEST_BUTTON.classList.add("show");
        // CLEAR_DEST_BTN.classList.remove("show");
     }
  });

}

function addFareLenListener() {

   let lengthRef = firebase.database().ref("/riders")
                     .child(mUser.uid).child("fare_length");

  lengthRef.on('value', (fareLen) => {
     if (fareLen.exists()) {
         let length = fareLen.val();
         mDistance = length.distance;
         mDuration = length.duration;
         // console.log(length);
     } else {
        mDistance = null;
        mDuration = null;
     }
     if (mRequestInProgress == false) {
        computeFare();
     }
  });

}

function addFareListener() {

   let fareRef = firebase.database()
      .ref("/riders").child(mUser.uid).child("fare");

   fareRef.on('value', (fare) => {

      if (fare.exists()) {


         let fareVal = fare.val();

         console.log("Fare: " + fareVal);
         console.log(mDestMarker);

         let formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: fareVal.currency,

            // These options are needed to round to whole numbers if that's what you want.
            //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
            //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
         });


         let fareStr = formatter.format(fareVal.fare_amount);

         const contentString =
            '<div id="content">' +
            '<div id="siteNotice">' +
            "</div>" +
            '<h5 id="firstHeading" class="firstHeading">' + fareStr + '</h5>' +

            '<div id="bodyContent">' +
            "<p>Your destination is <b>" + mDistance.text + "</b> away. The trip " +
            "duration is <b>" + mDuration.text + "</b>.</p>" +
            "</div>" +
            "</div>";

            if (mDestInfoWindow != null) {
               mDestInfoWindow.close();
            }

            mDestInfoWindow = new google.maps.InfoWindow();
            mDestInfoWindow.setContent(contentString);


            mDestInfoWindow.open({
               anchor: mDestMarker,
               map: mMap,
               shouldFocus: false,
            });

            mMap.controls[google.maps.ControlPosition.TOP_CENTER].push(BTN_REQUEST);



      } else {
         if (mDestInfoWindow != null) {
            mDestInfoWindow.close();
         }
         while (mMap.controls[google.maps.ControlPosition.TOP_CENTER].length > 0) {
            mMap.controls[google.maps.ControlPosition.TOP_CENTER].pop();
         }
      }

   });

}

function addRequestListener() {

   let requestKeyRef = firebase.database().ref("/riders")
                      .child(mUser.uid).child("request_key");

   requestKeyRef.on('value', (request) => {
      if (request.exists()) {
         mRequestId = request.val();
         let requestRef = firebase.database().ref("/requests").child(mRequestId);

         requestRef.on('value', (requestRec) => {
            if (requestRec.exists()) {
               let page = "https://www.hughscar.com/request_detail.html?request=" + mRequestId;
               location.replace(page);
            } else {
               requestKeyRef.remove();
            }
         });


      } else {
         if (mRequestId != null) {
            let requestRef = firebase.database().ref("/requests").child(mRequestId);
            requestRef.off();
            mRequestId = null;
         }

      }
   });

}

function getDrivers() {

   let driversRecord = firebase.database().ref("/drivers")
      .orderByChild("status").equalTo("online");
   //console.log(mUser.uid);
   //console.log(driversRecord);

   driversRecord.on('child_added', (driver) => {
      if (driver.exists()) {

         console.log(driver.key);
         console.log(driver.val().last_loc);

         let key = driver.key;
         let driver_loc = driver.val().last_loc;

         mDriverMarker = new google.maps.Marker({
            position: driver_loc,
            map: mMap,
            icon: "/images/icons8-car-24.png"
         });

         DRIVERS.set(key, mDriverMarker);
         // routePickup();
      }
   });

   driversRecord.on('child_changed', (driver) => {
      if (driver.exists()) {
         console.log(driver.key);
         console.log(driver.val().last_loc);

         let key = driver.key;
         let driverLoc = driver.val().last_loc;

         let marker = DRIVERS.get(key);
         marker.setPosition(driverLoc);
         // routePickup();


      }
   });

   driversRecord.on('child_removed', (driver) => {
      if (driver.exists()) {
         console.log(driver.key);
         console.log(driver.val().last_loc);

         let key = driver.key;
         let driverLoc = driver.val().last_loc;

         let marker = DRIVERS.get(key);

         marker.setMap(null);
         DRIVERS.delete(key);
         // routePickup();

      }
   });

}

function getDrivers2() {

   let driversRecord = firebase.database().ref("/drivers")
      .orderByChild("status").equalTo("online");
   //console.log(mUser.uid);
   //console.log(driversRecord);

   driversRecord.on('value', (drivers) => {

      mOrigins = [];
      mMarkers = [];

      drivers.forEach((driver) => {
         let driverUid = driver.key;
         let driverData = driver.val();

         let key = driver.key;
         let driver_loc = driverData.last_loc;


         let driverMarker = new google.maps.Marker({
            position: driver_loc,
            map: mMap,
            icon: "/images/icons8-car-24.png"
         });

         mOrigins.push(driver_loc);
         mMarkers.push(driverMarker);
         DRIVERS.set(key, driverData);
      });
      calcDistance();

   });
}

function setDestMarker(atLatLng) {

   mMap.setCenter(atLatLng);
   mMap.setZoom(9);

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
         // geoCodeCoordinates(destination, 'destination');

      });

   } else {
      mDestMarker.setPosition(atLatLng);
      mDestMarker.setMap(mMap);
   }

}

function setPickupMarker(atLatLng) {

   mMap.setCenter(atLatLng);
   mMap.setZoom(9);

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
         updates['/pickup' ] = {lat: mUserLat, lng: mUserLng };
         // updates['/status' ] = ready;
         updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

         riderRef.update(updates);

         // geoCodeCoordinates({lat: mUserLat, lng: mUserLng}, 'pickup');
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

function routePickup() {

   let key = "okqT8SrEguQxE4PS1YoQnJ6X1923";
   let driverMarker = DRIVERS.get(key);

   let oldInfoWindow = INFO_WINDOWS.get(key);
   if (oldInfoWindow != null) {
      oldInfoWindow.close();
   }

   if (mPickupMarker != null && driverMarker != null) {

      let request = {
         origin: driverMarker.getPosition(),
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
            let pickupDistance = response.routes[0].legs[0].distance.text;

            const contentString =
               '<div id="content">' +
               '<div id="siteNotice">' +
               "</div>" +
               // '<h5 id="firstHeading" class="firstHeading">Hello, Im currently online.</h5>' +

               '<div id="bodyContent">' +
               '<button id="btn-call-driver" class="btn btn-primary" onclick="callDriver()">Call Now</button>' +
               "<p>I'm currently online and <b>" + pickupDistance + "</b> away.</p>" +
               "</div>" +
               "</div>";


            let driverInfowindow = new google.maps.InfoWindow({
               map: mMap,
               content: contentString,
               // content: "Hello, I'm currently " + response.routes[0].legs[0].duration.text + " away.",
               // position: driverPosition,
            });

            INFO_WINDOWS.set(key, driverInfowindow);

            driverInfowindow.open({
               anchor: driverMarker,
               shouldFocus: false,
            });


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
