
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import { jwtDecode } from 'jwt-decode';
import './App.css';
import { Link } from 'react-router-dom';

function Home() {
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [stats, setStats] = useState({ likes: 0, comments: 0, bookmarked: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setUserLoggedIn(!!token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.userType === 'Admin') {
          setIsAdmin(true);
          setLoadingCourses(true);
          fetch('/api/courses', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
              setCourses(data);
              setLoadingCourses(false);
            })
            .catch(() => {
              toast.error('Failed to load courses');
              setLoadingCourses(false);
            });
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
      setStats({ likes: 12, comments: 5, bookmarked: 3 }); // Replace with real API call
    }
  }, []);

  return (
    <div>
      {isAdmin ? (
        <section className="admin-courses" style={{ background: '#111', color: '#fff', padding: '2rem 0' }}>
          <h1 className="heading" style={{ color: '#14b8a6', fontWeight: 700, fontSize: '2.2rem', marginBottom: '2rem' }}>All Courses</h1>
          {loadingCourses ? (
            <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" /></div>
          ) : courses.length === 0 ? (
            <p className="text-center text-gray-400">No courses found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
              {courses.map(course => (
                <div key={course.id || course._id} className="rounded-md bg-gray-900 shadow-lg border border-gray-800 flex flex-col overflow-hidden">
                  <div className="w-full aspect-video bg-black">
                    <img
                      src={course.thumb}
                      alt={`${course.title} thumbnail`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{ aspectRatio: '16/9', display: 'block' }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between px-4 py-3">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-2">{course.title}</h2>
                      <p className="text-gray-300 mb-2" style={{ fontSize: '1rem' }}>{course.description?.slice(0, 80)}{course.description?.length > 80 ? '...' : ''}</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Link to={`/courses/${course.id || course._id}`} className="bg-teal-400 text-black px-3 py-1 rounded hover:bg-teal-500 text-sm font-semibold" aria-label="View course">View</Link>
                      <button className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm font-semibold" aria-label="Edit course">Edit</button>
                      <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-semibold" aria-label="Delete course">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        // ...existing home content for non-admins...
        <>
          <section className="quick-select">
            <h1 className="heading">Quick Options</h1>
            <div className="box-container">
              {/* ...existing code... */}
              {!userLoggedIn ? (
                <div className="box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  <h3 className="title" style={{ marginBottom: '1.5rem', fontWeight: 700, fontSize: '2rem' }}>Please login or register</h3>
                  <div className="flex-btn" style={{ justifyContent: 'center', gap: '1rem' }}>
                    <Link to="/login" className="option-btn" style={{ minWidth: '120px', fontWeight: 600 }}>Login</Link>
                    <Link to="/register" className="option-btn" style={{ minWidth: '120px', fontWeight: 600 }}>Register</Link>
                  </div>
                </div>
              ) : (
                <div className="box" style={{ textAlign: 'center' }}>
                  <h3 className="title" style={{ fontWeight: 700, fontSize: '2rem', marginBottom: '1rem' }}>Likes and Comments</h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <i className="fas fa-heart" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                    Total Likes : <span>{stats.likes}</span>
                    <Link to="/likes" className="inline-btn" style={{ marginLeft: '1rem' }}>View Likes</Link>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <i className="fas fa-comment" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                    Total Comments : <span>{stats.comments}</span>
                    <Link to="/comments" className="inline-btn" style={{ marginLeft: '1rem' }}>View Comments</Link>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <i className="fas fa-bookmark" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                    Saved Playlist : <span>{stats.bookmarked}</span>
                    <Link to="/bookmark" className="inline-btn" style={{ marginLeft: '1rem' }}>View Bookmark</Link>
                  </div>
                </div>
              )}
              {/* ...existing categories, topics, tutor box... */}
              <div className="box">
                <h3 className="title">Top categories</h3>
                <div className="flex">
                  <Link to="/search_course"><i className="fas fa-code"></i><span>Development</span></Link>
                  <a href="#"><i className="fas fa-chart-simple"></i><span>Business</span></a>
                  <a href="#"><i className="fas fa-pen"></i><span>Design</span></a>
                  <a href="#"><i className="fas fa-chart-line"></i><span>Marketing</span></a>
                  <a href="#"><i className="fas fa-music"></i><span>Music</span></a>
                  <a href="#"><i className="fas fa-camera"></i><span>Photography</span></a>
                  <a href="#"><i className="fas fa-cog"></i><span>Software</span></a>
                  <a href="#"><i className="fas fa-vial"></i><span>Science</span></a>
                </div>
              </div>
              <div className="box">
                <h3 className="title">Popular topics</h3>
                <div className="flex">
                  <a href="#"><i className="fab fa-html5"></i><span>HTML</span></a>
                  <a href="#"><i className="fab fa-css3"></i><span>CSS</span></a>
                  <a href="#"><i className="fab fa-js"></i><span>JavaScript</span></a>
                  <a href="#"><i className="fab fa-react"></i><span>React</span></a>
                  <a href="#"><i className="fab fa-php"></i><span>PHP</span></a>
                  <a href="#"><i className="fab fa-bootstrap"></i><span>Bootstrap</span></a>
                </div>
              </div>
              <div className="box tutor" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h3 className="title" style={{ fontWeight: 700, fontSize: '2rem', marginBottom: '1rem', textAlign: 'center', width: '100%' }}>Become a tutor</h3>
                <p style={{ marginBottom: '1.5rem' }}>Share your expertise and inspire learners by joining our platform as a tutor. Help students achieve their goals and grow your professional network.</p>
                <Link
                  to="/admin/register"
                  className="inline-btn"
                  style={{
                    width: '100%',
                    borderRadius: '.5rem',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    background: '#00a085',
                    color: '#fff',
                    letterSpacing: '.01em',
                    marginTop: '.5rem',
                    padding: '1rem 0',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#008066'}
                  onMouseOut={e => e.currentTarget.style.background = '#00a085'}
                >
                  Get started
                </Link>
              </div>
            </div>
          </section>
          <section className="courses">
            <h1 className="heading">Latest courses</h1>
            <div className="box-container">
              {/* TODO: Map over latest courses from backend */}
              <p className="empty">No courses added yet!</p>
            </div>
            <div className="more-btn">
              <Link to="/courses" className="inline-option-btn">View more</Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;
