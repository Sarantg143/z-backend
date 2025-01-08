const mongoose = require("mongoose");

const DegreeProgressSchema = new mongoose.Schema({
    degreeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Degree', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    courses: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
        isComplete: { type: Boolean, default: false },
        progressPercentage: { type: Number, default: 0 },
        testCompleted: { type: Boolean, default: false },
        chapters: [
          {
            chapterId: { type: mongoose.Schema.Types.ObjectId, required: true },
            isComplete: { type: Boolean, default: false },
            progressPercentage: { type: Number, default: 0 },
            lessons: [
              {
                lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
                isComplete: { type: Boolean, default: false },
                progressPercentage: { type: Number, default: 0 },
                testCompleted: { type: Boolean, default: false },
                sublessons: [
                  {
                    subLessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
                    isComplete: { type: Boolean, default: false },
                    progressPercentage: { type: Number, default: 0 },
                    testCompleted: { type: Boolean, default: false }
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    isDegreeComplete: { type: Boolean, default: false },
    progressPercentage: { type: Number, default: 0 }
});

module.exports = DegreeProgressSchema;
