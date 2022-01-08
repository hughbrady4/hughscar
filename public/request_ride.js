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

var mUserLat;
var mUserLng;
var mUser;
var mStatus;

var mMap;
let mMapClickOn = false;
let mPickupMarker;
let mDestinationMarker;
let mDirections = [];
let mDriverMarkers = [];
let mPaymentForm;
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

function initApp() {
   initMap();
   initAuth();
}

function requestLocation() {
  if (navigator.geolocation) {
     navigator.geolocation.getCurrentPosition((position) => {
        mUserLat = position.coords.latitude;
        mUserLng = position.coords.longitude;
        console.log(mUserLat);
        console.log(mUserLng);
        //initMap();
        mMap.setCenter({lat: mUserLat, lng: mUserLng });
        mMap.setZoom(11);
        setPickupMarker({lat: mUserLat, lng: mUserLng }, true);
        //addUserMarker({lat: mUserLat, lng: mUserLng });
        //initAuth();

     }, (error) => {
        userMessage("Failed to get geolocation from browser");
        console.log(error.message);
        //initMap();
        //initAuth();
     });
  } else {
     userMessage("Failed to get geolocation from browser");
     //initMap();
     //initAuth();
  }


}

function initMap() {
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

   const directionsService = new google.maps.DirectionsService();
   const directionsRenderer = new google.maps.DirectionsRenderer({
      draggable: true,
      mMap,
      // panel: document.getElementById("right-panel"),
   });
   directionsRenderer.addListener("directions_changed", () => {
      computeTotalDistance(directionsRenderer.getDirections());
   });

   // let infoPanel = document.getElementById("infoPanel");
   // mMap.controls[google.maps.ControlPosition.LEFT_TOP].push(infoPanel);
}

function computeTotalDistance(result) {
  let total = 0;
  const myroute = result.routes[0];

  if (!myroute) {
    return;
  }

  for (let i = 0; i < myroute.legs.length; i++) {
    total += myroute.legs[i].distance.value;
  }
  total = total / 1000;
  // document.getElementById("total").innerHTML = total + " km";
}

