const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { EngagementLog, Student } = require('./models');

const JWT_SECRET = process.env.JWT_SECRET || 'apex101_secret';
const API_KEY_HEADER = 'authorization';

const extractToken = (req) => {
  if (req.headers[API_KEY_HEADER]) {
    const parts = req.headers[API_KEY_HEADER].split(' ');
    if (parts.length === 2) {
      return parts[1];
    }
  }
  if (req.body?.token) return req.body.token;
  if (req.query?.token) return req.query.token;
  return null;
};

const resolveStudent = async (req) => {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const student = await Student.findById(decoded.id);
    if (!student || student.constructor?.modelName !== 'Student') return null;
    return student;
  } catch {
    return null;
  }
};

const buildIncrement = (resourceType, seconds) => {
  const increments = {
    'engagementStats.totalSeconds': seconds,
    'engagementStats.sessions': 1
  };
  const normalized = (resourceType || '').toLowerCase();
  if (normalized === 'visual') {
    increments['engagementStats.visualSeconds'] = seconds;
  } else if (normalized === 'verbal') {
    increments['engagementStats.verbalSeconds'] = seconds;
  } else if (normalized === 'audio') {
    increments['engagementStats.audioSeconds'] = seconds;
  }
  return increments;
};

const persistLog = async (student, payload) => {
  const seconds = Math.max(0, Number(payload.seconds) || 0);
  if (!seconds) return;
  const resourceId = payload.resourceId;
  if (!resourceId) return;
  const resourceType = payload.resourceType || 'Visual';
  await EngagementLog.create({
    studentId: student._id,
    resourceId,
    resourceType,
    seconds,
    timestamp: payload.timestamp || new Date()
  });
  await Student.updateOne(
    { _id: student._id },
    { $inc: buildIncrement(resourceType, seconds), $set: { lastActiveAt: new Date() } }
  );
};

router.post('/sync', async (req, res) => {
  const student = await resolveStudent(req);
  if (!student) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await persistLog(student, req.body || {});
    res.json({ message: 'Engagement captured' });
  } catch (err) {
    console.error('Analytics sync error:', err);
    res.status(500).json({ error: 'Failed to record engagement' });
  }
});

router.post('/beacon', async (req, res) => {
  const student = await resolveStudent(req);
  if (!student) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await persistLog(student, req.body || {});
    res.json({ message: 'Beacon received' });
  } catch (err) {
    console.error('Analytics beacon error:', err);
    res.status(500).json({ error: 'Failed to record engagement' });
  }
});

module.exports = router;
