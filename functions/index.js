const functions = require("firebase-functions");

const admin = require("firebase-admin");
admin.initializeApp();

const deviceToken = functions.config().request_notifier.default_device_token;

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.newRequest = functions.database.ref("/requests/{requestId}")
    .onCreate((snapshot, context) => {
      // Grab the current value of what was written to the Realtime Database.
      const original = snapshot.toJSON();
      functions.logger.log("New request", context.params.requestId, original);
      // const uppercase = original.toUpperCase();
      // writing to the Firebase Realtime Database.
      // return snapshot.ref.parent.child('uppercase').set(uppercase);


      const payload = {
        notification: {
          title: "You have a new request \uD83D\uDE43",
          body: JSON.stringify(original),
        },
      };

      return admin.messaging().sendToDevice(deviceToken, payload);
    });
