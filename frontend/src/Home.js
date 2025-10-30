import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import './App.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './api';
function Home() {
  const [stats, setStats] = useState({ likes: 0, comments: 0, bookmarked: 0 });
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();
  const userType = user?.userType || null;
  useEffect(() => {
    if (initializing) return;
    if (userType === 'Admin') {
      setLoadingCourses(true);
      api.get('/courses')
        .then(({ data }) => {
          setCourses(Array.isArray(data) ? data : []);
          setLoadingCourses(false);
        })
        .catch(() => {
          toast.error('Failed to load courses');
          setError('Failed to load courses');
          setLoadingCourses(false);
        });
    } else {
      setLoadingCourses(false);
    }
    if (isAuthenticated) {
      setStats({ likes: 12, comments: 5, bookmarked: 3 }); // TODO replace with real API
    } else {
      setStats({ likes: 0, comments: 0, bookmarked: 0 });
    }
  }, [initializing, userType, isAuthenticated]);
  // Filter courses by search
  const filteredCourses = courses.filter(course =>
    course.title?.toLowerCase().includes(search.toLowerCase())
  );
  // Admin: YouTube-style grid with actions
  if (userType === 'Admin') {
    return (
      <div>
        <section className="admin-courses" style={{ background: '#111', color: '#fff', padding: '2rem 0' }}>
          <h1 className="heading" style={{ color: '#14b8a6', fontWeight: 700, fontSize: '2.2rem', marginBottom: '2rem' }}>All Courses</h1>
          <div style={{ maxWidth: 900, margin: '0 auto 2rem auto' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="mb-6 p-2 border rounded w-full max-w-md"
              style={{ background: '#222', color: '#fff', border: '1px solid #14b8a6' }}
              aria-label="Search courses"
            />
          </div>
          {loadingCourses ? (
            <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" /></div>
          ) : error ? (
            <p className="text-center text-red-400">{error}</p>
          ) : filteredCourses.length === 0 ? (
            <p className="text-center text-gray-400">No courses found.</p>
          ) : (
            <div
              className="grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '2rem',
                padding: '0 2rem'
              }}
            >
              {filteredCourses.map(course => (
                <div
                  key={course.id || course._id}
                  className="rounded-md bg-gray-900 shadow-lg border border-gray-800 flex flex-col overflow-hidden transition-all"
                  style={{
                    position: 'relative',
                    minHeight: 0,
                    cursor: 'pointer'
                  }}
                >
                  <div
                    className="w-full"
                    style={{
                      aspectRatio: '16/9',
                      background: '#222',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={course.thumb ? `/uploaded_files/${course.thumb}` : course.backgroundImage}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.2s',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        width: '100%',
                        background: 'rgba(20,184,166,0.85)',
                        color: '#fff',
                        padding: '0.5rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        letterSpacing: '0.01em'
                      }}
                    >
                      <span style={{ marginRight: '0.5rem' }}>
                        {/* Optionally show icon if available */}
                        {course.icon && React.createElement(course.icon, { style: { fontSize: '1.2rem', verticalAlign: 'middle' } })}
                      </span>
                      {course.title}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between px-4 py-3">
                    <div className="flex gap-2 mt-2">
                      <Link
                        to={`/courses/${course.id || course._id}`}
                        className="bg-teal-400 text-black px-3 py-1 rounded hover:bg-teal-500 text-sm font-semibold"
                        aria-label="View course"
                      >
                        View
                      </Link>
                      <button
                        className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm font-semibold"
                        aria-label="Edit course"
                        onClick={() => navigate(`/courses/${course.id || course._id}/edit`)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-semibold"
                        aria-label="Delete course"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this course?')) {
                            // TODO: Implement delete logic (API call, update state, show toast)
                            toast.info('Delete functionality not implemented yet.');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }
  // Non-admin: original home view
  return (
    <div>
      <section className="quick-select">
        <h1 className="heading">Quick Options</h1>
        <div className="box-container">
          {/* ...existing code... */}
          {!isAuthenticated ? (
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
    </div>
  );
}
export default Home;