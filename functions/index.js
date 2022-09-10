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


/**
 * Triggers when the app is opened the first time in a user device and sends a
 * notification to your developer device.
 *
 * The device model name, the city and the country of the user are sent in
 * the notification message
 */
exports.appEngagement = functions.analytics.event("user_engagement")
    .onLog((event) => {
      // const user = event.user;
      const payload = {
        notification: {
          title: "You have user engagement \uD83D\uDE43",
          body: "Test",
        },
      };

      return admin.messaging().sendToDevice(deviceToken, payload);
    });