function displayRoute(origin, destination, service, display) {
  service.route(
    {
      origin: origin,
      destination: destination,
      waypoints: [
        { location: "Adelaide, SA" },
        { location: "Broken Hill, NSW" },
      ],
      travelMode: google.maps.TravelMode.DRIVING,
      avoidTolls: true,
    },
    (result, status) => {
      if (status === "OK" && result) {
        display.setDirections(result);
      } else {
        alert("Could not display directions due to: " + status);
      }
    }
  );
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
         mUser = user;
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.classList.remove("show");
         let mainContainer = document.getElementById('main_content');
         mainContainer.classList.add("show");
         getRideControl();
      } else {
         let mainContainer = document.getElementById('main_content');
         mainContainer.classList.remove("show");
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.classList.add("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });

}

function getRideControl() {

   createUserRecord(mUser);

   let rideControlData = firebase.database().ref("/control-data/")
                      //.child(mUser.uid)
                      //.orderByChild("status")
                      //.equalTo("started")
                      .limitToFirst(1);



   let rideControlRecord = firebase.database().ref("/ride-control/")
                      .child(mUser.uid);
                      //.equalTo("started")
                      //.limitToFirst(1);

   rideControlRecord.on('value', (snapshot) => {
      if (snapshot.exists()) {
         let mStatus = snapshot.val().status;
         //console.log(snapshot);
         //let statusField = document.getElementById("status");
         //statusField.innerHTML = status;
         if (mStatus == "new") {
            setUI4Input();
         } else if (mStatus == "ready") {
            setUI4Ready(snapshot.val().current_request);
         } else if (mStatus == "canceled") {
            setUI4Input(childKey, childData);
         } else if (mStatus == "accepted") {
            setUI4DriverInRoute(childKey);
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
         let rideControlKey = firebase.database().ref("/ride-control/")
                              .child(mUser.uid);

         rideControlKey.set({
            status: "New Request",
            startedAt: firebase.database.ServerValue.TIMESTAMP,
         });
         //setUI4Input(rideRequestKey);
      }
   });

}

function setUI4Input() {

   clearRoute();

   requestLocation();

   let loader = document.getElementById("loader");
   if (loader)
      loader.classList.remove("show");

   let paymentForm = document.getElementById("form-container");
   if (paymentForm)
      paymentForm.classList.remove("show");

   while (mMap.controls[google.maps.ControlPosition.TOP_CENTER].length > 0) {
      mMap.controls[google.maps.ControlPosition.TOP_CENTER].pop();
   }

   loadDrivers();


   //statusField.readOnly = true;

   let distField = document.getElementById("distance");
   distField.value = null;

   let durationField = document.getElementById("duration");
   durationField.value = null;

   let fareField = document.getElementById("fare");
   fareField.value = null;




   let date = new Date(Date.now() + 30*60000);
   const dateField = document.getElementById("date");
   // dateField.id = "pickup-date-edit";
   // dateField.type = "date";
   // dateField.classList.add("form-control");
   dateField.value = date.toISOString().substring(0, 10);
   dateField.addEventListener("change", () => {

   });

   dateField.readOnly = false;


   let hour = date.getHours();
   let min  = date.getMinutes();
   hour = (hour < 10 ? "0" : "") + hour;
   min = (min < 10 ? "0" : "") + min;


   const timeField = document.getElementById("time");
   // timeField.id = "pickup-time-edit";
   // timeField.type = "time";
   timeField.value = hour + ":" + min;
   // dateField.classList.add("form-control");
   timeField.addEventListener("change", () => {

   });

   timeField.readOnly = false;

   const pickupAddressField = document.getElementById("pickup");
   pickupAddressField.value = null;
   pickupAddressField.readOnly = false;
   mPickupMarker = null;

   pickupAddressField.addEventListener("change", () => {

      let geoCoder = new google.maps.Geocoder();
      let address = pickupAddressField.value;

      console.log(address);
      //console.log(label);

      geoCoder.geocode({ address: address }, (results, status) => {
         if (status === "OK") {
            if (results[0]) {
               setPickupMarker(results[0].geometry.location, false);
            } else {
            }
         } else {
            userMessage(status);

         }
      });


   });


   const destAddressField = document.getElementById("destination");
   destAddressField.value = null;
   destAddressField.readOnly = false;
   mDestinationMarker = null;
   destAddressField.addEventListener("change", () => {

      let geoCoder = new google.maps.Geocoder();
      let address = destAddressField.value;

      console.log(address);
      //console.log(label);

      geoCoder.geocode({ address: address }, (results, status) => {
         if (status === "OK") {
            if (results[0]) {
               setDestinationMarker(results[0].geometry.location, false);
            } else {
            }
         } else {
            userMessage(status);
         }
      });

   });


   if (mMapClickOn != true) {
      mMapClickOn = true;
      mMap.addListener("click", (event) => {
         if (mPickupMarker == null) {
            setPickupMarker(event.latLng, true);
            return;
         }

         if (mDestinationMarker == null) {
            setDestinationMarker(event.latLng, true);
            return;
         }

      });
   }

   const routeButton = document.createElement("button");
   routeButton.textContent = "Calculate Fare";
   routeButton.classList.add("button");
   mMap.controls[google.maps.ControlPosition.TOP_CENTER].push(routeButton);
   routeButton.addEventListener("click", () => {
      if (mPickupMarker == null || mDestinationMarker == null) {
         userMessage("Add 2 waypoints to build a route");
         return;
      }
      writeRequest();
      // requestRide();
      // buildControls("book");
   });
   //requestLocation(map);
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
      });


   } else {
      mPickupMarker.setPosition(atLatLng);
      mPickupMarker.setMap(mMap);
   }

   if (geoCode) {
      geoCodeMarker(document.getElementById("pickup"), atLatLng);
   }

}

