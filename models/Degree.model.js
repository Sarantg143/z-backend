const mongoose = require("mongoose");
const { Schema } = mongoose;

// Lesson Schema
const lessonSchema = new Schema(
  {
    // lessonId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    lessonId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    title: { type: String, required: true },
    file: { 
      type: String, 
      required: false, },
    fileType: { type: String },
    duration: { 
      type: Number, 
      required: false, },
    test: {
      type: {
        type: String, // "MCQ" or "QuestionAnswer"
        required: true,
      },
      questions: [
        {
          question: { type: String, required: true },
          options: [{ type: String }],
          correctAnswer: { type: String },
          answer: { type: String }, 
        },
      ],
    },
  },
  { timestamps: true }
);

// Chapter Schema
const chapterSchema = new Schema(
  {
    chapterId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    title: { type: String, required: true },
    description: { type: String },
    lessons: [lessonSchema], // Array of lessons
  },
  { timestamps: true }
);

// Course Schema
const courseSchema = new Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
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
          options: [{ type: String }], 
          correctAnswer: { type: String }, 
          answer: { type: String }, 
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
    degreeId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String }, 
    price: { type: Number, required: true },
    courses: [courseSchema], 
  },
  { timestamps: true }
);


module.exports = mongoose.model("Degree", degreeSchema);
