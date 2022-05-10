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



const AUTH_CONTAINER = document.getElementById('firebaseui-auth-container');
let mUser;
let mMap;
let mPickupLoc;
let mDestLoc;
let mDirectionsService;
let mDirectionsRenderer;
let mRequestId;

function initApp() {
   initMap();
   let params = (new URL(document.location)).searchParams;
   let request = params.get('request');
   let url = window.location.href;
   mRequestId = params.get('request');
   userMessage(mRequestId);
   initAuth();


   // if (navigator.geolocation) {
   //    navigator.geolocation.getCurrentPosition((position) => {
   //       mUserLat = position.coords.latitude;
   //       mUserLng = position.coords.longitude;
   //       console.log(mUserLat);
   //       console.log(mUserLng);
   //       //initMap();
   //       mMap.setCenter({lat: mUserLat, lng: mUserLng });
   //       mMap.setZoom(11);
   //       initAuth();
   //
   //    }, (error) => {
   //       userMessage("Failed to get geolocation from browser");
   //       console.log(error.message);
   //       //initMap();
   //       initAuth();
   //    });
   // } else {
   //    userMessage("Failed to get geolocation from browser");
   //    //initMap();
   //    initAuth();
   // }

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
         getRideRequest();
      } else {
         let authContainer = document.getElementById('firebaseui-auth-container');
         authContainer.classList.add("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });

}

function getRideRequest() {

   //createUserRecord(mUser);

   let rideRequests = firebase.database().ref("/ride-requests/")
                      .child(mRequestId);
                      //.orderByChild("status")
                      //.equalTo("started")
                      //.limitToFirst(1);

   rideRequests.on('value', (snapshot) => {
      if (snapshot.exists()) {

         snapshot.forEach((childSnapshot) => {
            let childKey = childSnapshot.key;
            let childData = childSnapshot.val();
            console.log(childKey);
            console.log(childData);


          });

          showRequest(snapshot.val());
      } else {

      }
   });

}

function showRequest(requestData) {
  console.log(requestData);
  let label = labels[labelIndex++ % labels.length];

  const infowindow = new google.maps.InfoWindow({
         content: requestData.point_A_address,
      });


  const marker = new google.maps.Marker({
     label: label,
     animation: google.maps.Animation.DROP,
     draggable: false,
     position: requestData.point_A,
     map: mMap,
  });
  marker.addListener("click", () => {
    infowindow.open(mMap, marker);
  });

  let label2 = labels[labelIndex++ % labels.length];

  const infowindow2 = new google.maps.InfoWindow({
         content: requestData.point_B_address,
      });


  const marker2 = new google.maps.Marker({
     label: label2,
     animation: google.maps.Animation.DROP,
     draggable: false,
     position: requestData.point_B,
     map: mMap,
  });
  marker2.addListener("click", () => {
    infowindow2.open(mMap, marker2);
  });

  let date = requestData.request_date;
  const dateField = document.createElement("input");
  dateField.id = "pickup-date-edit";
  dateField.type = "date";
  dateField.classList.add("form-control");
  dateField.value = date;
  dateField.addEventListener("change", () => {

  });

  let time = requestData.request_time;
  // let hour = time.getHours();
  // let min  = time.getMinutes();
  // hour = (hour < 10 ? "0" : "") + hour;
  // min = (min < 10 ? "0" : "") + min;

  const timeField = document.createElement("input");
  timeField.id = "pickup-time-edit";
  timeField.type = "time";
  timeField.value = time;
  dateField.classList.add("form-control");
  timeField.addEventListener("change", () => {

  });

  const dateTimeWrap = document.createElement("div");
  dateTimeWrap.id = "pickup-date-wrapper";
  dateTimeWrap.appendChild(dateField);
  dateTimeWrap.appendChild(timeField);

  const addressField = document.createElement("input");
  addressField.id = "rider";
  addressField.className = "pickup-address-edit";
  addressField.classList.add("form-control");
  addressField.type = "text";
  addressField.value = requestData.rider_uid;
  addressField.addEventListener("change", () => {
     //geoCodeAddress(addressField, label, marker);
  });


  const formField = document.createElement("div");
  //formField.classList.add("container");
  formField.classList.add("form-group");

  formField.id = "address-form";
  formField.appendChild(dateTimeWrap);
  //formField.appendChild(addressLabel);
  formField.appendChild(addressField);
  mMap.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);


}


