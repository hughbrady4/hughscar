
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


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

const STORAGE_REF = firebase.storage().ref();
const AUTH_CONTAINER = document.getElementById('firebaseui-auth-container');
const CARD_DRIVER = document.getElementById('card-driver-image');


const PHOTO_INPUT = document.getElementById('link-photo-upload');
PHOTO_INPUT.addEventListener('change', (evt) => {

   evt.stopPropagation();
   evt.preventDefault();
   let file = evt.target.files[0];

   var metadata = {
      'contentType': file.type
   };

   // Push to child path.
   STORAGE_REF.child('images/' + file.name).put(file, metadata).then(function(imageFile) {
      console.log('Uploaded', imageFile.totalBytes, 'bytes.');
      console.log('File metadata:', imageFile.metadata);
      // Let's get a download URL for the file.
      return imageFile.ref.getDownloadURL();

   }).then(function(url) {

      let driverRef = firebase.database().ref("/drivers").child(mUser.uid);
      const UPDATES = {};
      UPDATES['/driver_image'] = url;
      UPDATES['/updated' ] = firebase.database.ServerValue.TIMESTAMP;
      return driverRef.update(UPDATES);

   }).then(() => {
       userMessage("Driver image updated");
   }).catch(function(error) {
      console.error('Upload failed:', error);
   });
 }, false);


initApp();

function initApp() {

   firebase.auth().onAuthStateChanged((user) => {

      if (user == null) {
         // AUTH_CONTAINER.classList.add("show");
         userMessage("You are logged out.");

         firebase.auth().signInAnonymously().then(() => {
            //userMessage("You are logged in anonymously.");
         }).catch((error) => {
            $("#transportservice-content-container").hide();
            let errorCode = error.code;
            let errorMessage = error.message;
            userMessage(errorMessage);
         });
         return;
      }

      AUTH_CONTAINER.classList.remove("show");
      mUser =  user;

      if (mUser.isAnonymous) {
         //userMessage("You are still logged in anonymously.");
         $("#btn-signout").hide();
         $("#btn-signin").show();
      } else {
         userMessage("You are logged in.");
         $("#btn-signout").show();
         $("#btn-signin").hide();
      }

      let driverImageRef = firebase.database().ref("/drivers")
         .child(mUser.uid).child("driver_image");

      driverImageRef.on('value', (imageUrl) => {
         if (imageUrl.exists()) {
            let url = imageUrl.val();
            console.log("Pic: " + url);
            CARD_DRIVER.src = url;
         } else {

         }
      });



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
