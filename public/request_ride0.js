
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

var mUserLat = 38.87504573180474;
var mUserLng = -104.73386842314846;

var map;
var userLoc;
let driverMarkers = [];
let mDirections = [];
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

const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let labelIndex = 0;

var directionsService;
var directionsRenderer;
var distanceService;
var geoCoder;
let browserLocation;

function addUserMarker(atLatLng) {

   if (userMarkers.length > 1) {
      errorMessage("Maxium number of waypoints");
      return;
   }

   let label = labels[labelIndex++ % labels.length];
   const marker = new google.maps.Marker({
      label: label,
      // animation: google.maps.Animation.DROP,
      draggable: true,
      position: atLatLng,
      map: map,
   });

   userMarkers.push(marker);

   marker.addListener("mouseover", (event) => {
      marker.setLabel(null);
      marker.setAnimation(google.maps.Animation.BOUNCE);
   });

   marker.addListener("mouseout", (event) => {
      marker.setAnimation(null);
      marker.setLabel(label);
   });


   // marker.addListener("click", function(e) {
   //   errorMessage("Drag marker " + label + " to desired location on map");
   //
   // });

   const dateLabel = document.createElement("label");
   dateLabel.id = "pickup-date-label";
   dateLabel.for = "pickup-date-edit";
   dateLabel.innerHTML = "Pickup Date"

   let date = new Date();
   const dateField = document.createElement("input");
   dateField.id = "pickup-date-edit";
   dateField.type = "date";
   dateField.classList.add("form-control");
   dateField.value = date.toISOString().substring(0, 10);
   dateField.addEventListener("change", () => {

   });

   const timeLabel = document.createElement("label");
   timeLabel.id = "pickup-time-label";
   timeLabel.for = "pickup-time-edit";
   timeLabel.innerHTML = "Pickup time"

   let hour = date.getHours();
   let min  = date.getMinutes();
   hour = (hour < 10 ? "0" : "") + hour;
   min = (min < 10 ? "0" : "") + min;


   const timeField = document.createElement("input");
   timeField.id = "pickup-time-edit";
   timeField.type = "time";
   timeField.value = hour + ":" + min;
   dateField.classList.add("form-control");
   timeField.addEventListener("change", () => {

   });

   const dateTimeWrap = document.createElement("div");
   dateTimeWrap.id = "pickup-date-wrapper";
   //dateTimeWrap.appendChild(dateLabel);
   //dateTimeWrap.appendChild(timeLabel);
   dateTimeWrap.appendChild(dateField);

   dateTimeWrap.appendChild(timeField);


   // const addressLabel = document.createElement("label");
   // addressLabel.id = "pickup-address-label-" + label;
   // addressLabel.className = "pickup-address-label";
   // addressLabel.for = "pickup-address-edit-" + label;
   //addressLabel.innerHTML = "Address " + label;

   const addressField = document.createElement("input");
   addressField.id = "pickup-address-edit-" + label;
   addressField.className = "pickup-address-edit";
   addressField.classList.add("form-control");
   addressField.type = "text";
   addressField.addEventListener("change", () => {
      geoCodeAddress(addressField, label, marker);
   });
   geoCodeMarker(addressField, atLatLng);

   //const buttonField = document.createElement("button");
   //buttonField.id = "update-address-button";
   //buttonField.onClick = "geoCodeMarker(addressField, marker.getPosition())";


   if (label == "A") {
     const formField = document.createElement("div");
     //formField.classList.add("container");
     formField.classList.add("form-group");

     formField.id = "address-form";
     formField.appendChild(dateTimeWrap);
     //formField.appendChild(addressLabel);
     formField.appendChild(addressField);
     map.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);

   } else {
     const formField = map.controls[google.maps.ControlPosition.LEFT_TOP].pop();
     //formField.appendChild(addressLabel);
     formField.appendChild(addressField);
     map.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);

   }

   marker.addListener("dragend", (event) => {
      //addressField.value = marker.getPosition();
      geoCodeMarker(addressField, marker.getPosition());
  });

}

function geoCodeMarker(addressField, atLatLng) {
  geoCoder = new google.maps.Geocoder();

  //console.log(addressField);
  //console.log(atLatLng);

  geoCoder.geocode({ location: atLatLng }, (results, status) => {
      if (status === "OK") {
         if (results[0]) {
            //console.log(addressField);
            addressField.value = results[0].formatted_address;
         } else {
            addressField.value = "unknown";
         }
      } else {
        errorMessage(status);

      }
   });

}

function geoCodeAddress(addressField, label, marker) {
  geoCoder = new google.maps.Geocoder();

  let address = addressField.value;

  console.log(address);
  console.log(label);

  geoCoder.geocode({ address: address }, (results, status) => {
      if (status === "OK") {
         if (results[0]) {
            marker.setPosition(results[0].geometry.location);
         } else {
         }
      } else {
        errorMessage(status);

      }
   });

}

