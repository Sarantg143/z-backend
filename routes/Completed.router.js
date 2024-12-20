const express = require("express");
const router = express.Router();
const Completed = require("../models/Completed.model");

router.post("/complete-lesson", async (req, res) => {
  try {
    const { userId, degreeId, courses } = req.body;

   
    let completed = await Completed.findOne({ userId, degreeId });

    if (!completed) {
    
      completed = new Completed({
        userId,
        degreeId,
        courses: []
      });
    }
    courses.forEach(({ courseId, chapters }) => {
      let course = completed.courses.find(c => c.courseId.toString() === courseId);

      if (!course) {
        course = { courseId, chapters: [] };
        completed.courses.push(course);
      }

      chapters.forEach(({ chapterId, lessons }) => {
        let chapter = course.chapters.find(c => c.chapterId.toString() === chapterId);

        if (!chapter) {
          chapter = { chapterId, lessons: [] };
          course.chapters.push(chapter);
        }

        lessons.forEach(lessonId => {

          if (!chapter.lessons.some(l => l.lessonId.toString() === lessonId)) {
           
            chapter.lessons.push({ lessonId });
          }
        });
      });
    });

    
    await completed.save();

    res.status(200).json({
      message: "Lessons marked as completed",
      completed
    });
  } catch (error) {
    console.error("Error marking lessons as completed:", error);
    res.status(500).json({
      message: "Failed to mark lessons as completed",
      error: error.message
    });
  }
});

module.exports = router;
