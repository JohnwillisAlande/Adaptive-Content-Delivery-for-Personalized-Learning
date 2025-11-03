const { Student, Badge, StudentBadge, Interaction } = require('./models');

const XP_REWARDS = {
  LOGIN: 10,
  MATERIAL_VIEW: 5,
  MATERIAL_COMPLETE: 15,
  QUIZ_COMPLETE: 25
};

const DEFAULT_DAILY_GOAL = {
  lessonsTarget: 1,
  lessonsCompletedToday: 0,
  loginsTarget: 1,
  loginsCompletedToday: 0,
  lastResetAt: null
};

const BADGE_DEFINITIONS = [
  {
    badgeId: 'xp_100',
    title: 'Rising Scholar',
    description: 'Earn 100 XP across the platform.',
    icon: 'fas fa-medal',
    criteria: { type: 'xp', threshold: 100 }
  },
  {
    badgeId: 'xp_500',
    title: 'Dedicated Learner',
    description: 'Accumulate 500 XP by engaging with lessons.',
    icon: 'fas fa-trophy',
    criteria: { type: 'xp', threshold: 500 }
  },
  {
    badgeId: 'first_course_complete',
    title: 'Course Conqueror',
    description: 'Complete your first course.',
    icon: 'fas fa-flag-checkered',
    criteria: { type: 'course_completion', count: 1 }
  },
  {
    badgeId: 'quiz_master',
    title: 'Quiz Master',
    description: 'Finish 5 quizzes.',
    icon: 'fas fa-award',
    criteria: { type: 'quiz_completed', count: 5 }
  }
];

let badgesSeeded = false;

