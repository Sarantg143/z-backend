const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const Degree = require("../models/Degree.model");
const { uploadFile } = require("../utils/fileUpload");
const { deleteTempFile } = require("../utils/tempUtils");
const multer = require("multer");
const path = require("path");
const { auth } = require("../firebaseConfig");
const { updateLessonProgress, calculateDegreeCompletion } = require('../utils/progress');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../temp") });

// Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { email, username, password , role = 'client'} = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .send({ message: "Email or Username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    res.status(201).send({
      message: "Signup successful. Please complete your profile.",
      user: { id: newUser._id, email: newUser.email, username: newUser.username,role: newUser.role },
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).send({ message: "Signup failed.", error: error.message });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).send({
      message: "Login successful.",
      token,
      user: { 
        id: user._id, 
        email: user.email, 
        username: user.username, 
        role: user.role 
        
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send({ message: "Login failed.", error: error.message });
  }
});

// Google Login Route
router.post("/google-login", async (req, res) => {
  try {
    const { email, username } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, username });
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).send({
      message: "Google login successful.",
      token,
      user: { id: user._id, email: user.email, username: user.username },
    });
  } catch (error) {
    console.error("Error during Google login:", error);
    res.status(500).send({ message: "Google login failed.", error: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ message: "Email is required." });
    }
    const actionCodeSettings = {
      url: "http://your-frontend-url.com/login", 
      handleCodeInApp: false,  
    };
    const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

    console.log(`Password reset link for ${email}: ${resetLink}`);

    res.status(200).send({
      message: "Password reset email sent successfully. Please check your inbox.",
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);

    if (error.code === "auth/user-not-found") {
      return res.status(404).send({ message: "No user found with this email." });
    }

    res.status(500).send({
      message: "Failed to send password reset email.",
      error: error.message,
    });
  }
});


// Additional User Details (After Signup)
router.post(
  "/profile",
  upload.fields([
    { name: "signatureFile" },
    { name: "passportPhotoFile" },
    { name: "educationCertFile" },
  ]),
  async (req, res) => {
    try {
      const userId = req.body.userId;
    
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      const signatureFilePath = req.files?.signatureFile?.[0]?.path;
      const passportPhotoFilePath = req.files?.passportPhotoFile?.[0]?.path;
      const educationCertFilePath = req.files?.educationCertFile?.[0]?.path;

      let signatureFileUrl, passportPhotoFileUrl, educationCertFileUrl;

      if (signatureFilePath) {
        signatureFileUrl = await uploadFile(
          signatureFilePath,
          req.files.signatureFile[0].originalname
        );
        deleteTempFile(signatureFilePath);
      }

      if (passportPhotoFilePath) {
        passportPhotoFileUrl = await uploadFile(
          passportPhotoFilePath,
          req.files.passportPhotoFile[0].originalname
        );
        deleteTempFile(passportPhotoFilePath);
      }

      if (educationCertFilePath) {
        educationCertFileUrl = await uploadFile(
          educationCertFilePath,
          req.files.educationCertFile[0].originalname
        );
        deleteTempFile(educationCertFilePath);
      }

      const isFieldValid = (field) => field !== undefined && field !== null && field.trim() !== "";


const allDetailsFilled = isFieldValid(req.body.firstName) &&isFieldValid(req.body.lastName) &&
                         isFieldValid(req.body.mobileNo) &&isFieldValid(req.body.maritalStatus) &&
                         isFieldValid(req.body.dob) &&isFieldValid(req.body.gender) &&
                         isFieldValid(req.body.applyingFor) &&isFieldValid(req.body.educationalQualification) &&
                         isFieldValid(req.body.theologicalQualification) &&isFieldValid(req.body.presentAddress) &&
                         isFieldValid(req.body.ministryExperience) &&isFieldValid(req.body.salvationExperience);
      // Update user details
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          mobileNo: req.body.mobileNo,
          maritalStatus: req.body.maritalStatus,
          dob: req.body.dob,
          gender: req.body.gender,
          applyingFor: req.body.applyingFor,
          // applyingFor: { degreeId, title: degree.title },
          educationalQualification: req.body.educationalQualification,
          theologicalQualification: req.body.theologicalQualification,
          presentAddress: req.body.presentAddress,
          ministryExperience: req.body.ministryExperience,
          salvationExperience: req.body.salvationExperience,
          signatureFile: signatureFileUrl,
          passportPhotoFile: passportPhotoFileUrl,
          educationCertFile: educationCertFileUrl,
          details: allDetailsFilled ? true : undefined,
        },
        { new: true }
      );

      res.status(200).send({
        message: "Profile completed successfully.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error completing profile:", error);
      res.status(500).send({
        message: "Failed to complete profile.",
        error: error.message,
      });
    }
  }
);

