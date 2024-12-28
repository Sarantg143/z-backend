// // const express = require("express");
// // const Degree = require("../models/Degree.model");
// // const { uploadFile } = require("../utils/fileUpload");
// // const { deleteTempFile } = require("../utils/tempUtils");
// // const multer = require("multer");
// // const path = require("path");

// // const router = express.Router();
// // const upload = multer({ dest: path.join(__dirname, "../temp") });



// // router.post("/", async (req, res) => {
// //   try {
    
// //     const { title, description, thumbnail, price, courses } = req.body;

// //     const newDegree = new Degree({
// //       title,
// //       description,
// //       thumbnail,
// //       price,
// //       courses, 
// //     });

// //     await newDegree.save();

// //     res.status(201).json({
// //       message: "Degree created successfully",
// //       degree: newDegree,
// //     });
// //   } catch (error) {
// //     console.error("Error adding degree:", error);
// //     res.status(500).json({
// //       message: "Failed to create degree",
// //       error: error.message,
// //     });
// //   }
// // });


// // router.get('/', async (req, res) => {
// //     try {
// //       const degrees = await Degree.find();
// //       res.status(200).json({
// //         message: "All degrees fetched successfully",
// //         degrees,
// //       });
// //     } catch (error) {
// //       console.error("Error fetching degrees:", error);
// //       res.status(500).json({
// //         message: "Failed to fetch degrees",
// //         error: error.message,
// //       });
// //     }
// //   });
  
  
// //   router.get('/:degreeId', async (req, res) => {
// //     try {
// //       const { degreeId } = req.params;
  
// //       const degree = await Degree.findById(degreeId);
  
// //       if (!degree) {
// //         return res.status(404).json({ message: "Degree not found" });
// //       }
  
// //       res.status(200).json({
// //         message: "Degree fetched successfully",
// //         degree,
// //       });
// //     } catch (error) {
// //       console.error("Error fetching degree by ID:", error);
// //       res.status(500).json({
// //         message: "Failed to fetch degree",
// //         error: error.message,
// //       });
// //     }
// //   });
  

// //   router.get('/:degreeId/:courseId', async (req, res) => {
// //     try {
// //       const { degreeId, courseId } = req.params;
  
// //       const degree = await Degree.findById(degreeId);
  
// //       if (!degree) {
// //         return res.status(404).json({ message: "Degree not found" });
// //       }
// //       const course = degree.courses.find(c => c._id.toString() === courseId);
  
// //       if (!course) {
// //         return res.status(404).json({ message: "Course not found in this degree" });
// //       }
  
// //       res.status(200).json({
// //         message: "Course fetched successfully",
// //         course,
// //       });
// //     } catch (error) {
// //       console.error("Error fetching course by ID:", error);
// //       res.status(500).json({
// //         message: "Failed to fetch course",
// //         error: error.message,
// //       });
// //     }
// //   });

  
// // module.exports = router;



const mongoose = require("mongoose");
const express = require("express");
const Degree = require("../models/Degree.model");
const { uploadFile , uploadFile2, deleteFileFromStorage } = require("../utils/fileUpload"); // Helper function to handle file upload
const { deleteTempFile } = require("../utils/tempUtils");  
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

const getFileType = (fileName) => {
  const extension = fileName.split(".").pop().toLowerCase();
  if (["mp3", "wav"].includes(extension)) return "audio";
  if (["mp4", "avi", "mkv"].includes(extension)) return "video";
  if (["pdf", "docx", "txt"].includes(extension)) return "document";
  if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
  return "unknown"; 
};

