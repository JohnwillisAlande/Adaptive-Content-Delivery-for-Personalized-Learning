// 1. CORE DEPENDENCIES AND ROUTER INITIALIZATION
const express = require('express');
const router = express.Router(); // <--- CORRECT: Router initialized first

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const models = require('./models');
const { awardLoginXp, getBadgeDefinitions, getStudentBadges, dailyGoalSnapshot, streakSnapshot } = require('./gamification');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const axios = require('axios'); // <-- ADDED: For calling Python API

const JWT_SECRET = process.env.JWT_SECRET || 'apex101_secret';
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const isAdminRequest = (req) => req?.user?.userType === 'Admin';
const ensureAdmin = (req, res) => {
    if (!isAdminRequest(req)) {
        res.status(403).json({ error: 'Admins only' });
        return false;
    }
    return true;
};

const calculateOnlineStatus = (dateValue) => {
    if (!dateValue) return false;
    const timestamp = new Date(dateValue).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= ONLINE_WINDOW_MS;
};

const collectCourseKeys = (course) => {
    const keys = new Set();
    if (!course) return [];
    if (course.id) keys.add(course.id.toString());
    if (course._id) keys.add(course._id.toString());
    if (course.playlistId) keys.add(course.playlistId.toString());
    return Array.from(keys).filter(Boolean);
};

const buildTeacherCourseContext = async (teacherId) => {
    const teacher = await models.Teacher.findById(teacherId).lean();
    if (!teacher) return null;
    const courses = await models.Course.find({ teacherId: teacher._id })
        .sort({ createdAt: -1 })
        .lean();

    const keyToCourseId = new Map();
    const courseIdToCourse = new Map();
    courses.forEach((course) => {
        const idString = course._id.toString();
        courseIdToCourse.set(idString, course);
        collectCourseKeys(course).forEach((key) => {
            keyToCourseId.set(key, idString);
        });
    });

    const playlistKeys = Array.from(keyToCourseId.keys());
    return { teacher, courses, keyToCourseId, courseIdToCourse, playlistKeys };
};

const buildStudentLearningLabel = (learningStyle = {}) => {
    const dimensions = [];
    dimensions.push(learningStyle.is_intuitive ? 'Intuitive' : 'Sensory');
    dimensions.push(learningStyle.is_verbal ? 'Verbal' : 'Visual');
    dimensions.push(learningStyle.is_reflective ? 'Reflective' : 'Active');
    dimensions.push(learningStyle.is_global ? 'Global' : 'Sequential');
    return dimensions.join(' · ');
};

const buildStudentCourseContext = async (studentId) => {
    const student = await models.Student.findById(studentId).lean();
    if (!student) return null;
    const enrolledRaw = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];
    const enrolled = enrolledRaw.map((value) => value?.toString()).filter(Boolean);
    const courses = enrolled.length
        ? await models.Course.find({ id: { $in: enrolled } }).lean()
        : [];

    const courseMap = new Map();
    const playlistToCourse = new Map();
    const playlistKeys = [];
    courses.forEach((course) => {
        courseMap.set(course.id, course);
        collectCourseKeys(course).forEach((key) => {
            playlistToCourse.set(key, course.id);
            playlistKeys.push(key);
        });
    });

    return {
        student,
        enrolledCourseIds: enrolled,
        courses,
        courseMap,
        playlistToCourse,
        playlistKeys
    };
};

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001/predict';
const resolveModelHealthUrl = () => process.env.ML_API_HEALTH_URL || ML_API_URL.replace(/\/predict$/, '/health');

const checkModelStatus = async () => {
    const healthUrl = resolveModelHealthUrl();
    try {
        const response = await axios.get(healthUrl, { timeout: 2000 });
        return { running: true, message: response.statusText || 'OK' };
    } catch (err) {
        if (err.response) {
            return { running: true, message: err.response.statusText || 'Responding' };
        }
        return { running: false, message: err.message };
    }
};

// ---
// --- ADDED: HELPER FUNCTIONS TO FIND USERS ACROSS COLLECTIONS ---
// ---
// This function finds a user by email in Student, Teacher, or Admin
const findUserByEmail = async (email) => {
    if (!email) return null;
    const emailLower = email.toLowerCase();
    let user = await models.Student.findOne({ email: emailLower });
    if (user) return user;
    user = await models.Teacher.findOne({ email: emailLower });
    if (user) return user;
    user = await models.Admin.findOne({ email: emailLower });
    return user; // will be null if not found
};

// This function finds a user by ID in Student, Teacher, or Admin
const findUserById = async (id) => {
    if (!id) return null;
    try {
        let user = await models.Student.findById(id);
        if (user) return user;
        user = await models.Teacher.findById(id);
        if (user) return user;
        user = await models.Admin.findById(id);
        return user;
    } catch (err) {
        console.error("Error finding user by ID:", err.message);
        return null;
    }
};
// ---
// --- END HELPER FUNCTIONS ---
// ---

// 2. AUTH MIDDLEWARE (Must be defined before any routes that use it)
function auth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'No token' });
    const token = header.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// 3. MULTER SETUP (Must be defined before the upload variable is used in routes)
const uploadDir = path.join(__dirname, '../uploaded_files');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});
const upload = multer({ storage });


// 4. ROUTE DEFINITIONS START HERE (Now 'router' and 'auth' are ready)

