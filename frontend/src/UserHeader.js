import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSync } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import './App.css';
import { useAuth } from './context/AuthContext';
import api from './api';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const FILE_BASE_URL = (process.env.REACT_APP_FILE_BASE_URL || API_BASE.replace(/\/api$/, '')).replace(/\/$/, '');

const resolveAvatar = (image) => {
  if (!image) return '';
  const normalized = image.replace(/\\/g, '/');
  if (normalized.startsWith('http')) return normalized;
  if (normalized.startsWith('/uploaded_files')) {
    return `${FILE_BASE_URL}${normalized}`;
  }
  if (normalized.startsWith('uploaded_files')) {
    return `${FILE_BASE_URL}/${normalized}`;
  }
  return `${FILE_BASE_URL}/uploaded_files/${normalized.replace(/^\/+/, '')}`;
};

function UserHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark-mode') === 'enabled');
  const [isPredicting, setIsPredicting] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const avatarSrc = useMemo(() => resolveAvatar(user?.image), [user?.image]);
  const displayName = user?.name || 'Guest';
  const displayRole = user?.userType || (isAuthenticated ? 'Member' : '');
  const studentMetrics = useMemo(() => {
    if (!user || user.userType !== 'Student') {
      return null;
    }
    const xp = typeof user.xp === 'number' ? user.xp : 0;
    const badgeCount = Array.isArray(user.badges) ? user.badges.length : 0;
    const loginStreak = user.streaks?.login?.count ?? 0;
    return {
      xp,
      badgeCount,
      loginStreak
    };
  }, [user]);

  const navLinks = useMemo(() => {
    const links = [
      { to: '/home', label: 'Home' },
      { to: '/courses', label: 'Courses' }
    ];
    if (user?.userType === 'Student') {
      links.push({ to: '/student/courses', label: 'My Courses' });
    }
    if (user?.userType === 'Teacher') {
      links.push(
        { to: '/teacher/courses', label: 'My Courses' },
        { to: '/teacher/materials', label: 'Upload' }
      );
    }
    links.push({ to: '/teachers', label: 'Teachers' });
    if (user?.userType === 'Admin') {
      links.push({ to: '/students', label: 'Students' }, { to: '/admin/model', label: 'Model' });
    }
    links.push({ to: '/about', label: 'About' }, { to: '/contact', label: 'Contact' });
    return links;
  }, [user?.userType]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.remove('active');
    } else {
      document.body.classList.add('active');
    }
    return () => document.body.classList.remove('active');
  }, [sidebarOpen]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('dark-mode', 'enabled');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('dark-mode', 'disabled');
    }
  }, [darkMode]);

  const handlePredict = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to update your learning style.');
      return;
    }
    setIsPredicting(true);
    try {
      await api.post('/predict-style');
      toast.success('Your learning style has been updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update your learning style.');
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <>
      <header className="floating-nav" aria-label="Primary navigation">
        <div className="floating-nav__shell">
          <Link to={isAuthenticated ? '/home' : '/'} className="floating-nav__logo">
            ApexLearn
          </Link>
          <nav className="floating-nav__menu">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`floating-nav__link${isActive ? ' is-active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="floating-nav__actions">
            <button
              type="button"
              className="floating-nav__icon"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar menu"
            >
              <i className="fas fa-bars" />
            </button>
            <button
              type="button"
              className="floating-nav__icon"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Toggle theme"
            >
              <i className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`} />
            </button>
            {isAuthenticated && user?.userType === 'Student' && (
              <button
                type="button"
                className="floating-nav__cta floating-nav__cta--ghost floating-nav__cta--sync"
                onClick={handlePredict}
                disabled={isPredicting}
                aria-label="Update my learning style"
              >
                {isPredicting ? (
                  <ClipLoader size={16} color="#14b8a6" />
                ) : (
                  <FaSync />
                )}
              </button>
            )}
            {isAuthenticated ? (
              <Link to="/profile" className="floating-nav__cta floating-nav__cta--outline">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" />
                ) : (
                  <span>{displayName.split(' ')[0]}</span>
                )}
              </Link>
            ) : (
              <>
                <Link to="/login" className="floating-nav__cta floating-nav__cta--ghost">
                  Log In
                </Link>
                <Link to="/register" className="floating-nav__cta floating-nav__cta--solid">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={`side-bar${sidebarOpen ? '' : ' active'}`} style={{ left: sidebarOpen ? 0 : '-31rem' }}>
        <div className="close-side-bar" onClick={() => setSidebarOpen(false)}>
          <i className="fas fa-times"></i>
        </div>
        <div className="profile">
          {isAuthenticated ? (
            <>
              {avatarSrc ? <img src={avatarSrc} alt={`${displayName}'s profile`} /> : <div className="profile-placeholder"></div>}
              <h3>{displayName}</h3>
              <span>{displayRole}</span>
              {studentMetrics && (
                <div className="sidebar-metrics" aria-label="Student progress summary">
                  <span><i className="fas fa-bolt" aria-hidden="true"></i>{studentMetrics.xp}</span>
                  <span><i className="fas fa-medal" aria-hidden="true"></i>{studentMetrics.badgeCount}</span>
                  <span><i className="fas fa-fire" aria-hidden="true"></i>{studentMetrics.loginStreak}</span>
                </div>
              )}
              <Link to="/profile" className="btn sidebar-profile-btn">View profile</Link>
            </>
          ) : (
            <>
              <h3 className="title">Please login or register</h3>
              <div className="flex-btn" style={{ paddingTop: '.5rem' }}>
                <Link to="/login" className="option-btn">Login</Link>
                <Link to="/register" className="option-btn">Register</Link>
              </div>
            </>
          )}
        </div>
        <nav className="navbar">
          <Link to="/home"><i className="fas fa-home"></i><span>Home</span></Link>
          <Link to="/courses"><i className="fas fa-graduation-cap"></i><span>Courses</span></Link>
          {user?.userType === 'Student' && (
            <Link to="/student/courses"><i className="fas fa-layer-group"></i><span>My Courses</span></Link>
          )}
          {user?.userType === 'Teacher' && (
            <>
              <Link to="/teacher/courses"><i className="fas fa-folder-open"></i><span>My Courses</span></Link>
              <Link to="/teacher/materials"><i className="fas fa-upload"></i><span>Upload Material</span></Link>
            </>
          )}
          <Link to="/teachers"><i className="fas fa-chalkboard-user"></i><span>Teachers</span></Link>
          {user?.userType === 'Admin' && (
            <>
              <Link to="/students"><i className="fas fa-users"></i><span>Students</span></Link>
              <Link to="/admin/model"><i className="fas fa-robot"></i><span>Model</span></Link>
            </>
          )}
          <Link to="/about"><i className="fas fa-question"></i><span>About Us</span></Link>
          <Link to="/contact"><i className="fas fa-headset"></i><span>Contact Us</span></Link>
        </nav>
      </div>
    </>
  );
}

export default UserHeader;
