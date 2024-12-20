const { storageRef } = require("../firebaseConfig");
const fs = require("fs");

// Upload file from the temp folder to Firebase and return public URL
const uploadFile = async (filePath, fileName) => {
  try {
    const storageFile = storageRef.file(fileName);
    const fileStream = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
      const blobStream = storageFile.createWriteStream();

      blobStream.on("error", (error) => reject(error));
      blobStream.on("finish", () => {
        const publicUrl = `https://storage.googleapis.com/${storageRef.name}/${fileName}`;
        resolve(publicUrl);
      });

      fileStream.pipe(blobStream);
    });
  } catch (error) {
    throw new Error("File upload failed: " + error.message);
  }
};

module.exports = { uploadFile };