const upload = multer({dest: path.join(__dirname, "../temp"), 
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

router.post("/",upload.fields([
    { name: "degreeThumbnail", maxCount: 1 }, 
    { name: "courseThumbnails" }, 
    { name: "lessonFiles" }, 
  ]),
  async (req, res) => {
    const tempFiles = []; 

    try {
      const { title, description, price, courses } = req.body;

      if (!title || !description || !price || !courses) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const parsedCourses = JSON.parse(courses);

      const uploadedDegreeThumbnail = req.files["degreeThumbnail"]?.[0];
      let degreeThumbnailUrl = null;

      if (uploadedDegreeThumbnail) {
        const filePath = uploadedDegreeThumbnail.path;
        tempFiles.push(filePath); 
        const fileName = uploadedDegreeThumbnail.originalname;
        degreeThumbnailUrl = await uploadFile(filePath, fileName);
      }

      const uploadedCourseThumbnails = req.files["courseThumbnails"] || [];
      const courseThumbnailsUrls = await Promise.all(
        uploadedCourseThumbnails.map(async (file) => {
          const filePath = file.path;
          tempFiles.push(filePath); 
          const fileName = file.originalname;
          return await uploadFile(filePath, fileName);
        })
      );

      const uploadedLessonFiles = req.files["lessonFiles"] || [];
      const lessonFilesUrls = await Promise.all(
        uploadedLessonFiles.map(async (file) => {
          const filePath = file.path;
          tempFiles.push(filePath); 
          const fileName = file.originalname;
          return await uploadFile2(filePath, fileName); 
        })
      );
      let globalLessonIndex = 0;
      const newDegree = new Degree({
        degreeId: new mongoose.Types.ObjectId(),
        title,
        description,
        price,
        thumbnail: degreeThumbnailUrl,
        courses: parsedCourses.map((course, courseIndex) => ({
          courseId: new mongoose.Types.ObjectId(),
          title: course.title,
          description: course.description,
          thumbnail: courseThumbnailsUrls[courseIndex] || null,
          test: course.test || [],
          overviewPoints: course.overviewPoints || [],
          chapters: course.chapters.map((chapter) => ({
            chapterId: new mongoose.Types.ObjectId(),
            title: chapter.title,
            description: chapter.description,
            lessons: chapter.lessons.map((lesson) => {
              const fileMetadata = lessonFilesUrls[globalLessonIndex] || {}; // Fetch file by global index
              globalLessonIndex++;
              return {
                lessonId: new mongoose.Types.ObjectId(),
                title: lesson.title,
                file: fileMetadata.url || null,
                fileType: fileMetadata.type || null, // Optional file type
                test: lesson.test || [],
              };
            }),
          })),
        })),
      });

      // Save Degree to Database
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
    } finally {
    
      await Promise.all(
        tempFiles.map(async (filePath) => {
          try {
            const fileExists = await fs
              .access(filePath)
              .then(() => true)
              .catch(() => false);
            if (fileExists) {
              await fs.unlink(filePath);
              console.log(`Temporary file deleted: ${filePath}`);
            }
          } catch (error) {
            console.error(`Failed to delete temp file: ${filePath}`, error);
          }
        })
      );
    }
  }
);

router.put("/:degreeId", upload.fields([
  { name: "degreeThumbnail", maxCount: 1 }, 
  { name: "courseThumbnails" },             
  { name: "lessonFiles" },                 
]),
async (req, res) => {
  const tempFiles = []; 
  try {
    const { degreeId } = req.params;
    const { title, description, price, courses } = req.body;

    if (!title || !description || !price || !courses) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingDegree = await Degree.findById(degreeId);
    if (!existingDegree) {
      return res.status(404).json({ message: "Degree not found" });
    }

    const uploadedDegreeThumbnail = req.files["degreeThumbnail"]?.[0];
    let degreeThumbnailUrl = existingDegree.thumbnail; 

    if (uploadedDegreeThumbnail) {
      const filePath = uploadedDegreeThumbnail.path;
      tempFiles.push(filePath); 
      const fileName = uploadedDegreeThumbnail.originalname;

      degreeThumbnailUrl = await uploadFile(filePath, fileName);
      if (existingDegree.thumbnail) {
        await deleteFileFromStorage(existingDegree.thumbnail); 
      }
    }

    const uploadedCourseThumbnails = req.files["courseThumbnails"] || [];
    const courseThumbnailsUrls = await Promise.all(
      uploadedCourseThumbnails.map(async (file) => {
        const filePath = file.path;
        tempFiles.push(filePath); 
        const fileName = file.originalname;
        return await uploadFile(filePath, fileName);
      })
    );

    const uploadedLessonFiles = req.files["lessonFiles"] || [];
    const lessonFilesUrls = await Promise.all(
      uploadedLessonFiles.map(async (file) => {
        const filePath = file.path;
        tempFiles.push(filePath); 
        const fileName = file.originalname;
        return await uploadFile2(filePath, fileName);
      })
    );

    existingDegree.title = title || existingDegree.title;
    existingDegree.description = description || existingDegree.description;
    existingDegree.price = price || existingDegree.price;

    if (courses) {
      const parsedCourses = JSON.parse(courses);
      existingDegree.courses = parsedCourses.map((course, courseIndex) => ({
        courseId: existingDegree.courses[courseIndex]?.courseId || new mongoose.Types.ObjectId(),
        title: course.title,
        description: course.description,
        thumbnail: courseThumbnailsUrls[courseIndex] || existingDegree.courses[courseIndex]?.thumbnail || null,
        test: course.test || [],
        overviewPoints: course.overviewPoints || [],
        chapters: course.chapters.map((chapter) => ({
          chapterId: new mongoose.Types.ObjectId(),
          title: chapter.title,
          description: chapter.description,
          lessons: chapter.lessons.map((lesson, lessonIndex) => {
            const fileMetadata = lessonFilesUrls[lessonIndex] || {};
            return {
              lessonId: new mongoose.Types.ObjectId(),
              title: lesson.title,
              file: fileMetadata.url || null, 
              fileType: fileMetadata.type || null,
              test: lesson.test || [],
            };
          }),
        })),
      }));
    }

    await existingDegree.save();

    res.status(200).json({
      message: "Degree updated successfully",
      degree: existingDegree,
    });
  } catch (error) {
    console.error("Error updating degree:", error);
    res.status(500).json({
      message: "Failed to update degree",
      error: error.message,
    });
  } finally {
    
    await Promise.all(
      tempFiles.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
          console.log(`Temporary file deleted: ${filePath}`);
        } catch (error) {
          console.error(`Failed to delete temp file: ${filePath}`, error);
        }
      })
    );
  }
});


