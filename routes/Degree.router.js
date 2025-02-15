
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


// Add a New Degree
router.post("/", async (req, res) => {
  try {
    const { title, description, thumbnail, price, courses } = req.body;

    const newDegree = new Degree({
      title,
      description,
      thumbnail,
      price,
      courses, 
    });

    const savedDegree = await newDegree.save();
    res.status(201).json({ message: "Degree added successfully", degree: savedDegree });
  } catch (error) {
    console.error("Error adding degree:", error);
    res.status(500).json({ message: "Failed to add degree", error: error.message });
  }
}); 

// Edit 
router.put("/:id", async (req, res) => {
  try {
    const degreeId = req.params.id;
    const updates = req.body;

    const updatedDegree = await Degree.findByIdAndUpdate(degreeId, updates, {
      new: true, 
      runValidators: true, 
    });

    if (!updatedDegree) {
      return res.status(404).json({ message: "Degree not found" });
    }

    res.status(200).json({ message: "Degree updated successfully", degree: updatedDegree });
  } catch (error) {
    console.error("Error updating degree:", error);
    res.status(500).json({ message: "Failed to update degree", error: error.message });
  }
});


router.post("/add", upload.fields([
  { name: "degreeThumbnail", maxCount: 1 }, 
  { name: "courseThumbnails" }, 
  { name: "lessonFiles" }, 
  { name: "subLessonFiles" }
]), async (req, res) => {
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
    const uploadedLessonFiles = req.files["lessonFiles"] || [];
    const uploadedSubLessonFiles = req.files["subLessonFiles"] || [];

    const courseThumbnailsUrls = await Promise.all(
      uploadedCourseThumbnails.map(async (file) => {
        const filePath = file.path;
        tempFiles.push(filePath);
        const fileName = file.originalname;
        return await uploadFile(filePath, fileName);
      })
    );

    const lessonFilesUrls = await Promise.all(
      uploadedLessonFiles.map(async (file) => {
        const filePath = file.path;
        tempFiles.push(filePath);
        const fileName = file.originalname;
        return await uploadFile2(filePath, fileName) || { url: null, type: null }; 
      })
    );

    const subLessonFilesUrls = await Promise.all(
      uploadedSubLessonFiles.map(async (file) => {
        const filePath = file.path;
        tempFiles.push(filePath);
        const fileName = file.originalname;
        return await uploadFile2(filePath, fileName) || { url: null, type: null }; 
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
        thumbnail: courseThumbnailsUrls[courseIndex] || null,
        test: course.test || [],
        overviewPoints: course.overviewPoints || [],
        chapters: course.chapters.map((chapter) => ({
          chapterId: new mongoose.Types.ObjectId(),
          title: chapter.title,
          description: chapter.description || null,
          test: chapter.test || [],
          lessons: chapter.lessons.map((lesson) => {
            const lessonFileMetadata = lessonFilesUrls[lessonIndex] || { url: null, type: null };
            lessonIndex++;
            return {
              lessonId: new mongoose.Types.ObjectId(),
              title: lesson.title || null,
              file: lessonFileMetadata.url,
              fileType: lessonFileMetadata.type,
              test: lesson.test || [],
              subLessons: (lesson.subLessons || []).map((subLesson) => {
                const subLessonFileMetadata = subLessonFilesUrls[subLessonIndex] || { url: null, type: null };
                subLessonIndex++;
                return {
                  subLessonId: new mongoose.Types.ObjectId(),
                  title: subLesson.title || null,
                  file: subLessonFileMetadata.url,
                  fileType: subLessonFileMetadata.type,
                  test: subLesson.test || [],
                };
              }),
            };
          }),
        })),
      })),
    });



    await newDegree.save();
    res.status(201).json({ message: "Degree created successfully", degree: newDegree });
  } catch (error) {
    console.error("Error adding degree:", error);
    res.status(500).json({ message: "Failed to create degree", error: error.message });
  } finally {
    await Promise.all(tempFiles.map(async (filePath) => {
      try {
        const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
        if (fileExists) {
          await fs.promises.unlink(filePath);
          console.log(`Temporary file deleted: ${filePath}`);
        }
      } catch (error) {
        console.error(`Failed to delete temp file: ${filePath}`, error);
      }
    }));
  }
});



