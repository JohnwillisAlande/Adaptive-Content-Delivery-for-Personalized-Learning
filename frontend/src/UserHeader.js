import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom';
import './App.css';

function UserHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar open by default
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark-mode') === 'enabled');


  // User state: always reflects localStorage token
  const [user, setUser] = useState({
    name: '',
    image: '',
    loggedIn: false,
    userType: ''
  });

  // Check login state on mount and on storage changes
  useEffect(() => {
    function syncUser() {
      const token = localStorage.getItem('token');
      const name = localStorage.getItem('user_name');
      const image = localStorage.getItem('user_image');
      let userType = '';
      if (token) {
        try {
          userType = jwtDecode(token).userType;
        } catch {}
        setUser({
          name: name || 'Student Name',
          image: image || '',
          loggedIn: true,
          userType
        });
      } else {
        setUser({
          name: '',
          image: '',
          loggedIn: false,
          userType: ''
        });
      }
    }
    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

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

  const handleToggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <>
      <header className="header">
        <section className="flex">
          <Link to="/home" className="logo">ApexLearn</Link>
          <form className="search-form">
            <input type="text" name="search_course" placeholder="Search courses..." maxLength={100} />
            <button type="submit" className="fas fa-search" name="search_course_btn"></button>
          </form>
          <div className="icons">
            <div id="menu-btn" className="fas fa-bars" onClick={() => setSidebarOpen(!sidebarOpen)}></div>
            <div id="search-btn" className="fas fa-search"></div>
            <div id="user-btn" className="fas fa-user"></div>
            <div id="toggle-btn" className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`} onClick={handleToggleTheme}></div>
          </div>
          <div className="profile">
            {user.loggedIn ? (
              <>
                {user.image ? <img src={user.image} alt="" /> : <div className="profile-placeholder"></div>}
                <h3>{user.name}</h3>
                <span>Student</span>
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

      {/* Sidebar */}
      <div className={`side-bar${sidebarOpen ? '' : ' active'}`} style={{ left: sidebarOpen ? 0 : '-31rem' }}>
        <div className="close-side-bar" onClick={() => setSidebarOpen(false)}>
          <i className="fas fa-times"></i>
        </div>
        <div className="profile">
          {user.loggedIn ? (
            <>
              {user.image ? <img src={user.image} alt="" /> : <div className="profile-placeholder"></div>}
              <h3>{user.name}</h3>
              <span>{user.userType || 'Student'}</span>
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
          <Link to="/teachers"><i className="fas fa-chalkboard-user"></i><span>Teachers</span></Link>
          {user.userType === 'Admin' && (
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
