
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
var drivers = firebase.database().ref("driver-cur-loc");
var userLocs = firebase.database().ref("user-locs");

var userLat = 32.89232732227711;
var userLng = -96.95597853022022;
var map;
var userLoc;
let driverMarkers = [];
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

   if (userMarkers.length > 2) {
      errorMessage("Maxium number of waypoints");
      return;
   }

   let label = labels[labelIndex++ % labels.length];
   const marker = new google.maps.Marker({
      label: label,
      animation: google.maps.Animation.DROP,
      draggable: true,
      position: atLatLng,
      map: map,
   });

   userMarkers.push(marker);

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
   timeField.addEventListener("change", () => {

   });

   const dateTimeWrap = document.createElement("div");
   dateTimeWrap.id = "pickup-date-wrapper";
   //dateTimeWrap.appendChild(dateLabel);
   //dateTimeWrap.appendChild(timeLabel);
   dateTimeWrap.appendChild(dateField);

   dateTimeWrap.appendChild(timeField);


   const addressLabel = document.createElement("label");
   addressLabel.id = "pickup-address-label";
   addressLabel.for = "pickup-address-edit";
   addressLabel.innerHTML = "Address " + label;

   const addressField = document.createElement("input");
   addressField.id = "pickup-address-edit";
   addressField.type = "text";
   addressField.addEventListener("change", () => {
      geoCodeAddress(addressField, label, marker);
   });
   geoCodeMarker(addressField, atLatLng);

   const buttonField = document.createElement("button");
   buttonField.id = "update-address-button";
   //buttonField.onClick = "geoCodeMarker(addressField, marker.getPosition())";


   if (label == "A") {
     const formField = document.createElement("div");
     formField.id = "address-form";
     formField.appendChild(dateTimeWrap);
     formField.appendChild(addressLabel);
     formField.appendChild(addressField);
     map.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);

   } else {
     const formField = map.controls[google.maps.ControlPosition.LEFT_TOP].pop();
     formField.appendChild(addressLabel);
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

function requestRide() {

   let departTime = new Date(Date.now() + 600 * 1000);
   let origin = userMarkers[0].getPosition();
   let destination = userMarkers[userMarkers.length-1].getPosition();

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
         google.maps.event.clearListeners(map, 'click');

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

         //add cancel button
         const cancelButton = document.createElement("button");
         cancelButton.textContent = "Cancel";
         cancelButton.classList.add("button");
         cancelButton.addEventListener("click", () => {
            window.history.back();
         });
         map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(cancelButton);

         const confirmButton = document.createElement("button");
         confirmButton.textContent = "Confirm Request";
         confirmButton.classList.add("button");
         map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(confirmButton);
         confirmButton.addEventListener("click", () => {
            writeRequest();
         });



      } else {
        errorMessage(status);
      }
   });
}

function clearRoute() {
   directionsRenderer.setMap(null);
   let directionsPanel = document.getElementById("directionsPanel");
   directionsPanel.className = "hide_directions";
   let mapDiv = document.getElementById("map");
   mapDiv.className = "map_full";
}

function initMap() {

   const SERVICE_AREA_BOUNDS = {
      north: 34.23570153604349,
      south: 31.52826999601207,
      west: -101.33952345209524,
      east: -92.57243360834524,
   };

   map = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: {lat: userLat, lng: userLng },
      zoom: 11,
      restriction: {
         latLngBounds: SERVICE_AREA_BOUNDS,
         strictBounds: false,
      }
   });

   map.addListener("click", (event) => {
      //map.setCenter(event.latLng);
      //map.setZoom(15);
      addUserMarker(event.latLng);
   });


   const mapHeader = document.createElement("div");
   mapHeader.classList.add("map_header_container");
   mapHeader.innerHTML = "Hugh's Car Service";
   map.controls[google.maps.ControlPosition.TOP_RIGHT].push(mapHeader);

}