// Edit User
router.put("/:id", upload.fields([
  { name: "signatureFile" },
  { name: "passportPhotoFile" },
  { name: "educationCertFile" },
  { name: "profilePic" },  
  { name: "profileBanner" }, 
]), async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const signatureFilePath = req.files?.signatureFile?.[0]?.path;
    const passportPhotoFilePath = req.files?.passportPhotoFile?.[0]?.path;
    const educationCertFilePath = req.files?.educationCertFile?.[0]?.path;
    const profilePicPath = req.files?.profilePic?.[0]?.path; 
    const profileBannerPath = req.files?.profileBanner?.[0]?.path;  

    let signatureFileUrl = user.signatureFile;
    let passportPhotoFileUrl = user.passportPhotoFile;
    let educationCertFileUrl = user.educationCertFile;
    let profilePicUrl = user.profilePic; 
    let profileBannerUrl = user.profileBanner;  

    if (signatureFilePath) {
      signatureFileUrl = await uploadFile(signatureFilePath, req.files.signatureFile[0].originalname);
      deleteTempFile(signatureFilePath);
    }

    if (passportPhotoFilePath) {
      passportPhotoFileUrl = await uploadFile(passportPhotoFilePath, req.files.passportPhotoFile[0].originalname);
      deleteTempFile(passportPhotoFilePath);
    }

    if (educationCertFilePath) {
      educationCertFileUrl = await uploadFile(educationCertFilePath, req.files.educationCertFile[0].originalname);
      deleteTempFile(educationCertFilePath);
    }

    if (profilePicPath) {
      profilePicUrl = await uploadFile(profilePicPath, req.files.profilePic[0].originalname);
      deleteTempFile(profilePicPath);
    }

    if (profileBannerPath) {
      profileBannerUrl = await uploadFile(profileBannerPath, req.files.profileBanner[0].originalname);
      deleteTempFile(profileBannerPath);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...req.body,
        signatureFile: signatureFileUrl,
        passportPhotoFile: passportPhotoFileUrl,
        educationCertFile: educationCertFileUrl,
        profilePic: profilePicUrl, 
        profileBanner: profileBannerUrl,  
      },
      { new: true }
    );

    res.status(200).send({
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({
      message: "Failed to update user.",
      error: error.message,
    });
  }
});


// Delete User Route
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }
    await User.findByIdAndDelete(userId);

    res.status(200).send({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({
      message: "Failed to delete user.",
      error: error.message,
    });
  }
});


// Get All Users Route
router.get("/", async (req, res) => {
  try {
    
    const users = await User.find();

    res.status(200).send({
      message: "Users retrieved successfully.",
      users,
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).send({
      message: "Failed to retrieve users.",
      error: error.message,
    });
  }
});

// Get User by ID Route
router.get("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send({
      message: "User retrieved successfully.",
      user,
    });
  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).send({
      message: "Failed to retrieve user.",
      error: error.message,
    });
  }
});


// Update lesson progress
router.post('/progress', async (req, res) => {
  const { userId, degreeId, courseIndex, chapterIndex, lessonIndex } = req.body;

  try {
    const result = await updateLessonProgress(userId, degreeId, courseIndex, chapterIndex, lessonIndex);
    res.status(200).json({
      message: 'Progress updated successfully',
      watchedPercentage: result.watchedPercentage,
      degreeProgress: result.degreeProgress,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating progress', error });
  }
});

// Get degree progress
router.get('/progress/:userId/:degreeId', async (req, res) => {
  const { userId, degreeId } = req.params;

  try {
    const progress = await calculateDegreeCompletion(userId, degreeId);
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving progress', error });
  }
});


router.get('/:id/watchPercent', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ watchPercent: user.watchPercent });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving watchPercent', error });
  }
});


router.put('/:id/watchPercent', async (req, res) => {
  const { watchPercent } = req.body;
  if (typeof watchPercent !== 'number' || watchPercent < 0 || watchPercent > 100) {
    return res.status(400).json({ message: 'watchPercent must be a number between 0 and 100' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { watchPercent },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'watchPercent updated successfully', watchPercent: user.watchPercent });
  } catch (error) {
    res.status(500).json({ message: 'Error updating watchPercent', error });
  }
});


router.delete('/:id/watchPercent', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $unset: { watchPercent: 1 } }, 
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'watchPercent deleted successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting watchPercent', error });
  }
});

module.exports = router;