// --- Disable/Enable Teacher ---
router.put('/teachers/:id/active', auth, async (req, res) => {
    try {
        if (req.user.userType !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
        const { active } = req.body;
        // FIXED: Your Tutor model is likely 'Teacher' based on login, but 'Tutor' in models.js
        // Let's use 'Tutor' as defined in your models.js
        const teacher = await models.Tutor.findByIdAndUpdate(req.params.id, { active }, { new: true });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        res.json({ message: `Teacher ${active ? 'enabled' : 'disabled'}` });
    } catch (err) {
        console.error('Teacher active error:', err);
        res.status(500).json({ error: 'Failed to update teacher status' });
    }
});

// --- Teachers List ---
router.get('/teachers', auth, async (req, res) => {
    try {
        const userType = req.user.userType;
        let query = {};
        // For non-admins, you may want to filter or limit fields
        let projection = { name: 1, profession: 1, email: 1, image: 1 };
        if (userType !== 'Admin') {
            // Optionally filter public teachers, e.g., only active ones
            // query = { status: 'active' };
        }
        // FIXED: Using 'Tutor' model
        const teachers = await models.Tutor.find(query, projection);
        res.json(teachers);
    } catch (err) {
        console.error('Teachers fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
});

router.get('/admin/teachers', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    try {
        const teachers = await models.Teacher.find({}, { password: 0, reset_token: 0, reset_expiry: 0 })
            .sort({ createdAt: -1 })
            .lean();

        const courseStats = await models.Course.aggregate([
            { $match: { teacherId: { $ne: null } } },
            {
                $group: {
                    _id: '$teacherId',
                    courseCount: { $sum: 1 },
                    totalStudents: { $sum: { $ifNull: ['$students', 0] } }
                }
            }
        ]);
        const statsMap = new Map(courseStats.map((item) => [item._id?.toString(), item]));

        const payload = teachers.map((teacher) => {
            const hash = statsMap.get(teacher._id.toString()) || {};
            const lastActiveAt = teacher.updatedAt || teacher.createdAt;
            return {
                id: teacher._id.toString(),
                name: teacher.name,
                email: teacher.email,
                image: teacher.image || '',
                courseCount: hash.courseCount || 0,
                totalStudents: hash.totalStudents || 0,
                registeredAt: teacher.createdAt,
                lastActiveAt,
                online: calculateOnlineStatus(lastActiveAt)
            };
        });

        res.json(payload);
    } catch (err) {
        console.error('Admin teachers list error:', err);
        res.status(500).json({ error: 'Failed to load teachers' });
    }
});

router.get('/admin/teachers/:teacherId', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    try {
        const context = await buildTeacherCourseContext(req.params.teacherId);
        if (!context) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        const { teacher, courses, keyToCourseId, courseIdToCourse, playlistKeys } = context;

        const courseKeyBySlug = new Map();
        courses.forEach((course) => {
            const slug = course.id || course._id?.toString();
            if (slug) {
                courseKeyBySlug.set(slug, course._id.toString());
            }
        });
        const courseSlugList = Array.from(courseKeyBySlug.keys());

        const studentCountsMap = new Map();
        let uniqueEnrolledCount = 0;

        if (courseSlugList.length) {
            const studentAgg = await models.Student.aggregate([
                { $match: { enrolledCourses: { $exists: true, $ne: [] } } },
                { $unwind: '$enrolledCourses' },
                { $match: { enrolledCourses: { $in: courseSlugList } } },
                { $group: { _id: '$enrolledCourses', count: { $sum: 1 } } }
            ]);
            studentAgg.forEach((entry) => {
                const normalizedId = courseKeyBySlug.get(entry._id) || entry._id;
                studentCountsMap.set(
                    normalizedId,
                    (studentCountsMap.get(normalizedId) || 0) + entry.count
                );
            });
            uniqueEnrolledCount = await models.Student.countDocuments({
                enrolledCourses: { $in: courseSlugList }
            });
        }

        const materialMap = new Map();
        const interactionMap = new Map();
        let distinctLearners = [];

        if (playlistKeys.length) {
            const materialCounts = await models.Content.aggregate([
                { $match: { playlist_id: { $in: playlistKeys } } },
                { $group: { _id: '$playlist_id', count: { $sum: 1 } } }
            ]);
            materialCounts.forEach((entry) => {
                const key = keyToCourseId.get(entry._id);
                if (!key) return;
                materialMap.set(key, (materialMap.get(key) || 0) + entry.count);
            });

            const interactionCounts = await models.Interaction.aggregate([
                { $match: { playlist_id: { $in: playlistKeys } } },
                {
                    $group: {
                        _id: '$playlist_id',
                        totalVisits: { $sum: 1 },
                        totalTime: { $sum: '$timeSpentSeconds' }
                    }
                }
            ]);
            interactionCounts.forEach((entry) => {
                const key = keyToCourseId.get(entry._id);
                if (!key) return;
                const prev = interactionMap.get(key) || { totalVisits: 0, totalTime: 0 };
                prev.totalVisits += entry.totalVisits || 0;
                prev.totalTime += entry.totalTime || 0;
                interactionMap.set(key, prev);
            });

            distinctLearners = await models.Interaction.distinct('user_id', {
                playlist_id: { $in: playlistKeys }
            });
        }

        const recentInteractions = playlistKeys.length
            ? await models.Interaction.find({ playlist_id: { $in: playlistKeys } })
                .sort({ timestamp: -1 })
                .limit(6)
                .select('playlist_id user_id timeSpentSeconds completed timestamp annotations')
                .lean()
            : [];

        const courseStats = courses.map((course) => {
            const idString = course._id.toString();
            const interactions = interactionMap.get(idString) || { totalVisits: 0, totalTime: 0 };
            const slug = course.id || idString;
            const studentCount =
                studentCountsMap.get(idString) ||
                studentCountsMap.get(slug) ||
                0;
            return {
                id: slug,
                courseId: idString,
                title: course.title,
                createdAt: course.createdAt,
                students: studentCount,
                lessons: course.lessons || 0,
                materialsCount: materialMap.get(idString) || 0,
                totalVisits: interactions.totalVisits,
                totalTimeSpentSeconds: interactions.totalTime
            };
        });

        const overview = {
            totalCourses: courses.length,
            totalStudents: uniqueEnrolledCount,
            totalMaterials: courseStats.reduce((sum, course) => sum + (course.materialsCount || 0), 0),
            totalVisits: courseStats.reduce((sum, course) => sum + (course.totalVisits || 0), 0),
            totalTimeSpentSeconds: courseStats.reduce((sum, course) => sum + (course.totalTimeSpentSeconds || 0), 0),
            uniqueLearners: distinctLearners.length
        };
        overview.averageTimePerCourse = overview.totalCourses
            ? overview.totalTimeSpentSeconds / overview.totalCourses
            : 0;

        const recentPayload = recentInteractions.map((entry) => {
            const courseId = keyToCourseId.get(entry.playlist_id);
            const course = courseId ? courseIdToCourse.get(courseId) : null;
            return {
                id: entry._id?.toString(),
                courseId: course?.id || course?._id?.toString(),
                courseTitle: course?.title || 'Course',
                userId: entry.user_id,
                timeSpentSeconds: entry.timeSpentSeconds,
                completed: entry.completed,
                timestamp: entry.timestamp,
                annotations: entry.annotations || {}
            };
        });

        res.json({
            teacher: {
                id: teacher._id.toString(),
                name: teacher.name,
                email: teacher.email,
                image: teacher.image || '',
                registeredAt: teacher.createdAt,
                lastActiveAt: teacher.updatedAt || teacher.createdAt,
                online: calculateOnlineStatus(teacher.updatedAt || teacher.createdAt)
            },
            overview,
            courses: courseStats,
            recentInteractions: recentPayload
        });
    } catch (err) {
        console.error('Admin teacher detail error:', err);
        res.status(500).json({ error: 'Failed to load teacher details' });
    }
});

router.get('/admin/teachers/:teacherId/logs', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    try {
        const context = await buildTeacherCourseContext(req.params.teacherId);
        if (!context) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        const { teacher, keyToCourseId, courseIdToCourse, playlistKeys } = context;
        if (!playlistKeys.length) {
            return res.json({ teacher: { id: teacher._id.toString(), name: teacher.name }, logs: [] });
        }
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const entries = await models.Interaction.find({ playlist_id: { $in: playlistKeys } })
            .sort({ timestamp: -1 })
            .limit(limit)
            .select('playlist_id user_id timeSpentSeconds completed timestamp annotations')
            .lean();
        const logs = entries.map((entry) => {
            const courseId = keyToCourseId.get(entry.playlist_id);
            const course = courseId ? courseIdToCourse.get(courseId) : null;
            return {
                id: entry._id?.toString(),
                userId: entry.user_id,
                courseId: course?.id || course?._id?.toString(),
                courseTitle: course?.title || 'Course',
                timeSpentSeconds: entry.timeSpentSeconds,
                completed: entry.completed,
                timestamp: entry.timestamp,
                annotations: entry.annotations || {}
            };
        });
        res.json({
            teacher: { id: teacher._id.toString(), name: teacher.name },
            logs
        });
    } catch (err) {
        console.error('Admin teacher logs error:', err);
        res.status(500).json({ error: 'Failed to load teacher logs' });
    }
});

