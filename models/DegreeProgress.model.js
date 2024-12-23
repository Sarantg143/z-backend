const mongoose = require("mongoose");

// Lesson Progress Schema
const LessonProgressSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
  watched: { type: Boolean, default: false },
  watchedAt: { type: Date, default: null },
}, { _id: false });

// Chapter Progress Schema
const ChapterProgressSchema = new mongoose.Schema({
  chapterId: { type: mongoose.Schema.Types.ObjectId, required: true },
  lessons: [LessonProgressSchema],
}, { _id: false });

// Course Progress Schema
const CourseProgressSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
    chapters: [ChapterProgressSchema],
    watchedPercentage: { type: Number, default: 0 }, // This will store course-wise watched percentage
  }, { _id: false });

// Degree Progress Schema
const DegreeProgressSchema = new mongoose.Schema({
  degreeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courses:  [CourseProgressSchema],
  watchedPercentage: { type: Number, default: 0 },
}, { _id: false });

module.exports = DegreeProgressSchema;
