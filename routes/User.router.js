const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../utils/fileUpload"); // Reusable Firebase upload utility
const User = require("../models/User.model"); // Import User model
const { deleteTempFile } = require("../utils/tempUtils"); // Utility to delete temp files
const path = require("path");

const router = express.Router();

// Configure multer to save files in the temp folder
const upload = multer({
  dest: path.join(__dirname, "../temp"),
});

// Route to create a new user
router.post("/add", upload.single("profilePicture"), async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).send({ message: "Name and email are required." });
    }

    let profilePictureUrl = null;

    // If a profile picture is provided, upload it to Firebase
    if (req.file) {
      const tempPath = req.file.path; // Path to the file in the temp folder
      const fileName = req.file.originalname; // Original file name

      try {
        profilePictureUrl = await uploadFile(tempPath, fileName); // Upload to Firebase
      } catch (error) {
        return res.status(500).send({
          message: "Error uploading profile picture.",
          error: error.message,
        });
      } finally {
        // Clean up temp file
        deleteTempFile(tempPath);
      }
    }

    // Create a new user in the database
    const newUser = new User({
      name,
      email,
      profilePicture: profilePictureUrl,
    });

    await newUser.save(); // Save user to MongoDB

    res.status(201).send({
      message: "User created successfully!",
      user: newUser,
    });
  } catch (error) {
    console.error("Error adding user:", error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).send({
        message: "Email already exists. Please use a different email.",
      });
    }

    res.status(500).send({ message: "Error creating user.", error: error.message });
  }
});

module.exports = router;
