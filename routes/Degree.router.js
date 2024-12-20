const express = require("express");
const Degree = require("../models/Degree.model");
const { uploadFile } = require("../utils/fileUpload");
const { deleteTempFile } = require("../utils/tempUtils");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../temp") });




// Add a new degree
router.post("/", async (req, res) => {
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


router.get('/', async (req, res) => {
    try {
      const degrees = await Degree.find(); // Retrieve all degrees from the database
      res.status(200).json({
        message: "All degrees fetched successfully",
        degrees,
      });
    } catch (error) {
      console.error("Error fetching degrees:", error);
      res.status(500).json({
        message: "Failed to fetch degrees",
        error: error.message,
      });
    }
  });
  
  // Get a degree by ID
  router.get('/:degreeId', async (req, res) => {
    try {
      const { degreeId } = req.params;
  
      // Find degree by ID
      const degree = await Degree.findById(degreeId);
  
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }
  
      res.status(200).json({
        message: "Degree fetched successfully",
        degree,
      });
    } catch (error) {
      console.error("Error fetching degree by ID:", error);
      res.status(500).json({
        message: "Failed to fetch degree",
        error: error.message,
      });
    }
  });
  
  // Get a course by ID within a degree
  router.get('/:degreeId/:courseId', async (req, res) => {
    try {
      const { degreeId, courseId } = req.params;
  
      // Find the degree by ID
      const degree = await Degree.findById(degreeId);
  
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }
  
      // Find the course by ID in the degree's courses array
      const course = degree.courses.find(c => c._id.toString() === courseId);
  
      if (!course) {
        return res.status(404).json({ message: "Course not found in this degree" });
      }
  
      res.status(200).json({
        message: "Course fetched successfully",
        course,
      });
    } catch (error) {
      console.error("Error fetching course by ID:", error);
      res.status(500).json({
        message: "Failed to fetch course",
        error: error.message,
      });
    }
  });
module.exports = router;
