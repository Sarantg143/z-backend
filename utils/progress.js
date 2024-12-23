const mongoose = require('mongoose');
const User = require('../models/User.model');
const Degree = require('../models/Degree.model');

const fetchById = async (Model, id, entityName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${entityName} ID`);
  }

  const document = await Model.findById(id);

  if (!document) {
    throw new Error(`${entityName} not found`);
  }

  return document;
};

const updateLessonProgress = async (userId, degreeId, courseIndex, lessonIndex, chapterIndex) => {
  try {
    // Fetch the user and degree using fetchById
    const user = await fetchById(User, userId, 'User');
    const degree = await fetchById(Degree, degreeId, 'Degree');

    // Check if degreeProgress exists for the degree
    let degreeProgress = user.degreeProgress.find(dp => dp.degreeId.equals(degreeId));
    if (!degreeProgress) {
      degreeProgress = {
        degreeId,
        courses: [],
        watchedPercentage: 0,
      };
      user.degreeProgress.push(degreeProgress);
    }

    // Check courseProgress
    let courseProgress = degreeProgress.courses[courseIndex];
    if (!courseProgress) {
      courseProgress = {
        courseId: degree.courses[courseIndex].courseId,
        chapters: [],
        watchedPercentage: 0,
      };
      degreeProgress.courses[courseIndex] = courseProgress;
    }

    // Check chapterProgress
    let chapterProgress = courseProgress.chapters[chapterIndex];
    if (!chapterProgress) {
      chapterProgress = {
        chapterId: degree.courses[courseIndex].chapters[chapterIndex].chapterId,
        lessons: [],
      };
      courseProgress.chapters[chapterIndex] = chapterProgress;
    }

    // Check lessonProgress
    let lessonProgress = chapterProgress.lessons[lessonIndex];
    if (!lessonProgress) {
      lessonProgress = {
        lessonId: degree.courses[courseIndex].chapters[chapterIndex].lessons[lessonIndex].lessonId,
        watched: false,
        watchedAt: null,
      };
      chapterProgress.lessons[lessonIndex] = lessonProgress;
    }

    // Mark lesson as watched
    lessonProgress.watched = true;
    lessonProgress.watchedAt = new Date();

    // Calculate watched percentage
    const totalLessons = user.degreeProgress
      .flatMap(dp => dp.courses)
      .flatMap(cp => cp.chapters)
      .reduce((sum, ch) => sum + ch.lessons.length, 0);

    const watchedLessons = user.degreeProgress
      .flatMap(dp => dp.courses)
      .flatMap(cp => cp.chapters)
      .reduce((sum, ch) => sum + ch.lessons.filter(ls => ls.watched).length, 0);

    degreeProgress.watchedPercentage = ((watchedLessons / totalLessons) * 100).toFixed(2);

    // Save the user
    await user.save();

    return {
      degreeProgress,
      watchedPercentage: degreeProgress.watchedPercentage,
    };
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    throw error;
  }
};
  
  
  
  
  
  const calculateDegreeCompletion = async (userId, degreeId) => {
    try {
      const user = await User.findById(userId).populate('degreeProgress.degreeId');
      const degreeProgress = user.degreeProgress.find(dp => dp.degreeId.equals(degreeId));
  
      if (!degreeProgress) {
        return { watchedPercentage: 0, courses: [] };
      }
  
      return {
        watchedPercentage: degreeProgress.watchedPercentage,
        courses: degreeProgress.courses.map(course => ({
          courseId: course.courseId,
          watchedPercentage: course.watchedPercentage,  
          chapters: course.chapters.map(chapter => ({
            chapterId: chapter.chapterId,
            lessons: chapter.lessons.map(lesson => ({
              lessonId: lesson.lessonId,
              watched: lesson.watched,
            })),
          })),
        })),
      };
    } catch (error) {
      console.error('Error calculating degree completion:', error);
      throw error;
    }
  };
  

module.exports = {updateLessonProgress,calculateDegreeCompletion};