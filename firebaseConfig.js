const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.FIREBASE_BUCKET_NAME,
});

const storageRef = admin.storage().bucket();
const auth = admin.auth();

module.exports = { storageRef,auth };
