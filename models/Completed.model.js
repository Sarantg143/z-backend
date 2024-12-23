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
    },
    chapterId: {
        type: String,
        required: [true, "Chapter ID is required"],
    },
    completedLessons: {
        type: Array, 
        default: [],
    },
});

const Completed = mongoose.model("CompletedLesson", CompletedLessonSchema);
module.exports = Completed;
