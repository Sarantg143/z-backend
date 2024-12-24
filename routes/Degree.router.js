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



router.post("/", upload.fields([
  { name: 'degreeThumbnail', maxCount: 1 }, 
  { name: 'courseThumbnails', maxCount: 10 }, 
  { name: 'lessonFiles', maxCount: 10 }
]), async (req, res) => {
  const tempFiles = []; 
  try {
    const { title, description, price, courses } = req.body;

    if (!title || !description || !price || !courses) {
      return res.status(400).json({ message: "Missing required degree fields" });
    }

    const uploadedDegreeThumbnail = req.files['degreeThumbnail'];
    let uploadedDegreeThumbnailUrl = null;
    if (uploadedDegreeThumbnail && uploadedDegreeThumbnail.length > 0) {
      const filePath = uploadedDegreeThumbnail[0].path;
      const fileName = uploadedDegreeThumbnail[0].originalname;
      uploadedDegreeThumbnailUrl = await uploadFile(filePath, fileName);
      tempFiles.push(filePath); 
    }

    const uploadedCourseThumbnails = req.files['courseThumbnails'];
    const uploadedCourseThumbnailsUrls = uploadedCourseThumbnails
      ? await Promise.all(uploadedCourseThumbnails.map(async (file) => {
          const filePath = file.path;
          const fileName = file.originalname;
          tempFiles.push(filePath); 
          return await uploadFile(filePath, fileName);

        }))
      : [];

    const uploadedLessonFiles = req.files['lessonFiles'];
    const uploadedLessonFilesUrls = uploadedLessonFiles
      ? await Promise.all(uploadedLessonFiles.map(async (file) => {
          const filePath = file.path;
          const fileName = file.originalname;
          tempFiles.push(filePath); 
          return await uploadFile2(filePath, fileName);
        }))
      : [];

    const parsedCourses = JSON.parse(courses);

    const newDegree = new Degree({
      degreeId: new mongoose.Types.ObjectId(), 
      title,
      description,
      price,
      thumbnail: uploadedDegreeThumbnailUrl,
      courses: parsedCourses.map((course, index) => ({
        courseId: new mongoose.Types.ObjectId(),  
        title: course.title,
        description: course.description,
        thumbnail: uploadedCourseThumbnailsUrls[index] || null,
        test: course.test|| [],
        overviewPoints: course.overviewPoints || [],
        chapters: course.chapters.map((chapter, chapterIndex) => ({
          chapterId: new mongoose.Types.ObjectId(),  
          title: chapter.title,
          description: chapter.description,
          lessons: chapter.lessons.map((lesson, lessonIndex) => {
            const fileMetadata = uploadedLessonFilesUrls[lessonIndex] || {};
            return {
              lessonId: new mongoose.Types.ObjectId(),  
              title: lesson.title,
              file: fileMetadata.url || null,  
              fileType: fileMetadata.type || null,  
              test: lesson.test|| [],
            };
          }),
        })),
      })),
    });

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
  try {
    await Promise.all(
      tempFiles.map(async (filePath) => {
      
          const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
          if (fileExists) {
            await fs.unlink(filePath); 
            console.log(`Temporary file deleted: ${filePath}`);
          } else {
            console.warn(`Temp file not found for deletion: ${filePath}`);
          }
        } catch (error) {
          console.error(`Failed to delete temp file: ${filePath}`, error);
        }}));
      }});


