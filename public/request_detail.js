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
let mDriverLoc;
let mDirectionsService;
let mDirectionsRenderer;
let mRequestId;

function initApp() {

   let zoom = 9;

   mMap = new google.maps.Map(document.getElementById("map"), {
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: "cooperative",
      center: {lat: 38.87504573180474, lng: -104.73386842314846},
      zoom: zoom,
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

   mPickupRenderer = new google.maps.DirectionsRenderer({
      //panel: directionsPanel,
      //markerOptions: markerOptions,
      draggable: false,
      map: mMap,
      polylineOptions: {strokeColor: "LightSalmon"},
   });




   let params = (new URL(document.location)).searchParams;
   let request = params.get('request');
   let url = window.location.href;
   mRequestId = params.get('request');
   //userMessage(mRequestId);

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

   requestLocRef.on('value', (pickupLoc) => {
      if (pickupLoc.exists()) {
         mPickupLoc = pickupLoc.val();
         routeFare();
         routePickup();
      } else {
         mPickupLoc = null;
      }
   });

   let requestDestRef = firebase.database().ref("/requests")
                      .child(mRequestId).child("dest_loc");

   requestDestRef.on('value', (destLoc) => {
      if (destLoc.exists()) {
         mDestLoc = destLoc.val();
         routeFare();
      } else {
         mDestLoc = null;
      }
   });

   let requestDriverRef = firebase.database().ref("/requests")
                      .child(mRequestId).child("driver_loc");

   requestDriverRef.on('value', (driverLoc) => {
      if (driverLoc.exists()) {
         mDriverLoc = driverLoc.val();
         routePickup();
      } else {
         mDriverLoc = null;

      }
   });

   let requestStatusRef = firebase.database().ref("/requests")
                    .child(mRequestId).child("status");

   requestStatusRef.on('value', (status) => {
      if (status.exists()) {
      }
   });

   //mMap.controls[google.maps.ControlPosition.LEFT_TOP].push(formField);

}

function routePickup() {

   if (mPickupLoc != null && mDriverLoc != null) {

      let request = {
         origin: mDriverLoc,
         destination: mPickupLoc,
         //waypoints: waypts,
         //optimizeWaypoints: true,
         travelMode: 'DRIVING',
         //drivingOptions: { departureTime: departTime, trafficModel: "pessimistic"},
      };

      mDirectionsService.route(request, (response, status) => {
         if (status == 'OK') {
            mPickupRenderer.setDirections(response);
            mPickupRenderer.setMap(mMap);
            let duration = response.routes[0].legs[0].duration;
            let distance = response.routes[0].legs[0].distance;


         }
      });
   } else {
      mPickupRenderer.setMap(null);
   }
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
