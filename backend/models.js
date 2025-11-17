// MongoDB Mongoose schemas for Apex101

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
  thumb: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'active' },

  // --- Sequencing field for adaptive ordering ---
  order: { type: Number, default: 0 }, // e.g., 1, 2, 3, 4

  // --- Content payloads (teachers can provide the format that matches the category) ---
  video: { type: String, required: false }, // Optional, kept for video-based lessons
  textContent: { type: String, required: false }, // Plain text / article content
  fileUrl: { type: String, required: false }, // Uploaded PDF, audio, images, etc.
  quizData: { type: mongoose.Schema.Types.Mixed, required: false }, // JSON structure for quizzes

  // --- Annotations for the ML Model ---
  annotations: {
    format: { 
      type: String, 
      enum: ['Visual', 'Verbal', 'Audio'], 
      default: 'Visual' 
    },
    type: { 
      type: String, 
      enum: ['Abstract', 'Concrete'], 
      default: 'Abstract' 
    },
    category: { 
      type: String, 
      enum: ['Video', 'Example', 'Exercise', 'Quiz', 'Outline', 'Reading', 'Concept Map', 'Audio', 'Flashcards', 'PDF'], 
      default: 'Video' 
    }
  }
});

const LikeSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  tutor_id: { type: String, required: true },
  content_id: { type: String, required: true }
});

const BadgeSchema = new mongoose.Schema(
  {
    badgeId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'fa-medal' },
    criteria: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const StudentBadgeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Types.ObjectId, ref: 'Student', required: true, index: true },
    badgeId: { type: String, required: true },
    awardedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

StudentBadgeSchema.index({ studentId: 1, badgeId: 1 }, { unique: true });

const CourseLikeSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    userId: { type: mongoose.Types.ObjectId, required: true, index: true }
  },
  { timestamps: true }
);

CourseLikeSchema.index({ courseId: 1, userId: 1 }, { unique: true });

const CourseCommentSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    userId: { type: mongoose.Types.ObjectId, required: true },
    userName: { type: String, default: '' },
    comment: { type: String, required: true, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

const PlaylistSchema = new mongoose.Schema({
  id: { type: String, default: null },
  tutor_id: { type: String, default: null },
  title: { type: String, required: true },
  description: { type: String, required: true },
  thumb: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'deactive' }
});

const CourseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  suspended: { type: Boolean, default: false },
  subtitle: { type: String, default: '' },
  backgroundImage: { type: String, default: '' },
  thumb: { type: String, default: '' },
  lessons: { type: Number, default: 0 },
  duration: { type: String, default: '' },
  students: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  teacherId: { type: mongoose.Types.ObjectId, ref: 'Teacher', default: null },
  playlistId: { type: mongoose.Types.ObjectId, ref: 'Playlist', default: null }
}, { timestamps: true });

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
  xp: { type: Number, default: 0 },
  lastLoginXpAt: { type: Date, default: null },
  loginStreak: {
    count: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastDate: { type: Date, default: null }
  },
  lessonStreak: {
    count: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastDate: { type: Date, default: null }
  },
  dailyGoal: {
    lessonsTarget: { type: Number, default: 1 },
    lessonsCompletedToday: { type: Number, default: 0 },
    loginsTarget: { type: Number, default: 1 },
    loginsCompletedToday: { type: Number, default: 0 },
    lastResetAt: { type: Date, default: null }
  },
  enrolledCourses: [{ type: String }], // Array of course IDs
  googleId: { type: String },
  isGoogleAuth: { type: Boolean, default: false },
  githubId: { type: String },
  isGithubAuth: { type: Boolean, default: false },
  ...passwordResetFields,

  // --- ADDED: Learning Style Profile ---
  // This is where we will store the ML model's predictions.
  learningStyle: {
    is_intuitive: { type: Number, default: 0 }, // 0=Sensory, 1=Intuitive
    is_verbal: { type: Number, default: 0 },    // 0=Visual, 1=Verbal
    is_reflective: { type: Number, default: 0 },// 0=Active, 1=Reflective
    is_global: { type: Number, default: 0 }     // 0=Sequential, 1=Global
  },
  
  featureVector: { type: Object, default: null } 
}, { timestamps: true });

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
  ...passwordResetFields,

  learningStyle: {
    is_intuitive: { type: Number, default: 0 },
    is_verbal: { type: Number, default: 0 },
    is_reflective: { type: Number, default: 0 },
    is_global: { type: Number, default: 0 }
  },
  featureVector: { type: Object, default: null }
}, { timestamps: true });

// Admin schema
const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  image: { type: String },
  ...passwordResetFields,

  learningStyle: {
    is_intuitive: { type: Number, default: 0 },
    is_verbal: { type: Number, default: 0 },
    is_reflective: { type: Number, default: 0 },
    is_global: { type: Number, default: 0 }
  },
  featureVector: { type: Object, default: null }
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

const InteractionSchema = new mongoose.Schema({
  user_id: { type: String, required: true }, // The 'id' from StudentSchema
  content_id: { type: String, required: true }, // The 'id' from ContentSchema
  playlist_id: { type: String, required: true }, // The 'id' from PlaylistSchema

  annotations: {
    format: String,
    type: String,
    category: String,
    order: Number
  },
  
  timeSpentSeconds: { type: Number, required: true, default: 0 },
  completed: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const ModelLogSchema = new mongoose.Schema(
  {
    userId: { type: String, default: '' },
    featureVector: { type: mongoose.Schema.Types.Mixed, default: null },
    prediction: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, default: 'pending' },
    errorMessage: { type: String, default: '' },
    durationMs: { type: Number, default: 0 }
  },
  { timestamps: true }
);


module.exports = {
  Bookmark: mongoose.model('Bookmark', BookmarkSchema),
  Comment: mongoose.model('Comment', CommentSchema),
  Contact: mongoose.model('Contact', ContactSchema),
  Content: mongoose.model('Content', ContentSchema),
  Like: mongoose.model('Like', LikeSchema),
  Badge: mongoose.model('Badge', BadgeSchema),
  StudentBadge: mongoose.model('StudentBadge', StudentBadgeSchema),
  CourseLike: mongoose.model('CourseLike', CourseLikeSchema),
  CourseComment: mongoose.model('CourseComment', CourseCommentSchema),
  Course: mongoose.model('Course', CourseSchema),
  Playlist: mongoose.model('Playlist', PlaylistSchema),
  Tutor: mongoose.model('Tutor', TutorSchema),
  Student: mongoose.model('Student', StudentSchema),
  Teacher: mongoose.model('Teacher', TeacherSchema),
  Admin: mongoose.model('Admin', AdminSchema),
  PasswordReset: mongoose.model('PasswordReset', PasswordResetSchema),
  About: mongoose.model('About', AboutSchema),
  Interaction: mongoose.model('Interaction', InteractionSchema), // --- ADDED ---
  ModelLog: mongoose.model('ModelLog', ModelLogSchema)
};