router.get('/admin/students', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    try {
        const students = await models.Student.find()
            .select('name email image enrolledCourses learningStyle createdAt updatedAt')
            .lean();
        const payload = students.map((student) => ({
            id: student._id.toString(),
            name: student.name,
            email: student.email,
            image: student.image || '',
            courseCount: Array.isArray(student.enrolledCourses) ? student.enrolledCourses.filter(Boolean).length : 0,
            registeredAt: student.createdAt,
            lastActiveAt: student.updatedAt || student.createdAt,
            online: calculateOnlineStatus(student.updatedAt || student.createdAt),
            learningStyleLabel: buildStudentLearningLabel(student.learningStyle || {})
        }));
        res.json(payload);
    } catch (err) {
        console.error('Admin students list error:', err);
        res.status(500).json({ error: 'Failed to load students' });
    }
});

router.get('/admin/students/:studentId', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    try {
        const context = await buildStudentCourseContext(req.params.studentId);
        if (!context) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const { student, enrolledCourseIds, courses, courseMap, playlistToCourse, playlistKeys } = context;
        const learnerId = student._id.toString();
        const baseMatch = { user_id: learnerId };
        let courseSummaryAgg = [];
        let formatAgg = [];
        let materialAgg = [];
        let materialsList = [];
        if (playlistKeys.length) {
            baseMatch.playlist_id = { $in: playlistKeys };
            const matchStage = [{ $match: baseMatch }];
            courseSummaryAgg = await models.Interaction.aggregate([
                ...matchStage,
                {
                    $group: {
                        _id: '$playlist_id',
                        clicks: { $sum: 1 },
                        totalTime: { $sum: '$timeSpentSeconds' },
                        completions: { $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] } },
                        lastViewedAt: { $max: '$timestamp' }
                    }
                }
            ]);
            formatAgg = await models.Interaction.aggregate([
                ...matchStage,
                {
                    $group: {
                        _id: { playlist_id: '$playlist_id', format: '$annotations.format' },
                        clicks: { $sum: 1 },
                        totalTime: { $sum: '$timeSpentSeconds' }
                    }
                }
            ]);
            materialAgg = await models.Interaction.aggregate([
                ...matchStage,
                {
                    $group: {
                        _id: '$content_id',
                        clicks: { $sum: 1 },
                        totalTime: { $sum: '$timeSpentSeconds' },
                        lastViewedAt: { $max: '$timestamp' }
                    }
                }
            ]);
            materialsList = await models.Content.find({ playlist_id: { $in: playlistKeys } })
                .sort({ order: 1, createdAt: 1 })
                .lean();
        }

        const courseSummaryMap = new Map();
        courseSummaryAgg.forEach((entry) => {
            const courseId = playlistToCourse.get(entry._id);
            if (!courseId) return;
            courseSummaryMap.set(courseId, {
                clicks: entry.clicks || 0,
                totalTimeSpentSeconds: entry.totalTime || 0,
                completions: entry.completions || 0,
                lastViewedAt: entry.lastViewedAt || null
            });
        });

        const formatBreakdownMap = new Map();
        formatAgg.forEach((entry) => {
            const courseId = playlistToCourse.get(entry._id.playlist_id);
            if (!courseId) return;
            const rows = formatBreakdownMap.get(courseId) || [];
            rows.push({
                format: entry._id.format || 'Unspecified',
                clicks: entry.clicks || 0,
                totalTimeSpentSeconds: entry.totalTime || 0
            });
            formatBreakdownMap.set(courseId, rows);
        });

        const materialStatsMap = new Map(
            materialAgg.map((entry) => [entry._id?.toString(), entry])
        );

        const courseMaterialsMap = new Map();
        materialsList.forEach((material) => {
            const playlistId = material.playlist_id?.toString();
            const courseId = playlistToCourse.get(playlistId);
            if (!courseId) return;
            const rows = courseMaterialsMap.get(courseId) || [];
            rows.push(material);
            courseMaterialsMap.set(courseId, rows);
        });

        const coursesPayload = enrolledCourseIds.map((courseId) => {
            const doc = courseMap.get(courseId);
            const metrics = courseSummaryMap.get(courseId) || {
                clicks: 0,
                totalTimeSpentSeconds: 0,
                completions: 0,
                lastViewedAt: null
            };
            const formatBreakdown = formatBreakdownMap.get(courseId) || [];
            const materials = (courseMaterialsMap.get(courseId) || []).map((material) => {
                const materialId = material.id || material._id?.toString();
                const stats = materialStatsMap.get(materialId) || {};
                return {
                    id: materialId,
                    title: material.title,
                    annotations: material.annotations || {},
                    clicks: stats.clicks || 0,
                    totalTimeSpentSeconds: stats.totalTime || 0,
                    lastViewedAt: stats.lastViewedAt || null
                };
            });
            return {
                id: courseId,
                title: doc?.title || courseId,
                subtitle: doc?.subtitle || '',
                metrics,
                formatBreakdown,
                materials
            };
        });

        const badges = await models.StudentBadge.find({ studentId: student._id })
            .select('badgeId awardedAt')
            .lean();

        const gamification = {
            xp: student.xp || 0,
            loginStreak: student.loginStreak || { count: 0, longest: 0 },
            lessonStreak: student.lessonStreak || { count: 0, longest: 0 },
            dailyGoal: student.dailyGoal || null,
            badges: badges.map((badge) => ({
                badgeId: badge.badgeId,
                awardedAt: badge.awardedAt
            }))
        };

        res.json({
            student: {
                id: student._id.toString(),
                name: student.name,
                email: student.email,
                image: student.image || '',
                registeredAt: student.createdAt,
                lastActiveAt: student.updatedAt || student.createdAt,
                online: calculateOnlineStatus(student.updatedAt || student.createdAt),
                learningStyle: student.learningStyle || {},
                learningStyleLabel: buildStudentLearningLabel(student.learningStyle || {}),
                featureVector: student.featureVector || null,
                gamification,
                courseCount: enrolledCourseIds.length
            },
            courses: coursesPayload
        });
    } catch (err) {
        console.error('Admin student detail error:', err);
        res.status(500).json({ error: 'Failed to load student details' });
    }
});