router.put("/edit/:degreeId", upload.fields([
  { name: "degreeThumbnail", maxCount: 1 },
  { name: "courseThumbnails" },
  { name: "lessonFiles" },
  { name: "subLessonFiles" }
]), async (req, res) => {
  const tempFiles = [];

  try {
    const { degreeId } = req.params;
    const { title, description, price, courses, sublessonIndexes } = req.body;

    if (!courses) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedCourses = JSON.parse(courses);

    let parsedIndexes = [];
    try {
      parsedIndexes = JSON.parse(req.body.sublessonIndexes || "[]");
      console.log("Parsed Sublesson Indexes:", parsedIndexes);
    } catch (error) {
      console.error("Failed to parse sublessonIndexes:", error);
      return res.status(400).json({ message: "Invalid sublessonIndexes format" });
    }
  
    const degree = await Degree.findById(degreeId);
    if (!degree) {
      return res.status(404).json({ message: "Degree not found" });
    }
    const uploadedDegreeThumbnail = req.files["degreeThumbnail"]?.[0];
    let degreeThumbnailUrl = degree.thumbnail; 
    if (uploadedDegreeThumbnail) {
      const filePath = uploadedDegreeThumbnail.path;
      tempFiles.push(filePath);
      const fileName = uploadedDegreeThumbnail.originalname;
      degreeThumbnailUrl = await uploadFile(filePath, fileName);
    }

    const uploadedCourseThumbnails = req.files["courseThumbnails"] || [];
    const courseThumbnailsUrls = await Promise.all(
      uploadedCourseThumbnails.map(async (file, index) => {
        const filePath = file.path;
        tempFiles.push(filePath);
        const fileName = file.originalname;
        return await uploadFile(filePath, fileName) || degree.courses[index].thumbnail;  
      })
    );

    const uploadedLessonFiles = req.files["lessonFiles"] || [];
    const lessonFilesUrls = await Promise.all(
      uploadedLessonFiles.map(async (file, lessonIndex) => {
        const filePath = file.path;
        tempFiles.push(filePath);
        const fileName = file.originalname;
        return await uploadFile2(filePath, fileName) || degree.courses[lessonIndex]?.chapters[lessonIndex]?.lessons[lessonIndex]?.file;  // Retain old file if not provided
      })
    );

    const uploadedSubLessonFiles = req.files["subLessonFiles"] || [];
    const subLessonFilesUrls = []; 
    
    if (uploadedSubLessonFiles.length > 0 && parsedIndexes.length > 0) {
     
      await Promise.all(
        uploadedSubLessonFiles.map(async (file, index) => {
          const sublessonIndex = parsedIndexes[index]; 
          if (sublessonIndex !== undefined) {
            const filePath = file.path;
            tempFiles.push(filePath); 
            const fileName = file.originalname;
  
            const uploadResult = await uploadFile2(filePath, fileName);
            console.log(`File uploaded for sublesson ${sublessonIndex}:`, uploadResult);
    
            if (uploadResult && uploadResult.url) {
              subLessonFilesUrls[sublessonIndex] = uploadResult.url; 
            }
          }
        })
      );
    }
    
    console.log("Mapped SubLesson Files URLs:", subLessonFilesUrls);
    console.log("Parsed Indexes:", parsedIndexes);
    console.log("Uploaded Files:", uploadedSubLessonFiles.map(file => file.originalname));
    
    degree.title = title || degree.title; 
    degree.description = description || degree.description; 
    degree.price = price || degree.price;  
    degree.thumbnail = degreeThumbnailUrl;

    degree.courses = parsedCourses.map((course, courseIndex) => ({
      ...degree.courses[courseIndex],
      title: course.title || degree.courses[courseIndex].title,  
      description: course.description || degree.courses[courseIndex].description,  
      thumbnail: courseThumbnailsUrls[courseIndex] || degree.courses[courseIndex].thumbnail,
      test: course.test || degree.courses[courseIndex].test,
      overviewPoints: course.overviewPoints || degree.courses[courseIndex].overviewPoints,
      chapters: (course.chapters || []).map((chapter, chapterIndex) => ({
        ...degree.courses[courseIndex].chapters[chapterIndex],
        title: chapter.title || degree.courses[courseIndex].chapters[chapterIndex].title,  
        description: chapter.description || degree.courses[courseIndex].chapters[chapterIndex].description,
        test: chapter.test || degree.courses[courseIndex].chapters[chapterIndex].test,
        lessons: (chapter.lessons || []).map((lesson, lessonIndex) => ({
          ...degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex],
          title: lesson.title || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].title,  
          file: lessonFilesUrls[lessonIndex] || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].file, 
          fileType: lesson.fileType || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].fileType,
          test: lesson.test || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].test,
          subLessons: (lesson.subLessons || []).map((subLesson, subLessonIndex) => ({
            ...degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].subLessons[subLessonIndex],
            title: subLesson.title || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].subLessons[subLessonIndex].title,
            file: subLessonFilesUrls[subLessonIndex] || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].subLessons[subLessonIndex].file, // Use new file URL or retain the old one
            fileType: subLesson.fileType || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].subLessons[subLessonIndex].fileType,
            test: subLesson.test || degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].subLessons[subLessonIndex].test,
          }))
                   
        }))
      }))
    }));

    await degree.save();

    res.status(200).json({ message: "Degree updated successfully", degree });
  } catch (error) {
    console.error("Error updating degree:", error);
    res.status(500).json({ message: "Failed to update degree", error: error.message });
  } finally {
    await Promise.all(tempFiles.map(async (filePath) => {
      try {
        const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
        if (fileExists) {
          await fs.promises.unlink(filePath);
          console.log(`Temporary file deleted: ${filePath}`);
        }
      } catch (error) {
        console.error(`Failed to delete temp file: ${filePath}`, error);
      }
    }));
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

