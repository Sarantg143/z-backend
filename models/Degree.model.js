const mongoose = require("mongoose");
const { Schema } = mongoose;

// Lesson Schema
const lessonSchema = new Schema(
  {
    // lessonId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    lessonId: { type: mongoose.Schema.Types.ObjectId },
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
  },
  { timestamps: true }
);

// Chapter Schema
const chapterSchema = new Schema(
  {
    chapterId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true },
    description: { type: String },
    lessons: [lessonSchema], // Array of lessons
  },
  { timestamps: true }
);

// Course Schema
const courseSchema = new Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId },
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
  },
  { timestamps: true }
);

// Degree Schema
const degreeSchema = new Schema(
  {
    degreeId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String }, 
    price: { type: Number, required: true },
    courses: [courseSchema], 
  },
  { timestamps: true }
);


module.exports = mongoose.model("Degree", degreeSchema);