router.get('/admin/students/:studentId/logs', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    try {
        const context = await buildStudentCourseContext(req.params.studentId);
        if (!context) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const { student, playlistToCourse, courseMap } = context;
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const entries = await models.Interaction.find({ user_id: student._id.toString() })
            .sort({ timestamp: -1 })
            .limit(limit)
            .select('playlist_id annotations timeSpentSeconds completed timestamp')
            .lean();

        const logs = entries.map((entry) => {
            const courseId = playlistToCourse.get(entry.playlist_id);
            const course = courseId ? courseMap.get(courseId) : null;
            return {
                id: entry._id?.toString(),
                courseId,
                courseTitle: course?.title || 'Course',
                format: entry.annotations?.format || '—',
                category: entry.annotations?.category || '—',
                timeSpentSeconds: entry.timeSpentSeconds,
                completed: entry.completed,
                timestamp: entry.timestamp
            };
        });

        res.json({
            student: {
                id: student._id.toString(),
                name: student.name
            },
            logs
        });
    } catch (err) {
        console.error('Admin student logs error:', err);
        res.status(500).json({ error: 'Failed to load student logs' });
    }
});

router.get('/model/status', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const status = await checkModelStatus();
    res.json({
        running: status.running,
        message: status.message,
        checkedAt: new Date().toISOString()
    });
});

