
const mongoose = require("mongoose");
const express = require("express");
const Degree = require("../models/Degree.model");
const { uploadFile , uploadFile2, deleteFileFromStorage } = require("../utils/fileUpload"); // Helper
const { deleteTempFile } = require("../utils/tempUtils");  
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

const upload = multer({dest: path.join(__dirname, "../temp"), 
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

router.post(
  "/",
  upload.fields([
    { name: "degreeThumbnail", maxCount: 1 },
    { name: "courseThumbnails" },
    { name: "lessonFiles" },
    { name: "subLessonFiles" },
  ]),
  async (req, res) => {
    const tempFiles = [];
    try {
      const { title, description, price, courses } = req.body;

      if (!title || !description || !price || !courses) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let parsedCourses;
      try {
        parsedCourses = JSON.parse(courses);
      } catch (error) {
        return res.status(400).json({ message: "Invalid courses format" });
      }

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
          if (!file) return { url: null, type: null }; 
          const filePath = file.path;
          tempFiles.push(filePath);
          const fileName = file.originalname;
          return (await uploadFile(filePath, fileName)) || { url: null, type: null };
        })
      );

      const uploadedLessonFiles = req.files["lessonFiles"] || [];
      const lessonFilesUrls = await Promise.all(
        uploadedLessonFiles.map(async (file) => {
          if (!file) return { url: null, type: null };  // Safeguard against undefined
          const filePath = file.path;
          tempFiles.push(filePath);
          const fileName = file.originalname;
          return (await uploadFile2(filePath, fileName)) || { url: null, type: null };
        })
      );


      const uploadedSubLessonFiles = req.files["subLessonFiles"] || [];
      const subLessonFilesUrls = await Promise.all(
        uploadedSubLessonFiles.map(async (file) => {
          if (!file) return { url: null, type: null }; 
          const filePath = file.path;
          tempFiles.push(filePath);
          const fileName = file.originalname;
          return (await uploadFile2(filePath, fileName)) || { url: null, type: null };
        })
      );

      let lessonIndex = 0;
      let subLessonIndex = 0;

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
          thumbnail: courseThumbnailsUrls[courseIndex]?.url || null,
          test: course.test || [],
          overviewPoints: course.overviewPoints || [],
          chapters: course.chapters.map((chapter) => ({
            chapterId: new mongoose.Types.ObjectId(),
            title: chapter.title,
            description: chapter.description || null,
            test: chapter.test || [],
            lessons: chapter.lessons.map((lesson) => {
              const fileMetadata = lessonFilesUrls[lessonIndex] || { url: null, type: null };
              lessonIndex++;
              return {
                lessonId: new mongoose.Types.ObjectId(),
                title: lesson.title || null,
                file: fileMetadata.url,
                fileType: fileMetadata.type,
                test: lesson.test || null,
                subLessons: Array.isArray(lesson.subLessons)
                  ? lesson.subLessons.map((subLesson) => {
                      const subLessonFileMetadata = subLessonFilesUrls[subLessonIndex] || { url: null, type: null };
                      subLessonIndex++;
                      return {
                        subLessonId: new mongoose.Types.ObjectId(),
                        title: subLesson.title || null,
                        file: subLessonFileMetadata.url,
                        fileType: subLessonFileMetadata.type,
                        test: subLesson.test || null,
                      };
                    })
                  : [],
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
      await Promise.all(
        tempFiles.map(async (filePath) => {
          try {
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
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
  { name: "subLessonFiles" },
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

    const uploadedSubLessonFiles = req.files["subLessonFiles"] || [];
    const subLessonFilesUrls = await Promise.all(
      uploadedSubLessonFiles.map(async (file) => {
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
              subLessons: lesson.subLessons.map((subLesson, subLessonIndex) => {
                const subLessonFileMetadata = subLessonFilesUrls[subLessonIndex] || {};
                return {
                  subLessonId: new mongoose.Types.ObjectId(),
                  title: subLesson.title || null,
                  file: subLessonFileMetadata.url || null,
                  fileType: subLessonFileMetadata.type || null,
                  duration: subLesson.duration || null,
                  test: subLesson.test || null,
                };
              }),
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
  
            for (const subLesson of lesson.subLessons) {
              if (subLesson.file) {
                try {
                  await deleteFileFromStorage(subLesson.file);
                } catch (error) {
                  console.error(`Failed to delete sublesson file: ${subLesson.file}`, error);
                }
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