function removeMarkerFromMap(index) {
   console.log("Hello from method, index: " + index);
   userMarkers[index].setMap(null);
}

function clearMap() {
   for (let i = 0; i < userMarkers.length; i++) {
      userMarkers[i].setMap(null);
   }
   userMarkers.length = 0
   labelIndex = 0;

   while (map.controls[google.maps.ControlPosition.LEFT_TOP].length > 0) {
      map.controls[google.maps.ControlPosition.LEFT_TOP].pop();
   }

}

function setUI4Waiting(data) {

   console.log(data);

   let departTime = new Date(Date.now() + 600 * 1000);
   let origin = data.point_A;
   let destination = data.point_B;

   const waypts = [];

   for (var i = 1; i < (userMarkers.length-1); i++) {
      waypts.push({
         location: userMarkers[i].getPosition(),
         stopover: true,
      });
   }

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

         // let directionsPanel = document.getElementById("directionsPanel");
         // directionsPanel.className = "show_directions";
         // let mapDiv = document.getElementById("map");
         // mapDiv.className = "map_with_directions";

         directionsRenderer = new google.maps.DirectionsRenderer({
            //panel: directionsPanel,
            draggable: false,
            map:map,
         });

         directionsRenderer.setMap(map);
         directionsRenderer.setDirections(result);

         mDirections.push(directionsRenderer);

         //add cancel button
         const cancelButton = document.createElement("button");
         cancelButton.textContent = "Cancel";
         cancelButton.classList.add("button");
         cancelButton.addEventListener("click", () => {
            let user = firebase.auth().currentUser;
            if (!user) {
               errorMessage("Login required to cancel request.");
               return;
            }

            let openRequests = firebase.database().ref("/ride-requests-by-user/" + user.uid);
            openRequests.remove();


            // window.history.back();
         });
         map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(cancelButton);

         // const confirmButton = document.createElement("button");
         // confirmButton.textContent = "Confirm Request";
         // confirmButton.classList.add("button");
         // map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(confirmButton);
         // confirmButton.addEventListener("click", () => {
         //    writeRequest();
         //    sendMessage();
         //
         //    while (map.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
         //       map.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
         //    }
         //
         //    //add cancel button
         //    const cancelButton = document.createElement("button");
         //    cancelButton.textContent = "Cancel";
         //    cancelButton.classList.add("button");
         //    cancelButton.addEventListener("click", () => {
         //       window.history.back();
         //    });
         //    map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(cancelButton);
         //
         //
         // });



      } else {
        errorMessage(status);
      }
   });

   let loader = document.getElementById("loader");
   loader.className = "show";

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

function initMapRequest() {

   map = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: {lat: mUserLat, lng: mUserLng },
      zoom: 11,
      // restriction: {
      //    latLngBounds: SERVICE_AREA_BOUNDS,
      //    strictBounds: false,
      // }
   });


   initAuth();

}

function setUI4Input() {
   clearMap();
   clearRoute();

   let loader = document.getElementById("loader");
   loader.className = loader.className.replace("show", "");

   while (map.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
      map.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
   }


   map.addListener("click", (event) => {
      //map.setCenter(event.latLng);
      //map.setZoom(15);
      addUserMarker(event.latLng);
   });

   //add clear button
   const clearButton = document.createElement("button");
   clearButton.textContent = "Clear";
   clearButton.classList.add("button");
   clearButton.addEventListener("click", () => {
      if (userMarkers.length < 1) {
         errorMessage("Add a waypoint to the map");
         return;
      }
      clearMap();
   });
   map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(clearButton);

   const routeButton = document.createElement("button");
   routeButton.textContent = "Request Ride";
   routeButton.classList.add("button");
   map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(routeButton);
   routeButton.addEventListener("click", () => {
      if (userMarkers.length < 2) {
         errorMessage("Add 2 waypoints to build a route");
         return;
      }
      writeRequest();
      // requestRide();
      // buildControls("book");
   });
   //requestLocation(map);
}

function readPendingRequests() {
   let user = firebase.auth().currentUser;
   if (!user) {
      errorMessage("Login required to request pickup");
      return;
   }

   let openRequests = firebase.database()
      .ref("/ride-requests-by-user/" + user.uid)
      .orderByChild("status")
      .equalTo("open")
      .limitToFirst(1);

   // openRequests.on('value', (snapshot) => {
   //    if (snapshot.val()) {
   //       snapshot.forEach((childSnapshot) => {
   //          setUI4Waiting(childSnapshot.val());
   //       });
   //    } else {
   //       setUI4Input();
   //       requestLocation(map);
   //    }
   // });


   openRequests.on('child_added', (snapshot) => {
      setUI4Waiting(snapshot);
   });

   openRequests.on('child_removed', (snapshot) => {
     setUI4Input();

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

function requestLocation1() {
   if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
         mUserLat = position.coords.latitude;
         mUserLng = position.coords.longitude;
         console.log(mUserLat);
         console.log(mUserLng);

      }, () => {
         errorMessage("Failed to get geolocation from browser");
      });
   } else {
      errorMessage("Failed to get geolocation from browser");
   }
}

