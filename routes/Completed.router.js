const express = require("express");
const router = express.Router();
const Completed = require("../models/Completed.model");
const Degree = require("../models/Degree.model");
const User = require("../models/User.model");


router.post("/", async (req, res) => {
  try {
    const { userId, degreeId, courseId, chapterId, lessonId } = req.body;

    let completed = await Completed.findOne({ userId, degreeId });

    if (!completed) {
      completed = new Completed({
        userId,
        degreeId,
        courses: [],
      });
    }

    let course = completed.courses.find(c => c.courseId.toString() === courseId);
    if (!course) {
      course = {
        courseId,
        chapters: [],
      };
      completed.courses.push(course);
    }

    let chapter = course.chapters.find(ch => ch.chapterId.toString() === chapterId);
    if (!chapter) {
      chapter = {
        chapterId,
        lessons: [],
      };
      course.chapters.push(chapter);
    }

    const lessonCompleted = chapter.lessons.some(l => l.lessonId.toString() === lessonId);
    if (lessonCompleted) {
      return res.status(400).json({ message: "Lesson already completed" });
    }

    chapter.lessons.push({ lessonId });

    await completed.save();

    const degree = await Degree.findById(degreeId);
    if (!degree) {
      return res.status(404).json({ message: "Degree not found" });
    }

    let totalLessons = 0;
    let completedLessons = 0;
    degree.courses.forEach(course => {
      course.chapters.forEach(chapter => {
        totalLessons += chapter.lessons.length;
        chapter.lessons.forEach(lesson => {

          const courseInCompleted = completed.courses.find(c => c.courseId.toString() === course._id.toString());
          const chapterInCompleted = courseInCompleted?.chapters.find(ch => ch.chapterId.toString() === chapter._id.toString());
          if (chapterInCompleted?.lessons.some(l => l.lessonId.toString() === lesson._id.toString())) {
            completedLessons++;
          }
        });
      });
    });


    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const degreeIndex = user.degrees.findIndex(degree => degree.degreeId.toString() === degreeId);
    if (degreeIndex === -1) {
      user.degrees.push({
        degreeId,
        title: degree.title,
        completionPercentage: percentage,
      });
    } else {
      user.degrees[degreeIndex].completionPercentage = percentage;
    }

    await user.save();

    res.status(200).json({
      message: "Lesson marked as completed, and degree progress updated",
      completionPercentage: percentage,
    });
  } catch (error) {
    console.error("Error completing lesson:", error);
    res.status(500).json({
      message: "Failed to mark lesson as completed",
      error: error.message,
    });
  }
});


router.get("/", async (req, res) => {
    try {
      const { userId, degreeId } = req.query;
  
      if (!userId || !degreeId) {
        return res.status(400).json({ message: "User ID and Degree ID are required" });
      }
  
      const completed = await Completed.findOne({ userId, degreeId });
  
      if (!completed) {
        return res.status(404).json({ message: "Degree completion data not found for this user" });
      }
  
      const degree = await Degree.findById(degreeId);
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }
  
      let totalLessons = 0;
      let completedLessons = 0;
  
      
      degree.courses.forEach(course => {
        course.chapters.forEach(chapter => {
          totalLessons += chapter.lessons.length;
          chapter.lessons.forEach(lesson => {
            const courseInCompleted = completed.courses.find(c => c.courseId.toString() === course._id.toString());
            const chapterInCompleted = courseInCompleted?.chapters.find(ch => ch.chapterId.toString() === chapter._id.toString());
            if (chapterInCompleted?.lessons.some(l => l.lessonId.toString() === lesson._id.toString())) {
              completedLessons++;
            }
          });
        });
      });
  
      const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
      res.status(200).json({
        degreeId: degree._id,
        degreeTitle: degree.title,
        totalLessons,
        completedLessons,
        completionPercentage,
      });
    } catch (error) {
      console.error("Error fetching degree progress:", error);
      res.status(500).json({
        message: "Failed to fetch degree progress",
        error: error.message,
      });
    }
  });

module.exports = router;
