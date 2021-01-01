
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
var routeRequests = firebase.database().ref("route-requests");
var userLat = 32.89232732227711;
var userLng = -96.95597853022022;
var map;
var userLoc;
let driverMarkers = [];
let userMarkers = [];
let infoWindows = [];
let infoWindow;
var lastZoom;

const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let labelIndex = 0;


var directionsService;
var directionsRenderer;
var distanceService;

let browserLocation;

//loadDrivers();

function addUserMarker(atLatLng) {

   if (userMarkers.length > 3) {
      errorMessage("Maxium number of waypoints");
      return;
   }

   //console.log(userMarkers.length);
   let newLat = map.getCenter().lat();
   let newLng = map.getCenter().lng();
   let zoom = map.getZoom();
   //console.log(map.getZoom());

   if (userMarkers.length > 0) {
      let lastPosition = userMarkers[userMarkers.length-1].getPosition();
      newLat = lastPosition.lat();
      if (zoom < 3) {
        newLng = lastPosition.lng() + 50;
      } else if (zoom < 6) {
        newLng = lastPosition.lng() + 5;
      } else if (zoom < 9) {
        newLng = lastPosition.lng() + 0.5;
      } else if (zoom < 12) {
        newLng = lastPosition.lng() + 0.05;
      } else if (zoom < 18){
        newLng = lastPosition.lng() + 0.005;
      } else {
        newLng = lastPosition.lng() + 0.0005;
      }
   }

   if (atLatLng) {
      newLat = atLatLng.lat();
      newLng = atLatLng.lng();
   }

   let label = labels[labelIndex++ % labels.length];
   const marker = new google.maps.Marker({
      label: label,
      animation: google.maps.Animation.DROP,
      draggable: true,
      position: {lat: newLat, lng: newLng},
      map: map,
   });

   userMarkers.push(marker);

   marker.addListener("click", function(e) {
     errorMessage("Drag marker " + label + " to desired location on map");

   });
}

function removeMarker(index) {
   console.log("Hello from method, index: " + index);
   userMarkers[index].setMap(null);
}

function clearMarkers() {

  if (userMarkers.length < 1) {
     errorMessage("Add a waypoint to the map");
     return;
  }

   for (let i = 0; i < userMarkers.length; i++) {
      userMarkers[i].setMap(null);
   }
   userMarkers.length = 0
   labelIndex = 0;

}

function showRoute() {

  if (userMarkers.length < 2) {
     errorMessage("Add 2 waypoints to build a route");
     return;
  }

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

   directionsService.route(request, function(result, status) {
      if (status == 'OK') {
         //lastZoom = map.getZoom();

         // for (let i =  0; i <userMarkers.length; i++) {
         //   userMarkers[i].setMap(null);
         // }

         clearMarkers();
         google.maps.event.clearListeners(map, 'click');

         directionsRenderer.setMap(map);
         directionsRenderer.setDirections(result);

         let directionsPanel = document.getElementById("directionsPanel");
         directionsPanel.className = "show_directions";
         let mapDiv = document.getElementById("map");
         mapDiv.className = "map_with_directions";

      } else {
        errorMessage(status);
      }
   });
}

function clearRoute() {
   directionsRenderer.setMap(null);
   //map.setZoom(lastZoom);
   let directionsPanel = document.getElementById("directionsPanel");
   directionsPanel.className = "hide_directions";
   let mapDiv = document.getElementById("map");
   mapDiv.className = "map_full";

   //let legs = directionsRenderer.getDirections().routes[0].legs;

   //console.log(legs);

   //let i = 0;
   //for (i =  0; i < legs.length; i++) {
   //   userMarkers[i].setMap(map);
   //   userMarkers[i].setPosition(legs[i].start_location);
   //}

   //userMarkers[i].setMap(map);
   //userMarkers[i].setPosition(legs[i-1].end_location);

}


