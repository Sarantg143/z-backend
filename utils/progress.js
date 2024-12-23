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

const updateLessonProgress = async (userId, degreeId, courseIndex, chapterIndex, lessonIndex) => {
  try {
      // Fetch the user
      const user = await fetchById(User, userId, "User");

      // Find the degreeProgress for the given degreeId
      let degreeProgress = user.degreeProgress.find((dp) => dp.degreeId.equals(degreeId));

      if (!degreeProgress) {
          console.log("Initializing degreeProgress for degreeId:", degreeId);

          // Fetch the degree structure
          const degree = await fetchById(Degree, degreeId, "Degree");

          degreeProgress = {
              degreeId: degree._id, // Use degree._id from fetched degree
              courses: degree.courses.map((course) => ({
                  courseId: course.courseId,
                  chapters: course.chapters.map((chapter) => ({
                      chapterId: chapter.chapterId,
                      lessons: chapter.lessons.map((lesson) => ({
                          lessonId: lesson.lessonId,
                          watched: false,
                          watchedAt: null,
                      })),
                  })),
                  watchedPercentage: 0,
              })),
              watchedPercentage: 0,
          };

          user.degreeProgress.push(degreeProgress);
      }

      // Check if courseProgress exists
      const courseProgress = degreeProgress.courses[courseIndex];
      if (!courseProgress) {
          throw new Error(`Course at index ${courseIndex} does not exist`);
      }

      // Check if chapterProgress exists
      const chapterProgress = courseProgress.chapters[chapterIndex];
      if (!chapterProgress) {
          throw new Error(`Chapter at index ${chapterIndex} does not exist`);
      }

      // Check if lessonProgress exists
      const lessonProgress = chapterProgress.lessons[lessonIndex];
      if (!lessonProgress) {
          throw new Error(`Lesson at index ${lessonIndex} does not exist`);
      }

      // Mark the lesson as watched
      lessonProgress.watched = true;
      lessonProgress.watchedAt = new Date();

      // Recalculate watched percentage for the course
      const totalLessons = chapterProgress.lessons.length;
      const watchedLessons = chapterProgress.lessons.filter((lesson) => lesson.watched).length;
      courseProgress.watchedPercentage = totalLessons > 0 ? (watchedLessons / totalLessons) * 100 : 0;

      // Recalculate watched percentage for the degree
      let totalDegreeLessons = 0;
      let totalDegreeWatchedLessons = 0;

      degreeProgress.courses.forEach((course) => {
          course.chapters.forEach((chapter) => {
              totalDegreeLessons += chapter.lessons.length;
              totalDegreeWatchedLessons += chapter.lessons.filter((lesson) => lesson.watched).length;
          });
      });

      degreeProgress.watchedPercentage =
          totalDegreeLessons > 0 ? ((totalDegreeWatchedLessons / totalDegreeLessons) * 100).toFixed(2) : 0;

      // Mark `degreeProgress` as modified
      user.markModified("degreeProgress");

      // Save the user document
      await user.save();

      return {
          message: "Progress updated successfully",
          watchedPercentage: degreeProgress.watchedPercentage,
          degreeProgress,
      };
  } catch (error) {
      console.error("Error updating lesson progress:", error);
      throw error; // Rethrow for higher-level handling
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