function setDestinationMarker(atLatLng, geoCode) {

   if (mDestinationMarker == null) {
      mDestinationMarker = new google.maps.Marker({
         label: "B",
         animation: google.maps.Animation.DROP,
         draggable: true,
         position: atLatLng,
         map: mMap,
      });

      // mDestinationMarker.addListener("mouseover", (event) => {
      //    //mDestinationMarker.setLabel(null);
      //    //mDestinationMarker.setAnimation(google.maps.Animation.BOUNCE);
      // });
      //
      // mDestinationMarker.addListener("mouseout", (event) => {
      //    //mDestinationMarker.setAnimation(null);
      //    //mDestinationMarker.setLabel("A");
      // });

      mDestinationMarker.addListener("dragend", (event) => {
         //addressField.value = marker.getPosition();
         geoCodeMarker(document.getElementById("destination"), mDestinationMarker.getPosition());
      });
   } else {
      mDestinationMarker.setPosition(atLatLng);
      mDestinationMarker.setMap(mMap);

   }

   if (geoCode) {
      geoCodeMarker(document.getElementById("destination"), atLatLng);
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

function setUI4Ready(rideRequestKey) {

   // let statusField = document.getElementById("status");
   // statusField.innerHTML = controlData.status;
   // statusField.readOnly = true;

   //clearMap();
   google.maps.event.clearListeners(mMap, 'click');
   mMapClickOn = false;


   if (mPickupMarker) {
      mPickupMarker.setMap(null)
   }

   if (mDestinationMarker) {
      mDestinationMarker.setMap(null);
   }

   let rideRequestRef = firebase.database().ref("/ride-requests/").child(rideRequestKey);
   rideRequestRef.get().then(function(snapshot) {
      if (snapshot.exists()) {
         console.log(snapshot.val());

         let data = snapshot.val();

         let dateField = document.getElementById("date");
         dateField.value = data.request_date;
         dateField.readOnly = true;

         let timeField = document.getElementById("time");
         timeField.value = data.request_time;
         timeField.readOnly = true;

         let pickupField = document.getElementById("pickup");
         pickupField.value = data.point_A_address;
         pickupField.readOnly = true;

         let destField = document.getElementById("destination");
         destField.value = data.point_B_address;
         destField.readOnly = true;

         while (mMap.controls[google.maps.ControlPosition.TOP_CENTER].length > 0) {
            mMap.controls[google.maps.ControlPosition.TOP_CENTER].pop();
         }

         //add cancel button
         const cancelButton = document.createElement("button");
         cancelButton.textContent = "Cancel";
         cancelButton.classList.add("button");
         cancelButton.addEventListener("click", () => {
            let user = firebase.auth().currentUser;
            if (!user) {
               userMessage("Login required to cancel request.");
               return;
            }

            // let ride = firebase.database()
            //    .ref("/ride-control/" + user.uid + "/" + rideRequestKey + "/status" );
            // openRide.set({
            //   status: "canceled",
            //   canceledAt: firebase.database.ServerValue.TIMESTAMP,
            //
            // });


            //let rideRequestKey = firebase.database().ref("/ride-requests/" + rideRequestKey);
            let rideRequestsByUser = firebase.database()
               .ref("/ride-requests-by-user/" + user.uid + "/" + rideRequestKey);

            rideRequestsByUser.set(null);

            let rideRequestRef = firebase.database().ref("/ride-requests/" + rideRequestKey);
            rideRequestRef.set(null);

            let rideControlRecordStatus = firebase.database().ref("/ride-control/")
                               .child(mUser.uid).child("status");

            rideControlRecordStatus.set("New Request");

            let rideControlRecordCanceledAt = firebase.database().ref("/ride-control/")
                               .child(mUser.uid).child("canceled_at");

            rideControlRecordCanceledAt.set(firebase.database.ServerValue.TIMESTAMP);

            // window.history.back();
         });
         mMap.controls[google.maps.ControlPosition.TOP_CENTER].push(cancelButton);

         let dateTime = data.request_date + "T" + data.request_time;

         let departTime = new Date(dateTime);
         console.log(departTime);
         let origin = data.point_A;
         let destination = data.point_B;

         const waypts = [];
         //
         // for (var i = 1; i < (userMarkers.length-1); i++) {
         //    waypts.push({
         //       location: userMarkers[i].getPosition(),
         //       stopover: true,
         //    });
         // }

         let request = {
            origin: origin,
            destination: destination,
            waypoints: waypts,
            optimizeWaypoints: true,
            travelMode: 'DRIVING',
            drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
         };

         let directionsService = new google.maps.DirectionsService();

         directionsService.route(request, function(result, status) {
            if (status == 'OK') {

               //for (let j = 0; j < result.routes.length; j++) {
               let route = result.routes[0];

               for (let i = 0; i < route.legs.length; i++) {
                  console.log(route.legs[i].steps.length);
                  console.log(route.legs[i].distance);
                  console.log(route.legs[i].duration);
               }

               let distField = document.getElementById("distance");
               distField.value = route.legs[0].distance.text;

               let durationField = document.getElementById("duration");
               durationField.value = route.legs[0].duration.text;

               let kilos = route.legs[0].distance.value / 1000;
               let minutes = route.legs[0].duration.value / 60;
               let miles = kilos * 0.621371;
               let timeCharge = minutes * 0.35;
               let mileageCharge = miles * 2;
               let totalCharge = timeCharge + mileageCharge;
               let formatter = new Intl.NumberFormat('en-US', {
                 style: 'currency',
                 currency: 'USD',

                 // These options are needed to round to whole numbers if that's what you want.
                 //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
                 //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
               });
               let fareField = document.getElementById("fare");
               fareField.value = formatter.format(totalCharge);
               //createPaymentForm(totalCharge);


               console.log(kilos);
               console.log(minutes);
               console.log(miles);
               console.log(timeCharge);
               console.log(mileageCharge);


               let directionsRenderer = new google.maps.DirectionsRenderer({
                  //panel: directionsPanel,
                  draggable: false,
                  map:mMap,
               });

               directionsRenderer.setDirections(result);
               mDirections.push(directionsRenderer);

            } else {
              userMessage(status);
            }
         });

         // let loader = document.getElementById("loader");
         // loader.className = "show";

      } else {
         console.log("No data available");
      }
   }).catch(function(error) {
      console.error(error);
   });

}

function setUI4DriverInRoute(rideRequestKey) {

  let rideRequestRef = firebase.database().ref("/rides-matched/").child(rideRequestKey);
  rideRequestRef.get().then(function(snapshot) {
     if (snapshot.exists()) {
        console.log(snapshot.val());

        let data = snapshot.val();

        let departTime = new Date(Date.now() + 600 * 1000);
        let origin = data.driver_location;
        let destination = data.rider_location;

        // const waypts = [];
        //
        // for (var i = 1; i < (userMarkers.length-1); i++) {
        //    waypts.push({
        //       location: userMarkers[i].getPosition(),
        //       stopover: true,
        //    });
        // }

        var request = {
           origin: origin,
           destination: destination,
           // waypoints: waypts,
           optimizeWaypoints: true,
           travelMode: 'DRIVING',
           drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
        };

        directionsService = new google.maps.DirectionsService();

        directionsService.route(request, function(result, status) {
           if (status == 'OK') {

              clearMap();
              google.maps.event.clearListeners(mMap, 'click');

              while (mMap.controls[google.maps.ControlPosition.TOP_CENTER].length > 0) {
                 mMap.controls[google.maps.ControlPosition.TOP_CENTER].pop();
              }

              // let directionsPanel = document.getElementById("directionsPanel");
              // directionsPanel.className = "show_directions";
              // let mapDiv = document.getElementById("map");
              // mapDiv.className = "map_with_directions";
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






              directionsRenderer = new google.maps.DirectionsRenderer({
                 //panel: directionsPanel,
                 // markerOptions: {
                 //   icon: icons["size_24"].icon,
                 //   position: origin,
                 // },
                 suppressMarkers: true,
                 draggable: false,
                 map: mMap,
              });




              //directionsRenderer.setMap(map);
              directionsRenderer.setDirections(result);

              mDirections.push(directionsRenderer);

              const marker = new google.maps.Marker({
                 icon: icons["size_24"].icon,
                 animation: google.maps.Animation.BOUNCE,
                 position: origin,
                 map: mMap,
              });

              const marker2 = new google.maps.Marker({

                 position: destination,
                 label: "A",
                 map: mMap,
              });



              //add cancel button
              // const cancelButton = document.createElement("button");
              // cancelButton.textContent = "Cancel";
              // cancelButton.classList.add("button");
              // cancelButton.addEventListener("click", () => {
              //    let user = firebase.auth().currentUser;
              //    if (!user) {
              //       userMessage("Login required to cancel request.");
              //       return;
              //    }
              //
              //    let openRide = firebase.database()
              //       .ref("/ride-control/" + user.uid + "/" + rideRequestKey);
              //    openRide.set({
              //      status: "canceled",
              //      canceledAt: firebase.database.ServerValue.TIMESTAMP,
              //
              //    });
              //
              //
              //    // window.history.back();
              // });
              // map.controls[google.maps.ControlPosition.TOP_CENTER].push(cancelButton);


           } else {
             userMessage(status);
           }
        });
        let loader = document.getElementById("loader");
        loader.classList.remove("show");

     } else {
        console.log("No data available");
     }
  }).catch(function(error) {
     console.error(error);
  });

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
  for(let i = 0; i < mDirections.length; i++) {
     mDirections[i].setMap(null);
  }
  mDirections.length = 0;
}

function loadDrivers() {
   let drivers = firebase.database().ref("drivers");
   drivers.on('child_added', (snapshot) => {
         // Get that click from firebase.
         let driverRec = snapshot.val();
         console.log(driverRec);
         let driverLoc = new google.maps.LatLng(driverRec.last_loc);
         // let atTime = new Date(driverRec.timestamp);
         // console.log(atTime);

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


         // let timeString = atTime.toLocaleString();
         const marker = new google.maps.Marker({
            icon: icons["size_24"].icon,
            animation: google.maps.Animation.DROP,
            position: driverLoc,
            map: mMap,
            //label: timeString,
         });
         mDriverMarkers.push(marker);

         displayRoute(
           "Perth, WA",
           "Sydney, NSW",
           directionsService,
           directionsRenderer
         );

         // let request = {
         //    origin: driverLoc,
         //    destination: destination,
         //    waypoints: waypts,
         //    optimizeWaypoints: true,
         //    travelMode: 'DRIVING',
         //    drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
         // };
         //
         // let directionsService = new google.maps.DirectionsService();
         //
         // directionsService.route(request, function(result, status) {
         //    if (status == 'OK') {
         //
         //       //for (let j = 0; j < result.routes.length; j++) {
         //       let route = result.routes[0];
         //
         //       for (let i = 0; i < route.legs.length; i++) {
         //          console.log(route.legs[i].steps.length);
         //          console.log(route.legs[i].distance);
         //          console.log(route.legs[i].duration);
         //       }
         //
         //       let distField = document.getElementById("distance");
         //       distField.value = route.legs[0].distance.text;
         //
         //       let durationField = document.getElementById("duration");
         //       durationField.value = route.legs[0].duration.text;
         //
         //       let kilos = route.legs[0].distance.value / 1000;
         //       let minutes = route.legs[0].duration.value / 60;
         //       let miles = kilos * 0.621371;
         //       let timeCharge = minutes * 0.35;
         //       let mileageCharge = miles * 2;
         //       let totalCharge = timeCharge + mileageCharge;
         //       let formatter = new Intl.NumberFormat('en-US', {
         //         style: 'currency',
         //         currency: 'USD',
         //
         //         // These options are needed to round to whole numbers if that's what you want.
         //         //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
         //         //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
         //       });
         //       let fareField = document.getElementById("fare");
         //       fareField.value = formatter.format(totalCharge);
         //       createPaymentForm(totalCharge);
         //
         //
         //       console.log(kilos);
         //       console.log(minutes);
         //       console.log(miles);
         //       console.log(timeCharge);
         //       console.log(mileageCharge);
         //
         //
         //       let directionsRenderer = new google.maps.DirectionsRenderer({
         //          //panel: directionsPanel,
         //          draggable: false,
         //          map:mMap,
         //       });
         //
         //       directionsRenderer.setDirections(result);
         //       mDirections.push(directionsRenderer);
         //
         //    } else {
         //      userMessage(status);
         //    }
         // });



      });

   drivers.on('child_changed',
      function(snapshot) {
         // Get that click from firebase.
         let driverRec = snapshot.val();
         console.log(driverRec);
   });

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
      userMessage("Login required to request pickup");
      return;
   }
   // let markerA = userMarkers[0];
   // let markerB = userMarkers[1];
   // let markerC = userMarkers[2];

   // let formField = map.controls[google.maps.ControlPosition.LEFT_TOP].pop();
   // console.log(formField);

   // let rideRequests = firebase.database().ref("/ride-requests/");
   let rideRequestRef = firebase.database().ref("/ride-requests/").push();
   let updates = {};

   updates["/ride-requests/" + rideRequestRef.key] = {
      rider_uid: user.uid,
      user_name: user.displayName,
      status: "Ready",
      startedAt: firebase.database.ServerValue.TIMESTAMP,
      request_date: document.getElementById("date").value,
      request_time: document.getElementById("time").value,
      point_A: mPickupMarker.getPosition().toJSON(),
      point_A_address: document.getElementById("pickup").value,
      point_B: mDestinationMarker.position.toJSON(),
      point_B_address: document.getElementById("destination").value,
   };


   updates["/ride-requests-by-user/" + user.uid + "/" + rideRequestRef.key] = {
      status: "Ready",
      user_name: user.displayName,
      startedAt: firebase.database.ServerValue.TIMESTAMP,
      request_date: document.getElementById("date").value,
      request_time: document.getElementById("time").value,
      point_A: mPickupMarker.getPosition().toJSON(),
      point_A_address: document.getElementById("pickup").value,
      point_B: mDestinationMarker.getPosition().toJSON(),
      point_B_address: document.getElementById("destination").value,
   };

   updates["/ride-control/" + user.uid + "/current_request"] = rideRequestRef.key;
   updates["/ride-control/" + user.uid + "/status"] = "Ready";
   updates["/ride-control/" + user.uid + "/ready_at"] =
      firebase.database.ServerValue.TIMESTAMP;


   let result = firebase.database().ref().update(updates);

   console.log(result);

   // let rideControlRecordStatus = firebase.database().ref("/ride-control/")
   //                    .child(mUser.uid).child(controlKey).child("status");
   //
   // rideControlRecordStatus.set("Ready");

   // let rideControlRecordOpenedAt = firebase.database().ref("/ride-control/")
   //                    .child(mUser.uid).child(controlKey).child("opened_at");
   //
   // rideControlRecordOpenedAt.set(firebase.database.ServerValue.TIMESTAMP);
}

function createPaymentForm(totalCharge) {

   let paymentForm = document.getElementById("form-container");
   paymentForm.classList.add("show");

   if (mPaymentForm) {
     return;
   }

   // Create and initialize a payment form object
   mPaymentForm = new SqPaymentForm({
      applicationId: "sq0idp-EsBuPxXTSOsSrwhXNpewzg",
      inputClass: 'sq-input',
      autoBuild: false,

      // Customize the CSS for SqPaymentForm iframe elements
      inputStyles: [{
         fontSize: '16px',
         lineHeight: '24px',
         padding: '16px',
         placeholderColor: '#a0a0a0',
         backgroundColor: 'transparent',
      }],

      // Initialize the credit card placeholders
      cardNumber: {
         elementId: 'sq-card-number',
         placeholder: 'Card Number'
      },
      cvv: {
         elementId: 'sq-cvv',
         placeholder: 'CVV'
      },
      expirationDate: {
         elementId: 'sq-expiration-date',
         placeholder: 'MM/YY'
      },
      postalCode: {
         elementId: 'sq-postal-code',
         placeholder: 'Postal'
      },

      // SqPaymentForm callback functions
      callbacks: {
         /*
         * callback function: cardNonceResponseReceived
         * Triggered when: SqPaymentForm completes a card nonce request
         */
         cardNonceResponseReceived: function (errors, nonce, cardData) {
            if (errors) {
               // Log errors from nonce generation to the browser developer console.
               console.error('Encountered errors:');
               errors.forEach(function (error) {
                  console.error('  ' + error.message);
               });
               alert('Encountered errors, check browser developer console for more details');
              return;
            }

         }
      }
   });

   mPaymentForm.build();
}

function processPayment() {
   fetch('process-payment', {
      method: 'POST',
      headers: {
         'Accept': 'application/json',
         'Content-Type': 'application/json'
      },
      body: JSON.stringify({
         nonce: nonce,
         idempotency_key: idempotency_key,
         location_id: "LRFYYZ8JA2MFH"
      })
   }).catch(err => {
      alert('Network error: ' + err);
   }).then(response => {
      if (!response.ok) {
         return response.json().then(
         errorInfo => Promise.reject(errorInfo));
      }
      return response.json();
   }).then(data => {
      console.log(data);
      alert('Payment complete successfully!\nCheck browser developer console for more details');
   }).catch(err => {
      console.error(err);
      alert('Payment failed to complete!\nCheck browser developer console for more details');
   });

}

function onGetCardNonce(event) {

  // Don't submit the form until SqPaymentForm returns with a nonce
  event.preventDefault();
  // Request a nonce from the SqPaymentForm object
  mPaymentForm.requestCardNonce();
}

function createUserRecord(user) {
   firebase.database().ref('users/' + user.uid).set({
      username: user.displayName,
      email: user.email,
      profile_picture : user.photoURL,
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
