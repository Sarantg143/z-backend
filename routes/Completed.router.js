const express = require("express");
const mongoose = require("mongoose");
const Completed = require("../models/completed.model");
const Degree = require("../models/Degree.model");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, degreeId, lessonId } = req.body;

    if (!userId || !degreeId || !lessonId) {
      return res.status(400).json({ message: "Missing required fields (userId, degreeId, lessonId)" });
    }

    // Find or create the user's degree completion data
    let completedDegree = await Completed.findOne({ userId, degreeId });

    if (!completedDegree) {
      completedDegree = new Completed({
        userId,
        degreeId,
        courses: [],
      });
    }

    // Find the degree structure to get its courses, chapters, and lessons
    const degree = await Degree.findById(degreeId);
    if (!degree) {
      return res.status(404).json({ message: "Degree not found" });
    }

    let lessonAdded = false;

    // Iterate through courses in the degree
    for (const course of degree.courses) {
      let completedCourse = completedDegree.courses.find(
        (c) => c.courseId.toString() === course._id.toString()
      );

      if (!completedCourse) {
        completedCourse = {
          courseId: course._id,
          chapters: [],
        };
        completedDegree.courses.push(completedCourse);
      }

      // Iterate through chapters in the course
      for (const chapter of course.chapters) {
        let completedChapter = completedCourse.chapters.find(
          (ch) => ch.chapterId.toString() === chapter._id.toString()
        );

        if (!completedChapter) {
          completedChapter = {
            chapterId: chapter._id,
            lessons: [],
          };
          completedCourse.chapters.push(completedChapter);
        }

        // Check if the lesson belongs to this chapter
        const lesson = chapter.lessons.find(
          (l) => l._id.toString() === lessonId
        );

        if (lesson) {
          const lessonAlreadyCompleted = completedChapter.lessons.some(
            (l) => l.lessonId.toString() === lessonId
          );

          if (!lessonAlreadyCompleted) {
            completedChapter.lessons.push({ lessonId, completedAt: new Date() });
            lessonAdded = true;
          }

          // Check if all lessons in the chapter are completed
          if (
            completedChapter.lessons.length === chapter.lessons.length &&
            !completedChapter.completedAt
          ) {
            completedChapter.completedAt = new Date();
          }
        }
      }

      // Check if all chapters in the course are completed
      if (
        completedCourse.chapters.length === course.chapters.length &&
        completedCourse.chapters.every((ch) => ch.completedAt) &&
        !completedCourse.completedAt
      ) {
        completedCourse.completedAt = new Date();
      }
    }

    // Check if all courses in the degree are completed
    if (
      completedDegree.courses.length === degree.courses.length &&
      completedDegree.courses.every((c) => c.completedAt) &&
      !completedDegree.completedAt
    ) {
      completedDegree.completedAt = new Date();
    }

    // Calculate completion percentages
    const totalCourses = degree.courses.length;

    // Calculate course-wise and degree-wise percentages
    completedDegree.courses.forEach((completedCourse) => {
      const course = degree.courses.find(
        (c) => c._id.toString() === completedCourse.courseId.toString()
      );

      const totalChapters = course.chapters.length;
      const completedChapters = completedCourse.chapters.filter(
        (ch) => ch.completedAt
      ).length;

      completedCourse.completionPercentage = Math.round(
        (completedChapters / totalChapters) * 100
      );
    });

    const completedCourses = completedDegree.courses.filter(
      (c) => c.completedAt
    ).length;

    completedDegree.completionPercentage = Math.round(
      (completedCourses / totalCourses) * 100
    );

    // Save only if a new lesson was added
    if (lessonAdded) {
      await completedDegree.save();
    }

    // Format the response
    const response = {
      completionPercentage: completedDegree.completionPercentage,
      courses: completedDegree.courses.map((completedCourse) => {
        const course = degree.courses.find(
          (c) => c._id.toString() === completedCourse.courseId.toString()
        );

        return {
          courseId: completedCourse.courseId,
          completionPercentage: completedCourse.completionPercentage,
          chapters: completedCourse.chapters.map((completedChapter) => {
            const chapter = course.chapters.find(
              (ch) => ch._id.toString() === completedChapter.chapterId.toString()
            );

            return {
              chapterId: completedChapter.chapterId,
              completedAt: completedChapter.completedAt || null,
              lessons: completedChapter.lessons.map((lesson) => ({
                lessonId: lesson.lessonId,
                completedAt: lesson.completedAt,
              })),
            };
          }),
        };
      }),
    };

    res.status(200).json({
      message: "Completion data saved successfully",
      completedDegree: response,
    });
  } catch (error) {
    console.error("Error saving completion data:", error);
    res.status(500).json({
      message: "Failed to save completion data",
      error: error.message,
    });
  }
});

module.exports = router;



module.exports = router;
