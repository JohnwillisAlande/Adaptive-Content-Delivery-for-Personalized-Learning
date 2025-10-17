const express = require('express');
const router = express.Router();
const { Content, Playlist, User } = require('./models');
const jwt = require('jsonwebtoken');

// Hardcoded fallback courses
const COURSE_LIST = [
  {
    id: 'english',
    name: 'English',
    icon: 'FaBook',
    thumb: 'https://via.placeholder.com/640x360/2563eb/ffffff?text=English',
    color: 'bg-blue-600'
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: 'FaCalculator',
    thumb: 'https://via.placeholder.com/640x360/059669/ffffff?text=Mathematics',
    color: 'bg-green-600'
  },
  {
    id: 'kiswahili',
    name: 'Kiswahili',
    icon: 'FaGlobeAfrica',
    thumb: 'https://via.placeholder.com/640x360/f59e42/ffffff?text=Kiswahili',
    color: 'bg-orange-500'
  },
  {
    id: 'environmental',
    name: 'Environmental Activities',
    icon: 'FaLeaf',
    thumb: 'https://via.placeholder.com/640x360/065f46/ffffff?text=Environmental',
    color: 'bg-green-900'
  },
  {
    id: 'hygiene-nutrition',
    name: 'Hygiene and Nutrition',
    icon: 'FaAppleAlt',
    thumb: 'https://via.placeholder.com/640x360/ef4444/ffffff?text=Hygiene+%26+Nutrition',
    color: 'bg-red-600'
  },
  {
    id: 'religious',
    name: 'Religious Activities',
    icon: 'FaPray',
    thumb: 'https://via.placeholder.com/640x360/7c3aed/ffffff?text=Religious',
    color: 'bg-purple-700'
  },
  {
    id: 'creative-movement',
    name: 'Creative and Movement Activities',
    icon: 'FaPaintBrush',
    thumb: 'https://via.placeholder.com/640x360/facc15/000000?text=Creative+%26+Movement',
    color: 'bg-yellow-400'
  },
];

// GET /api/courses - List all courses
router.get('/', async (req, res) => {
  try {
    // If you have a Course model, fetch from DB, else fallback
    // const courses = await Course.find();
    res.json(COURSE_LIST);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/:courseId - Get course materials
router.get('/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search || '';
  const PAGE_SIZE = 10;
  try {
    // Example: fetch playlists and contents for the course
    const playlists = await Playlist.find({ course: courseId });
    const materialsRaw = await Content.find({
      course: courseId,
      title: { $regex: search, $options: 'i' }
    })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);
    // Map materials to include thumb, title, videoUrl
    const materials = materialsRaw.map(mat => ({
      id: mat._id,
      title: mat.title,
      thumb: mat.thumb || 'https://via.placeholder.com/640x360/222/fff?text=Material',
      videoUrl: mat.videoUrl || '',
      description: mat.description || ''
    }));
    // Example progress (replace with real logic)
    let progress = null;
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'apex101_secret');
        const user = await User.findById(decoded.id);
        // Calculate progress based on user activity (stub)
        progress = Math.floor(Math.random() * 100); // Replace with real progress
      } catch {}
    }
    res.json({ materials, playlists, progress });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course materials' });
  }
});

// POST /api/enroll/:courseId - Enroll user in course
router.post('/enroll/:courseId', async (req, res) => {
  const { courseId } = req.params;
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'apex101_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Example: add courseId to user's enrolledCourses array
    if (!user.enrolledCourses) user.enrolledCourses = [];
    if (!user.enrolledCourses.includes(courseId)) {
      user.enrolledCourses.push(courseId);
      await user.save();
    }
    res.json({ message: 'Enrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

module.exports = router;
