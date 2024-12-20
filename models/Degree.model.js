const mongoose = require("mongoose");
const { Schema } = mongoose;

// Lesson Schema
const lessonSchema = new Schema({
  lessonId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  file: { type: String }, // URL for lesson file (video, PDF, etc.)
  test: {
    type: {
      type: String, // "MCQ" or "QuestionAnswer"
      required: true,
    },
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String }], // Options for MCQ
        correctAnswer: { type: String }, // Correct answer for MCQ
        answer: { type: String }, // Answer for QuestionAnswer type
      },
    ],
  },
}, { timestamps: true });

// Pre-save hook to generate lessonId
lessonSchema.pre('save', function(next) {
  if (!this.lessonId) {
    this.lessonId = `lesson-${Date.now()}`;
  }
  next();
});

// Chapter Schema
const chapterSchema = new Schema({
  chapterId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  lessons: [lessonSchema], // Array of lessons
}, { timestamps: true });

// Pre-save hook to generate chapterId
chapterSchema.pre('save', function(next) {
  if (!this.chapterId) {
    this.chapterId = `chapter-${Date.now()}`;
  }
  next();
});

// Course Schema
const courseSchema = new Schema({
  courseId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String }, // URL for course thumbnail
  test: {
    type: {
      type: String, // "MCQ" or "QuestionAnswer"
      required: true,
    },
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String }], // Options for MCQ
        correctAnswer: { type: String }, // Correct answer for MCQ
        answer: { type: String }, // Answer for QuestionAnswer type
      },
    ],
  },
  overviewPoints: [
    {
      title: { type: String },
      description: { type: String },
    },
  ],
  chapters: [chapterSchema], // Array of chapters
}, { timestamps: true });

// Pre-save hook to generate courseId
courseSchema.pre('save', function(next) {
  if (!this.courseId) {
    this.courseId = `course-${Date.now()}`;
  }
  next();
});

// Degree Schema
const degreeSchema = new Schema({
  degreeId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String }, // URL for degree thumbnail
  price: { type: Number, required: true },
  courses: [courseSchema], // Array of courses
}, { timestamps: true });

// Pre-save hook to generate degreeId
degreeSchema.pre('save', function(next) {
  if (!this.degreeId) {
    this.degreeId = `degree-${Date.now()}`;
  }
  next();
});

// Degree model
module.exports = mongoose.model("Degree", degreeSchema);
