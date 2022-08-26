importScripts("https://www.gstatic.com/firebasejs/9.9.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.9.2/firebase-database-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.9.2/firebase-auth-compat.js");


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

const firebaseApp = firebase.initializeApp(firebaseConfig);


function requestLocation() {
  if (navigator.geolocation) {
     navigator.geolocation.getCurrentPosition((position) => {
        let userLat = position.coords.latitude;
        let userLng = position.coords.longitude;

        let driverRef = firebaseApp.database()
           .ref("drivers/" + firebaseApp.auth().currentUser.uid).child("last_loc");
        driverRef.set({lat: userLat, lng: userLng });

        setTimeout("requestLocation()",1000);

      }, (error) => {
         //userMessage("Failed to get geolocation from browser");
         console.log(error.message);
      });
   } else {
      console.log("Failed to get geolocation from browser");
      //userMessage("Failed to get geolocation from browser");
   }
}

requestLocation();