router.put( "/:id", upload.fields([
          { name: "degreeThumbnail", maxCount: 1 },
          { name: "courseThumbnails", maxCount: 10 },
          { name: "lessonFiles", maxCount: 10 },
        ]),
        async (req, res) => {
          const tempFiles = []; 
          try {
            const { id } = req.params;
            const { title, description, price, courses } = req.body;
      
  
            if (!title || !description || !price || !courses) {
              return res.status(400).json({ message: "Missing required degree fields" });
            }
      
            
            const degree = await Degree.findById(id);
            if (!degree) {
              return res.status(404).json({ message: "Degree not found" });
            }
    
            const uploadedDegreeThumbnail = req.files["degreeThumbnail"];
            if (uploadedDegreeThumbnail && uploadedDegreeThumbnail.length > 0) {
              const filePath = uploadedDegreeThumbnail[0].path;
              const fileName = uploadedDegreeThumbnail[0].originalname;
              degree.thumbnail = await uploadFile(filePath, fileName);
              tempFiles.push(filePath); 
            }
      
            const uploadedCourseThumbnails = req.files["courseThumbnails"] || [];
            if (uploadedCourseThumbnails.length > 0) {
              const uploadedCourseThumbnailsUrls = await Promise.all(
                uploadedCourseThumbnails.map(async (file) => {
                  const filePath = file.path;
                  const fileName = file.originalname;
                  tempFiles.push(filePath); 
                  return await uploadFile(filePath, fileName);
                })
              );
              degree.courses.forEach((course, index) => {
                if (uploadedCourseThumbnailsUrls[index]) {
                  course.thumbnail = uploadedCourseThumbnailsUrls[index];
                }
              });
            }
      
            const uploadedLessonFiles = req.files["lessonFiles"] || [];
            if (uploadedLessonFiles.length > 0) {
              const uploadedLessonFilesUrls = await Promise.all(
                uploadedLessonFiles.map(async (file) => {
                  const filePath = file.path;
                  const fileName = file.originalname;
                  tempFiles.push(filePath); 
                  return await uploadFile2(filePath, fileName);
                })
              );
              degree.courses.forEach((course) => {
                course.chapters.forEach((chapter) => {
                  chapter.lessons.forEach((lesson, lessonIndex) => {
                    const fileMetadata = uploadedLessonFilesUrls[lessonIndex] || {};
                    lesson.file = fileMetadata.url || lesson.file;
                    lesson.fileType = fileMetadata.type || lesson.fileType;
                  });
                });
              });
            }
      
            
            degree.title = title || degree.title;
            degree.description = description || degree.description;
            degree.price = price || degree.price;
    
            const parsedCourses = JSON.parse(courses);
            degree.courses = parsedCourses.map((course, index) => ({
              ...degree.courses[index], 
              title: course.title || degree.courses[index].title,
              description: course.description || degree.courses[index].description,
              test: course.test || degree.courses[index].test,
              overviewPoints: course.overviewPoints || degree.courses[index].overviewPoints,
              chapters: course.chapters.map((chapter, chapterIndex) => ({
                ...degree.courses[index].chapters[chapterIndex],
                title: chapter.title || degree.courses[index].chapters[chapterIndex].title,
                description: chapter.description || degree.courses[index].chapters[chapterIndex].description,
                lessons: chapter.lessons.map((lesson, lessonIndex) => ({
                  ...degree.courses[index].chapters[chapterIndex].lessons[lessonIndex],
                  title: lesson.title || degree.courses[index].chapters[chapterIndex].lessons[lessonIndex].title,
                  test: lesson.test || degree.courses[index].chapters[chapterIndex].lessons[lessonIndex].test,
                })),
              })),
            }));
      
            await degree.save();
    
            res.status(200).json({
              message: "Degree updated successfully",
              degree,
            });
          } catch (error) {
            console.error("Error updating degree:", error);
            res.status(500).json({
              message: "Failed to update degree",
              error: error.message,
            });
          }finally {
                  try {
                await Promise.all(
                tempFiles.map(async (filePath) => {
              
                  const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
                  if (fileExists) {
                    await fs.unlink(filePath); 
                    console.log(`Temporary file deleted: ${filePath}`);
                  } else {
                    console.warn(`Temp file not found for deletion: ${filePath}`);
                  }
                } catch (error) {
                  console.error(`Failed to delete temp file: ${filePath}`, error);
                }
              })
            );
          }
        }
      );

      

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

  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const degree = await Degree.findById(id);
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }
  
      if (degree.thumbnail) {
        await deleteFileFromStorage(degree.thumbnail); 
      }
  
      for (const course of degree.courses) {
        if (course.thumbnail) {
          await deleteFileFromStorage(course.thumbnail);
        }
  
        for (const chapter of course.chapters) {
          for (const lesson of chapter.lessons) {
            if (lesson.file) {
              await deleteFileFromStorage(lesson.file);
            }
          }
        }
      }
  
      await Degree.findByIdAndDelete(id);
  
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
