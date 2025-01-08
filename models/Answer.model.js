const mongoose = require("mongoose");
const { Schema } = mongoose;

const userAnswerSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        degreeId: { type: mongoose.Schema.Types.ObjectId, ref: "Degree", required: true },

        testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
        subLessonId: { type: mongoose.Schema.Types.ObjectId, ref: "SubLesson" },
        answers: [
            {
                questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
                answerType: { type: String, enum: ["MCQ", "Typed", "FileUpload"], required: true },
                answerText: { type: String },
                fileUrl: { type: String },
                obtainedMarks: { type: Number, default: 0 }  
            }
        ],

        totalMarks: { type: Number, default: 0 },   
        maxMarks: { type: Number, default: 0 },     
        submittedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model("UserAnswer", userAnswerSchema);
