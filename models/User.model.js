const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    mobileNo: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    maritalStatus: { type: String, required: true }, // Dropdown: Single/Married
    dob: { type: Date, required: true },
    gender: { type: String, required: true }, // Dropdown: Male/Female/Other
    applyingFor: { type: String, required: true }, // Dropdown or specific course
    educationalQualification: { type: String, required: true },
    theologicalQualification: { type: String, required: true },
    presentAddress: { type: String, required: true },
    ministryExperience: { type: String, required: true },
    salvationExperience: { type: String, required: true },
    signatureFile: { type: String, required: true }, // URL for signature image
    passportPhotoFile: { type: String, required: true }, // URL for passport-size photo
    educationCertFile: { type: String, required: true }, // URL for education certificate
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    createdAt: { type: Date, default: Date.now },
    role: { type: String, default: 'client' },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
