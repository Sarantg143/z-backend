const Router = require('express');
const Completed = require('../models/Completed.model');

const CompletedLesson = Router();

CompletedLesson.get('/:userId/:courseId', async (req, res) => {
  try {
      const { userId, courseId } = req.params;
      const completedData = await Completed.findOne({ userId, courseId });

      if (!completedData) {
          return res.status(404).json({
              success: false,
              message: "No data found for the given userId and courseId",
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

        // Validate request body
        if (!userId || !degreeId || !courseId || !lessonTitle) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: userId, degreeId, courseId, lessonTitle",
            });
        }

        // Find existing record for user and course
        let completedData = await Completed.findOne({ userId, courseId });

        if (!completedData) {
            // Create new record if none exists
            completedData = await Completed.create({
                userId,
                degreeId,
                courseId,
                completedLessons: [lessonTitle],
            });

            return res.status(201).json({
                success: true,
                message: "Lesson added successfully for the user and course",
                data: completedData,
            });
        }

        // Check if lesson is already completed
        if (completedData.completedLessons.includes(lessonTitle)) {
            return res.status(400).json({
                success: false,
                message: "Lesson already marked as completed",
            });
        }

        // Add lesson to the completedLessons array
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




CompletedLesson.put('/:userId/:courseId', async (req, res) => {
  try {
      const { userId, courseId } = req.params;
      const { lessonTitle } = req.body;

      if (!lessonTitle) {
          return res.status(400).json({
              success: false,
              message: "Lesson title is required",
          });
      }
      let completedData = await Completed.findOne({ userId, courseId });

      if (!completedData) {
          return res.status(404).json({
              success: false,
              message: "No data found for the given userId and courseId",
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
          message: "Lesson updated successfully",
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
