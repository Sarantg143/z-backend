const mongoose = require('mongoose');

const CompletedLessonSchema = mongoose.Schema({
    userId: {
        type: String,
        required: [true, "User ID is required"],
    },
    degreeId: {
        type: String,
        required: [true, "Degree ID is required"],
    },
    courseId: {
        type: String,
        required: [true, "Course ID is required"],
        // Ensure each courseId has only one entry
    },
    completedLessons: {
      type: [String], 
      default: [],
  },
});


CompletedLessonSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const Completed = mongoose.model("CompletedLesson", CompletedLessonSchema)

module.exports = Completed;
