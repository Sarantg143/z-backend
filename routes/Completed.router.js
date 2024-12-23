const Router = require('express');
const Completed = require('../models/Completed.model');

const CompletedLesson = Router();


CompletedLesson.get('/:userId/:courseId', async (req, res) => {
  try {
      const { userId, courseId } = req.params;

      const completedData = await Completed.findOne({
          userId,
          courseId,
      });

      if (!completedData) {
          return res.status(404).json({
              success: false,
              message: "No completed lessons found for this user and course",
          });
      }

      res.status(200).json({
          success: true,
          completedLessons: completedData.completedLessons,
      });
  } catch (e) {
      res.status(400).json({
          success: false,
          error: e.message,
          message: "Bad Request",
      });
  }
});

CompletedLesson.get('/:userId/:degreeId', async (req, res) => {
  try {
      const { userId, degreeId } = req.params;

      const completedData = await Completed.find({
          userId,
          degreeId,
      });

      if (!completedData || completedData.length === 0) {
          return res.status(404).json({
              success: false,
              message: "No completed lessons found for this user and degree",
          });
      }

      const formattedData = completedData.map((entry) => ({
          courseId: entry.courseId,
          completedLessons: entry.completedLessons,
      }));

      res.status(200).json({
          success: true,
          data: formattedData,
      });
  } catch (e) {
      res.status(400).json({
          success: false,
          error: e.message,
          message: "Bad Request",
      });
  }
});



// Create new completed lesson data
CompletedLesson.post('/', async (req, res) => {
  try {
      const { userId, degreeId, courseId, completedLessons } = req.body;
      const existingEntry = await Completed.findOne({ courseId });

      if (existingEntry) {
          return res.status(400).json({
              success: false,
              message: "An entry already exists for this courseId",
          });
      }

      const completedData = await Completed.create({
          userId,
          degreeId,
          courseId,
          completedLessons,
      });

      res.status(201).json({
          success: true,
          completedData,
          message: "Created successfully",
      });
  } catch (e) {
      res.status(400).json({
          success: false,
          error: e.message,
          message: "Bad Request",
      });
  }
});

// Update completed lessons by adding a new lesson
CompletedLesson.put('/:id/addLesson', async (req, res) => {
    try {
        const { id } = req.params; 
        const { lessonId } = req.body; 

        const completedData = await Completed.findById(id);

        if (completedData) {
            const { completedLessons } = completedData;

            if (!completedLessons.includes(lessonId)) {
                completedLessons.push(lessonId);

                await completedData.save();

                res.status(200).json({
                    success: true,
                    message: "Lesson marked as completed",
                    updatedData: completedData,
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: "Lesson already completed",
                });
            }
        } else {
            res.status(404).json({
                success: false,
                message: "Data not found",
            });
        }
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message,
            message: "Bad Request",
        });
    }
});

CompletedLesson.put('/:courseId', async (req, res) => {
  try {
      const { courseId } = req.params;
      const { lessonTitle } = req.body;

      
      const existingData = await Completed.findOne({ courseId });

      if (!existingData) {
          return res.status(404).json({
              success: false,
              message: "Data not found for the provided courseId",
          });
      }

      if (existingData.completedLessons.includes(lessonTitle)) {
          return res.status(200).json({
              success: true,
              message: "Lesson already completed",
          });
      }

      existingData.completedLessons.push(lessonTitle);
      const updatedData = await existingData.save();

      res.status(200).json({
          success: true,
          message: "Lesson marked as completed",
          updatedData,
      });
  } catch (e) {
      res.status(400).json({
          success: false,
          error: e.message,
          message: "Bad Request",
      });
  }
});


module.exports = CompletedLesson;
