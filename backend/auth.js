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

// --- Students List ---
router.get('/students', auth, async (req, res) => {
    try {
        if (req.user.userType !== 'Admin') {
            return res.status(403).json([]);
        }
        const students = await models.Student.find({}, '_id name email image enrolledCourses');
        res.json(students);
    } catch (err) {
        console.error('Students fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch students' });
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
 * Your frontend will call this after a user finishes a playlist/module.
 * URL: POST /api/predict-style/:playlistId
 */
router.post('/predict-style/:playlistId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { playlistId } = req.params;

        // 1. Get user (for saving)
        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 2. Get all interactions for this user and this specific playlist
        const interactions = await models.Interaction.find({ 
            user_id: userId, 
            playlist_id: playlistId 
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
        
        try {
            const response = await axios.post(pythonApiUrl, featureVector);
            predictions = response.data;
        } catch (err) {
            console.error("Error calling Python API:", err.message);
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












