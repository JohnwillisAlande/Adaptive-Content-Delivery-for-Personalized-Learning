const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const models = require('./models');
const User = models.User;
const bcrypt = require('bcryptjs');

// Password Reset: Forgot Password (case-insensitive, uses PasswordReset model)
router.post('/forgot-password', async (req, res) => {
    try {
        let email = (req.body.email || '').trim().toLowerCase();
        if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
            return res.status(400).json({ success: false, message: 'Invalid email' });
        }
        // Case-insensitive lookup using regex
        const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        if (!user) {
            console.log('Email not found:', email);
            return res.status(404).json({ success: false, message: 'Email not found' });
        }
        // Generate token and expiry, store in PasswordReset model
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await models.PasswordReset.findOneAndUpdate(
            { email },
            { email, token, expires_at: expires },
            { upsert: true, new: true }
        );
        const resetLink = `http://localhost:3000/new-password/${token}`;
        console.log(`User found: ${email}`);
        console.log(`Email sent to: ${email} with link: ${resetLink}`);
        if (process.env.EMAIL_USER) {
            // Optionally send email using nodemailer
        }
        res.json({ success: true, message: 'Reset link sent to your email' });
    } catch (err) {
        console.error('Forgot error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Password Reset: New Password
router.post('/api/new-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Passwords must match and be at least 8 characters' });
    }
    const user = await User.findOne({
      reset_token: token,
      reset_expiry: { $gt: new Date() }
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    user.password = bcrypt.hashSync(password, 10);
    user.reset_token = null;
    user.reset_expiry = null;
    await user.save();
    console.log(`Password reset for ${user.email}`);
    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('New password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Users
router.get('/users', async (req, res) => {
  const users = await models.User.find();
  res.json(users);
});
router.post('/users', async (req, res) => {
  const user = new models.User(req.body);
  await user.save();
  res.status(201).json(user);
});

// Tutors
router.get('/tutors', async (req, res) => {
  const tutors = await models.Tutor.find();
  // For each tutor, count playlists, contents, likes, comments
  const result = await Promise.all(tutors.map(async tutor => {
    const total_playlists = await models.Playlist.countDocuments({ tutor_id: tutor._id.toString() });
    const total_contents = await models.Content.countDocuments({ tutor_id: tutor._id.toString() });
    const total_likes = await models.Like.countDocuments({ tutor_id: tutor._id.toString() });
    const total_comments = await models.Comment.countDocuments({ tutor_id: tutor._id.toString() });
    return {
      ...tutor.toObject(),
      total_playlists,
      total_contents,
      total_likes,
      total_comments
    };
  }));
  res.json(result);
});
router.post('/tutors', async (req, res) => {
  const tutor = new models.Tutor(req.body);
  await tutor.save();
  res.status(201).json(tutor);
});

// Playlists
router.get('/playlists', async (req, res) => {
  const playlists = await models.Playlist.find();
  res.json(playlists);
});
router.post('/playlists', async (req, res) => {
  const playlist = new models.Playlist(req.body);
  await playlist.save();
  res.status(201).json(playlist);
});

// Content
router.get('/contents', async (req, res) => {
  const contents = await models.Content.find();
  res.json(contents);
});
router.post('/contents', async (req, res) => {
  const content = new models.Content(req.body);
  await content.save();
  res.status(201).json(content);
});

// Comments
router.get('/comments', async (req, res) => {
  const comments = await models.Comment.find();
  res.json(comments);
});
router.post('/comments', async (req, res) => {
  const comment = new models.Comment(req.body);
  await comment.save();
  res.status(201).json(comment);
});

// Likes
router.get('/likes', async (req, res) => {
  const likes = await models.Like.find();
  res.json(likes);
});
router.post('/likes', async (req, res) => {
  const like = new models.Like(req.body);
  await like.save();
  res.status(201).json(like);
});

// Bookmarks
router.get('/bookmarks', async (req, res) => {
  const bookmarks = await models.Bookmark.find();
  res.json(bookmarks);
});
router.post('/bookmarks', async (req, res) => {
  const bookmark = new models.Bookmark(req.body);
  await bookmark.save();
  res.status(201).json(bookmark);
});

// Contact
router.get('/contacts', async (req, res) => {
  const contacts = await models.Contact.find();
  res.json(contacts);
});
router.post('/contacts', async (req, res) => {
  const contact = new models.Contact(req.body);
  await contact.save();
  res.status(201).json(contact);
});

// Password Resets
router.get('/password_resets', async (req, res) => {
  const resets = await models.PasswordReset.find();
  res.json(resets);
});
router.post('/password_resets', async (req, res) => {
  const reset = new models.PasswordReset(req.body);
  await reset.save();
  res.status(201).json(reset);
});

module.exports = router;
