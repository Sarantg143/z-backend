const express = require("express");
const Degree = require("../models/Degree.model");
const { uploadFile } = require("../utils/fileUpload");
const { deleteTempFile } = require("../utils/tempUtils");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../temp") });

// Add a Degree Route
router.post("/", upload.fields([
    { name: "degreeThumbnail" },       // Degree Thumbnail
    { name: "courseThumbnail" },       // Course Thumbnail (for each course)
    { name: "lessonFile" },            // Lesson files (for each lesson)
  ]), async (req, res) => {
    try {
      const {
        title,
        description,
        price,
        courses,  // Array of courses containing lessons
      } = req.body;
  
      // Check if at least one course with at least one chapter and lesson is provided
      if (!courses || !Array.isArray(courses) || courses.length === 0) {
        return res.status(400).send({ message: "At least one course is required." });
      }
  
      // Validate each course, chapter, and lesson
      for (let course of courses) {
        if (!course.title || !course.description || !course.lessons || course.lessons.length === 0) {
          return res.status(400).send({ message: "Each course must have at least one lesson." });
        }
  
        for (let lesson of course.lessons) {
          if (!lesson.title || !lesson.description || !lesson.file) {
            return res.status(400).send({ message: "Each lesson must have a title, description, and file." });
          }
        }
      }
  
      // Upload degree thumbnail
      let degreeThumbnailUrl;
      if (req.files && req.files.degreeThumbnail) {
        degreeThumbnailUrl = await uploadFile(req.files.degreeThumbnail[0].path, req.files.degreeThumbnail[0].originalname);
        deleteTempFile(req.files.degreeThumbnail[0].path);
      }
  
      // Upload and process course thumbnails
      const processedCourses = await Promise.all(courses.map(async (course) => {
        let courseThumbnailUrl;
        if (req.files && req.files.courseThumbnail) {
          const courseThumbnailFile = req.files.courseThumbnail.find(file => file.originalname === course.title); // Match file to the course
          if (courseThumbnailFile) {
            courseThumbnailUrl = await uploadFile(courseThumbnailFile.path, courseThumbnailFile.originalname);
            deleteTempFile(courseThumbnailFile.path);
          }
        }
  
        // Process lessons
        const processedLessons = await Promise.all(course.lessons.map(async (lesson) => {
          let lessonFileUrl;
          if (req.files && req.files.lessonFile) {
            const lessonFile = req.files.lessonFile.find(file => file.originalname === lesson.title); // Match file to the lesson
            if (lessonFile) {
              lessonFileUrl = await uploadFile(lessonFile.path, lessonFile.originalname);
              deleteTempFile(lessonFile.path);
            }
          }
  
          return { ...lesson, file: lessonFileUrl };
        }));
  
        return { ...course, thumbnail: courseThumbnailUrl, lessons: processedLessons };
      }));
  
      // Create new degree with courses and lessons
      const newDegree = new Degree({
        degreeId: `degree-${Date.now()}`,
        title,
        description,
        thumbnail: degreeThumbnailUrl,
        price,
        courses: processedCourses,
      });
  
      // Save degree to database
      await newDegree.save();
  
      res.status(201).send({
        message: "Degree, course, and lesson added successfully.",
        degree: newDegree,
      });
    } catch (error) {
      console.error("Error adding degree:", error);
      res.status(500).send({ message: "Failed to add degree.", error: error.message });
    }
  });
  
module.exports = router;