function addUserMarker(atLatLng) {

   if (userMarkers.length > 1) {
      userMessage("Maxium number of waypoints");
      return;
   }

   let label = labels[labelIndex++ % labels.length];
   const marker = new google.maps.Marker({
      label: label,
      // animation: google.maps.Animation.DROP,
      draggable: true,
      position: atLatLng,
      map: mMap,
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
   //   userMessage("Drag marker " + label + " to desired location on map");
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
     mMap.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);

   } else {
     const formField = mMap.controls[google.maps.ControlPosition.LEFT_TOP].pop();
     //formField.appendChild(addressLabel);
     formField.appendChild(addressField);
     mMap.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);

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
        userMessage(status);

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
        userMessage(status);

      }
   });

}

function removeMarkerFromMap(index) {
   userMarkers[index].setMap(null);
}

function clearMap() {
   for (let i = 0; i < userMarkers.length; i++) {
      userMarkers[i].setMap(null);
   }
   userMarkers.length = 0
   labelIndex = 0;

   while (mMap.controls[google.maps.ControlPosition.LEFT_TOP].length > 0) {
      mMap.controls[google.maps.ControlPosition.LEFT_TOP].pop();
   }

   google.maps.event.clearListeners(mMap, 'click');

}

function setUI4Waiting(rideRequestKey) {

   let rideRequestRef = firebase.database().ref("/ride-requests/").child(rideRequestKey);
   rideRequestRef.get().then(function(snapshot) {
      if (snapshot.exists()) {
         console.log(snapshot.val());

         let data = snapshot.val();

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
               google.maps.event.clearListeners(mMap, 'dblclick');

               while (mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
                  mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
               }

               // let directionsPanel = document.getElementById("directionsPanel");
               // directionsPanel.className = "show_directions";
               // let mapDiv = document.getElementById("map");
               // mapDiv.className = "map_with_directions";

               directionsRenderer = new google.maps.DirectionsRenderer({
                  //panel: directionsPanel,
                  draggable: false,
                  map:mMap,
               });

               //directionsRenderer.setMap(map);
               directionsRenderer.setDirections(result);

               mDirections.push(directionsRenderer);

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

                  let openRide = firebase.database()
                     .ref("/ride-control/" + user.uid + "/" + rideRequestKey);
                  openRide.set({
                    status: "canceled",
                    canceledAt: firebase.database.ServerValue.TIMESTAMP,

                  });


                  // window.history.back();
               });
               mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(cancelButton);

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
              userMessage(status);
            }
         });

         let loader = document.getElementById("loader");
         loader.className = "show";

      } else {
         console.log("No data available");
      }
   }).catch(function(error) {
      console.error(error);
   });

}

function setUI4Input(rideRequestKey) {
   clearMap();
   clearRoute();

   let loader = document.getElementById("loader");
   //loader.className = loader.className.replace("show", "");
   loader.classList.remove("show");

   while (mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
      mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
   }

      mMap.addListener("click", (event) => {
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
         userMessage("Add a waypoint to the map");
         return;
      }
      clearMap();
   });
   mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(clearButton);

   const routeButton = document.createElement("button");
   routeButton.textContent = "Request Ride";
   routeButton.classList.add("button");
   mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(routeButton);
   routeButton.addEventListener("click", () => {
      if (userMarkers.length < 2) {
         userMessage("Add 2 waypoints to build a route");
         return;
      }
      writeRequest(rideRequestKey);
      // requestRide();
      // buildControls("book");
   });
   //requestLocation(map);
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

              while (mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].length > 0) {
                 mMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].pop();
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
              // map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(cancelButton);


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

function readPendingRequests() {
   let user = firebase.auth().currentUser;
   if (!user) {
      userMessage("Login required to request pickup");
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
        //   userMessage("You're current location is outside service area");
         //}
      }, () => {
         userMessage("Failed to get geolocation from browser");
         //addUserMarker();
         //buildControls("waypoints");
         //console.log("Failed to get geolocation from browser");
      });
   } else {
      userMessage("Failed to get geolocation from browser");
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

function writeRequest(rideRequestKey2) {

   let user = firebase.auth().currentUser;
   if (!user) {
      userMessage("Login required to request pickup");
      return;
   }
   let markerA = userMarkers[0];
   let markerB = userMarkers[1];
   let markerC = userMarkers[2];

   // let formField = map.controls[google.maps.ControlPosition.LEFT_TOP].pop();
   // console.log(formField);

   let rideRequests = firebase.database().ref("/ride-requests/");
   let rideRequestKey = firebase.database().ref("/ride-requests/" + rideRequestKey2);
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

   let rideControlRecord = firebase.database().ref("/ride-control/")
                      .child(mUser.uid).child(rideRequestKey2);

   rideControlRecord.set({
      status: "opened",
      openedAt: firebase.database.ServerValue.TIMESTAMP,
   });


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
