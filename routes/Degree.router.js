const express = require("express");
const Degree = require("../models/Degree.model");
const { uploadFile } = require("../utils/fileUpload");
const { deleteTempFile } = require("../utils/tempUtils");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../temp") });




// Add a new degree
router.post("/add", async (req, res) => {
  try {
    // Extract the degree details from the request body
    const { title, description, thumbnail, price, courses } = req.body;

    // Create a new Degree document
    const newDegree = new Degree({
      title,
      description,
      thumbnail,
      price,
      courses, // Includes courses, chapters, and lessons as nested data
    });

    // Save the new degree to the database
    await newDegree.save();

    res.status(201).json({
      message: "Degree created successfully",
      degree: newDegree,
    });
  } catch (error) {
    console.error("Error adding degree:", error);
    res.status(500).json({
      message: "Failed to create degree",
      error: error.message,
    });
  }
});

module.exports = router;
