const mongoose = require("mongoose");

// Define the User schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profilePicture: {
      type: String, // URL of the profile picture (uploaded to Firebase)
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Export the User model
module.exports = mongoose.model("User", userSchema);
