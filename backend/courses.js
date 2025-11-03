const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
// --- FIXED: Import all models, including the new User types ---
const { Content, Playlist, Student, Teacher, Admin, Course, Interaction, CourseLike, CourseComment } = require('./models');
const { handleMaterialInteraction, handleCourseProgress } = require('./gamification');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'apex101_secret';

const uploadDir = path.join(__dirname, '../uploaded_files');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });
const materialUpload = upload.fields([
  { name: 'thumb', maxCount: 1 },
  { name: 'videoFile', maxCount: 1 },
  { name: 'contentFile', maxCount: 1 }
]);

const generateCourseId = (title = '') => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `course-${Date.now()}`;
};

const ensureUniqueCourseId = async (slug) => {
  let unique = slug;
  let counter = 1;
  // Ensure slug uniqueness
  // eslint-disable-next-line no-await-in-loop
  while (await Course.exists({ id: unique })) {
    unique = `${slug}-${counter++}`;
  }
  return unique;
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return fallback;
};

const getRequestContext = async (req) => {
  if (!req.headers.authorization) return {};
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.id);
    return { decoded, user };
  } catch (err) {
    console.warn('Auth decode failed:', err.message);
    return {};
  }
};

// --- ADDED: Helper function to find a user across multiple collections ---
// Since you have Student, Teacher, and Admin models, we need to check all of them.
const findUserById = async (id) => {
  try {
    let user = await Student.findById(id);
    if (user) return user;
    user = await Teacher.findById(id);
    if (user) return user;
    user = await Admin.findById(id);
    return user; // will be null if not found in any
  } catch (err) {
    console.error("Error finding user by ID:", err.message);
    return null;
  }
};


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

const BASE_COURSE_MAP = new Map(COURSE_LIST.map(course => [course.id, course]));

const buildCourseSummary = (courseId, storedCourse) => {
  const base = BASE_COURSE_MAP.get(courseId) || {};
  const source = storedCourse || base;
  return {
    id: storedCourse?.id || courseId || base.id,
    _id: storedCourse?._id || null,
    title: source.title || source.name || base.title || base.name || '',
    name: source.title || source.name || base.title || base.name || '',
    description: source.description || base.description || '',
    subtitle: source.subtitle || base.subtitle || '',
    backgroundImage: source.backgroundImage || base.backgroundImage || '',
    thumb: source.thumb || base.thumb || '',
    lessons: source.lessons ?? base.lessons ?? 0,
    duration: source.duration || base.duration || '',
    students: source.students ?? base.students ?? 0,
    featured: source.featured ?? base.featured ?? false
  };
};

const resolveCoursePlaylistKeys = (course, fallbackId = null) => {
  const keys = new Set();
  if (fallbackId) keys.add(fallbackId.toString());
  if (course?.id) keys.add(course.id.toString());
  if (course?.playlistId) keys.add(course.playlistId.toString());
  return Array.from(keys).filter(Boolean);
};

const collectPlaylistKeysWithPlaylists = (course, fallbackId, playlists = []) => {
  const keys = new Set(resolveCoursePlaylistKeys(course, fallbackId));
  (playlists || []).forEach((playlist) => {
    if (playlist?.id) keys.add(playlist.id.toString());
    if (playlist?._id) keys.add(playlist._id.toString());
  });
  return Array.from(keys).filter(Boolean);
};

const applyLearningStylePreferences = (materials, learningStyle) => {
  let visibleItems = [...materials];
  let hiddenItems = [];
  if (!learningStyle) {
    return { visibleItems, hiddenItems };
  }

  const formatOf = (item) => item.annotations?.format;
  const typeOf = (item) => item.annotations?.type;
  const categoryOf = (item) => item.annotations?.category;

  if (learningStyle.is_verbal === 0) {
    visibleItems.sort((a, b) => {
      if (formatOf(a) === 'Visual') return -1;
      if (formatOf(b) === 'Visual') return 1;
      return 0;
    });
    hiddenItems = visibleItems.filter(o => formatOf(o) === 'Verbal');
    visibleItems = visibleItems.filter(o => formatOf(o) !== 'Verbal');
  } else {
    visibleItems.sort((a, b) => {
      if (formatOf(a) === 'Verbal') return -1;
      if (formatOf(b) === 'Verbal') return 1;
      return 0;
    });
    hiddenItems = visibleItems.filter(o => formatOf(o) === 'Visual');
    visibleItems = visibleItems.filter(o => formatOf(o) !== 'Visual');
  }

  if (learningStyle.is_intuitive === 0) {
    visibleItems.sort((a, b) => {
      if (typeOf(a) === 'Concrete') return -1;
      if (typeOf(b) === 'Concrete') return 1;
      return 0;
    });
  } else {
    visibleItems.sort((a, b) => {
      if (typeOf(a) === 'Abstract') return -1;
      if (typeOf(b) === 'Abstract') return 1;
      return 0;
    });
  }

  if (learningStyle.is_reflective === 0) {
    visibleItems.sort((a, b) => {
      if (categoryOf(a) === 'Exercise') return -1;
      if (categoryOf(b) === 'Exercise') return 1;
      return 0;
    });
    const examples = visibleItems.filter(o => categoryOf(o) === 'Example');
    const nonExamples = visibleItems.filter(o => categoryOf(o) !== 'Example');
    const examplesToHide = examples.slice(Math.floor(examples.length / 2));
    const examplesToShow = examples.slice(0, Math.floor(examples.length / 2));
    visibleItems = nonExamples.concat(examplesToShow);
    hiddenItems = hiddenItems.concat(examplesToHide);
  } else {
    visibleItems.sort((a, b) => {
      if (categoryOf(a) === 'Example') return -1;
      if (categoryOf(b) === 'Example') return 1;
      return 0;
    });
    const exercises = visibleItems.filter(o => categoryOf(o) === 'Exercise');
    const nonExercises = visibleItems.filter(o => categoryOf(o) !== 'Exercise');
    const exercisesToHide = exercises.slice(Math.floor(exercises.length / 2));
    const exercisesToShow = exercises.slice(0, Math.floor(exercises.length / 2));
    visibleItems = nonExercises.concat(exercisesToShow);
    hiddenItems = hiddenItems.concat(exercisesToHide);
  }

  if (learningStyle.is_global === 1) {
    visibleItems.sort((a, b) => {
      const isOutlineA = categoryOf(a) === 'Outline' || categoryOf(a) === 'Concept Map';
      const isOutlineB = categoryOf(b) === 'Outline' || categoryOf(b) === 'Concept Map';
      if (isOutlineA) return -1;
      if (isOutlineB) return 1;
      return 0;
    });
  }

  return { visibleItems, hiddenItems };
};

