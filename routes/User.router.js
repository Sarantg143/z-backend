const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { uploadFile } = require("../utils/fileUpload");
const { deleteTempFile } = require("../utils/tempUtils");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../temp") });

// Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { email, username, password , role = 'client'} = req.body;

    // Check if email or username already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .send({ message: "Email or Username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with basic details
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

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    // If user not found, return an error
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Check if the password is correct
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

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      // If user does not exist, create a new one
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

// Additional User Details Route (After Signup)
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

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      // Upload files to Firebase and get URLs
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
          educationalQualification: req.body.educationalQualification,
          theologicalQualification: req.body.theologicalQualification,
          presentAddress: req.body.presentAddress,
          ministryExperience: req.body.ministryExperience,
          salvationExperience: req.body.salvationExperience,
          signatureFile: signatureFileUrl,
          passportPhotoFile: passportPhotoFileUrl,
          educationCertFile: educationCertFileUrl,
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

// Edit User Route
router.put("/:id", upload.fields([
  { name: "signatureFile" },
  { name: "passportPhotoFile" },
  { name: "educationCertFile" },
]), async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user to update
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Upload new files to Firebase if provided
    const signatureFilePath = req.files?.signatureFile?.[0]?.path;
    const passportPhotoFilePath = req.files?.passportPhotoFile?.[0]?.path;
    const educationCertFilePath = req.files?.educationCertFile?.[0]?.path;

    let signatureFileUrl = user.signatureFile;
    let passportPhotoFileUrl = user.passportPhotoFile;
    let educationCertFileUrl = user.educationCertFile;

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

    // Update user fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...req.body,
        signatureFile: signatureFileUrl,
        passportPhotoFile: passportPhotoFileUrl,
        educationCertFile: educationCertFileUrl,
        role: role || user.role,
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

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Delete the user from the database
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
    // Fetch all users from the database
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

    // Find the user by ID
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

module.exports = router;
