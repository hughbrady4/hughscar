
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
let mStatus;
let mDrivers = new Map();
let mDirectionsService;
let mDirectionsRenderer;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();
//console.log(firebase);


function initApp() {
   userMessage("Welcome!");
   initMap();
   initAuth();
   requestLocation();

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


function getRideControl() {


   self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
   //initializeAppCheck(app, {/* App Check options */ });

   // createUserRecord(mUser);
   //
   // let rideControlData = firebase.database().ref("/control-data/")
   //                    //.child(mUser.uid)
   //                    //.orderByChild("status")
   //                    //.equalTo("started")
   //                    .limitToFirst(1);



   let rideControlRecord = firebase.database().ref("/riders/")
                      .child(mUser.uid);
                      //.equalTo("started")
                      //.limitToFirst(1);
   console.log(mUser.uid);
   console.log(rideControlRecord);

   rideControlRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         mStatus = snapshot.val().status;
         console.log(mStatus);
         // let statusField = document.getElementById("status");
         // statusField.innerHTML = status;
         if (status == "new") {
            // setUI4Input();
         } else if (status == "ready") {
            // setUI4Ready(snapshot.val().current_request);
         } else if (status == "canceled") {
            // setUI4Input(childKey, childData);
         } else if (status == "accepted") {
            // setUI4DriverInRoute(childKey);
         }

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
        console.log("new");

         let rideControlKey = firebase.database().ref("/riders/")
                              .child(mUser.uid);

         rideControlKey.set({
            status: "new",
            startedAt: firebase.database.ServerValue.TIMESTAMP,
         });
         //setUI4Input(rideRequestKey);
      }
   });

}


function getDrivers() {

   let driversRecord = firebase.database().ref("/drivers");
   //console.log(mUser.uid);
   //console.log(driversRecord);

   driversRecord.on('child_added', (snapshot) => {
      if (snapshot.exists()) {

         console.log(snapshot.key);
         console.log(snapshot.val().last_loc);

         let key = snapshot.key;
         let driver_loc = snapshot.val().last_loc;

         let marker = new google.maps.Marker({
            position: driver_loc,
            map: mMap,
            icon: "/images/icons8-car-24.png"
         });

         mDrivers.set(key, marker);
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

   if (mDrivers != null && mPickupMarker != null) {

     let request = {
        origin: mDrivers.get("06q2Ag2lwmODwXTqkVXtlmkVPzD3").position,
        destination: mPickupMarker.getPosition(),
        //waypoints: waypts,
        //optimizeWaypoints: true,
        travelMode: 'DRIVING',
        //drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
     };

     mDirectionsService.route(request, (response, status) => {
        if (status == 'OK') {
           mDirectionsRenderer.setDirections(response);
        }
     });

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

   const locationButton = document.createElement("button");

   locationButton.textContent = "Current Location";
   locationButton.classList.add("custom-map-control-button");
   mMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(locationButton);

   locationButton.addEventListener("click", () => {
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

   // const directionsService = new google.maps.DirectionsService();
   // const directionsRenderer = new google.maps.DirectionsRenderer({
   //    draggable: true,
   //    mMap,
   //    // panel: document.getElementById("right-panel"),
   // });
   // directionsRenderer.addListener("directions_changed", () => {
   //    computeTotalDistance(directionsRenderer.getDirections());
   // });

   // let infoPanel = document.getElementById("infoPanel");
   // mMap.controls[google.maps.ControlPosition.LEFT_TOP].push(infoPanel);
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

         getRideControl();
         getDrivers();

      } else {
         document.getElementById('firebaseui-auth-container').classList.add("show");
         userMessage("You are logged out.");

         $("#link-signOut").hide();
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