const computeCourseProgress = async (courseId, userId, options = {}) => {
  const {
    playlistIds = [courseId],
    totalMaterialsOverride = null
  } = options;

  const filter = { playlist_id: { $in: Array.from(new Set(playlistIds.map(String).filter(Boolean))) } };

  const [totalMaterials, completedIds] = await Promise.all([
    totalMaterialsOverride !== null
      ? Promise.resolve(totalMaterialsOverride)
      : Content.countDocuments(filter),
    userId
      ? Interaction.distinct('content_id', {
          ...filter,
          user_id: userId,
          $or: [
            { completed: { $exists: false } },
            { completed: true }
          ]
        })
      : Promise.resolve([])
  ]);

  const completedCount = Array.isArray(completedIds) ? completedIds.length : 0;
  const percent = totalMaterials > 0
    ? Math.min(100, Math.round((completedCount / totalMaterials) * 100))
    : 0;

  return {
    percent,
    totalMaterials,
    completedCount,
    completedIds: new Set(completedIds)
  };
};

// GET /api/courses - List all courses (merged with database overrides)
router.get('/', async (req, res) => {
  try {
    const [{ user }, storedCourses] = await Promise.all([
      getRequestContext(req),
      Course.find().lean()
    ]);

    const storedById = new Map(storedCourses.map(course => [course.id, course]));
    const enrolledSet = new Set(
      Array.isArray(user?.enrolledCourses) ? user.enrolledCourses : []
    );

    const mergedCourses = COURSE_LIST.map(baseCourse => {
      const override = storedById.get(baseCourse.id);
      if (override) storedById.delete(baseCourse.id);
      const summary = buildCourseSummary(baseCourse.id, override);
      return {
        ...summary,
        isEnrolled: enrolledSet.has(summary.id)
      };
    });

    const additionalCourses = Array.from(storedById.values()).map(course => {
      const summary = buildCourseSummary(course.id, course);
      return {
        ...summary,
        isEnrolled: enrolledSet.has(summary.id)
      };
    });

    res.json([...mergedCourses, ...additionalCourses]);
  } catch (err) {
    console.error('Courses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/student/my - Courses a student is enrolled in with progress
router.get('/student/my', async (req, res) => {
  try {
    const { user } = await getRequestContext(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!Array.isArray(user.enrolledCourses) || !user.enrolledCourses.length) {
      return res.json([]);
    }

    const enrolledIds = user.enrolledCourses.filter(Boolean);
    const storedCourses = await Course.find({ id: { $in: enrolledIds } }).lean();
    const storedById = new Map(storedCourses.map(course => [course.id, course]));

    const progressPairs = await Promise.all(
      enrolledIds.map(async (courseId) => {
        const storedCourse = storedById.get(courseId);
        const playlistKeys = resolveCoursePlaylistKeys(storedCourse, courseId);
        const progress = await computeCourseProgress(courseId, user._id.toString(), {
          playlistIds: playlistKeys
        });
        return [courseId, progress];
      })
    );
    const progressMap = new Map(progressPairs);

    const response = enrolledIds.map(courseId => {
      const summary = buildCourseSummary(courseId, storedById.get(courseId));
      const progress = progressMap.get(courseId) || {
        percent: 0,
        totalMaterials: summary.lessons || 0,
        completedCount: 0
      };

      return {
        ...summary,
        isEnrolled: true,
        progressPercent: progress.percent,
        totalMaterials: progress.totalMaterials,
        completedMaterials: progress.completedCount
      };
    });

    res.json(response);
  } catch (err) {
    console.error('Student courses fetch error:', err);
    res.status(500).json({ error: 'Failed to load enrolled courses' });
  }
});

router.get('/student/for-you', async (req, res) => {
  try {
    const { user } = await getRequestContext(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.constructor?.modelName !== 'Student') {
      return res.status(403).json({ error: 'Students only' });
    }

    const enrolled = Array.isArray(user.enrolledCourses) ? user.enrolledCourses.filter(Boolean) : [];
    if (!enrolled.length) {
      return res.json([]);
    }

    const uniqueCourseIds = Array.from(new Set(enrolled));
    const recommendations = [];

    for (const courseId of uniqueCourseIds) {
      const courseLookup = [{ id: courseId }];
      if (mongoose.Types.ObjectId.isValid(courseId)) {
        courseLookup.push({ _id: courseId });
      }
      const storedCourse = await Course.findOne({ $or: courseLookup }).lean();
      if (!storedCourse) continue;

      const courseSummary = buildCourseSummary(courseId, storedCourse);
      const playlistQuery = [{ id: courseId }];
      if (mongoose.Types.ObjectId.isValid(courseId)) {
        playlistQuery.push({ _id: courseId });
      }
      if (storedCourse.playlistId && mongoose.Types.ObjectId.isValid(storedCourse.playlistId)) {
        playlistQuery.push({ _id: storedCourse.playlistId });
      }
      const playlists = await Playlist.find({ $or: playlistQuery }).lean();
      const playlistKeys = collectPlaylistKeysWithPlaylists(storedCourse, courseId, playlists);
      if (!playlistKeys.length) {
        playlistKeys.push(courseId);
      }

      const baseFilter = { playlist_id: { $in: playlistKeys } };
      const visibilityFilter = { ...baseFilter, ...visibleStatusFilter };
      const materialsRaw = await Content.find(visibilityFilter).sort({ order: 1, date: -1 }).lean();
      if (!materialsRaw.length) continue;

      const { visibleItems } = applyLearningStylePreferences(materialsRaw, user.learningStyle || null);
      const recommendedMaterials = visibleItems.slice(0, 4).map(formatMaterial);
      if (!recommendedMaterials.length) continue;

      const coursePayload = {
        id: courseSummary.id,
        title: courseSummary.title,
        subtitle: courseSummary.subtitle,
        description: courseSummary.description,
        thumb: courseSummary.thumb,
        thumbUrl: courseSummary.thumb ? toPublicPath(courseSummary.thumb) : ''
      };

      recommendedMaterials.forEach((material) => {
        recommendations.push({
          course: coursePayload,
          material
        });
      });
    }

    res.json(recommendations.slice(0, 20));
  } catch (err) {
    console.error('Student recommendations fetch error:', err);
    res.status(500).json({ error: 'Failed to load personalized materials' });
  }
});

const deleteFileIfExists = async (filename) => {
  if (!filename) return;
  const targetPath = path.join(uploadDir, filename);
  try {
    await fs.promises.unlink(targetPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to delete file ${filename}:`, err.message);
    }
  }
};

const isLocalAsset = (value) => Boolean(value && !value.startsWith('http'));
const toPublicPath = (value) => {
  if (!value) return '';
  return value.startsWith('http') ? value : `/uploaded_files/${value}`;
};

const formatMaterial = (doc) => ({
  _id: doc._id,
  id: doc.id,
  title: doc.title,
  description: doc.description,
  status: doc.status,
  video: doc.video,
  videoUrl: toPublicPath(doc.video),
  thumb: doc.thumb,
  thumbUrl: toPublicPath(doc.thumb),
  order: doc.order,
  annotations: doc.annotations,
  textContent: doc.textContent,
  fileUrl: toPublicPath(doc.fileUrl),
  quizData: doc.quizData,
  playlist_id: doc.playlist_id,
  tutor_id: doc.tutor_id
});

const formatCourseForTeacher = (course, options = {}) => {
  const {
    materials = [],
    materialCount = materials.length
  } = options;

  return {
    _id: course._id,
    id: course.id,
    title: course.title,
    description: course.description,
    subtitle: course.subtitle,
    backgroundImage: course.backgroundImage,
    thumb: course.thumb,
    thumbUrl: toPublicPath(course.thumb),
    lessons: course.lessons,
    duration: course.duration,
    students: course.students,
    featured: course.featured,
    playlistId: course.playlistId,
    materialCount,
    materials: materials.map(formatMaterial)
  };
};

const FORMAT_OPTIONS = ['Visual', 'Verbal', 'Audio'];
const TYPE_OPTIONS = ['Abstract', 'Concrete'];
const CATEGORY_OPTIONS = ['Video', 'Example', 'Exercise', 'Quiz', 'Reading', 'Outline', 'Concept Map', 'Audio', 'Flashcards', 'PDF'];
const normalizeMaterialStatus = (value, fallback = 'active') => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['deactive', 'inactive', 'disabled', 'draft', 'hidden'].includes(normalized)) {
    return 'deactive';
  }
  if (['active', 'enabled', 'live', 'published'].includes(normalized)) {
    return 'active';
  }
  return fallback;
};

const visibleStatusFilter = {
  $or: [
    { status: { $exists: false } },
    { status: { $ne: 'deactive' } }
  ]
};

const getTeacherContext = async (req, res) => {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.decoded?.userType !== 'Teacher') {
    res.status(403).json({ error: 'Teachers only' });
    return null;
  }
  return ctx;
};

const loadCourseMaterials = async (course) => {
  const playlistKeys = resolveCoursePlaylistKeys(course);
  if (!playlistKeys.length) return [];
  return Content.find({ playlist_id: { $in: playlistKeys } })
    .sort({ order: 1, createdAt: 1 })
    .lean();
};

const syncTeacherCourseReference = async (teacherDoc, courseId) => {
  if (!teacherDoc) return;
  if (!Array.isArray(teacherDoc.coursesTaught)) {
    teacherDoc.coursesTaught = [];
  }
  const idString = courseId.toString();
  if (!teacherDoc.coursesTaught.includes(idString)) {
    teacherDoc.coursesTaught.push(idString);
    await teacherDoc.save();
  }
};

// --- Teacher course management routes ---
router.get('/teacher/my', async (req, res) => {
  const ctx = await getTeacherContext(req, res);
  if (!ctx) return;
  try {
    const courses = await Course.find({ teacherId: ctx.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const payload = await Promise.all(
      courses.map(async (course) => {
        const materials = await loadCourseMaterials(course);
        return formatCourseForTeacher(course, { materials });
      })
    );

    res.json(payload);
  } catch (err) {
    console.error('Teacher courses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.post('/teacher', upload.single('thumb'), async (req, res) => {
  const ctx = await getTeacherContext(req, res);
  if (!ctx) {
    if (req.file) await deleteFileIfExists(req.file.filename);
    return;
  }
  const { title, description, subtitle = '', backgroundImage = '', duration = '', lessons, featured } = req.body;
  if (!title || !description) {
    if (req.file) await deleteFileIfExists(req.file.filename);
    return res.status(400).json({ error: 'Title and description are required' });
  }
  try {
    const baseSlug = generateCourseId(title);
    const slug = await ensureUniqueCourseId(baseSlug);
    const thumbFile = req.file ? req.file.filename : '';

    const playlist = new Playlist({
      title,
      description,
      thumb: thumbFile,
      tutor_id: ctx.user._id,
      status: 'active',
      id: slug
    });
    await playlist.save();

    const course = new Course({
      id: slug,
      title,
      description,
      subtitle,
      backgroundImage,
      thumb: thumbFile,
      lessons: toNumber(lessons, 0),
      duration,
      students: 0,
      featured: toBoolean(featured, false),
      teacherId: ctx.user._id,
      playlistId: playlist._id
    });
    await course.save();
    await syncTeacherCourseReference(ctx.user, course._id);

    res.status(201).json(formatCourseForTeacher(course, { materials: [] }));
  } catch (err) {
    console.error('Teacher course creation error:', err);
    if (req.file) await deleteFileIfExists(req.file.filename);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/teacher/:courseId', upload.single('thumb'), async (req, res) => {
  const ctx = await getTeacherContext(req, res);
  if (!ctx) {
    if (req.file) await deleteFileIfExists(req.file.filename);
    return;
  }
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacherId?.toString() !== ctx.user._id.toString()) {
      if (req.file) await deleteFileIfExists(req.file.filename);
      return res.status(404).json({ error: 'Course not found' });
    }

    const playlist = course.playlistId ? await Playlist.findById(course.playlistId) : null;
    const {
      title,
      description,
      subtitle,
      backgroundImage,
      duration,
      lessons,
      featured
    } = req.body;

    if (title) {
      course.title = title;
      if (playlist) playlist.title = title;
    }
    if (description) {
      course.description = description;
      if (playlist) playlist.description = description;
    }
    if (subtitle !== undefined) course.subtitle = subtitle;
    if (backgroundImage !== undefined) course.backgroundImage = backgroundImage;
    if (duration !== undefined) course.duration = duration;
    if (lessons !== undefined) course.lessons = toNumber(lessons, course.lessons);
    if (featured !== undefined) course.featured = toBoolean(featured, course.featured);

    if (req.file) {
      if (isLocalAsset(course.thumb)) await deleteFileIfExists(course.thumb);
      course.thumb = req.file.filename;
      if (playlist) playlist.thumb = req.file.filename;
    }

    if (playlist) await playlist.save();
    await course.save();
    const materials = await loadCourseMaterials(course);
    res.json(formatCourseForTeacher(course, { materials }));
  } catch (err) {
    console.error('Teacher course update error:', err);
    if (req.file) await deleteFileIfExists(req.file.filename);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.get('/teacher/:courseId/materials', async (req, res) => {
  const ctx = await getTeacherContext(req, res);
  if (!ctx) return;
  try {
    const course = await Course.findById(req.params.courseId).lean();
    if (!course || course.teacherId?.toString() !== ctx.user._id.toString()) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const materials = await loadCourseMaterials(course);
    res.json(materials.map(formatMaterial));
  } catch (err) {
    console.error('Teacher materials fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.get('/teacher/materials/:materialId', async (req, res) => {
  const ctx = await getTeacherContext(req, res);
  if (!ctx) return;
  try {
    const material = await Content.findById(req.params.materialId).lean();
    if (!material) return res.status(404).json({ error: 'Material not found' });
    const query = [{ id: material.playlist_id }];
    if (mongoose.Types.ObjectId.isValid(material.playlist_id)) {
      query.push({ playlistId: material.playlist_id });
    }
    const course = await Course.findOne({ $or: query }).lean();
    if (!course || course.teacherId?.toString() !== ctx.user._id.toString()) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json({
      ...formatMaterial(material),
      courseId: course._id
    });
  } catch (err) {
    console.error('Teacher material fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

router.post('/teacher/:courseId/materials', materialUpload, async (req, res) => {
  const ctx = await getTeacherContext(req, res);
  if (!ctx) return;
  const files = req.files || {};
  const thumbFile = files.thumb?.[0];
  const videoFile = files.videoFile?.[0];
  const {
    title,
    description,
    order,
    format,
    type,
    category,
    videoUrl
  } = req.body;

  if (!title || !description) {
    if (thumbFile) await deleteFileIfExists(thumbFile.filename);
    if (videoFile) await deleteFileIfExists(videoFile.filename);
    return res.status(400).json({ error: 'Title and description are required' });
  }
  if (!FORMAT_OPTIONS.includes(format)) {
    return res.status(400).json({ error: 'Invalid primary format selection' });
  }
  if (!TYPE_OPTIONS.includes(type)) {
    return res.status(400).json({ error: 'Invalid content type selection' });
  }
  if (!CATEGORY_OPTIONS.includes(category)) {
    return res.status(400).json({ error: 'Invalid content category selection' });
  }

  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacherId?.toString() !== ctx.user._id.toString()) {
      if (thumbFile) await deleteFileIfExists(thumbFile.filename);
      if (videoFile) await deleteFileIfExists(videoFile.filename);
      return res.status(404).json({ error: 'Course not found' });
    }

    const playlistKey = course.id || course.playlistId?.toString();
    if (!playlistKey) {
      return res.status(400).json({ error: 'Course is missing playlist reference' });
    }

    if (!thumbFile) {
      return res.status(400).json({ error: 'Thumbnail image is required' });
    }

    const numericOrder = parseInt(order, 10);
    if (Number.isNaN(numericOrder) || numericOrder < 1) {
      await deleteFileIfExists(thumbFile.filename);
      if (videoFile) await deleteFileIfExists(videoFile.filename);
      if (files.contentFile?.[0]) await deleteFileIfExists(files.contentFile[0].filename);
      return res.status(400).json({ error: 'Lesson number must be a whole number starting at 1' });
    }

    const requiresVideo = ['Video', 'Example'].includes(category);
    const requiresFile = ['Reading', 'Exercise', 'Concept Map', 'Audio', 'Flashcards', 'PDF', 'Outline'].includes(category);
    const allowsTextFallback = ['Reading', 'Exercise', 'Flashcards', 'Outline'].includes(category);
    const isQuizCategory = category === 'Quiz';
    const trimmedText = req.body.textContent && req.body.textContent.trim()
      ? req.body.textContent.trim()
      : undefined;

    let resolvedVideo = null;
    if (requiresVideo) {
      if (videoFile) {
        resolvedVideo = videoFile.filename;
      } else if (videoUrl && videoUrl.trim()) {
        resolvedVideo = videoUrl.trim();
      } else {
        await deleteFileIfExists(thumbFile.filename);
        if (files.contentFile?.[0]) await deleteFileIfExists(files.contentFile[0].filename);
        return res.status(400).json({ error: 'Provide a video file or URL for this content type' });
      }
    } else if (videoFile || (videoUrl && videoUrl.trim())) {
      resolvedVideo = videoFile ? videoFile.filename : videoUrl.trim();
    }

    const contentFile = files.contentFile?.[0];
    let resolvedFile = null;
    if (contentFile) {
      resolvedFile = contentFile.filename;
    } else if (req.body.fileUrl && req.body.fileUrl.trim()) {
      resolvedFile = req.body.fileUrl.trim();
    }
    if (requiresFile && !resolvedFile) {
      if (!(allowsTextFallback && trimmedText)) {
        await deleteFileIfExists(thumbFile.filename);
        if (videoFile) await deleteFileIfExists(videoFile.filename);
        if (contentFile) await deleteFileIfExists(contentFile.filename);
        return res.status(400).json({ error: 'Upload or link a file for this content type' });
      }
    }

    let parsedQuiz = undefined;
    if (isQuizCategory) {
      if (!req.body.quizData) {
        await deleteFileIfExists(thumbFile.filename);
        if (videoFile) await deleteFileIfExists(videoFile.filename);
        if (contentFile) await deleteFileIfExists(contentFile.filename);
        return res.status(400).json({ error: 'Quiz content is required' });
      }
      try {
        parsedQuiz = typeof req.body.quizData === 'string'
          ? JSON.parse(req.body.quizData)
          : req.body.quizData;
      } catch (err) {
        await deleteFileIfExists(thumbFile.filename);
        if (videoFile) await deleteFileIfExists(videoFile.filename);
        if (contentFile) await deleteFileIfExists(contentFile.filename);
        return res.status(400).json({ error: 'Quiz data must be valid JSON' });
      }
    }

    const status = normalizeMaterialStatus(req.body.status, 'active');

    const content = new Content({
      id: new mongoose.Types.ObjectId().toString(),
      playlist_id: playlistKey,
      tutor_id: ctx.user._id.toString(),
      title,
      description,
      status,
      video: resolvedVideo,
      thumb: thumbFile.filename,
      order: numericOrder,
      textContent: trimmedText,
      fileUrl: resolvedFile,
      quizData: parsedQuiz,
      annotations: {
        format,
        type,
        category
      }
    });
    await content.save();

    course.lessons = await Content.countDocuments({ playlist_id: playlistKey, ...visibleStatusFilter });
    await course.save();

    res.status(201).json(formatMaterial(content));
  } catch (err) {
    console.error('Teacher material creation error:', err);
    if (files.thumb?.[0]) await deleteFileIfExists(files.thumb[0].filename);
    if (files.videoFile?.[0]) await deleteFileIfExists(files.videoFile[0].filename);
    if (files.contentFile?.[0]) await deleteFileIfExists(files.contentFile[0].filename);
    res.status(500).json({ error: 'Failed to upload material' });
  }
});

router.put('/teacher/:courseId/materials/:materialId', materialUpload, async (req, res) => {
  const ctx = await getTeacherContext(req, res);
  if (!ctx) return;
  const files = req.files || {};
  const thumbFile = files.thumb?.[0];
  const videoFile = files.videoFile?.[0];
  const contentFile = files.contentFile?.[0];
  const {
    title,
    description,
    order,
    format,
    type,
    category,
    videoUrl,
    textContent,
    fileUrl: fileUrlBody,
    quizData,
    status
  } = req.body;

  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacherId?.toString() !== ctx.user._id.toString()) {
      if (thumbFile) await deleteFileIfExists(thumbFile.filename);
      if (videoFile) await deleteFileIfExists(videoFile.filename);
      if (contentFile) await deleteFileIfExists(contentFile.filename);
      return res.status(404).json({ error: 'Course not found' });
    }
    const playlistKey = course.id || course.playlistId?.toString();
    if (!playlistKey) {
      if (thumbFile) await deleteFileIfExists(thumbFile.filename);
      if (videoFile) await deleteFileIfExists(videoFile.filename);
      if (contentFile) await deleteFileIfExists(contentFile.filename);
      return res.status(400).json({ error: 'Course is missing playlist reference' });
    }

    const material = await Content.findById(req.params.materialId);
    if (!material || material.playlist_id !== playlistKey) {
      if (thumbFile) await deleteFileIfExists(thumbFile.filename);
      if (videoFile) await deleteFileIfExists(videoFile.filename);
      if (contentFile) await deleteFileIfExists(contentFile.filename);
      return res.status(404).json({ error: 'Material not found' });
    }

    if (title) material.title = title;
    if (description) material.description = description;

    if (order !== undefined && order !== '') {
      const numericOrder = parseInt(order, 10);
      if (Number.isNaN(numericOrder) || numericOrder < 1) {
        if (thumbFile) await deleteFileIfExists(thumbFile.filename);
        if (videoFile) await deleteFileIfExists(videoFile.filename);
        if (contentFile) await deleteFileIfExists(contentFile.filename);
        return res.status(400).json({ error: 'Lesson number must be a whole number starting at 1' });
      }
      material.order = numericOrder;
    }

    if (format) {
      if (!FORMAT_OPTIONS.includes(format)) {
        return res.status(400).json({ error: 'Invalid primary format selection' });
      }
      material.annotations.format = format;
    }
    if (type) {
      if (!TYPE_OPTIONS.includes(type)) {
        return res.status(400).json({ error: 'Invalid content type selection' });
      }
      material.annotations.type = type;
    }
    if (category) {
      if (!CATEGORY_OPTIONS.includes(category)) {
        return res.status(400).json({ error: 'Invalid content category selection' });
      }
      material.annotations.category = category;
    }

    if (status !== undefined) {
      material.status = normalizeMaterialStatus(status, material.status || 'active');
    }

    const targetCategory = material.annotations?.category || 'Video';
    const requiresVideo = ['Video', 'Example'].includes(targetCategory);
    const requiresFile = ['Reading', 'Exercise', 'Concept Map', 'Audio', 'Flashcards', 'PDF', 'Outline'].includes(targetCategory);
    const allowsTextFallback = ['Reading', 'Exercise', 'Flashcards', 'Outline'].includes(targetCategory);
    const isQuizCategory = targetCategory === 'Quiz';
    const fallbackTextCandidate = textContent && textContent.trim()
      ? textContent.trim()
      : (material.textContent && typeof material.textContent === 'string' ? material.textContent.trim() : '');

    if (videoFile) {
      if (isLocalAsset(material.video)) await deleteFileIfExists(material.video);
      material.video = videoFile.filename;
    } else if (videoUrl && videoUrl.trim()) {
      if (isLocalAsset(material.video)) await deleteFileIfExists(material.video);
      material.video = videoUrl.trim();
    } else if (requiresVideo && !material.video) {
      return res.status(400).json({ error: 'Provide a video file or URL for this content type' });
    }

    if (contentFile) {
      if (isLocalAsset(material.fileUrl)) await deleteFileIfExists(material.fileUrl);
      material.fileUrl = contentFile.filename;
    } else if (fileUrlBody && fileUrlBody.trim()) {
      if (isLocalAsset(material.fileUrl)) await deleteFileIfExists(material.fileUrl);
      material.fileUrl = fileUrlBody.trim();
    } else if (requiresFile && !material.fileUrl) {
      if (!(allowsTextFallback && fallbackTextCandidate)) {
        return res.status(400).json({ error: 'Upload or link a file for this content type' });
      }
    }

    if (textContent !== undefined) {
      material.textContent = fallbackTextCandidate || undefined;
    }

    if (isQuizCategory) {
      if (quizData !== undefined) {
        try {
          material.quizData = typeof quizData === 'string' ? JSON.parse(quizData) : quizData;
        } catch (err) {
          if (thumbFile) await deleteFileIfExists(thumbFile.filename);
          if (videoFile) await deleteFileIfExists(videoFile.filename);
          if (contentFile) await deleteFileIfExists(contentFile.filename);
          return res.status(400).json({ error: 'Quiz data must be valid JSON' });
        }
      } else if (!material.quizData) {
        return res.status(400).json({ error: 'Quiz content is required' });
      }
    } else if (quizData !== undefined && quizData === '') {
      material.quizData = undefined;
    }

    if (thumbFile) {
      if (isLocalAsset(material.thumb)) await deleteFileIfExists(material.thumb);
      material.thumb = thumbFile.filename;
    }

    await material.save();
    course.lessons = await Content.countDocuments({ playlist_id: playlistKey, ...visibleStatusFilter });
    await course.save();
    res.json(formatMaterial(material));
  } catch (err) {
    console.error('Teacher material update error:', err);
    if (thumbFile) await deleteFileIfExists(thumbFile.filename);
    if (videoFile) await deleteFileIfExists(videoFile.filename);
    if (contentFile) await deleteFileIfExists(contentFile.filename);
    res.status(500).json({ error: 'Failed to update material' });
  }
});
// GET /api/courses/manage - List stored courses (admin only)
router.get('/manage', async (req, res) => {
  try {
    const { decoded } = await getRequestContext(req);
    if (!decoded || decoded.userType !== 'Admin') {
      return res.status(403).json({ error: 'Admins only' });
    }

    const courses = await Course.find().sort({ title: 1 }).lean();
    res.json(courses);
  } catch (err) {
    console.error('Manage courses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /api/courses/create - Create a course (admin only)
router.post('/create', upload.single('thumb'), async (req, res) => {
  try {
    const { decoded } = await getRequestContext(req);
    if (!decoded || decoded.userType !== 'Admin') {
      if (req.file) await deleteFileIfExists(req.file.filename);
      return res.status(403).json({ error: 'Admins only' });
    }

    const {
      id,
      title,
      description,
      subtitle = '',
      backgroundImage = '',
      lessons,
      duration = '',
      students,
      featured
    } = req.body;

    if (!title || !description) {
      if (req.file) await deleteFileIfExists(req.file.filename);
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const courseId = (id && id.trim()) ? id.trim() : generateCourseId(title);
    const thumb = req.file ? req.file.filename : '';

    const newCourse = new Course({
      id: courseId,
      title,
      description,
      subtitle,
      backgroundImage,
      thumb,
      lessons: toNumber(lessons),
      duration,
      students: toNumber(students),
      featured: toBoolean(featured)
    });

    await newCourse.save();
    res.status(201).json({ message: 'Course created', course: newCourse });
  } catch (err) {
    console.error('Course creation error:', err);
    if (req.file) await deleteFileIfExists(req.file.filename);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A course with that identifier already exists' });
    }
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/courses/:courseId - Update a course (admin only)
router.put('/:courseId', upload.single('thumb'), async (req, res) => {
  const { courseId } = req.params;
  try {
    const { decoded } = await getRequestContext(req);
    if (!decoded || decoded.userType !== 'Admin') {
      if (req.file) await deleteFileIfExists(req.file.filename);
      return res.status(403).json({ error: 'Admins only' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      if (req.file) await deleteFileIfExists(req.file.filename);
      return res.status(404).json({ error: 'Course not found' });
    }

    const {
      title,
      description,
      subtitle,
      backgroundImage,
      lessons,
      duration,
      students,
      featured
    } = req.body;

    if (title) course.title = title;
    if (description) course.description = description;
    if (subtitle !== undefined) course.subtitle = subtitle;
    if (backgroundImage !== undefined) course.backgroundImage = backgroundImage;
    if (lessons !== undefined) course.lessons = toNumber(lessons, course.lessons);
    if (duration !== undefined) course.duration = duration;
    if (students !== undefined) course.students = toNumber(students, course.students);
    if (featured !== undefined) course.featured = toBoolean(featured, course.featured);

    if (req.file) {
      await deleteFileIfExists(course.thumb);
      course.thumb = req.file.filename;
    }

    await course.save();
    res.json({ message: 'Course updated', course });
  } catch (err) {
    console.error('Course update error:', err);
    if (req.file) await deleteFileIfExists(req.file.filename);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// GET /api/courses/:courseId/materials/:materialId - Fetch a single material for playback
router.get('/:courseId/materials/:materialId', async (req, res) => {
  const { courseId, materialId } = req.params;
  try {
    const { user } = await getRequestContext(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isStudent = user.constructor?.modelName === 'Student';
    const isTeacher = user.constructor?.modelName === 'Teacher';
    const isAdmin = user.constructor?.modelName === 'Admin';

    if (isStudent && (!Array.isArray(user.enrolledCourses) || !user.enrolledCourses.includes(courseId))) {
      return res.status(403).json({ error: 'Enroll in this course to access materials' });
    }

    const courseLookup = [{ id: courseId }];
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      courseLookup.push({ _id: courseId });
    }
    const storedCourse = await Course.findOne({ $or: courseLookup }).lean();
    const materialQuery = [{ id: materialId }];
    if (mongoose.Types.ObjectId.isValid(materialId)) {
      materialQuery.push({ _id: materialId });
    }

    const playlists = await Playlist.find({
      $or: [
        { id: courseId },
        mongoose.Types.ObjectId.isValid(courseId) ? { _id: courseId } : null,
        storedCourse?.playlistId && mongoose.Types.ObjectId.isValid(storedCourse.playlistId)
          ? { _id: storedCourse.playlistId }
          : null
      ].filter(Boolean)
    }).lean();
    const playlistKeys = collectPlaylistKeysWithPlaylists(storedCourse, courseId, playlists);

    const material = await Content.findOne({
      playlist_id: { $in: playlistKeys },
      $or: materialQuery
    }).lean();

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const materialStatus = normalizeMaterialStatus(material.status, 'active');
    if (materialStatus !== 'active' && !(isTeacher || isAdmin)) {
      return res.status(403).json({ error: 'This material is not currently available' });
    }

    const formatted = formatMaterial(material);
    const courseSummary = buildCourseSummary(courseId, storedCourse);
    const response = {
      course: courseSummary,
      material: {
        ...formatted,
        status: materialStatus,
        textContent: material.textContent || '',
        quizData: material.quizData || null,
        hasVideo: Boolean(formatted.videoUrl),
        hasFile: Boolean(formatted.fileUrl),
        hasText: Boolean(material.textContent),
        isTeacher,
        isAdmin
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Material fetch error:', err);
    res.status(500).json({ error: 'Failed to load material' });
  }
});

// POST /api/courses/:courseId/materials/:materialId/interaction - Track student interaction
router.post('/:courseId/materials/:materialId/interaction', async (req, res) => {
  const { courseId, materialId } = req.params;
  try {
    const { user } = await getRequestContext(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isStudent = user.constructor?.modelName === 'Student';
    if (!isStudent) {
      return res.status(403).json({ error: 'Only students can track progress' });
    }
    if (!Array.isArray(user.enrolledCourses) || !user.enrolledCourses.includes(courseId)) {
      return res.status(403).json({ error: 'Enroll in this course to track progress' });
    }

    const courseLookup = [{ id: courseId }];
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      courseLookup.push({ _id: courseId });
    }
    const storedCourse = await Course.findOne({ $or: courseLookup }).lean();
    const materialQuery = [{ id: materialId }];
    if (mongoose.Types.ObjectId.isValid(materialId)) {
      materialQuery.push({ _id: materialId });
    }
    const playlists = await Playlist.find({
      $or: [
        { id: courseId },
        mongoose.Types.ObjectId.isValid(courseId) ? { _id: courseId } : null,
        storedCourse?.playlistId && mongoose.Types.ObjectId.isValid(storedCourse.playlistId)
          ? { _id: storedCourse.playlistId }
          : null
      ].filter(Boolean)
    }).lean();
    const playlistKeys = collectPlaylistKeysWithPlaylists(storedCourse, courseId, playlists);

    const material = await Content.findOne({
      playlist_id: { $in: playlistKeys },
      $or: materialQuery
    }).lean();
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const timeSpentSeconds = Math.max(0, Number(req.body.timeSpentSeconds) || 0);
    const completed = req.body.completed === undefined ? true : Boolean(req.body.completed);

    const interactionFilter = { user_id: user._id.toString(), content_id: material.id };
    const existingInteraction = await Interaction.findOne(interactionFilter).lean();

    const annotations = {
      format: material.annotations?.format || 'Visual',
      type: material.annotations?.type || 'Abstract',
      category: material.annotations?.category || 'Video',
      order: material.order ?? 0
    };

    const interactionPayload = {
      user_id: user._id.toString(),
      content_id: material.id,
      playlist_id: material.playlist_id,
      annotations,
      timeSpentSeconds,
      completed,
      timestamp: new Date()
    };

    if (!existingInteraction) {
      await Interaction.create(interactionPayload);
    } else {
      await Interaction.updateOne(interactionFilter, interactionPayload);
    }

    const {
      xpAwarded,
      totalXp,
      badgesAwarded: interactionBadges,
      streaks,
      dailyGoal
    } = await handleMaterialInteraction({
      studentDoc: user,
      material,
      completed,
      existingInteraction
    });

    const progress = await computeCourseProgress(courseId, user._id.toString(), {
      playlistIds: playlistKeys
    });

    const courseTitle = storedCourse?.title || courseId;
    const progressBadges = await handleCourseProgress({
      studentDoc: user,
      courseId,
      courseTitle,
      progressPercent: progress.percent
    });

    const badgesAwarded = [...(interactionBadges || []), ...(progressBadges || [])];

    res.json({
      message: 'Interaction recorded',
      xpAwarded,
      totalXp,
      streaks,
      dailyGoal,
      badgesAwarded,
      progress: {
        percent: progress.percent,
        totalMaterials: progress.totalMaterials,
        completedMaterials: progress.completedCount
      }
    });
  } catch (err) {
    console.error('Material interaction error:', err);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
});

// ---
// --- HEAVILY MODIFIED: Personalized course materials with filters ---
// ---
router.get('/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const PAGE_SIZE = Math.max(parseInt(req.query.pageSize, 10) || 12, 1);
  const search = req.query.search || '';
  const activeCategory = req.query.category || 'All';
  const activeFormat = req.query.format || 'All';

  try {
    const { user } = await getRequestContext(req);
    const courseLookup = [{ id: courseId }];
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      courseLookup.push({ _id: courseId });
    }
    const storedCourse = await Course.findOne({ $or: courseLookup }).lean();
    const courseSummary = buildCourseSummary(courseId, storedCourse);

    const isStudent = user?.constructor?.modelName === 'Student';
    const isTeacher = user?.constructor?.modelName === 'Teacher';
    const isAdmin = user?.constructor?.modelName === 'Admin';
    const userId = user?._id?.toString() || null;
    const isEnrolled = isStudent
      ? Array.isArray(user.enrolledCourses) && user.enrolledCourses.includes(courseId)
      : Boolean(user);

    // Fetch playlists for legacy compatibility
    const playlistQuery = [{ id: courseId }];
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      playlistQuery.push({ _id: courseId });
    }
    if (storedCourse?.playlistId && mongoose.Types.ObjectId.isValid(storedCourse.playlistId)) {
      playlistQuery.push({ _id: storedCourse.playlistId });
    }
    const playlists = await Playlist.find({ $or: playlistQuery }).lean();

    const playlistKeys = collectPlaylistKeysWithPlaylists(storedCourse, courseId, playlists);
    if (!playlistKeys.length) {
      playlistKeys.push(courseId);
    }

      const baseFilter = { playlist_id: { $in: playlistKeys } };
      const visibilityFilter = { ...baseFilter, ...visibleStatusFilter };
      const searchFilter = search ? { title: { $regex: search, $options: 'i' } } : {};
      const materialsRaw = await Content.find({
        ...visibilityFilter,
        ...searchFilter
      }).sort({ order: 1, date: -1 }).lean();
      const totalMaterialsCount = await Content.countDocuments(visibilityFilter);

    const categoryCounts = materialsRaw.reduce((acc, mat) => {
      const category = mat.annotations?.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const categories = [
      { key: 'All', label: 'All', count: materialsRaw.length },
      ...Object.entries(categoryCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, count]) => ({ key, label: key, count }))
    ];

      let filteredMaterials = materialsRaw;
      if (activeCategory && activeCategory !== 'All') {
        filteredMaterials = filteredMaterials.filter(mat =>
          (mat.annotations?.category || 'Uncategorized') === activeCategory
        );
      }
      if (activeFormat && activeFormat !== 'All') {
        const targetFormat = activeFormat.toLowerCase();
        filteredMaterials = filteredMaterials.filter(mat => {
          const sourceFormat = (mat.annotations?.format || '').toLowerCase();
          if (!sourceFormat) return false;
          if (targetFormat === 'audio') {
            return ['audio', 'auditory', 'aural'].includes(sourceFormat);
          }
          return sourceFormat === targetFormat;
        });
      }

    const learningStyle = isStudent ? user?.learningStyle : null;
    const { visibleItems, hiddenItems } = applyLearningStylePreferences(filteredMaterials, learningStyle);

    const start = (page - 1) * PAGE_SIZE;
    const paginatedVisibleItems = visibleItems.slice(start, start + PAGE_SIZE);

    const progress = await computeCourseProgress(courseId, userId, {
      playlistIds: playlistKeys,
      totalMaterialsOverride: totalMaterialsCount
    });
    const completedIds = progress.completedIds || new Set();

    const materials = (isStudent && !isEnrolled) ? [] : paginatedVisibleItems.map(mat => {
      const formatted = formatMaterial(mat);
      return {
        ...formatted,
        isCompleted: completedIds.has(mat.id)
      };
    });

    const mappedHiddenItems = hiddenItems.map(mat => {
      const formatted = formatMaterial(mat);
      return {
        ...formatted,
        isCompleted: completedIds.has(mat.id)
      };
    });

    res.json({
      course: {
        ...courseSummary,
        isEnrolled: isEnrolled || isTeacher || isAdmin,
        progressPercent: progress.percent,
        totalMaterials: progress.totalMaterials,
        completedMaterials: progress.completedCount
      },
      materials,
      hiddenItems: mappedHiddenItems,
      playlists,
        filters: {
          categories,
          activeCategory,
          activeFormat
        },
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        totalItems: visibleItems.length
      },
      enrollmentRequired: Boolean(user) && isStudent && !isEnrolled
    });
  } catch (err) {
    console.error('Course materials fetch error:', err);
    try {
      const logLine = `[${new Date().toISOString()}] ${courseId}: ${err?.stack || err}\n`;
      fs.appendFileSync(path.join(__dirname, 'course-material-errors.log'), logLine, 'utf8');
    } catch (logErr) {
      console.error('Failed to write course material error log:', logErr);
    }
    res.status(500).json({ error: 'Failed to fetch course materials' });
  }
});

router.get('/:courseId/social', async (req, res) => {
  const { courseId } = req.params;
  try {
    const { user } = await getRequestContext(req);
    const userId = user?._id ? user._id.toString() : null;

    const [likesCount, comments] = await Promise.all([
      CourseLike.countDocuments({ courseId }),
      CourseComment.find({ courseId }).sort({ createdAt: -1 }).limit(100).lean()
    ]);

    const hasLiked = userId
      ? await CourseLike.exists({ courseId, userId })
      : false;

    const serializedComments = comments.map((comment) => ({
      id: comment._id.toString(),
      courseId: comment.courseId,
      userId: comment.userId?.toString(),
      userName: comment.userName || 'Learner',
      comment: comment.comment,
      createdAt: comment.createdAt
    }));

    res.json({
      likesCount,
      hasLiked: Boolean(hasLiked),
      comments: serializedComments
    });
  } catch (err) {
    console.error('Course social fetch error:', err);
    res.status(500).json({ error: 'Failed to load course feedback' });
  }
});

router.post('/:courseId/like', async (req, res) => {
  const { courseId } = req.params;
  try {
    const { user } = await getRequestContext(req);
    if (!user?._id) {
      return res.status(401).json({ error: 'Login required to like a course' });
    }

    const userId = user._id;
    const existing = await CourseLike.findOne({ courseId, userId });
    let liked;
    if (existing) {
      await existing.deleteOne();
      liked = false;
    } else {
      await CourseLike.create({ courseId, userId });
      liked = true;
    }

    const likesCount = await CourseLike.countDocuments({ courseId });
    res.json({ liked, likesCount });
  } catch (err) {
    if (err.code === 11000) {
      const likesCount = await CourseLike.countDocuments({ courseId });
      return res.json({ liked: true, likesCount });
    }
    console.error('Course like error:', err);
    res.status(500).json({ error: 'Failed to update like' });
  }
});

router.post('/:courseId/comments', async (req, res) => {
  const { courseId } = req.params;
  const text = (req.body?.comment || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }
  if (text.length > 1000) {
    return res.status(400).json({ error: 'Comment is too long' });
  }

  try {
    const { user } = await getRequestContext(req);
    if (!user?._id) {
      return res.status(401).json({ error: 'Login required to comment' });
    }

    const userName = user.name || user.email || 'Learner';
    const created = await CourseComment.create({
      courseId,
      userId: user._id,
      userName,
      comment: text
    });

    res.status(201).json({
      id: created._id.toString(),
      courseId: created.courseId,
      userId: created.userId.toString(),
      userName: created.userName,
      comment: created.comment,
      createdAt: created.createdAt
    });
  } catch (err) {
    console.error('Course comment error:', err);
    res.status(500).json({ error: 'Failed to submit comment' });
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
    // FIXED: Use our helper function to find the user
    const user = await findUserById(decoded.id); 
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Example: add courseId to user's enrolledCourses array
    if (!user.enrolledCourses) user.enrolledCourses = [];
    if (!user.enrolledCourses.includes(courseId)) {
      user.enrolledCourses.push(courseId);
      await user.save();
    }
    res.json({ message: 'Enrolled successfully' });
  } catch (err) {
    console.error(err); // Log the full error
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

module.exports = router;



