// MongoDB Mongoose schemas for Apex101 migrated from MySQL

const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  playlist_id: { type: String, required: true }
});

const CommentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  content_id: { type: String, required: true },
  user_id: { type: String, required: true },
  tutor_id: { type: String, required: true },
  comment: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  number: { type: Number, required: true },
  message: { type: String, required: true }
});

const ContentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tutor_id: { type: String, required: true },
  playlist_id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  video: { type: String, required: true },
  thumb: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'deactive' }
});

const LikeSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  tutor_id: { type: String, required: true },
  content_id: { type: String, required: true }
});

const PlaylistSchema = new mongoose.Schema({
  id: { type: String, required: true },
  tutor_id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  thumb: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'deactive' }
});

const TutorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  profession: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  image: { type: String, required: true },
  active: { type: Boolean, default: true }
});

// Updated UserSchema for social logins (Google, GitHub) and password reset

// Password reset fields embedded in each user type
const passwordResetFields = {
  reset_token: { type: String },
  reset_expiry: { type: Date }
};

// Student schema
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  image: { type: String },
  enrolledCourses: [{ type: String }], // Array of course IDs
  googleId: { type: String },
  isGoogleAuth: { type: Boolean, default: false },
  githubId: { type: String },
  isGithubAuth: { type: Boolean, default: false },
  ...passwordResetFields
});

// Teacher schema
const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  image: { type: String },
  coursesTaught: [{ type: String }], // Array of course IDs
  googleId: { type: String },
  isGoogleAuth: { type: Boolean, default: false },
  githubId: { type: String },
  isGithubAuth: { type: Boolean, default: false },
  ...passwordResetFields
});

// Admin schema
const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  image: { type: String },
  ...passwordResetFields
});

// Separate PasswordReset model (kept for legacy/backup, but reset fields now in User)
const PasswordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  token: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true }
});

const AboutSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  mission: { type: String, default: '' },
  vision: { type: String, default: '' }
});

module.exports = {
  Bookmark: mongoose.model('Bookmark', BookmarkSchema),
  Comment: mongoose.model('Comment', CommentSchema),
  Contact: mongoose.model('Contact', ContactSchema),
  Content: mongoose.model('Content', ContentSchema),
  Like: mongoose.model('Like', LikeSchema),
  Playlist: mongoose.model('Playlist', PlaylistSchema),
  Tutor: mongoose.model('Tutor', TutorSchema),
  Student: mongoose.model('Student', StudentSchema),
  Teacher: mongoose.model('Teacher', TeacherSchema),
  Admin: mongoose.model('Admin', AdminSchema),
  PasswordReset: mongoose.model('PasswordReset', PasswordResetSchema),
  About: mongoose.model('About', AboutSchema)
};