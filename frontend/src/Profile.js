import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import './App.css';
import api from './api';
import { useAuth } from './context/AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const FILE_BASE_URL = (process.env.REACT_APP_FILE_BASE_URL || API_BASE.replace(/\/api$/, '')).replace(/\/$/, '');
const ILS_URL = 'https://learningstyles.webtools.ncsu.edu/';

const resolveImage = (image) => {
  if (!image) return null;
  const normalized = image.replace(/\\/g, '/');
  if (normalized.startsWith('http')) return normalized;
  if (normalized.startsWith('/uploaded_files')) return `${FILE_BASE_URL}${normalized}`;
  if (normalized.startsWith('uploaded_files')) return `${FILE_BASE_URL}/${normalized}`;
  return `${FILE_BASE_URL}/uploaded_files/${normalized.replace(/^\/+/, '')}`;
};

const createDefaultStyleSelection = () => ({
  perception: 'Sensory',
  input: 'Visual',
  processing: 'Active',
  understanding: 'Sequential'
});

const translateStyleFromDB = (dbStyle) => {
  if (!dbStyle) {
    return createDefaultStyleSelection();
  }
  return {
    perception: dbStyle.is_intuitive === 1 ? 'Intuitive' : 'Sensory',
    input: dbStyle.is_verbal === 1 ? 'Verbal' : 'Visual',
    processing: dbStyle.is_reflective === 1 ? 'Reflective' : 'Active',
    understanding: dbStyle.is_global === 1 ? 'Global' : 'Sequential'
  };
};

const describeStyleSelection = (selection) => ([
  { label: 'Perception', value: selection.perception },
  { label: 'Input', value: selection.input },
  { label: 'Processing', value: selection.processing },
  { label: 'Understanding', value: selection.understanding }
]);

const StyleSelector = ({ label, dim, optionA, optionB, currentStyle, onChange }) => {
  const value = currentStyle[dim] || optionA;
  return (
    <div className="style-selector">
      <span className="style-selector__label">{label}</span>
      <div className="style-selector__options">
        <label className={`style-selector__option ${value === optionA ? 'is-selected' : ''}`}>
          <input
            type="radio"
            name={dim}
            value={optionA}
            checked={value === optionA}
            onChange={onChange}
          />
          <span>{optionA}</span>
        </label>
        <label className={`style-selector__option ${value === optionB ? 'is-selected' : ''}`}>
          <input
            type="radio"
            name={dim}
            value={optionB}
            checked={value === optionB}
            onChange={onChange}
          />
          <span>{optionB}</span>
        </label>
      </div>
    </div>
  );
};