function requestLocation(myMap) {
   if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
         const pos = {
               lat: position.coords.latitude,
               lng: position.coords.longitude,
         };
         console.log(pos);
         browserLocation = new google.maps.LatLng(pos);
         let bounds = new google.maps.LatLngBounds(SW, NE);
         let inArea = bounds.contains(browserLocation);

         //if (inArea) {
            addUserMarker(browserLocation);
            myMap.setCenter(browserLocation);
            // lastZoom = myMap.getZoom();
            // setZoomSlow(13);
         //} else {
        //   errorMessage("You're current location is outside service area");
         //}
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
   let markerA = userMarkers[0];
   let markerB = userMarkers[1];
   let markerC = userMarkers[2];

   // let formField = map.controls[google.maps.ControlPosition.LEFT_TOP].pop();
   // console.log(formField);

   let rideRequests = firebase.database().ref("/ride-requests/");
   let rideRequestKey = rideRequests.push();
   let updates = {};

   rideRequestKey.set({
     rider_uid: user.uid,
     status: "open",
     startedAt: firebase.database.ServerValue.TIMESTAMP,
     request_date: document.getElementById("pickup-date-edit").value,
     request_time: document.getElementById("pickup-time-edit").value,
     point_A: markerA.getPosition().toJSON(),
     point_A_address: document.getElementById("pickup-address-edit-A").value,
     point_B: markerB.position.toJSON(),
     point_B_address: document.getElementById("pickup-address-edit-B").value,
     point_C: (markerC ? markerC.position.toJSON() : null),

   });




   // updates["/ride-requests/" + rideRequestKey] = {
   //    rider_uid: user.uid,
   //    status: "open",
   //    startedAt: firebase.database.ServerValue.TIMESTAMP,
   //    request_date: document.getElementById("pickup-date-edit").value,
   //    request_time: document.getElementById("pickup-time-edit").value,
   //    point_A: markerA.getPosition().toJSON(),
   //    point_B: markerB.position.toJSON(),
   //    point_C: (markerC ? markerC.position.toJSON() : null),
   //
   // };


   let rideRequestsByUser = firebase.database().ref("/ride-requests-by-user/" + user.uid + "/" + rideRequestKey.key);
   // let rideRequestsByUserKey = rideRequestsByUser.push();
   rideRequestsByUser.set({
     status: "open",
     startedAt: firebase.database.ServerValue.TIMESTAMP,
     request_date: document.getElementById("pickup-date-edit").value,
     request_time: document.getElementById("pickup-time-edit").value,
     point_A: userMarkers[0].getPosition().toJSON(),
     point_B: userMarkers[1].getPosition().toJSON(),
     point_C: (markerC ? markerC.position.toJSON() : null),

   });


   // updates["/ride-requests-by-user/" + user.uid + "/" + rideRequestKey] = {
   //    status: "open",
   //    startedAt: firebase.database.ServerValue.TIMESTAMP,
   //    request_date: document.getElementById("pickup-date-edit").value,
   //    request_time: document.getElementById("pickup-time-edit").value,
   //    point_A: userMarkers[0].getPosition().toJSON(),
   //    point_B: userMarkers[1].getPosition().toJSON(),
   //    point_C: (markerC ? markerC.position.toJSON() : null),
   //
   // };

   //let rideRequestsByUser = firebase.database().ref("ride-requests-by-user/" + user.uid);
   //let rideRequestByUserRef = rideRequestsByUser.push();

   // return firebase.database().ref().update(updates);



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
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.className = authContainer.className.replace("show", "");
         // let logoutButton = document.getElementById('logout_button');
         // logoutButton.className = authContainer.className.replace("show", "");
         // const logoutButton = document.createElement("button");
         // logoutButton.id = "logout_button";
         // logoutButton.textContent = "Sign out";
         // logoutButton.classList.add("button");
         // logoutButton.addEventListener('click', () => {
         //    firebase.auth().signOut();
         // });
         //
         // map.controls[google.maps.ControlPosition.RIGHT_TOP].push(logoutButton);
         createUserRecord(user);

         readPendingRequests();
      } else {
         map.controls[google.maps.ControlPosition.RIGHT_TOP].pop();

         document.getElementById('firebaseui-auth-container').className = "show";
         ui.start('#firebaseui-auth-container', uiConfig);


         // let logoutButton = document.getElementById('logout_button');
         // logoutButton.className = "show";
      }
   });


}

function createUserRecord(user) {
   firebase.database().ref('users/' + user.uid).set({
      username: user.displayName,
      email: user.email,
      profile_picture : user.photoURL,
   });

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
