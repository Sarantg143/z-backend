const mongoose = require('mongoose');
const { Schema } = mongoose;

const TestAnswerSchema = new Schema({
  question: { type: String },
  userAnswer: { type: Schema.Types.Mixed },
  correctAnswer: { type: Schema.Types.Mixed },
  type: { 
    type: String, 
    enum: ["MCQ", "QuestionAnswer","paragraph"],
    required: true 
  },
  marks: { type: Number },
  // maxMark: { 
  //   type: Number,
  //   required: true,
  //   default: 1  
  // },
  maxMark: { 
    type: Number,
    required: true,
    default: function () {
      return this.type === "MCQ" ? 1 : 10;
    },
    set: function (value) {
      return value !== undefined ? value : (this.type === "MCQ" ? 1 : 10);
    }
  },
  fileUrl: { type: String },
});

const AttemptSchema = new Schema({
  answers: [TestAnswerSchema],
  marksObtained: { type: Number, required: true },
  attemptedAt: { type: Date, default: Date.now },
  isBest: { type: Boolean, default: false }
});

function arrayLimit(val) {
  return val.length <= 5;
}

const CourseAnswerSchema = new Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseTitle: { type: String },
  attempts: { type: [AttemptSchema], validate: [arrayLimit, 'Maximum 5 attempts allowed'] },
  bestMarks: { type: Number, default: 0 }
});

const ChapterAnswerSchema = new Schema({ 
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  chapterTitle: { type: String },
  attempts: { type: [AttemptSchema], validate: [arrayLimit, 'Maximum 5 attempts allowed'] },
  bestMarks: { type: Number, default: 0 }
});

const LessonAnswerSchema = new Schema({ 
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
  lessonTitle: { type: String },
  attempts: { type: [AttemptSchema], validate: [arrayLimit, 'Maximum 5 attempts allowed'] },
  bestMarks: { type: Number, default: 0 }
});

const SubLessonAnswerSchema = new Schema({ 
  sublessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sublesson' },
  sublessonTitle: { type: String },
  attempts: { type: [AttemptSchema], validate: [arrayLimit, 'Maximum 5 attempts allowed'] },
  bestMarks: { type: Number, default: 0 }
});

const AnswerSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  username: { type: String },
  degreeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Degree' },
  degreeTitle: { type: String },
  totalMarks: { type: Number, default: 0 },
  totalPossibleMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  courses: [CourseAnswerSchema],
  chapters: [ChapterAnswerSchema],
  lessons: [LessonAnswerSchema],
  subLessons: [SubLessonAnswerSchema],
}, { timestamps: true });

AnswerSchema.pre('save', function(next) {
  let totalMarks = 0;
  let totalPossibleMarks = 0;

  const calculateEntityMarks = (entities) => {
    entities.forEach(entity => {
      let entityMaxMarks = 0;
      
      if (entity.attempts.length > 0) {
        entityMaxMarks = entity.attempts[0].answers.reduce(
          (sum, answer) => sum + answer.maxMark,
          0
        );
      }
      
      totalMarks += entity.bestMarks;
      totalPossibleMarks += entityMaxMarks;
    });
  };

  calculateEntityMarks(this.courses);
  calculateEntityMarks(this.chapters);
  calculateEntityMarks(this.lessons);
  calculateEntityMarks(this.subLessons);

  this.totalMarks = totalMarks;
  this.totalPossibleMarks = totalPossibleMarks;
  this.percentage = totalPossibleMarks > 0
    ? Math.min(Math.round((totalMarks / totalPossibleMarks) * 100 * 100) / 100, 100)
    : 0;

  next();
});

module.exports = mongoose.model('Answer', AnswerSchema);
