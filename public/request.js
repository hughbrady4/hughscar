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
   //userMessage(mRequestId);
   initAuth();


}

function initMap() {
   let zoom = 9;

   mMap = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: {lat: 38.87504573180474, lng: -104.73386842314846},
      zoom: zoom,
      // restriction: {
      //    latLngBounds: SERVICE_AREA_BOUNDS,
      //    strictBounds: false,
      // }
   });

   mDirectionsService = new google.maps.DirectionsService();

   let markerOptions = {
      visible: false,
   };

   mDirectionsRenderer = new google.maps.DirectionsRenderer({
      //panel: directionsPanel,
      //markerOptions: markerOptions,
      draggable: false,
      map: mMap,
   });
}



function initAuth() {

   let ui = new firebaseui.auth.AuthUI(firebase.auth());

   let uiConfig = {
      callbacks: {
         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            return false;
         },
         uiShown: function() {}
      },
      signInFlow: 'popup',
      signInOptions: [
         firebase.auth.PhoneAuthProvider.PROVIDER_ID
      ],
      //tosUrl: '<your-tos-url>',
      //privacyPolicyUrl: '<your-privacy-policy-url>'
   };

   firebase.auth().onAuthStateChanged((user) => {
      if (user) {
         mUser = user;
         AUTH_CONTAINER.classList.remove("show");
         $("#btn-signout").show();
         $("#link-drive").show();
         $("#link-queue").show();
         $("#btn-signin").hide();
         //getRideRequest();
         showRequest();
         getDrivers();

      } else {
         $("#btn-signout").hide();
         $("#link-drive").hide();
         $("#link-queue").hide();
         $("#btn-signin").show();
         AUTH_CONTAINER.classList.add("show");
         ui.start('#firebaseui-auth-container', uiConfig);
      }
   });

}

function getRideRequest() {

   let rideRequests = firebase.database().ref("/requests/")
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

          //showRequest(snapshot.val());
      }

   });

}

function showRequest() {

   // let pickupLoc = {lat: requestData.pickup_lat, lng: requestData.pickup_lng};
   // let destLoc = {lat: requestData.dest_lat, lng: requestData.dest_lng};
   let requestLocRef = firebase.database().ref("/requests")
                      .child(mRequestId).child("pickup_loc");

   requestLocRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
         mPickupLoc = snapshot.val();
         routeFare();

      }
   });

   let requestDestRef = firebase.database().ref("/requests")
                      .child(mRequestId).child("dest_loc");

   requestDestRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
         mDestLoc = snapshot.val();
         routeFare();

      }
   });

   //routeFare(pickupLoc, destLoc);

   const dateField = document.createElement("input");
   dateField.id = "pickup-date-edit";
   dateField.type = "datetime-local";
   dateField.classList.add("form-control");
   // dateField.value = dateTime;
   dateField.addEventListener("change", () => {

      let value = dateField.value;
      if (value == "") {value = null}
      const updates = {};
      updates['/pickup_time'] = value;
      updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

      let requestRef = firebase.database()
         .ref("/requests").child(mRequestId);
      requestRef.update(updates).then(() => {
         userMessage("Pickup time updated.");
      }).catch((error) => {
         userMessage(error.message);
      });

  });

  // let requestTimeRef = firebase.database().ref("/requests")
  //                    .child(mRequestId).child("pickup_time");
  //
  //  requestTimeRef.on('value', (snapshot) => {
  //     if (snapshot.exists()) {
  //        //userMessage("Pickup time changed.");
  //        let dateTime = snapshot.val();
  //        dateField.value = dateTime;
  //
  //     }
  //  });

   let requestTimeRef = firebase.database().ref("/requests")
                      .child(mRequestId).child("updated");

    requestTimeRef.on('value', (updated) => {
       if (updated.exists()) {
          userMessage("Pickup time changed: " + updated.val());
          let updatedDate = new Date();
          updatedDate.setTime(updated.val());
          dateString = updatedDate.toLocaleString();
          dateField.value = dateString;

       }
    });





  const phoneField = document.createElement("input");
  phoneField.id = "rider-phone";
  phoneField.classList.add("form-control");
  phoneField.type = "tel";
  //phoneField.value = requestData.phone;
  phoneField.addEventListener("change", () => {
  });


  let requestPhoneRef = firebase.database().ref("/requests")
                     .child(mRequestId).child("phone");

   requestPhoneRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
         let phone = snapshot.val();
         phoneField.value = phone;
      }
   });


  const fareField = document.createElement("input");
  fareField.id = "fare";
  fareField.classList.add("form-control");
  fareField.type = "text";
  let formatter = new Intl.NumberFormat('en-US', {
     style: 'currency',
     currency: 'USD',

     // These options are needed to round to whole numbers if that's what you want.
     //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
     //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });



  fareField.addEventListener("change", () => {
  });


   let requestFareRef = firebase.database().ref("/requests")
                     .child(mRequestId).child("fare/fare_amount");

   requestFareRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
         let fare = snapshot.val();
         let fareStr = formatter.format(fare);
         fareField.value = fareStr;
      }
   });



   const statusField = document.createElement("select");
   statusField.id = "status";
   statusField.classList.add("form-control");
   // statusField.type = "text";

   const optionCancel = document.createElement("option");
   optionCancel.value = "canceled";
   optionCancel.text = "canceled";
   // optionCanceled.innerHTML = "canceled";

   const optionComplete = document.createElement("option");
   optionComplete.value = "completed";
   optionComplete.text = "completed";
   // optionCanceled.innerHTML = "canceled";

   const optionAccept = document.createElement("option");
   optionAccept.value = "accepted";
   optionAccept.text = "accepted";

   const optionPending = document.createElement("option");
   optionPending.value = "pending";
   optionPending.text = "pending";
   // optionCanceled.innerHTML = "canceled";

   statusField.appendChild(optionAccept);
   statusField.appendChild(optionCancel);
   statusField.appendChild(optionComplete);
   statusField.appendChild(optionPending);


   statusField.addEventListener("change", () => {

      let value = statusField.value;
      if (value == "") {value = null}
      const updates = {};
      updates['/status'] = value;
      updates['/updated' ] = firebase.database.ServerValue.TIMESTAMP;

      let requestRef = firebase.database()
         .ref("/requests").child(mRequestId);

      requestRef.update(updates).then(() => {
         userMessage("Status updated.");
      }).catch((error) => {
         userMessage(error.message);
      });
  });

   let requestStatusRef = firebase.database().ref("/requests")
                    .child(mRequestId).child("status");

   requestStatusRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
         let status = snapshot.val();
         statusField.value = status;

         if (status == "canceled") {
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.classList.add("btn");
            deleteButton.classList.add("btn-primary");
            mMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(deleteButton);
            deleteButton.addEventListener("click", () => {
               let requestRef = firebase.database()
                 .ref("/requests").child(mRequestId);
               requestRef.set(null).then(() => {
                  userMessage("Request deleted!");
                  window.location.replace("/queue.html");
               }).catch((error) => {
                  userMessage(error.message);
               });
            });
         }
      }
   });

   const driverField = document.createElement("input");
   driverField.id = "driver-uid";
   driverField.classList.add("form-control");
   // phoneField.type = "tel";
   //phoneField.value = requestData.phone;
   phoneField.addEventListener("change", () => {
   });


   let driverRef = firebase.database().ref("/requests")
                      .child(mRequestId).child("driver");

   driverRef.on('value', (driver) => {
       if (driver.exists()) {
          let driverId = driver.val();
          driverField.value = driverId;
       }
    });

   const formField = document.createElement("div");
   //formField.classList.add("container");
   formField.classList.add("form-group");
   formField.id = "address-form";
   formField.appendChild(dateField);
   formField.appendChild(phoneField);
   formField.appendChild(fareField);
   formField.appendChild(statusField);
   formField.appendChild(driverField);


   mMap.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);

}