const ensureBadgesSeeded = async () => {
  if (badgesSeeded) return;
  await Promise.all(
    BADGE_DEFINITIONS.map(def =>
      Badge.findOneAndUpdate(
        { badgeId: def.badgeId },
        {
          title: def.title,
          description: def.description,
          icon: def.icon,
          criteria: def.criteria,
          active: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
  badgesSeeded = true;
};

const getBadgeDefinitions = async () => {
  await ensureBadgesSeeded();
  return Badge.find({ active: true }).sort({ title: 1 }).lean();
};

const cloneDailyGoal = (goal = {}) => ({
  lessonsTarget: goal.lessonsTarget ?? DEFAULT_DAILY_GOAL.lessonsTarget,
  lessonsCompletedToday: goal.lessonsCompletedToday ?? DEFAULT_DAILY_GOAL.lessonsCompletedToday,
  loginsTarget: goal.loginsTarget ?? DEFAULT_DAILY_GOAL.loginsTarget,
  loginsCompletedToday: goal.loginsCompletedToday ?? DEFAULT_DAILY_GOAL.loginsCompletedToday,
  lastResetAt: goal.lastResetAt ? new Date(goal.lastResetAt) : null
});

const cloneStreak = (streak = {}) => ({
  count: streak.count ?? 0,
  longest: streak.longest ?? 0,
  lastDate: streak.lastDate ? new Date(streak.lastDate) : null
});

const getStudentBadges = async (studentId) => {
  await ensureBadgesSeeded();
  if (!studentId) return [];
  const [definitions, earned] = await Promise.all([
    Badge.find({ active: true }).lean(),
    StudentBadge.find({ studentId }).sort({ awardedAt: -1 }).lean()
  ]);
  const defMap = new Map(definitions.map(def => [def.badgeId, def]));
  return earned.map(entry => {
    const def = defMap.get(entry.badgeId) || {};
    return {
      badgeId: entry.badgeId,
      title: def.title || entry.badgeId,
      description: def.description || '',
      icon: def.icon || 'fas fa-medal',
      awardedAt: entry.awardedAt,
      meta: entry.meta || {}
    };
  });
};

const awardBadge = async (studentId, def, meta = {}) => {
  try {
    const awarded = await StudentBadge.create({
      studentId,
      badgeId: def.badgeId,
      meta,
      awardedAt: new Date()
    });
    return {
      badgeId: def.badgeId,
      title: def.title,
      description: def.description,
      icon: def.icon,
      awardedAt: awarded.awardedAt,
      meta
    };
  } catch (err) {
    if (err.code === 11000) {
      return null;
    }
    throw err;
  }
};

const evaluateBadges = async ({ studentId, xp, context = {} }) => {
  await ensureBadgesSeeded();
  const [definitions, earnedDocs] = await Promise.all([
    Badge.find({ active: true }).lean(),
    StudentBadge.find({ studentId }).select('badgeId').lean()
  ]);
  const earned = new Set(earnedDocs.map(doc => doc.badgeId));
  const defMap = new Map(definitions.map(def => [def.badgeId, def]));
  const newBadges = [];

  const maybeAward = async (badgeId, meta) => {
    if (earned.has(badgeId)) return;
    const def = defMap.get(badgeId);
    if (!def) return;
    const awarded = await awardBadge(studentId, def, meta);
    if (awarded) {
      earned.add(badgeId);
      newBadges.push(awarded);
    }
  };

  for (const def of definitions) {
    const criteria = def.criteria || {};
    switch (criteria.type) {
      case 'xp':
        if (typeof criteria.threshold === 'number' && xp >= criteria.threshold) {
          await maybeAward(def.badgeId);
        }
        break;
      case 'course_completion':
        if (context.courseProgress !== undefined && context.courseProgress >= 100) {
          await maybeAward(def.badgeId, {
            courseId: context.courseId,
            courseTitle: context.courseTitle
          });
        }
        break;
      case 'quiz_completed':
        if (context.quizCompleted) {
          const completedQuizzes = await Interaction.countDocuments({
            user_id: studentId.toString(),
            completed: true,
            'annotations.category': 'Quiz'
          });
          if (completedQuizzes >= (criteria.count || 1)) {
            await maybeAward(def.badgeId, { completedQuizzes });
          }
        }
        break;
      default:
        break;
    }
  }

  return newBadges;
};

const isSameDay = (left, right) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const isPreviousDay = (left, right) => {
  const oneDayBefore = new Date(right);
  oneDayBefore.setDate(right.getDate() - 1);
  return isSameDay(left, oneDayBefore);
};

const ensureDailyGoal = (studentDoc, now) => {
  if (!studentDoc.dailyGoal) {
    studentDoc.dailyGoal = { ...DEFAULT_DAILY_GOAL, lastResetAt: now };
    return true;
  }
  const goal = studentDoc.dailyGoal;
  let changed = false;
  if (goal.lessonsTarget == null || goal.lessonsTarget < 1) {
    goal.lessonsTarget = DEFAULT_DAILY_GOAL.lessonsTarget;
    changed = true;
  }
  if (goal.loginsTarget == null || goal.loginsTarget < 1) {
    goal.loginsTarget = DEFAULT_DAILY_GOAL.loginsTarget;
    changed = true;
  }
  if (goal.lessonsCompletedToday == null) {
    goal.lessonsCompletedToday = DEFAULT_DAILY_GOAL.lessonsCompletedToday;
    changed = true;
  }
  if (goal.loginsCompletedToday == null) {
    goal.loginsCompletedToday = DEFAULT_DAILY_GOAL.loginsCompletedToday;
    changed = true;
  }
  const lastReset = goal.lastResetAt ? new Date(goal.lastResetAt) : null;
  if (!lastReset || !isSameDay(lastReset, now)) {
    goal.lessonsCompletedToday = 0;
    goal.loginsCompletedToday = 0;
    goal.lastResetAt = now;
    changed = true;
  }
  return changed;
};

const bumpStreak = (studentDoc, key, now) => {
  const streak = cloneStreak(studentDoc[key]);
  let changed = false;
  if (!streak.lastDate || !isSameDay(streak.lastDate, now)) {
    if (streak.lastDate && isPreviousDay(streak.lastDate, now)) {
      streak.count = (streak.count || 0) + 1;
    } else {
      streak.count = 1;
    }
    streak.longest = Math.max(streak.longest || 0, streak.count);
    streak.lastDate = now;
    changed = true;
  }
  if (!studentDoc[key]) {
    studentDoc[key] = streak;
    changed = true;
  } else if (changed) {
    studentDoc[key].count = streak.count;
    studentDoc[key].longest = streak.longest;
    studentDoc[key].lastDate = streak.lastDate;
  }
  return changed;
};

const streakSnapshot = (studentDoc) => ({
  login: cloneStreak(studentDoc.loginStreak),
  lesson: cloneStreak(studentDoc.lessonStreak)
});

const dailyGoalSnapshot = (studentDoc) => {
  const goal = cloneDailyGoal(studentDoc.dailyGoal);
  return {
    ...goal,
    lessonsRemaining: Math.max(goal.lessonsTarget - goal.lessonsCompletedToday, 0),
    loginsRemaining: Math.max(goal.loginsTarget - goal.loginsCompletedToday, 0),
    lessonGoalMet: goal.lessonsCompletedToday >= goal.lessonsTarget,
    loginGoalMet: goal.loginsCompletedToday >= goal.loginsTarget
  };
};

const awardLoginXp = async (studentDoc) => {
  if (!studentDoc || studentDoc.constructor?.modelName !== 'Student') {
    return { awarded: 0, totalXp: studentDoc?.xp ?? 0, badgesAwarded: [], streaks: streakSnapshot(studentDoc), dailyGoal: dailyGoalSnapshot(studentDoc) };
  }
  const now = new Date();
  let needsSave = false;
  needsSave = ensureDailyGoal(studentDoc, now) || needsSave;
  const streakChanged = bumpStreak(studentDoc, 'loginStreak', now);
  needsSave = streakChanged || needsSave;
  if ((studentDoc.dailyGoal?.loginsCompletedToday ?? 0) < 1) {
    studentDoc.dailyGoal.loginsCompletedToday = 1;
    needsSave = true;
  }
  let awarded = 0;
  if (!studentDoc.lastLoginXpAt || !isSameDay(new Date(studentDoc.lastLoginXpAt), now)) {
    studentDoc.xp = (studentDoc.xp || 0) + XP_REWARDS.LOGIN;
    studentDoc.lastLoginXpAt = now;
    awarded = XP_REWARDS.LOGIN;
    needsSave = true;
  }
  if (needsSave) {
    await studentDoc.save();
  }
  const badges = await evaluateBadges({ studentId: studentDoc._id, xp: studentDoc.xp || 0 });
  return {
    awarded,
    totalXp: studentDoc.xp || 0,
    badgesAwarded: badges,
    streaks: streakSnapshot(studentDoc),
    dailyGoal: dailyGoalSnapshot(studentDoc)
  };
};

const handleMaterialInteraction = async ({ studentDoc, material, completed, existingInteraction }) => {
  if (!studentDoc || studentDoc.constructor?.modelName !== 'Student') {
    return { xpAwarded: 0, totalXp: null, badgesAwarded: [], streaks: streakSnapshot(studentDoc), dailyGoal: dailyGoalSnapshot(studentDoc) };
  }
  const materialCategory = (material.annotations?.category || '').toLowerCase();
  const isQuiz = materialCategory === 'quiz';
  let xpAwarded = 0;
  if (!existingInteraction) {
    xpAwarded += XP_REWARDS.MATERIAL_VIEW;
  }
  if (completed && !(existingInteraction?.completed)) {
    xpAwarded += XP_REWARDS.MATERIAL_COMPLETE;
    if (isQuiz) {
      xpAwarded += XP_REWARDS.QUIZ_COMPLETE;
    }
  }

  const now = new Date();
  let needsSave = false;
  needsSave = ensureDailyGoal(studentDoc, now) || needsSave;
  let incrementLessonDay = false;
  if (!existingInteraction) {
    incrementLessonDay = true;
  }
  if (completed && !(existingInteraction?.completed)) {
    incrementLessonDay = true;
  }
  if (xpAwarded > 0) {
    studentDoc.xp = (studentDoc.xp || 0) + xpAwarded;
    needsSave = true;
  }
  if (incrementLessonDay) {
    const streakChanged = bumpStreak(studentDoc, 'lessonStreak', now);
    needsSave = streakChanged || needsSave;
    studentDoc.dailyGoal.lessonsCompletedToday = (studentDoc.dailyGoal.lessonsCompletedToday || 0) + 1;
    needsSave = true;
  }
  if (needsSave) {
    await studentDoc.save();
  }

  const badgesAwarded = await evaluateBadges({
    studentId: studentDoc._id,
    xp: studentDoc.xp || 0,
    context: { quizCompleted: completed && isQuiz }
  });

  return {
    xpAwarded,
    totalXp: studentDoc.xp || 0,
    badgesAwarded,
    streaks: streakSnapshot(studentDoc),
    dailyGoal: dailyGoalSnapshot(studentDoc)
  };
};

const handleCourseProgress = async ({ studentDoc, courseId, courseTitle, progressPercent }) => {
  if (!studentDoc || studentDoc.constructor?.modelName !== 'Student') {
    return [];
  }
  if (progressPercent < 100) return [];
  return evaluateBadges({
    studentId: studentDoc._id,
    xp: studentDoc.xp || 0,
    context: { courseProgress: progressPercent, courseId, courseTitle }
  });
};

module.exports = {
  XP_REWARDS,
  awardLoginXp,
  handleMaterialInteraction,
  handleCourseProgress,
  getBadgeDefinitions,
  getStudentBadges,
  streakSnapshot,
  dailyGoalSnapshot
};
