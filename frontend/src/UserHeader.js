import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';

const resolveAvatar = (image) => {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/uploaded_files')) {
    return `${FILE_BASE_URL}${image}`;
  }
  return `${FILE_BASE_URL}/uploaded_files/${image}`;
};

function UserHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark-mode') === 'enabled');
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const avatarSrc = useMemo(() => resolveAvatar(user?.image), [user?.image]);
  const displayName = user?.name || 'Guest';
  const displayRole = user?.userType || (isAuthenticated ? 'Member' : '');

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

  return (
    <>
      <header className="header">
        <section className="flex">
          <Link to={isAuthenticated ? '/home' : '/login'} className="logo">ApexLearn</Link>
          <form className="search-form">
            <input type="text" name="search_course" placeholder="Search courses..." maxLength={100} />
            <button type="submit" className="fas fa-search" name="search_course_btn"></button>
          </form>
          <div className="icons">
            <div id="menu-btn" className="fas fa-bars" onClick={() => setSidebarOpen(!sidebarOpen)}></div>
            <div id="search-btn" className="fas fa-search"></div>
            <div
              id="user-btn"
              className="fas fa-user"
              onClick={() => navigate(isAuthenticated ? '/profile' : '/login')}
              role="button"
              tabIndex={0}
            ></div>
            <div id="toggle-btn" className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`} onClick={() => setDarkMode((prev) => !prev)}></div>
          </div>
          <div className="profile">
            {isAuthenticated ? (
              <>
                {avatarSrc ? <img src={avatarSrc} alt={`${displayName}'s profile`} /> : <div className="profile-placeholder"></div>}
                <h3>{displayName}</h3>
                <span>{displayRole}</span>
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
        </section>
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
            <Link to="/students"><i className="fas fa-users"></i><span>Students</span></Link>
          )}
          <Link to="/about"><i className="fas fa-question"></i><span>About Us</span></Link>
          <Link to="/contact"><i className="fas fa-headset"></i><span>Contact Us</span></Link>
        </nav>
      </div>
    </>
  );
}

export default UserHeader;