function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, initializing, refresh, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', image: null, password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [styleSelection, setStyleSelection] = useState(createDefaultStyleSelection);
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const canManageLearningStyle = profile?.userType === 'Student';

  useEffect(() => {
    if (initializing) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/profile');
        const withBadges = { ...data, badges: Array.isArray(data.badges) ? data.badges : [] };
        setProfile(withBadges);
        setForm(f => ({ ...f, name: withBadges.name }));
        if (data.learningStyle) {
          setStyleSelection(translateStyleFromDB(data.learningStyle));
        } else {
          setStyleSelection(createDefaultStyleSelection());
        }
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [initializing, isAuthenticated, navigate]);

  useEffect(() => {
    if (!canManageLearningStyle && showStyleEditor) {
      setShowStyleEditor(false);
    }
  }, [canManageLearningStyle, showStyleEditor]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm(f => ({ ...f, [name]: files ? files[0] : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    if ((profile.userType === 'Student' || profile.userType === 'Teacher') && form.name) {
      fd.append('name', form.name);
    }
    if (form.image) fd.append('image', form.image);
    if (form.password) fd.append('password', form.password);
    if (form.confirmPassword) fd.append('confirmPassword', form.confirmPassword);

    try {
      const { data } = await api.put('/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Profile updated');
      setProfile(prev => ({ ...prev, ...data.user }));
      setForm(f => ({ ...f, password: '', confirmPassword: '' }));
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!profile) return;
    confirmAlert({
      title: 'Confirm Account Deletion',
      message: 'Are you sure? This action is irreversible.',
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            setLoading(true);
            try {
              await api.delete('/profile');
              toast.success('Account deleted');
              logout();
              setTimeout(() => navigate('/register'), 1000);
            } catch (err) {
              toast.error(err.response?.data?.error || 'Delete failed');
            } finally {
              setLoading(false);
            }
          }
        },
        { label: 'No', onClick: () => {} }
      ]
    });
  };

  const handleStyleChange = (e) => {
    const { name, value } = e.target;
    setStyleSelection(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStyleSubmit = async (e) => {
    e.preventDefault();
    setIsSavingStyle(true);
    try {
      const { data } = await api.post('/set-style', styleSelection);
      const translated = translateStyleFromDB(data);
      setStyleSelection(translated);
      setProfile(prev => (prev ? { ...prev, learningStyle: data } : prev));
      toast.success('Learning style updated successfully!');
      await refresh();
      setShowStyleEditor(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save learning style');
    } finally {
      setIsSavingStyle(false);
    }
  };

  const openILSQuiz = () => {
    window.open(ILS_URL, '_blank', 'noopener,noreferrer');
  };

  const loginStreakCount = profile?.streaks?.login?.count ?? 0;
  const loginStreakBest = profile?.streaks?.login?.longest ?? loginStreakCount;
  const lessonStreakCount = profile?.streaks?.lesson?.count ?? 0;
  const lessonStreakBest = profile?.streaks?.lesson?.longest ?? lessonStreakCount;
  const dailyGoalState = profile?.dailyGoal || null;
  const lessonsCompletedToday = dailyGoalState?.lessonsCompletedToday ?? 0;
  const lessonsTarget = dailyGoalState?.lessonsTarget ?? 1;
  const loginsCompletedToday = dailyGoalState?.loginsCompletedToday ?? 0;
  const loginsTarget = dailyGoalState?.loginsTarget ?? 1;
  const goalMet = Boolean(dailyGoalState?.lessonGoalMet && dailyGoalState?.loginGoalMet);

  if (loading) {
    return <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" size={32} /></div>;
  }

  if (!profile) {
    return <p className="text-center text-red-500">Could not load user profile.</p>;
  }

  if (showStyleEditor && canManageLearningStyle) {
    return (
      <section className="profile">
        <h1 className="heading">Learning Style Setup</h1>
        <div className="form-screen form-screen--plain form-screen--stacked">
          <div className="form-card form-card--wide profile-card learning-style-card">
            <div className="learning-style-card__intro">
              <p>
                The Felder�Silverman Index of Learning Styles (ILS) helps you understand how you prefer to
                take in and process new information across four dimensions: Perception, Input, Processing, and Understanding.
              </p>
              <ol className="learning-style-card__steps">
                <li>Click the button below to open the official ILS questionnaire in a new tab.</li>
                <li>Complete the quiz and note the result for each of the four dimensions.</li>
                <li>Return to this page, choose the matching options, and save to personalize your experience.</li>
              </ol>
              <button type="button" className="btn" onClick={openILSQuiz}>
                Take the ILS Questionnaire
              </button>
            </div>

            <form className="learning-style-card__form" onSubmit={handleStyleSubmit}>
              <StyleSelector
                label="Perception"
                dim="perception"
                optionA="Sensory"
                optionB="Intuitive"
                currentStyle={styleSelection}
                onChange={handleStyleChange}
              />
              <StyleSelector
                label="Input"
                dim="input"
                optionA="Visual"
                optionB="Verbal"
                currentStyle={styleSelection}
                onChange={handleStyleChange}
              />
              <StyleSelector
                label="Processing"
                dim="processing"
                optionA="Active"
                optionB="Reflective"
                currentStyle={styleSelection}
                onChange={handleStyleChange}
              />
              <StyleSelector
                label="Understanding"
                dim="understanding"
                optionA="Sequential"
                optionB="Global"
                currentStyle={styleSelection}
                onChange={handleStyleChange}
              />

              <div className="form-actions horizontal">
                <button
                  type="button"
                  className="option-btn"
                  onClick={() => setShowStyleEditor(false)}
                  disabled={isSavingStyle}
                >
                  Back to profile
                </button>
                <button type="submit" className="btn" disabled={isSavingStyle}>
                  {isSavingStyle ? <ClipLoader color="#0f172a" size={18} /> : 'Save My Style'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  const canEditName = profile.userType === 'Student' || profile.userType === 'Teacher';
  const disablePassword = profile.userType === 'Admin';
  const displayName = canEditName ? form.name : profile.name;
  const imageSrc = resolveImage(profile.image);
  const styleSummary = profile.learningStyle
    ? describeStyleSelection(translateStyleFromDB(profile.learningStyle))
    : null;

  return (
    <section className="profile">
      <h1 className="heading">Profile Details</h1>
      <div className="form-screen form-screen--plain form-screen--stacked">
        <form
          className="form-card form-card--wide profile-card"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          autoComplete="off"
        >
          <div className="profile-card__header">
            <div className="profile-card__avatar">
              {imageSrc ? <img src={imageSrc} alt="Profile" /> : <div className="profile-card__placeholder" />}
            </div>
            <div className="profile-card__summary">
              <span className="profile-card__role">{profile.userType} account</span>
              <span className="profile-card__name">{displayName}</span>
              <span className="profile-card__email">{profile.email}</span>
              {typeof profile.xp === 'number' && (
                <span className="profile-card__xp">{profile.xp} XP</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="profile-name">
                Full name <span className="required-indicator">*</span>
              </label>
              <input
                id="profile-name"
                type="text"
                name="name"
                value={displayName}
                onChange={handleChange}
                required={canEditName}
                readOnly={!canEditName}
                aria-label="Name"
              />
            </div>
            <div>
              <label htmlFor="profile-email">Email address</label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                readOnly
                aria-label="Email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-image">Profile image</label>
            <input
              id="profile-image"
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              aria-label="Profile image"
            />
          </div>

          <div className="form-row">
            <div className="profile-card__password">
              <label htmlFor="profile-password">New password</label>
              <input
                id="profile-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={disablePassword ? 'Password updates disabled' : 'Enter new password'}
                aria-label="Password"
                disabled={disablePassword}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label="Toggle password visibility"
                disabled={disablePassword}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="profile-card__password">
              <label htmlFor="profile-confirm">Confirm password</label>
              <input
                id="profile-confirm"
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder={disablePassword ? 'Password updates disabled' : 'Confirm new password'}
                aria-label="Confirm password"
                disabled={disablePassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                aria-label="Toggle confirm password visibility"
                disabled={disablePassword}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {profile.userType === 'Student' && (
            <div className="profile-card__streaks">
              <div className="profile-card__streak-box">
                <span className="profile-card__streak-label">Login streak</span>
                <span className="profile-card__streak-count">{loginStreakCount} day{loginStreakCount === 1 ? '' : 's'}</span>
                <span className="profile-card__streak-sub">Best streak: {loginStreakBest}</span>
                <span className="profile-card__goal-progress">
                  Today: {loginsCompletedToday}/{loginsTarget} login{loginsTarget === 1 ? '' : 's'}
                </span>
              </div>
              <div className="profile-card__streak-box">
                <span className="profile-card__streak-label">Lesson streak</span>
                <span className="profile-card__streak-count">{lessonStreakCount} day{lessonStreakCount === 1 ? '' : 's'}</span>
                <span className="profile-card__streak-sub">Best streak: {lessonStreakBest}</span>
                <span className="profile-card__goal-progress">
                  Today: {lessonsCompletedToday}/{lessonsTarget} lesson{lessonsTarget === 1 ? '' : 's'}
                </span>
              </div>
              <div className="profile-card__streak-box">
                <span className="profile-card__streak-label">Daily goals</span>
                <span className="profile-card__streak-count">
                  {goalMet ? 'Goal complete' : 'Keep going'}
                </span>
                <span className="profile-card__streak-sub">
                  Stay consistent to build your streaks and unlock more badges.
                </span>
                <span className={`profile-card__goal-pill${goalMet ? ' is-complete' : ''}`}>
                  {goalMet ? 'All targets met today' : 'Progress saved for today'}
                </span>
              </div>
            </div>
          )}

          <div className="profile-card__style">
            <div className="profile-card__style-header">
              <h2>Learning style</h2>
              {canManageLearningStyle && (
                <button
                  type="button"
                  className="profile-card__style-btn"
                  onClick={() => setShowStyleEditor(true)}
                  aria-label="Add or update learning style"
                >
                  <FaPlus />
                </button>
              )}
            </div>
            {styleSummary ? (
              <ul className="profile-card__style-summary">
                {styleSummary.map(item => (
                  <li key={item.label}>
                    <strong>{item.label}:</strong> {item.value}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-card__style-empty">
                {canManageLearningStyle
                  ? "You haven't saved a learning style yet. Click + to add yours."
                  : 'No learning style has been recorded for this account.'}
              </p>
            )}
          </div>

          <div className="profile-card__badges">
            <div className="profile-card__badges-header">
              <h2>Badges</h2>
            </div>
            {Array.isArray(profile.badges) && profile.badges.length ? (
              <ul className="profile-card__badge-list">
                {profile.badges.map(badge => (
                  <li key={`${badge.badgeId}-${badge.awardedAt || badge.title}`}>
                    <span className="profile-card__badge-icon">
                      <i className={badge.icon || 'fas fa-medal'} aria-hidden="true" />
                    </span>
                    <div className="profile-card__badge-copy">
                      <span className="profile-card__badge-title">{badge.title}</span>
                      {badge.description ? (
                        <span className="profile-card__badge-desc">{badge.description}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-card__badges-empty">No badges earned yet. Keep learning to unlock achievements!</p>
            )}
          </div>

          <div className="form-actions horizontal profile-card__actions">
            <button type="submit" className="btn">
              Save changes
            </button>
            {canEditName && (
              <button type="button" onClick={handleDelete} className="delete-btn">
                Delete account
              </button>
            )}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="option-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Profile;