function buildControls(mode) {

   while (map.controls[google.maps.ControlPosition.TOP_LEFT].length > 0) {
      map.controls[google.maps.ControlPosition.TOP_LEFT].pop();
   }

   // if (mode == "start") {
   //    const locButton = document.createElement("button");
   //    locButton.textContent = "Start from my location";
   //    locButton.classList.add("button");
   //    locButton.addEventListener("click", () => {
   //       startFlow();
   //       //buildControls("waypoints");
   //    });
   //    map.controls[google.maps.ControlPosition.TOP_LEFT].push(locButton);
   //    return;
   // }

   if (mode == "waypoints") {
     //add clear button
     const clearButton = document.createElement("button");
     clearButton.textContent = "Clear";
     clearButton.classList.add("button");
     clearButton.addEventListener("click", () => {
        clearMarkers();
        clearRoute();
        setZoomSlow(lastZoom);

        buildControls("start");
     });

     map.controls[google.maps.ControlPosition.TOP_LEFT].push(clearButton);


     //const addButton = document.createElement("button");
     //addButton.textContent = "Add Waypoint";
     //addButton.classList.add("button");
     //addButton.addEventListener("click", () => {
      //    addUserMarker();
        // if (userMarkers.length > 1) {
        //    buildControls("route");
        // }
     //});
     //map.controls[google.maps.ControlPosition.TOP_LEFT].push(addButton);


     return;
   }


   if (mode == "route") {

     //add clear button
     const clearButton = document.createElement("button");
     clearButton.textContent = "Clear";
     clearButton.classList.add("button");
     clearButton.addEventListener("click", () => {
        clearMarkers();
        clearRoute();
        setZoomSlow(lastZoom);
        buildControls("start");
     });
     map.controls[google.maps.ControlPosition.TOP_LEFT].push(clearButton);

     //const addButton = document.createElement("button");
     //addButton.textContent = "Add Waypoint";
     //addButton.classList.add("button");
     //addButton.addEventListener("click", () => {
     //     addUserMarker();
    //     if (userMarkers.length > 1) {
      //      buildControls("route");
      //   }
     //});
     //map.controls[google.maps.ControlPosition.TOP_LEFT].push(addButton);

      const routeButton = document.createElement("button");
      routeButton.textContent = "Show Route";
      routeButton.classList.add("button");
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(routeButton);
      routeButton.addEventListener("click", () => {
         showRoute();
         buildControls("book");
      });

      return;
   }

   if (mode == "book") {

      //add clear button
      const clearButton = document.createElement("button");
      clearButton.textContent = "Clear";
      clearButton.classList.add("button");
      clearButton.addEventListener("click", () => {
         clearMarkers();
         clearRoute();
         buildControls("start");
      });
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(clearButton);

      const bookButton = document.createElement("button");
      bookButton.textContent = "Request Pickup";
      bookButton.classList.add("button");
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(bookButton);
      bookButton.addEventListener("click", () => {
         let user = firebase.auth().currentUser;
         if (!user) {
            errorMessage("Login required to request pickup");
            return;
         }
         requestPickup();
         clearRoute();
         //showRoute();
         buildControls("waiting");
      });
   }

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

   // map.addListener("bounds_changed", () => {
   //   console.log(map.getBounds());
   //
   // });


   map.addListener("click", (event) => {
      //map.setCenter(event.latLng);
      //map.setZoom(15);
      addUserMarker(event.latLng);

      if (userMarkers.length > 1) {
         buildControls("route");
      } else {
         buildControls("waypoints");
      }

   });


   directionsService = new google.maps.DirectionsService();
   directionsRenderer = new google.maps.DirectionsRenderer({
      panel: directionsPanel,
      draggable: true,
      map:map,
   });


   //distanceService = new google.maps.DistanceMatrixService();

   const mapHeader = document.createElement("div");
   mapHeader.classList.add("map_header_container");
   mapHeader.innerHTML = "Hugh's Car Service";
   map.controls[google.maps.ControlPosition.TOP_RIGHT].push(mapHeader);



   //const login = document.getElementById("firebaseui-auth-container");
   //map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(login);
   //login.className = "show";

   //buildControls("start");
   //initAuth();

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

function startFlow() {
   if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
         const pos = {
               lat: position.coords.latitude,
               lng: position.coords.longitude,
         };

         browserLocation = new google.maps.LatLng(pos);

         let inArea = map.getBounds().contains(browserLocation);

         if (inArea) {

            lastZoom = map.getZoom();
            //console.log(lastZoom);
            map.setCenter(browserLocation);

            setZoomSlow(13);

            //map.setZoom(14);
            addUserMarker();
            buildControls("waypoints");

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

function requestPickup() {
  let user = firebase.auth().currentUser;
  if (!user) {
    errorMessage("Login required to request pickup");
    return;
  }
  let route = directionsRenderer.getDirections().routes[0];

  //console.log(route);


  let routeRequestRef = routeRequests.push();
  routeRequestRef.set({
     uid: user.uid,
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