router.get('/admin/model/logs', auth, async (req, res) => {
    if (!ensureAdmin(req, res)) return;
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const [logs, totalRequests, successCount, failureCount, avgDurationDoc, lastSuccess, lastFailure] = await Promise.all([
            models.ModelLog.find().sort({ createdAt: -1 }).limit(limit).lean(),
            models.ModelLog.countDocuments(),
            models.ModelLog.countDocuments({ status: 'success' }),
            models.ModelLog.countDocuments({ status: 'error' }),
            models.ModelLog.aggregate([
                { $group: { _id: null, avgDuration: { $avg: '$durationMs' } } }
            ]),
            models.ModelLog.findOne({ status: 'success' }).sort({ createdAt: -1 }).lean(),
            models.ModelLog.findOne({ status: 'error' }).sort({ createdAt: -1 }).lean()
        ]);
        res.json({
            metrics: {
                totalRequests,
                successCount,
                failureCount,
                averageDurationMs: avgDurationDoc?.[0]?.avgDuration || 0,
                lastSuccessAt: lastSuccess?.createdAt || null,
                lastFailureAt: lastFailure?.createdAt || null
            },
            logs
        });
    } catch (err) {
        console.error('Model logs fetch error:', err);
        res.status(500).json({ error: 'Failed to load model logs' });
    }
});

// --- About Us GET ---
router.get('/about', auth, async (req, res) => {
    try {
        let about = await models.About.findOne();
        if (!about) {
            // Create default if not exists
            about = await models.About.create({
                title: 'Welcome to ApexLearn',
                description: 'ApexLearn is an innovative online learning platform dedicated to empowering students and teachers worldwide. Our mission is to provide high-quality, accessible education for everyone, everywhere.',
                mission: 'To inspire lifelong learning and personal growth through engaging courses, expert instructors, and a supportive community.',
                vision: 'To be the leading platform for transformative education, fostering a global network of learners and educators.'
            });
        }
        // If not admin, return read-only
        if (req.user.userType !== 'Admin') {
            return res.json({
                title: about.title,
                description: about.description,
                mission: about.mission,
                vision: about.vision
            });
        }
        // Admin: return all fields
        res.json(about);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch About Us' });
    }
});

// --- About Us PUT ---
router.put('/about', auth, async (req, res) => {
    try {
        if (req.user.userType !== 'Admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        let about = await models.About.findOne();
        if (!about) {
            about = new models.About();
        }
        about.title = req.body.title;
        about.description = req.body.description;
        about.mission = req.body.mission;
        about.vision = req.body.vision;
        await about.save();
        res.json({ message: 'About Us updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update About Us' });
    }
});

// --- Forgot Password ---
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        // FIXED: Use helper function
        const user = await findUserByEmail(email); 
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000);
        user.reset_token = token;
        user.reset_expiry = expiry;
        await user.save();

        const resetLink = `http://localhost:3000/new-password/${token}`;
        console.log(`Reset link for ${user.email}: ${resetLink}`);

        if (process.env.EMAIL_USER) {
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'ApexLearn Password Reset',
                html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
            });
        }

        res.json({ message: 'Reset link sent to your email' });
    } catch (err) {
        console.error('Forgot error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- New Password Reset ---
router.post('/new-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

        // FIXED: Need to search all 3 user models for the token
        let user = await models.Student.findOne({ reset_token: token, reset_expiry: { $gt: new Date() } });
        if (!user) {
            user = await models.Teacher.findOne({ reset_token: token, reset_expiry: { $gt: new Date() } });
        }
        if (!user) {
            user = await models.Admin.findOne({ reset_token: token, reset_expiry: { $gt: new Date() } });
        }
        if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

        user.password = await bcrypt.hash(password, 10);
        user.reset_token = null;
        user.reset_expiry = null;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('New password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Google Login ---
router.post('/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // FIXED: Use helper function
        let user = await findUserByEmail(email); 
        if (!user) {
            // Default to creating a new Student
            user = new models.Student({
                googleId, email, name, image: picture, isGoogleAuth: true, password: crypto.randomBytes(20).toString('hex') // Add random password
            });
        }
        
        user.googleId = googleId;
        user.name = name;
        user.image = picture;
        user.isGoogleAuth = true;
        await user.save();
        
        // Determine userType
        let userType = 'Student'; // Default
        if (user instanceof models.Teacher) userType = 'Teacher';
        if (user instanceof models.Admin) userType = 'Admin';

        let xpAwarded = 0;
        let totalXp = user.xp || 0;
        let badgesAwarded = [];
        let streaks = null;
        let dailyGoal = null;
        if (userType === 'Student') {
            const result = await awardLoginXp(user);
            xpAwarded = result.awarded || 0;
            totalXp = result.totalXp ?? totalXp;
            badgesAwarded = result.badgesAwarded || [];
            streaks = result.streaks || streakSnapshot(user);
            dailyGoal = result.dailyGoal || dailyGoalSnapshot(user);
        }
        const badges = userType === 'Student' ? await getStudentBadges(user._id) : [];

        const jwtToken = jwt.sign({ id: user._id, email: user.email, userType }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                userType,
                xp: totalXp,
                streaks,
                dailyGoal
            },
            xpAwarded,
            badgesAwarded,
            badges,
            require2fa: false
        });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(400).json({ error: 'Google login failed' });
    }
});

