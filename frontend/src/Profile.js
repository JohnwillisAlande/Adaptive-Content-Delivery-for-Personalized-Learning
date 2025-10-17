
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './App.css';

function Profile() {
  const navigate = useNavigate();
  // Simulate fetching user and stats from localStorage or backend
  const [user, setUser] = useState({
    name: '',
    image: '',
    role: 'student',
  });
  const [stats, setStats] = useState({
    total_bookmarked: 0,
    total_likes: 0,
    total_comments: 0,
  });

  useEffect(() => {
    // Simulate auth check and redirect if not logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    // Simulate fetching user info
    setUser({
      name: localStorage.getItem('user_name') || 'Student Name',
      image: localStorage.getItem('user_image') || '',
      role: 'student',
    });
    // Simulate fetching stats (replace with real API call)
    setStats({
      total_bookmarked: Number(localStorage.getItem('total_bookmarked')) || 0,
      total_likes: Number(localStorage.getItem('total_likes')) || 0,
      total_comments: Number(localStorage.getItem('total_comments')) || 0,
    });
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_image');
      localStorage.removeItem('total_bookmarked');
      localStorage.removeItem('total_likes');
      localStorage.removeItem('total_comments');
      navigate('/login');
    }
  };

  return (
    <section className="profile">
      <h1 className="heading">profile details</h1>
      <div className="details">
        <div className="user">
          {user.image ? (
            <img src={user.image} alt="Profile" />
          ) : (
            <div className="profile-placeholder" style={{ width: '10rem', height: '10rem', borderRadius: '50%', background: '#eee', margin: '0 auto .5rem' }}></div>
          )}
          <h3>{user.name}</h3>
          <p>{user.role}</p>
          <Link to="/update" className="inline-btn">update profile</Link>
        </div>
        <div className="box-container">
          <div className="box">
            <div className="flex">
              <i className="fas fa-bookmark"></i>
              <div>
                <h3>{stats.total_bookmarked}</h3>
                <span>saved playlists</span>
              </div>
            </div>
            <Link to="/playlist" className="inline-btn">view playlists</Link>
          </div>
          <div className="box">
            <div className="flex">
              <i className="fas fa-heart"></i>
              <div>
                <h3>{stats.total_likes}</h3>
                <span>liked tutorials</span>
              </div>
            </div>
            <Link to="/likes" className="inline-btn">view liked</Link>
          </div>
          <div className="box">
            <div className="flex">
              <i className="fas fa-comment"></i>
              <div>
                <h3>{stats.total_comments}</h3>
                <span>video comments</span>
              </div>
            </div>
            <Link to="/comments" className="inline-btn">view comments</Link>
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button onClick={handleLogout} className="inline-btn" style={{ background: '#e74c3c', color: '#fff' }}>Logout</button>
      </div>
    </section>
  );
}

export default Profile;
