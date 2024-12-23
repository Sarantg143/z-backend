const Router = require('express');
const Completed = require('../models/Completed.model');

const CompletedLesson = Router();


CompletedLesson.get('/:courseId', async (req, res) => {
  try {
      const { courseId } = req.params;

      const completedData = await Completed.findOne({ courseId });

      if (!completedData) {
          return res.status(404).json({
              success: false,
              message: "No data found for the given courseId",
          });
      }

      res.status(200).json({
          success: true,
          message: "Data fetched successfully",
          data: completedData,
      });
  } catch (e) {
      res.status(500).json({
          success: false,
          error: e.message,
          message: "Internal Server Error",
      });
  }
});


CompletedLesson.get('/:userId/:degreeId', async (req, res) => {
  try {
      const { userId, degreeId } = req.params;

      const completedData = await Completed.find({ userId, degreeId });

      if (!completedData || completedData.length === 0) {
          return res.status(404).json({
              success: false,
              message: "No data found for the given userId and degreeId",
          });
      }
      res.status(200).json({
          success: true,
          message: "Data fetched successfully",
          data: completedData,
      });
  } catch (e) {
      res.status(500).json({
          success: false,
          error: e.message,
          message: "Internal Server Error",
      });
  }
});



CompletedLesson.post('/', async (req, res) => {
  try {
      const { userId, degreeId, courseId, lessonTitle } = req.body;

  
      if (!userId || !degreeId || !courseId || !lessonTitle) {
          return res.status(400).json({
              success: false,
              message: "Missing required fields: userId, degreeId, courseId, lessonTitle",
          });
      }

      let completedData = await Completed.findOne({
          courseId,
      });

      if (!completedData) {
        
          completedData = await Completed.create({
              userId,
              degreeId,
              courseId,
              completedLessons: [lessonTitle],
          });

          return res.status(201).json({
              success: true,
              message: "Lesson added successfully",
              data: completedData,
          });
      }

      if (completedData.completedLessons.includes(lessonTitle)) {
          return res.status(400).json({
              success: false,
              message: "Lesson already marked as completed",
          });
      }
      completedData.completedLessons.push(lessonTitle);
      await completedData.save();

      res.status(200).json({
          success: true,
          message: "Lesson added successfully",
          data: completedData,
      });
  } catch (e) {
      res.status(500).json({
          success: false,
          error: e.message,
          message: "Internal Server Error",
      });
  }
});

CompletedLesson.put('/:courseId', async (req, res) => {
  try {
      const { courseId } = req.params;
      const { lessonTitle } = req.body;

      if (!lessonTitle) {
          return res.status(400).json({
              success: false,
              message: "Missing required field: lessonTitle",
          });
      }

      let completedData = await Completed.findOne({ courseId });

      if (!completedData) {
          return res.status(404).json({
              success: false,
              message: "No data found for the given courseId",
          });
      }

      if (completedData.completedLessons.includes(lessonTitle)) {
          return res.status(400).json({
              success: false,
              message: "Lesson already marked as completed",
          });
      }
      completedData.completedLessons.push(lessonTitle);
      await completedData.save();

      res.status(200).json({
          success: true,
          message: "Lesson added successfully",
          data: completedData,
      });
  } catch (e) {
      res.status(500).json({
          success: false,
          error: e.message,
          message: "Internal Server Error",
      });
  }
});


module.exports = CompletedLesson;
