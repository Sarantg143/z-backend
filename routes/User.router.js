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
const { updateDegreeProgress, calculateDegreeCompletion ,updateLessonProgress} = require('../utils/progress');

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
      return res.status(401).send({ message: "Invalid username or password." });
    }

    res.status(200).send({
      message: "Login successful.",
      user: { id: user._id, 
        email: user.email, 
        username: user.username, 
        role: user.role,
        adminAuth: user.adminAuth,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send({ message: "Login failed.", error: error.message });
  }
});

// Google Login Route
router.post('/google', async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser= await User.findOne({
      $or: [{ email }, { name: email }],
    });

    if (existingUser) {
      return res.status(200).json({ exists: true, message: 'Email already exists in the database' });
    } else {
      return res.status(200).json({ exists: false, message: 'Email is available' });
    }
  } catch (err) {
    console.log(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/:id/resetpass', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

router.post("/verify-reset-link", async (req, res) => {
  const { oobCode } = req.body;
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, userId: user._id });
  } catch (err) {
    console.error("Error verifying reset link:", err);
    res.status(400).json({ success: false, message: err.message });
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
  const { userId, degreeId, lessonId } = req.body;

  try {
    const progress = await updateLessonProgress(userId, degreeId, lessonId);
    res.status(200).json({ message: 'Progress updated', progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/progress/:userId/:degreeId', async (req, res) => {
  const { userId, degreeId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const degreeProgress = user.degreeProgress.find(
      progress => progress.degreeId.toString() === degreeId
    );

    if (!degreeProgress) {
      return res.status(404).json({ message: 'Degree progress not found for the user' });
    }

    const degree = await Degree.findById(degreeId);
    if (!degree) {
      return res.status(404).json({ message: 'Degree not found' });
    }

    const response = {
      degreeDetails: {
        degreeId: degree._id,
        title: degree.title,
        description: degree.description,
        thumbnail: degree.thumbnail,
        price: degree.price
      },
      degreeProgress
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.put('/adminAuth/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.adminAuth = !user.adminAuth;
    await user.save();

    res.status(200).json({ 
      message: 'User adminAuth status updated successfully', 
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        adminAuth: user.adminAuth
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating adminAuth status', error: error.message });
  }
});


module.exports = router;
