// C:\xampp\htdocs\AdaptiveEduApp\backend\auth.js

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
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'apex101_secret';

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
        const user = await models.User.findOne({ email });
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

        const user = await models.User.findOne({
            reset_token: token,
            reset_expiry: { $gt: new Date() }
        });
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

        let user = await models.User.findOne({ googleId });
        if (!user) {
            user = await models.User.findOne({ email }) || new models.User({
                googleId, email, name, image: picture, isGoogleAuth: true
            });
            user.googleId = googleId;
            user.name = name;
            user.image = picture;
            user.isGoogleAuth = true;
            await user.save();
        }

        const jwtToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token: jwtToken,
            user: { id: user._id, name: user.name, email: user.email, image: user.image },
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
        let user = await models.User.findOne({ githubId: profile.id });
        if (!user) {
            user = await models.User.findOne({ email: profile.emails?.[0]?.value });
            if (user) {
                user.githubId = profile.id;
                user.name = profile.displayName || profile.username;
                user.image = profile.photos?.[0]?.value || '';
                user.isGithubAuth = true;
            } else {
                user = new models.User({
                    githubId: profile.id,
                    name: profile.displayName || profile.username,
                    email: profile.emails?.[0]?.value || `${profile.username}@github.com`,
                    image: profile.photos?.[0]?.value || '',
                    isGithubAuth: true
                });
            }
            await user.save();
        }
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        done(null, { token, user: { id: user._id, name: user.name, email: user.email, image: user.image } });
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
        console.log(`Registering as ${userType}: ${email}`);
        if (!['Student', 'Teacher'].includes(userType))
            return res.status(400).json({ error: 'Invalid user type' });

        const Model = userType === 'Student' ? models.Student : models.Teacher;
        const existing = await Model.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const hash = await bcrypt.hash(password, 10);
        const userDoc = new Model({ name, email: email.toLowerCase(), password: hash, image });
        await userDoc.save();

        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error' });
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

        const user = await Model.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, email: user.email, userType }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, image: user.image, userType }, require2fa: false });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// --- Protected Routes ---
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
    const user = await models.User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, image: user.image });
});

// --- Test route ---
router.get('/test', (req, res) => res.send('Router is working'));

// 5. MODULE EXPORT
module.exports = router;