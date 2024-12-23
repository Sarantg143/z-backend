const Router = require('express');
const Completed = require('../models/Completed.model');

const CompletedLesson = Router();


CompletedLesson.get('/:userId/:degreeId/:courseId/:chapterId', async (req, res) => {
    try {
        const { userId, degreeId, courseId, chapterId } = req.params;
        const completedData = await Completed.findOne({ 
            userId, degreeId, courseId, chapterId 
        });

        if (completedData) {
            res.status(200).json({
                success: true,
                completedData,
            });
        } else {
            res.status(404).json({
                success: false,
                message: "No data found for the provided details",
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

// Create new completed lesson data
CompletedLesson.post('/', async (req, res) => {
    try {
        const completedData = await Completed.create(req.body);

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
        const { id } = req.params; // ID of the completed lesson document
        const { lessonId } = req.body; // Lesson to add

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

module.exports = CompletedLesson;
