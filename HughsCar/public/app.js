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
var map;
var userLoc;
var userLng = -96.95597853022022;
let driverMarkers = [];
let userMarkers = [];
let infoWindow;
let lastZoom;

const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let labelIndex = 0;

var directionsService;
var directionsRenderer;


//var timeLink = document.getElementById("btn_pick_time");
//timeLink.addEventListener("click", initLocation);

//loadDrivers();


function initLocation() {

   if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(setPosition, noPosition);
   } else {
      message.innerHTML = "<p>Geolocation is not supported by this browser</p>";
      console.log("Failed to get geolocation from browser");
   }
}


function noPosition(position) {
   message.innerHTML = "<p>Geolocation is not supported by this browser</p>";
   console.log("Failed to get geolocation from browser");
}

function setPosition(position) {
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

function addUserMarker() {

   //console.log(userMarkers.length);
   let newLat = map.getCenter().lat();
   let newLng = map.getCenter().lng();

   let zoom = map.getZoom();

   if (userMarkers.length > 0) {
      let lastPosition = userMarkers[userMarkers.length-1].getPosition();
      newLat = lastPosition.lat();
      if (zoom <7) {
        newLng = lastPosition.lng() + 0.5;

      } else {
        newLng = lastPosition.lng() + 0.005;

      }

   }

   //console.log(labelIndex);

   let marker = new google.maps.Marker({
      label: labels[labelIndex++ % labels.length],
      animation: google.maps.Animation.DROP,
      draggable: true,
      position: {lat: newLat, lng: newLng},
      map: map,
   });
   //console.log(labelIndex);

   userMarkers.push(marker);

   marker.addListener("click", function(e) {
     //removeMarker(userMarkers.length-1);
     console.log(e);
     //userMarkers[userMarkers.length-1].setMap(null);

   });

   if (map.controls[google.maps.ControlPosition.TOP_LEFT].length < 2 &&
                  userMarkers.length > 0) {
      const clearMarkersButton = document.createElement("button");
      clearMarkersButton.className = "button"
      clearMarkersButton.textContent = "Clear Markers";
      clearMarkersButton.classList.add("custom-map-control-button");
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(clearMarkersButton);
      clearMarkersButton.addEventListener("click", () => {
         clearMarkers();
      });
   }

   if (map.controls[google.maps.ControlPosition.TOP_LEFT].length < 3 &&
                  userMarkers.length > 1) {
      const routeButton = document.createElement("button");
      routeButton.className = "button"
      routeButton.textContent = "Show Route";
      routeButton.classList.add("custom-map-control-button");
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(routeButton);
      routeButton.addEventListener("click", () => {
         showRoute();
      });
   }
}

function removeMarker(index) {
   console.log("Hello from method, index: " + index);
   userMarkers[index].setMap(null);
}

function clearMarkers() {
   for (let i = 0; i < userMarkers.length; i++) {
      userMarkers[i].setMap(null);
   }
   userMarkers.length = 0
   labelIndex = 0;
   while (map.controls[google.maps.ControlPosition.TOP_LEFT].length > 1) {
      map.controls[google.maps.ControlPosition.TOP_LEFT].pop();
   }
}

function showRoute() {
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

   for (let i =  0; i <userMarkers.length; i++) {
     userMarkers[i].setMap(null);
   }


   var request = {
      origin: origin,
      destination: destination,
      waypoints: waypts,
      optimizeWaypoints: true,
      travelMode: 'DRIVING',
      drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
   };

   directionsService.route(request, function(result, status) {
      if (status == 'OK') {
         lastZoom = map.getZoom();

         directionsRenderer.setMap(map);
         directionsRenderer.setDirections(result);

         console.log(result);
         let userRouteRef = firebase.database().ref("user-routes").push();
         //userRouteRef.set(result);


         //remove showRoute button
         map.controls[google.maps.ControlPosition.TOP_LEFT].pop();
         map.controls[google.maps.ControlPosition.TOP_LEFT].pop();
         map.controls[google.maps.ControlPosition.TOP_LEFT].pop();

         let directionsPanel = document.getElementById("directionsPanel");
         directionsPanel.className = "show_directions";
         let mapDiv = document.getElementById("map");
         mapDiv.className = "map_with_directions";

         //add clear button
         const clearButton = document.createElement("button");
         clearButton.className = "button"
         clearButton.textContent = "Clear Route";
         clearButton.classList.add("custom-map-control-button");
         clearButton.addEventListener("click", () => {
             clearRoute();
         });
         map.controls[google.maps.ControlPosition.TOP_LEFT].push(clearButton);
      }
   });
}

function clearRoute() {
   directionsRenderer.setMap(null);
   map.setZoom(lastZoom);
   let directionsPanel = document.getElementById("directionsPanel");
   directionsPanel.className = "hide_directions";
   let mapDiv = document.getElementById("map");
   mapDiv.className = "map_full";

   map.controls[google.maps.ControlPosition.TOP_LEFT].pop();

   const locationButton = document.createElement("button");
   locationButton.className = "button"
   locationButton.textContent = "Add Marker";
   locationButton.classList.add("custom-map-control-button");
   locationButton.addEventListener("click", () => {
       addUserMarker();
   });
   map.controls[google.maps.ControlPosition.TOP_LEFT].push(locationButton);

   if (map.controls[google.maps.ControlPosition.TOP_LEFT].length < 2 &&
                  userMarkers.length > 0) {
      const clearMarkersButton = document.createElement("button");
      clearMarkersButton.className = "button"
      clearMarkersButton.textContent = "Clear Markers";
      clearMarkersButton.classList.add("custom-map-control-button");
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(clearMarkersButton);
      clearMarkersButton.addEventListener("click", () => {
         clearMarkers();
      });
   }

   if (map.controls[google.maps.ControlPosition.TOP_LEFT].length < 3 &&
                  userMarkers.length > 1) {
      const routeButton = document.createElement("button");
      routeButton.className = "button"
      routeButton.textContent = "Show Route";
      routeButton.classList.add("custom-map-control-button");
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(routeButton);
      routeButton.addEventListener("click", () => {
         showRoute();
      });
   }

   let legs = directionsRenderer.getDirections().routes[0].legs;

   //console.log(legs);

   let i = 0;
   for (i =  0; i < legs.length; i++) {
     userMarkers[i].setMap(map);
     userMarkers[i].setPosition(legs[i].start_location);
   }

   userMarkers[i].setMap(map);
   userMarkers[i].setPosition(legs[i-1].end_location);

}


function initMap() {
   map = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      center: {lat: userLat, lng: userLng },
      zoom: 6,
   });

   directionsService = new google.maps.DirectionsService();
   directionsRenderer = new google.maps.DirectionsRenderer({
      panel: directionsPanel,
      draggable: true,
      map:map,
   });

   const mapHeader = document.createElement("div");
   mapHeader.classList.add("header_container");
   mapHeader.innerHTML = "Traveling Salesman";
   map.controls[google.maps.ControlPosition.TOP_CENTER].push(mapHeader);

   const locationButton = document.createElement("button");
   locationButton.textContent = "Add Marker";
   locationButton.classList.add("button");
   locationButton.addEventListener("click", () => {
       addUserMarker();
   });
   map.controls[google.maps.ControlPosition.TOP_LEFT].push(locationButton);

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

   var service = new google.maps.DistanceMatrixService();
   service.getDistanceMatrix({
      origins: [driverLoc],
      destinations: [userLoc],
      travelMode: 'DRIVING',
      },  (response, status) => {
      if (status == 'OK') {
         var origins = response.originAddresses;
         var destinations = response.destinationAddresses;

         for (var i = 0; i < origins.length; i++) {
            var results = response.rows[i].elements;
            for (var j = 0; j < results.length; j++) {
               var element = results[j];
               var distance = element.distance.text;
               var duration = element.duration.text;
               var value = element.duration.value;
               var from = origins[i];
               var to = destinations[j];
               console.log(element);
               console.log(distance);
               console.log(value);
               console.log(from);
               console.log(to);
            }
         }
      }
   });

}
