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

      const courseInDegree = degree.courses.find(c => c._id.toString() === courseId);
      if (!courseInDegree) {
        return res.status(404).json({ message: "Course not found in degree" });
      }
  
      const totalLessonsInDegree = degree.courses.reduce((sum, course) => {
        return sum + course.chapters.reduce((chapterSum, chapter) => {
          return chapterSum + chapter.lessons.length;
        }, 0);
      }, 0);
  
      let completedLessonsInDegree = 0;
  
      degree.courses.forEach(degreeCourse => {
        degreeCourse.chapters.forEach(chapter => {
          const courseInCompleted = completed.courses.find(c => c.courseId.toString() === degreeCourse._id.toString());
          const chapterInCompleted = courseInCompleted?.chapters.find(ch => ch.chapterId.toString() === chapter._id.toString());
          if (chapterInCompleted) {
            completedLessonsInDegree += chapterInCompleted.lessons.length;
          }
        });
      });
  
      completedLessonsInDegree++;
  
      const degreeCompletionPercentage = totalLessonsInDegree > 0
        ? Math.round((completedLessonsInDegree / totalLessonsInDegree) * 100)
        : 0;
  
      const totalLessonsInCourse = courseInDegree.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  
      let completedLessonsInCourse = 0;
      courseInDegree.chapters.forEach(chapter => {
        const chapterInCompleted = course.chapters.find(ch => ch.chapterId.toString() === chapter._id.toString());
        if (chapterInCompleted) {
          completedLessonsInCourse += chapterInCompleted.lessons.length;
        }
      });
  
      completedLessonsInCourse++;
  
      const courseCompletionPercentage = totalLessonsInCourse > 0
        ? Math.round((completedLessonsInCourse / totalLessonsInCourse) * 100)
        : 0;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const degreeInUser = user.degrees.find(degree => degree.degreeId.toString() === degreeId);
      if (!degreeInUser) {
        user.degrees.push({
          degreeId,
          title: degree.title,
          completionPercentage: degreeCompletionPercentage,
          courses: [{
            courseId,
            title: courseInDegree.title,
            completionPercentage: courseCompletionPercentage,
          }],
        });
      } else {
        degreeInUser.completionPercentage = degreeCompletionPercentage;
  
        let courseInUserDegree = degreeInUser.courses.find(course => course.courseId.toString() === courseId);
        if (!courseInUserDegree) {
          degreeInUser.courses.push({
            courseId,
            title: courseInDegree.title,
            completionPercentage: courseCompletionPercentage,
          });
        } else {
          courseInUserDegree.completionPercentage = courseCompletionPercentage;
        }
      }
  
      await user.save();
  
      res.status(200).json({
        message: "Lesson marked as completed, and progress updated",
        degreeCompletionPercentage,
        courseCompletionPercentage,
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

  router.get("/:userId/:degreeId", async (req, res) => {
    try {
      const { userId, degreeId } = req.params; 
  
      const completed = await Completed.findOne({ userId, degreeId });
      if (!completed) {
        return res.status(404).json({ message: "Completion data not found for this user" });
      }
  
      const degree = await Degree.findById(degreeId);
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }
  
      let totalLessons = 0;
      let completedLessons = 0;
  
      degree.courses.forEach((course) => {
        course.chapters.forEach((chapter) => {
          totalLessons += chapter.lessons.length;
  
          chapter.lessons.forEach((lesson) => {
            const courseInCompleted = completed.courses.find(
              (c) => c.courseId.toString() === course._id.toString()
            );
            const chapterInCompleted = courseInCompleted?.chapters.find(
              (ch) => ch.chapterId.toString() === chapter._id.toString()
            );
  
            if (
              chapterInCompleted?.lessons.some(
                (l) => l.lessonId.toString() === lesson._id.toString()
              )
            ) {
              completedLessons++;
            }
          });
        });
      });
  
      const completionPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
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


  router.get("/:userId/:courseId", async (req, res) => {
    try {
      const { userId, courseId } = req.params;
  
      const courseIdObject = mongoose.Types.ObjectId(courseId);

      const completed = await Completed.findOne({ userId });
      if (!completed) {
        return res.status(404).json({ message: "Completion data not found for this user" });
      }
 
      const course = completed.courses.find(c => c.courseId.toString() === courseIdObject.toString());
      if (!course) {
        return res.status(404).json({ message: "Course not found in user's completed data" });
      }
  
      const degree = await Degree.findOne({ "courses._id": courseIdObject });
      if (!degree) {
        return res.status(404).json({ message: "Degree not found" });
      }

      const courseDetails = degree.courses.find(c => c._id.toString() === courseIdObject.toString());
      if (!courseDetails) {
        return res.status(404).json({ message: "Course not found in degree" });
      }
 
      let totalLessons = 0;
      let completedLessons = 0;
  
      courseDetails.chapters.forEach(chapter => {
        totalLessons += chapter.lessons.length;
  
        chapter.lessons.forEach(lesson => {
          const chapterInCompleted = course.chapters.find(ch => ch.chapterId.toString() === chapter._id.toString());
  
          if (chapterInCompleted?.lessons.some(l => l.lessonId.toString() === lesson._id.toString())) {
            completedLessons++;
          }
        });
      });
  
      const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
      res.status(200).json({
        courseId: course._id,
        courseTitle: courseDetails.title,
        totalLessons,
        completedLessons,
        completionPercentage,
      });
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({
        message: "Failed to fetch course progress",
        error: error.message,
      });
    }
  });
  

module.exports = router;