function initMapConfirm() {

   const SERVICE_AREA_BOUNDS = {
      north: 34.23570153604349,
      south: 31.52826999601207,
      west: -101.33952345209524,
      east: -92.57243360834524,
   };

   map = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: {lat: userLat, lng: userLng },
      zoom: 11,
      restriction: {
         latLngBounds: SERVICE_AREA_BOUNDS,
         strictBounds: false,
      }
   });


   const mapHeader = document.createElement("div");
   mapHeader.classList.add("map_header_container");
   mapHeader.innerHTML = "Hugh's Car Service";
   map.controls[google.maps.ControlPosition.TOP_RIGHT].push(mapHeader);

}

function initMapRequest() {

   map = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: {lat: userLat, lng: userLng },
      zoom: 11,
      restriction: {
         latLngBounds: SERVICE_AREA_BOUNDS,
         strictBounds: false,
      }
   });

   map.addListener("click", (event) => {
      //map.setCenter(event.latLng);
      //map.setZoom(15);
      addUserMarker(event.latLng);
   });

   const mapHeader = document.createElement("div");
   mapHeader.classList.add("map_header_container");
   mapHeader.innerHTML = "Hugh's Car Service";
   map.controls[google.maps.ControlPosition.TOP_RIGHT].push(mapHeader);

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
      requestRide();
      // buildControls("book");
   });


   requestLocation(map);

}

function loadDrivers() {
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

function calcDistance() {

  let origins = [];
  let destinations = [];

   for (let i = 0; i < userMarkers.length; i++) {
      origins.push(userMarkers[i].getPosition());
      destinations.push(userMarkers[i].getPosition());
   }

   let distanceRequest = {
      origins: origins,
      destinations: destinations,
      travelMode: 'DRIVING',
      avoidHighways: false,
      avoidTolls: false,
   }

   distanceService.getDistanceMatrix(distanceRequest,  (response, status) => {
      if (status == 'OK') {

         for (let k = 0; k < infoWindows.length; k++) {
            infoWindows[k].close();
         }
         infoWindows.length = 0;

         let origins = response.originAddresses;
         let destinations = response.destinationAddresses;

         for (let i = 0; i < origins.length; i++) {
            let results = response.rows[i].elements;
            let infoString = "";

            for (var j = 0; j < results.length; j++) {

               if (i != j) {

                  let element = results[j];
                  if (element.status == "OK") {
                    let distance = element.distance.text;
                    let distanceValue = element.distance.value;
                    let duration = element.duration.text;
                    let value = element.duration.value;

                    let from = origins[i];
                    let to = destinations[j];

                    //let strDistance0 = "From: " + origins[i];
                    let strDistance1 = "<p>To: " + destinations[j] +
                                      ", " + distance + ", " + duration + "</p>";

                    infoString += strDistance1;
                  } else infoString += "<p>" + element.status + "</p>";
               }
            }

            const infoWindow = new google.maps.InfoWindow({
               content: infoString,
            });

            infoWindow.open(map, userMarkers[i]);
            infoWindows.push(infoWindow);
         }
      } else {
         errorMessage(status);
      }
   });
}

function requestLocation(myMap) {
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
   let route = directionsRenderer.getDirections().routes[0];


   let rideRequests = firebase.database().ref("route-requests/" + user.uid);
   let rideRequestRef = rideRequests.push();
   rideRequestRef.set({
      bounds: route.bounds.toJSON(),
      start_location: route.legs[0].start_location.toJSON(),
      start_address: route.legs[0].start_address,
      end_location: route.legs[route.legs.length-1].end_location.toJSON(),
      end_address: route.legs[route.legs.length-1].end_address,
   });

   window.location.replace('index.html');
}

function initAuth() {

   let ui = new firebaseui.auth.AuthUI(firebase.auth());

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            // Return type determines whether we continue the redirect automatically
            document.getElementById('firebaseui-auth-container').className.replace("show", "");
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
         document.getElementById('firebaseui-auth-container').className.replace("show", "");
      } else {
         document.getElementById('firebaseui-auth-container').className = "show";
         ui.start('#firebaseui-auth-container', uiConfig);
      }
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
