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
      const user = await fetchById(User, userId, "User");

      let degreeProgress = user.degreeProgress.find((dp) => dp.degreeId.equals(degreeId));
      if (!degreeProgress) {
          const degree = await fetchById(Degree, degreeId, "Degree");

          degreeProgress = {
              degreeId: degree._id,
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

      const courseProgress = degreeProgress.courses[courseIndex];
      const chapterProgress = courseProgress.chapters[chapterIndex];
      const lessonProgress = chapterProgress.lessons[lessonIndex];

      // Mark the lesson as watched
      lessonProgress.watched = true;
      lessonProgress.watchedAt = new Date();

      // Calculate percentages
      const totalLessons = chapterProgress.lessons.length;
      const watchedLessons = chapterProgress.lessons.filter((lesson) => lesson.watched).length;
      courseProgress.watchedPercentage = totalLessons > 0 ? (watchedLessons / totalLessons) * 100 : 0;

      let totalDegreeLessons = 0;
      let totalDegreeWatched = 0;

      degreeProgress.courses.forEach((course) => {
          course.chapters.forEach((chapter) => {
              totalDegreeLessons += chapter.lessons.length;
              totalDegreeWatched += chapter.lessons.filter((lesson) => lesson.watched).length;
          });
      });

      degreeProgress.watchedPercentage =
          totalDegreeLessons > 0 ? ((totalDegreeWatched / totalDegreeLessons) * 100).toFixed(2) : 0;

      // Debug logs
      console.log("Before saving, degreeProgress:", JSON.stringify(user.degreeProgress, null, 2));

      // Mark field as modified
      user.markModified("degreeProgress");
      await user.save();

      const updatedUser = await User.findById(userId);
      console.log("After saving, degreeProgress from DB:", JSON.stringify(updatedUser.degreeProgress, null, 2));

      return {
          message: "Progress updated successfully",
          degreeProgress: updatedUser.degreeProgress,
      };
  } catch (error) {
      console.error("Error updating lesson progress:", error);
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