function routeFare() {

   if (mPickupLoc != null && mDestLoc != null) {

      let request = {
         origin: mPickupLoc,
         destination: mDestLoc,
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


         }
      });
   } else {
      mDirectionsRenderer.setMap(null);
   }
}


const DRIVERS = new Map();
const INFO_WINDOWS = new Map();

function getDrivers() {

   let driversRecord = firebase.database().ref("/drivers")
      .orderByChild("status").equalTo("online");
   //console.log(mUser.uid);
   //console.log(driversRecord);

   driversRecord.on('child_added', (driver) => {
      if (driver.exists()) {

         let key = driver.key;
         let loc = driver.val().last_loc;

         let marker = new google.maps.Marker({
            position: loc,
            map: mMap,
            icon: "/images/icons8-car-24.png"
         });

         DRIVERS.set(key, marker);

         const CONTENT_STRING =
            '<div id="content">' +
            '<div id="siteNotice">' +
            "</div>" +
            // '<h5 id="firstHeading" class="firstHeading">' + fareStr + '</h5>' +

            '<div id="bodyContent">' +
            "<button id=\"btn-driver\" onclick=\"setDriver('" + key + "')\"" +
            ' class="btn btn-primary">Select</button>' +
            "<p>Driver key is : <b>" + key + "</b>." +
            "</div>" +
            "</div>";

         let infoWindow = new google.maps.InfoWindow();
         infoWindow.setContent(CONTENT_STRING);

         infoWindow.open({
            anchor: marker,
            map: mMap,
            shouldFocus: false,
         });

         INFO_WINDOWS.set(key, marker);
      }
   });

   driversRecord.on('child_changed', (driver) => {
      if (driver.exists()) {

         let key = driver.key;
         let loc = driver.val().last_loc;

         let marker = DRIVERS.get(key);
         marker.setPosition(loc);
         // routePickup();


      }
   });

   driversRecord.on('child_removed', (driver) => {
      if (driver.exists()) {

         let key = driver.key;
         let loc = driver.val().last_loc;

         let marker = DRIVERS.get(key);

         marker.setMap(null);
         DRIVERS.delete(key);
         // routePickup();

      }
   });

}

function setDriver(key) {
   // userMessage("Driver: " + key);
   let requestRef = firebase.database().ref("/requests").child(mRequestId);

   const UPDATES = {};
   UPDATES['/driver'] = key;
   UPDATES['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
   requestRef.update(UPDATES).then(() => {
      userMessage("Request updated");
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