router.get('/', async (req, res) => {
    try {
      const degrees = await Degree.find();
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
  
  
  router.get('/:degreeId', async (req, res) => {
    try {
      const { degreeId } = req.params;
  
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
  

  router.get('/:degreeId/:courseId', async (req, res) => {
    try {
      const { degreeId, courseId } = req.params;
  
      const degree = await Degree.findById(degreeId);
  
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }
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

  router.delete("/:degreeId", async (req, res) => {
    try {
      const { degreeId } = req.params;
      const degree = await Degree.findById(degreeId);
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }
      if (degree.thumbnail) {
        try {
          await deleteFileFromStorage(degree.thumbnail);
        } catch (error) {
          console.error(`Failed to delete degree thumbnail: ${degree.thumbnail}`, error);
        }
      }

      for (const course of degree.courses) {
        if (course.thumbnail) {
          try {
            await deleteFileFromStorage(course.thumbnail);
          } catch (error) {
            console.error(`Failed to delete course thumbnail: ${course.thumbnail}`, error);
          }
        }
  
        for (const chapter of course.chapters) {
          for (const lesson of chapter.lessons) {
            if (lesson.file) {
              try {
                await deleteFileFromStorage(lesson.file);
              } catch (error) {
                console.error(`Failed to delete lesson file: ${lesson.file}`, error);
              }
            }
          }
        }
      }
  
      // Delete degree from database
      await Degree.findByIdAndDelete(degreeId);
  
      res.status(200).json({ message: "Degree deleted successfully" });
    } catch (error) {
      console.error("Error deleting degree:", error);
      res.status(500).json({
        message: "Failed to delete degree",
        error: error.message,
      });
    }
  });
  


module.exports = router;

