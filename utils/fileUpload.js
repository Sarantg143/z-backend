const { storageRef } = require("../firebaseConfig");
const fs = require("fs");

// Upload file to Firebase and make it publicly accessible
const uploadFile = async (filePath, fileName) => {
  try {
    const storageFile = storageRef.file(fileName);
    const fileStream = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
      const blobStream = storageFile.createWriteStream();

      blobStream.on("error", (error) => reject(error));
      blobStream.on("finish", async () => {
        try {
          // Make the file publicly accessible
          await storageFile.makePublic();
          const publicUrl = `https://storage.googleapis.com/${storageRef.name}/${fileName}`;
          resolve(publicUrl);
        } catch (error) {
          reject(new Error("Failed to make file public: " + error.message));
        }
      });

      fileStream.pipe(blobStream);
    });
  } catch (error) {
    throw new Error("File upload failed: " + error.message);
  }
};

module.exports = { uploadFile };


// const fs = require("fs");
// const path = require("path");
// const ffmpeg = require("fluent-ffmpeg");
// const pdfParse = require("pdf-parse");
// const admin = require("firebase-admin");

// // Initialize Firebase Admin SDK
// const serviceAccount = require("../path/to/your/firebase-service-account.json");
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     storageBucket: "your-bucket-name.appspot.com",
//   });
// }
// const bucket = admin.storage().bucket();

// // Function to determine the folder based on file type
// const determineFolder = (fileType) => {
//   if (fileType.startsWith("audio")) return "audios";
//   if (fileType.startsWith("video")) return "videos";
//   if (fileType === "application/pdf") return "pdfs";
//   if (
//     fileType === "application/vnd.ms-powerpoint" ||
//     fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
//   )
//     return "ppts";
//   if (fileType.startsWith("image")) return "images";
//   return null;
// };

// // Function to calculate duration of audio/video files
// const getMediaDuration = (filePath) =>
//   new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(filePath, (err, metadata) => {
//       if (err) return reject(err);
//       const duration = metadata.format.duration; // Duration in seconds
//       resolve(duration);
//     });
//   });

// // Function to count pages in a PDF file
// const getPdfPageCount = async (filePath) => {
//   const dataBuffer = fs.readFileSync(filePath);
//   const pdfData = await pdfParse(dataBuffer);
//   return pdfData.numpages; // Number of pages
// };

// // Function to upload a file to Firebase Storage in a specific folder
// const uploadFileToFirebase = async (filePath, fileName, folder) => {
//   const fileUpload = bucket.file(`${folder}/${fileName}`); // Upload to specific folder

//   await bucket.upload(filePath, {
//     destination: `${folder}/${fileName}`,
//     metadata: {
//       metadata: {
//         firebaseStorageDownloadTokens: "token", // Public access token
//       },
//     },
//   });

//   const [fileUrl] = await fileUpload.getSignedUrl({
//     action: "read",
//     expires: "03-01-2500", // Long expiry date
//   });

//   return fileUrl;
// };


// module.exports = {
//   uploadFileToFirebase,
//   determineFolder,
//   getMediaDuration,
//   getPdfPageCount,
// };
