const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  mobileNo: { type: String },
  email: { type: String, required: true, unique: true },
  maritalStatus: { type: String },
  dob: { type: Date },
  gender: { type: String },
  applyingFor: { type: String },
  //applyingFor: { 
 //   degreeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Degree' },
 //   title: { type: String }},
  profilePic: {type: String},
  profileBanner: {type: String},
  educationalQualification: { type: String },
  theologicalQualification: { type: String },
  presentAddress: { type: String },
  ministryExperience: { type: String },
  salvationExperience: { type: String },
  signatureFile: { type: String },
  passportPhotoFile: { type: String },
  educationCertFile: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String }, // Hashed password
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: 'client' },
  details: { type : Boolean, default:false},
});

const User = mongoose.model('User', userSchema);

module.exports = User;
