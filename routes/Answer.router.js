const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { uploadFile } = require('../utils/fileUpload');
const Answer = require('../models/Answer.model'); // Ensure Answer model is imported
const Degree = require('../models/Degree.model'); // Ensure Degree model is imported

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, "../temp"),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Route to submit answers
router.post("/submit", upload.array("answerFiles"), async (req, res) => {
    const tempFiles = [];
    
    try {
      const { userId, degreeId, courses, chapters, lessons, subLessons } = req.body;
  
      if (!userId || !degreeId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
  
      let parsedCourses, parsedChapters, parsedLessons, parsedSubLessons;
      try {
        parsedCourses = JSON.parse(courses || "[]");
        parsedChapters = JSON.parse(chapters || "[]");
        parsedLessons = JSON.parse(lessons || "[]");
        parsedSubLessons = JSON.parse(subLessons || "[]");
      } catch (error) {
        return res.status(400).json({ message: "Invalid JSON format" });
      }
  
      const uploadedFiles = req.files || [];
      const answerFilesUrls = await Promise.all(
        uploadedFiles.map(async (file) => {
          tempFiles.push(file.path);  
          return await uploadFile(file.path, file.originalname);
        })
      );
  
      const attachFilesToAnswers = (answers) => {
        let fileIndex = 0;
        answers.forEach((item) => {
          if (item.test && item.test.type === "QuestionAnswer") {
            item.test.questions.forEach((question) => {
              if (!question.file && fileIndex < answerFilesUrls.length) {
                question.file = answerFilesUrls[fileIndex];
                fileIndex++;
              }
            });
          }
        });
      };
  
      // Attach files to respective test answers
      attachFilesToAnswers(parsedCourses);
      attachFilesToAnswers(parsedChapters);
      attachFilesToAnswers(parsedLessons);
      attachFilesToAnswers(parsedSubLessons);
  
      const newAnswer = new Answer({
        userId,
        degreeId,
        courses: parsedCourses,
        chapters: parsedChapters,
        lessons: parsedLessons,
        subLessons: parsedSubLessons,
        overallMarks: 0,  // Placeholder for marks, updated after evaluation
        percentage: 0,
      });
  
      await newAnswer.save();
  
      res.status(201).json({ message: "Test answers submitted successfully", answer: newAnswer });
    } catch (error) {
      console.error("Error submitting test answers:", error);
      res.status(500).json({ message: "Failed to submit test answers", error: error.message });
    } finally {
      // Cleanup temporary files
      await Promise.all(
        tempFiles.map(async (filePath) => {
          try {
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
            if (fileExists) {
              await fs.unlink(filePath);
              console.log(`Temporary file deleted: ${filePath}`);
            }
          } catch (error) {
            console.error(`Failed to delete temp file: ${filePath}`, error);
          }
        })
      );
    }
  });
  
// Route to update marks and recalculate total
router.post('/update-marks', async (req, res) => {
    try {
      const { answerId, updatedAnswers } = req.body;
      
      if (!answerId || !updatedAnswers) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
      const answerDoc = await Answer.findById(answerId);
      if (!answerDoc) {
        return res.status(404).json({ message: 'Answer not found' });
      }
  
      const parsedUpdatedAnswers = JSON.parse(updatedAnswers);
  
      // Update the marks for QuestionAnswer types
      answerDoc.subLessons = answerDoc.subLessons.map(subLesson => {
        const updatedSubLesson = parsedUpdatedAnswers.subLessons.find(sl => sl.subLessonId === subLesson.subLessonId);
        if (updatedSubLesson) {
          subLesson.marks = updatedSubLesson.marks !== null ? updatedSubLesson.marks : subLesson.marks;
        }
        return subLesson;
      });
  
      // Recalculate overall marks and percentage
      const { overallMarks, percentage } = recalculateMarksAndPercentage(answerDoc);
      answerDoc.totalMarks = overallMarks;  // Update total marks
      answerDoc.percentage = percentage;  // Update percentage
  
      await answerDoc.save();
      res.status(200).json({ message: 'Marks updated successfully', updatedAnswer: answerDoc });
    } catch (error) {
      console.error('Error updating marks:', error);
      res.status(500).json({ message: 'Failed to update marks', error: error.message });
    }
  });
  
// Utility to calculate overall marks
function calculateOverallMarks(data) {
    let totalMarks = 0;
  
    const sumMarks = (items) => items.reduce((sum, item) => sum + (item.marks || 0), 0);
  
    totalMarks += sumMarks(data.courses || []);
    totalMarks += sumMarks(data.chapters || []);
    totalMarks += sumMarks(data.lessons || []);
    totalMarks += sumMarks(data.subLessons || []);
  
    return totalMarks;
  }
  
  // Utility to recalculate overall marks and percentage
  function recalculateMarksAndPercentage(answerDoc) {
    const overallMarks = calculateOverallMarks(answerDoc);
    const maxPossibleMarks = 100; // Customize based on your scoring system
    const percentage = (overallMarks / maxPossibleMarks) * 100;
  
    return { overallMarks, percentage };
  }
  

module.exports = router;
