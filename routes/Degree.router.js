// const express = require("express");
// const Degree = require("../models/Degree.model");
// const { uploadFile } = require("../utils/fileUpload");
// const { deleteTempFile } = require("../utils/tempUtils");
// const multer = require("multer");
// const path = require("path");

// const router = express.Router();
// const upload = multer({ dest: path.join(__dirname, "../temp") });



// router.post("/", async (req, res) => {
//   try {
    
//     const { title, description, thumbnail, price, courses } = req.body;

//     const newDegree = new Degree({
//       title,
//       description,
//       thumbnail,
//       price,
//       courses, 
//     });

//     await newDegree.save();

//     res.status(201).json({
//       message: "Degree created successfully",
//       degree: newDegree,
//     });
//   } catch (error) {
//     console.error("Error adding degree:", error);
//     res.status(500).json({
//       message: "Failed to create degree",
//       error: error.message,
//     });
//   }
// });


// router.get('/', async (req, res) => {
//     try {
//       const degrees = await Degree.find();
//       res.status(200).json({
//         message: "All degrees fetched successfully",
//         degrees,
//       });
//     } catch (error) {
//       console.error("Error fetching degrees:", error);
//       res.status(500).json({
//         message: "Failed to fetch degrees",
//         error: error.message,
//       });
//     }
//   });
  
  
//   router.get('/:degreeId', async (req, res) => {
//     try {
//       const { degreeId } = req.params;
  
//       const degree = await Degree.findById(degreeId);
  
//       if (!degree) {
//         return res.status(404).json({ message: "Degree not found" });
//       }
  
//       res.status(200).json({
//         message: "Degree fetched successfully",
//         degree,
//       });
//     } catch (error) {
//       console.error("Error fetching degree by ID:", error);
//       res.status(500).json({
//         message: "Failed to fetch degree",
//         error: error.message,
//       });
//     }
//   });
  

//   router.get('/:degreeId/:courseId', async (req, res) => {
//     try {
//       const { degreeId, courseId } = req.params;
  
//       const degree = await Degree.findById(degreeId);
  
//       if (!degree) {
//         return res.status(404).json({ message: "Degree not found" });
//       }
//       const course = degree.courses.find(c => c._id.toString() === courseId);
  
//       if (!course) {
//         return res.status(404).json({ message: "Course not found in this degree" });
//       }
  
//       res.status(200).json({
//         message: "Course fetched successfully",
//         course,
//       });
//     } catch (error) {
//       console.error("Error fetching course by ID:", error);
//       res.status(500).json({
//         message: "Failed to fetch course",
//         error: error.message,
//       });
//     }
//   });

  
// module.exports = router;



const express = require("express");
const Busboy = require("busboy");
const fs = require("fs");
const path = require("path");
const Degree = require("../models/Degree.model");
const { uploadFile } = require("../utils/fileUpload");
const { deleteTempFile } = require("../utils/tempUtils");

const router = express.Router();

// Utility function to save files to disk
const saveFile = (fileStream, fileName) => {
  const uploadPath = path.join(__dirname, "../uploads", fileName);
  const writeStream = fs.createWriteStream(uploadPath);
  fileStream.pipe(writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(uploadPath));
    writeStream.on("error", reject);
  });
};

// Route to create a new Degree with courses, lessons, and files
router.post("/", (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  const formFields = {};
  const lessonFiles = [];
  const degreeThumbnail = [];
  const courseThumbnails = [];

  // Parse incoming fields and files
  busboy.on("field", (fieldname, value) => {
    if (fieldname === "degreeData") {
      // Parsing the degree data (title, description, etc.)
      formFields.degreeData = JSON.parse(value);
    } else if (fieldname === "courses") {
      // Parsing courses data (nested courses)
      formFields.courses = JSON.parse(value);
    }
  });

  // Parse file uploads (lesson files, degree, and course thumbnails)
  busboy.on("file", (fieldname, file, filename) => {
    if (fieldname === "degreeThumbnail") {
      const savePath = path.basename(filename); // Save with original filename
      const filePromise = saveFile(file, savePath).then((filePath) => ({
        fieldname,
        filename,
        filePath,
      }));
      degreeThumbnail.push(filePromise);
    } else if (fieldname === "courseThumbnail") {
      const savePath = path.basename(filename); // Save with original filename
      const filePromise = saveFile(file, savePath).then((filePath) => ({
        fieldname,
        filename,
        filePath,
      }));
      courseThumbnails.push(filePromise);
    } else {
      // Save lesson files (audio/video/ppt/pdf, etc.)
      const savePath = path.basename(filename);
      const filePromise = saveFile(file, savePath).then((filePath) => ({
        fieldname,
        filename,
        filePath,
      }));
      lessonFiles.push(filePromise);
    }
  });

  // Once busboy finishes processing
  busboy.on("finish", async () => {
    try {
      // Wait for all file uploads to complete
      const uploadedDegreeThumbnail = await Promise.all(degreeThumbnail);
      const uploadedCourseThumbnails = await Promise.all(courseThumbnails);
      const uploadedLessonFiles = await Promise.all(lessonFiles);

      // Process Degree and Courses data with files
      const newDegree = new Degree({
        title: formFields.degreeData.title,
        description: formFields.degreeData.description,
        price: formFields.degreeData.price,
        thumbnail: uploadedDegreeThumbnail[0]?.filePath, // First uploaded degree thumbnail
        courses: formFields.courses.map((course, index) => ({
          title: course.title,
          description: course.description,
          thumbnail: uploadedCourseThumbnails[index]?.filePath, // Course thumbnails
          lessons: course.lessons.map((lesson, lessonIndex) => ({
            title: lesson.title,
            file: uploadedLessonFiles[lessonIndex]?.filePath, // Lesson files
            test: lesson.test,
          })),
        })),
      });

      // Save the degree to the database
      await newDegree.save();

      res.status(201).json({
        message: "Degree created successfully",
        degree: newDegree,
      });
    } catch (error) {
      console.error("Error creating degree:", error);
      res.status(500).json({
        message: "Failed to create degree",
        error: error.message,
      });
    }
  });

  // Pipe the incoming request to busboy
  req.pipe(busboy);
});

module.exports = router;