// --- GitHub Auth Passport Strategy ---
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/api/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const githubId = profile.id;
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
        
        let user = await models.Student.findOne({ githubId }); // Check Student
        if (!user) user = await models.Teacher.findOne({ githubId }); // Check Teacher
        if (!user) user = await models.Admin.findOne({ githubId }); // Check Admin

        if (!user) {
            user = await findUserByEmail(email); // Check by email
            if (user) {
                user.githubId = githubId;
                user.isGithubAuth = true;
            } else {
                // Default to creating new Student
                user = new models.Student({
                    githubId,
                    name: profile.displayName || profile.username,
                    email: email,
                    image: profile.photos?.[0]?.value || '',
                    isGithubAuth: true,
                    password: crypto.randomBytes(20).toString('hex') // Add random password
                });
            }
            await user.save();
        }

        let userType = 'Student'; // Default
        if (user instanceof models.Teacher) userType = 'Teacher';
        if (user instanceof models.Admin) userType = 'Admin';

        let xpAwarded = 0;
        let totalXp = user.xp || 0;
        let badgesAwarded = [];
        let streaks = null;
        let dailyGoal = null;
        let badges = [];
        if (userType === 'Student') {
            const result = await awardLoginXp(user);
            xpAwarded = result.awarded || 0;
            totalXp = result.totalXp ?? totalXp;
            badgesAwarded = result.badgesAwarded || [];
            streaks = result.streaks || streakSnapshot(user);
            dailyGoal = result.dailyGoal || dailyGoalSnapshot(user);
            badges = await getStudentBadges(user._id);
        }

        const token = jwt.sign({ id: user._id, email: user.email, userType }, JWT_SECRET, { expiresIn: '1d' });
        done(null, {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                userType,
                xp: totalXp,
                streaks,
                dailyGoal,
                badges
            },
            xpAwarded,
            badgesAwarded
        });
    } catch (err) {
        done(err, null);
    }
}));

router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/auth/github/callback',
    passport.authenticate('github', { session: false }),
    (req, res) => {
        const { token, user } = req.user;
        res.redirect(`http://localhost:3000/auth/callback?token=${token}&user=${JSON.stringify(user)}`);
    }
);

