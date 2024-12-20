const mongoose = require('mongoose');


const CompletedLessonSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Lesson' },
  completedAt: { type: Date, default: Date.now }, 
});


const CompletedChapterSchema = new mongoose.Schema({
  chapterId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Chapter' },
  completedAt: { type: Date, default: Date.now }, 
  lessons: [CompletedLessonSchema], 
});


const CompletedCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Course' },
  completedAt: { type: Date, default: Date.now }, 
  chapters: [CompletedChapterSchema], 
});


const CompletedDegreeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  degreeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Degree' },
  completedAt: { type: Date, default: null }, 
  courses: [CompletedCourseSchema], 
}, { timestamps: true }); 


const Completed = mongoose.model('Completed', CompletedDegreeSchema);

module.exports = Completed;
