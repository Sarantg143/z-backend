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

const updateDegreeProgress = async (userId, degreeId, courseId, chapterIndex, lessonIndex) => {
  try {
    const user = await User.findById(userId);

    // Step 1: Find or initialize degreeProgress
    let degreeProgress = user.degreeProgress.find((dp) => dp.degreeId.equals(degreeId));
    if (!degreeProgress) {
      degreeProgress = {
        degreeId,
        courses: [],
        watchedPercentage: 0,
      };
      user.degreeProgress.push(degreeProgress);
    }

    // Step 2: Find or initialize course progress
    let courseProgress = degreeProgress.courses.find((course) => course.courseId.equals(courseId));
    if (!courseProgress) {
      courseProgress = {
        courseId,
        chapters: [],
      };
      degreeProgress.courses.push(courseProgress);
    }

    // Step 3: Find or initialize chapter progress
    let chapterProgress = courseProgress.chapters.find((chapter) => chapter.chapterId === chapterIndex);
    if (!chapterProgress) {
      chapterProgress = {
        chapterId: chapterIndex,
        lessons: [],
      };
      courseProgress.chapters.push(chapterProgress);
    }

    // Step 4: Find or initialize lesson progress
    let lessonProgress = chapterProgress.lessons.find((lesson) => lesson.lessonId === lessonIndex);
    if (!lessonProgress) {
      lessonProgress = {
        lessonId: lessonIndex,
        watched: false,
        watchedAt: null,
      };
      chapterProgress.lessons.push(lessonProgress);
    }

    // Step 5: Update lesson progress
    if (!lessonProgress.watched) {
      lessonProgress.watched = true;
      lessonProgress.watchedAt = new Date();
    }

    // Step 6: Recalculate watched percentage
    const totalLessons = user.degreeProgress.reduce((total, dp) => {
      if (!dp.degreeId.equals(degreeId)) return total;
      return total + dp.courses.reduce((courseTotal, course) => {
        return courseTotal + course.chapters.reduce((chapterTotal, chapter) => {
          return chapterTotal + chapter.lessons.length;
        }, 0);
      }, 0);
    }, 0);

    const watchedLessons = user.degreeProgress.reduce((watched, dp) => {
      if (!dp.degreeId.equals(degreeId)) return watched;
      return watched + dp.courses.reduce((courseWatched, course) => {
        return courseWatched + course.chapters.reduce((chapterWatched, chapter) => {
          return chapterWatched + chapter.lessons.filter((lesson) => lesson.watched).length;
        }, 0);
      }, 0);
    }, 0);

    degreeProgress.watchedPercentage = totalLessons > 0 ? ((watchedLessons / totalLessons) * 100).toFixed(2) : 0;

    // Save the user document
    await user.save();

    return {
      watchedPercentage: degreeProgress.watchedPercentage,
      degreeProgress,
    };
  } catch (error) {
    console.error("Error updating degree progress:", error);
    throw error;
  }
};



const calculateDegreeCompletion = async (userId, degreeId) => {
  try {
    const user = await User.findById(userId).populate('degreeProgress.degreeId');
    const degreeProgress = user.degreeProgress.find((dp) => dp.degreeId.equals(degreeId));

    if (!degreeProgress) {
      return { watchedPercentage: 0, courses: [] };
    }

    return {
      watchedPercentage: degreeProgress.watchedPercentage,
      courses: degreeProgress.courses.map((course) => ({
        courseId: course.courseId,
        chapters: course.chapters.map((chapter) => ({
          chapterId: chapter.chapterId,
          lessons: chapter.lessons.map((lesson) => ({
            lessonId: lesson.lessonId,
            watched: lesson.watched,
          })),
        })),
      })),
    };
  } catch (error) {
    console.error("Error calculating degree progress:", error);
    throw error;
  }
};


const updateLessonProgress = async (userId, degreeId, lessonId) => {
  try {
    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if the degreeProgress exists for the given degreeId
    let degreeProgress = user.degreeProgress.find(
      progress => progress.degreeId.toString() === degreeId
    );

    if (!degreeProgress) {
      // Initialize the degree progress if it doesn't exist
      const degree = await Degree.findOne({ _id: degreeId });
      if (!degree) {
        throw new Error('Degree not found');
      }

      // Initialize degreeProgress structure
      degreeProgress = {
        degreeId: degree._id,
        isDegreeComplete: false,
        progressPercentage: 0,
        courses: degree.courses.map(course => ({
          courseId: course.courseId,
          isComplete: false,
          progressPercentage: 0,
          chapters: course.chapters.map(chapter => ({
            chapterId: chapter.chapterId,
            isComplete: false,
            progressPercentage: 0,
            lessons: chapter.lessons.map(lesson => ({
              lessonId: lesson.lessonId,
              isComplete: false
            }))
          }))
        }))
      };

      // Add to user's degreeProgress
      user.degreeProgress.push(degreeProgress);
    }

    // Update the lesson progress
    let totalLessons = 0;
    let completedLessons = 0;

    degreeProgress.courses.forEach(course => {
      course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
          totalLessons++;
          if (lesson.lessonId.toString() === lessonId) {
            lesson.isComplete = true; // Mark this lesson as complete
          }
          if (lesson.isComplete) completedLessons++;
        });

        // Update chapter completion status
        chapter.isComplete = chapter.lessons.every(lesson => lesson.isComplete);
        chapter.progressPercentage = Math.round(
          (chapter.lessons.filter(lesson => lesson.isComplete).length / chapter.lessons.length) * 100
        );
      });

      // Update course completion status
      course.isComplete = course.chapters.every(chapter => chapter.isComplete);
      course.progressPercentage = Math.round(
        (course.chapters.filter(chapter => chapter.isComplete).length / course.chapters.length) * 100
      );
    });

    // Update degree progress
    degreeProgress.isDegreeComplete = degreeProgress.courses.every(course => course.isComplete);
    degreeProgress.progressPercentage = Math.round((completedLessons / totalLessons) * 100);

    // Save updated progress
    await user.save();

    return degreeProgress;
  } catch (error) {
    console.error('Error updating progress:', error.message);
    throw new Error(error.message);
  }
};


  

module.exports = {updateDegreeProgress,calculateDegreeCompletion,updateLessonProgress};