// --- Registration ---
router.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { name, email, password, userType } = req.body;
        const image = req.file ? req.file.filename : '';
        console.log(`Registering as:`, userType, 'Email:', email);
        if (!['Student', 'Teacher'].includes(userType)) {
            console.log('Invalid userType:', userType);
            return res.status(400).json({ error: 'Invalid user type' });
        }

        // Explicit Teacher registration handling
        if (userType === 'Teacher') {
            // Check for required fields
            if (!name || !email || !password) {
                console.log('Missing required field for Teacher:', { name, email, password });
                return res.status(400).json({ error: 'Missing required field for Teacher registration' });
            }
            const existing = await models.Teacher.findOne({ email: email.toLowerCase() });
            if (existing) {
                console.log('Teacher email already exists:', email);
                return res.status(400).json({ error: 'Email already exists' });
            }
            const hash = await bcrypt.hash(password, 10);
            const teacher = new models.Teacher({ name, email: email.toLowerCase(), password: hash, image });
            await teacher.save();
            console.log('Teacher registered:', email);
            return res.status(201).json({ message: 'User registered' });
        }

        // Student registration
        if (userType === 'Student') {
            if (!name || !email || !password) {
                console.log('Missing required field for Student:', { name, email, password });
                return res.status(400).json({ error: 'Missing required field for Student registration' });
            }
            const existing = await models.Student.findOne({ email: email.toLowerCase() });
            if (existing) {
                console.log('Student email already exists:', email);
                return res.status(400).json({ error: 'Email already exists' });
            }
            const hash = await bcrypt.hash(password, 10);
            const student = new models.Student({ name, email: email.toLowerCase(), password: hash, image });
            await student.save();
            console.log('Student registered:', email);
            return res.status(201).json({ message: 'User registered' });
        }
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// --- Login ---
router.post('/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;
        console.log(`Login as ${userType}: ${email}`);

        let Model;
        if (userType === 'Student') Model = models.Student;
        else if (userType === 'Teacher') Model = models.Teacher;
        else if (userType === 'Admin') Model = models.Admin;
        else return res.status(400).json({ error: 'Invalid user type' });

        // FIXED: Use findOne with lowercase email
        const user = await Model.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        let xpAwarded = 0;
        let totalXp = user.xp || 0;
        let badgesAwarded = [];
        let streaks = null;
        let dailyGoal = null;
        if (userType === 'Student') {
            const result = await awardLoginXp(user);
            xpAwarded = result.awarded || 0;
            totalXp = result.totalXp ?? totalXp;
            badgesAwarded = result.badgesAwarded || [];
            streaks = result.streaks || streakSnapshot(user);
            dailyGoal = result.dailyGoal || dailyGoalSnapshot(user);
        }
        const badges = userType === 'Student' ? await getStudentBadges(user._id) : [];

        const token = jwt.sign({ id: user._id, email: user.email, userType }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                userType,
                xp: totalXp,
                streaks,
                dailyGoal
            },
            xpAwarded,
            badgesAwarded,
            badges,
            require2fa: false
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// --- Protected Routes ---
// --- Profile Edit ---
router.put('/profile', auth, upload.single('image'), async (req, res) => {
    const { name, password, confirmPassword } = req.body;
    const imageFile = req.file;
    const { id, email, userType } = req.user;
    console.log(`Updating profile for ${userType}: ${email}`);

    let Model;
    if (userType === 'Student') Model = models.Student;
    else if (userType === 'Teacher') Model = models.Teacher;
    else if (userType === 'Admin') Model = models.Admin;
    else return res.status(400).json({ error: 'Invalid user type' });

    let updateFields = {};
    if (imageFile) {
        updateFields.image = imageFile.filename;
    }

    if (userType === 'Student' || userType === 'Teacher') {
        if (name) updateFields.name = name;
        if (password) {
            if (!confirmPassword || password !== confirmPassword) {
                return res.status(400).json({ error: 'Passwords do not match' });
            }
            updateFields.password = await bcrypt.hash(password, 10);
        }
    } else if (userType === 'Admin') {
        // Admin can only update image and password
        if (password) {
            if (!confirmPassword || password !== confirmPassword) {
                return res.status(400).json({ error: 'Passwords do not match' });
            }
            updateFields.password = await bcrypt.hash(password, 10);
        }
    }

    try {
        const user = await Model.findByIdAndUpdate(id, updateFields, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const isStudent = user.constructor?.modelName === 'Student';
        const badges = isStudent ? await getStudentBadges(user._id) : [];
        const streaks = isStudent ? streakSnapshot(user) : null;
        const dailyGoal = isStudent ? dailyGoalSnapshot(user) : null;
        res.status(200).json({
            message: 'Profile updated',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                userType,
                xp: user.xp || 0,
                badges,
                streaks,
                dailyGoal
            }
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Account Deletion ---
router.delete('/profile', auth, async (req, res) => {
    const { id, email, userType } = req.user;
    console.log(`Account deletion requested for ${userType}: ${email}`);
    let Model;
    if (userType === 'Student') Model = models.Student;
    else if (userType === 'Teacher') Model = models.Teacher;
    else if (userType === 'Admin') {
        return res.status(403).json({ error: 'Admins cannot delete their account' });
    } else {
        return res.status(400).json({ error: 'Invalid user type' });
    }
    try {
        const result = await Model.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ message: 'Account deleted' });
    } catch (err) {
        console.error('Account deletion error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/courses', auth, async (req, res) => {
    try {
        const userType = req.user.userType;
        const courses = await models.Playlist.find({}, { id: 1, title: 1, description: 1, thumb: 1 });
        res.json(courses);
    } catch (err) {
        console.error('Courses fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

router.get('/profile', auth, async (req, res) => {
    // FIXED: Use helper function
    const user = await findUserById(req.user.id); 
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isStudent = user.constructor?.modelName === 'Student';
    const badges = isStudent ? await getStudentBadges(user._id) : [];
    const streaks = isStudent ? streakSnapshot(user) : null;
    const dailyGoal = isStudent ? dailyGoalSnapshot(user) : null;
    res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        userType: req.user.userType,
        xp: user.xp || 0,
        badges,
        streaks,
        dailyGoal
    });
});

// --- Test route ---
router.get('/test', (req, res) => res.send('Router is working'));

router.get('/gamification/summary', auth, async (req, res) => {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.constructor?.modelName !== 'Student') {
        const definitions = await getBadgeDefinitions();
        return res.json({ xp: 0, badges: [], definitions, streaks: null, dailyGoal: null });
    }
    const [badges, definitions] = await Promise.all([
        getStudentBadges(user._id),
        getBadgeDefinitions()
    ]);
    res.json({
        xp: user.xp || 0,
        badges,
        definitions,
        streaks: streakSnapshot(user),
        dailyGoal: dailyGoalSnapshot(user)
    });
});

router.get('/gamification/badges', auth, async (req, res) => {
    const definitions = await getBadgeDefinitions();
    const user = await findUserById(req.user.id);
    if (!user || user.constructor?.modelName !== 'Student') {
        return res.json({ badges: definitions, earned: [] });
    }
    const earned = await getStudentBadges(user._id);
    res.json({ badges: definitions, earned });
});

// ---
// ---
// --- NEW ADAPTIVE LEARNING ROUTES ADDED BELOW ---
// ---
// ---

// --- Course Creation Route ---
router.post('/courses/create', auth, upload.single('thumb'), async (req, res) => {
    try {
        if (req.user.userType !== 'Admin') {
            return res.status(403).json({ error: 'Only admins can create courses' });
        }
        const { title, description } = req.body;
        const thumb = req.file ? req.file.filename : '';
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }
        const newCourse = new models.Playlist({
            title,
            description,
            thumb
        });
        await newCourse.save();
        res.status(201).json({ message: 'Course created', course: newCourse });
    } catch (err) {
        console.error('Course creation error:', err);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

/**
 * Helper function to calculate average time for a subset of interactions
 */
const calculateAverageTime = (interactions, filterFn) => {
    const items = interactions.filter(filterFn);
    if (items.length === 0) return 0;
    const total_time = items.reduce((sum, item) => sum + item.timeSpentSeconds, 0);
    return total_time / items.length;
};

/**
 * Helper function to calculate the sequential access ratio
 */
const calculateSequentialRatio = (interactions) => {
    // Filter for interactions that are part of a sequence (have an 'order' property)
    const orderedInteractions = interactions
        .filter(i => i.annotations && typeof i.annotations.order === 'number')
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by time

    if (orderedInteractions.length < 2) return 0; // Not enough data

    let sequential_accesses = 0;
    let total_possible_transitions = orderedInteractions.length - 1;

    for (let i = 0; i < total_possible_transitions; i++) {
        const current = orderedInteractions[i];
        const next = orderedInteractions[i+1];
        
        // Check if the next item is the *correct* next item in the sequence
        if (next.annotations.order === current.annotations.order + 1) {
            sequential_accesses++;
        }
    }

    return sequential_accesses / total_possible_transitions;
};

/**
 * ROUTE 1: Track User Behavior
 * Your frontend will call this when a user finishes interacting with content.
 * URL: POST /api/track
 */
router.post('/track', auth, async (req, res) => {
    try {
        const { contentObject, timeSpentSeconds } = req.body;
        const userId = req.user.id; // From auth middleware

        if (!contentObject || typeof timeSpentSeconds === 'undefined') {
            return res.status(400).json({ error: 'Missing contentObject or timeSpentSeconds' });
        }

        const newInteraction = new models.Interaction({
            user_id: userId,
            content_id: contentObject.id, // Your schema uses 'id'
            playlist_id: contentObject.playlist_id,
            
            // Copy the annotations and order at the time of interaction
            annotations: {
                format: contentObject.annotations.format,
                type: contentObject.annotations.type,
                category: contentObject.annotations.category,
                order: contentObject.order // From your updated model
            },

            timeSpentSeconds: timeSpentSeconds
        });

        await newInteraction.save();
        res.status(201).json({ message: 'Interaction saved' });

    } catch (err) {
        console.error('Tracking error:', err);
        res.status(500).json({ error: 'Server error while tracking' });
    }
});


/**
 * ROUTE 2: Calculate Features & Trigger Prediction
 * Your frontend can call this at any time to refresh the student's learning style.
 * URL: POST /api/predict-style
 */
router.post('/predict-style', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get user (for saving)
        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 2. Get all interactions for this user across every playlist
        const interactions = await models.Interaction.find({ 
            user_id: userId
        });

        if (interactions.length < 5) { // Not enough data to predict
            return res.status(400).json({ error: 'Not enough interaction data for a prediction.' });
        }

        // 3. --- FEATURE ENGINEERING ---
        // Calculate the 11 features for the Python model
        const featureVector = {
            example_access_count: interactions.filter(i => i.annotations.category === 'Example').length,
            avg_time_on_concrete_lo: calculateAverageTime(interactions, i => i.annotations.type === 'Concrete'),
            avg_time_on_abstract_lo: calculateAverageTime(interactions, i => i.annotations.type === 'Abstract'),
            avg_time_on_quiz: calculateAverageTime(interactions, i => i.annotations.category === 'Quiz'),
            avg_time_on_visual_lo: calculateAverageTime(interactions, i => i.annotations.format === 'Visual'),
            avg_time_on_verbal_lo: calculateAverageTime(interactions, i => i.annotations.format === 'Verbal'),
            exercise_access_count: interactions.filter(i => i.annotations.category === 'Exercise').length,
            avg_time_on_examples: calculateAverageTime(interactions, i => i.annotations.category === 'Example'),
            sequential_access_ratio: calculateSequentialRatio(interactions),
            outline_access_count: interactions.filter(i => i.annotations.category === 'Outline').length,
            concept_map_access_count: interactions.filter(i => i.annotations.category === 'Concept Map').length
        };

        // 4. --- CALL PYTHON ML API ---
        const pythonApiUrl = process.env.ML_API_URL || 'http://localhost:5001/predict';
        let predictions;
        const modelLog = new models.ModelLog({
            userId,
            featureVector,
            status: 'pending'
        });
        const startedAt = Date.now();
        try {
            const response = await axios.post(pythonApiUrl, featureVector);
            predictions = response.data;
            modelLog.prediction = predictions;
            modelLog.status = 'success';
            modelLog.durationMs = Date.now() - startedAt;
            await modelLog.save();
        } catch (err) {
            console.error("Error calling Python API:", err.message);
            modelLog.status = 'error';
            modelLog.errorMessage = err.message || 'Prediction server error';
            modelLog.durationMs = Date.now() - startedAt;
            await modelLog.save().catch(() => {});
            return res.status(500).send('Prediction server error');
        }

        // 5. --- SAVE PREDICTIONS TO USER ---
        user.learningStyle = predictions;
        user.featureVector = featureVector; // Save for debugging
        await user.save();

        res.json(predictions); // Send the new style back to the frontend

    } catch (err) {
        console.error('Prediction route error:', err);
        res.status(500).json({ error: 'Server error during prediction' });
    }
});

/**
 * ROUTE 3: Manually Set Learning Style
 * Your frontend profile page will call this.
 * URL: POST /api/set-style
 */
router.post('/set-style', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { perception, input, processing, understanding } = req.body;

        // 1. Find the user
        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Translate string inputs into the binary learningStyle object
        const newLearningStyle = {
            is_intuitive: perception === 'Intuitive' ? 1 : 0,
            is_verbal: input === 'Verbal' ? 1 : 0,
            is_reflective: processing === 'Reflective' ? 1 : 0,
            is_global: understanding === 'Global' ? 1 : 0
        };

        // 3. Update the user's profile
        user.learningStyle = newLearningStyle;
        await user.save();

        // 4. Return the new style
        res.json(newLearningStyle);

    } catch (err) {
        console.error('Set style error:', err);
        res.status(500).json({ error: 'Server error while setting style' });
    }
});

// 5. MODULE EXPORT
module.exports = router;












