import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import './App.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './api';
const createDefaultStats = () => ({
  likes: 0,
  comments: 0,
  bookmarked: 0,
  xp: 0,
  badges: 0,
  loginStreak: 0,
  loginBest: 0,
  lessonStreak: 0,
  lessonBest: 0,
  dailyGoal: {
    lessonsCompleted: 0,
    lessonsTarget: 1,
    lessonGoalMet: false,
    loginsCompleted: 0,
    loginsTarget: 1,
    loginGoalMet: false
  }
});

function Home() {
  const [stats, setStats] = useState(createDefaultStats);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');
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
    if (userType === 'Student') {
      setLoadingRecommendations(true);
      api.get('/courses/student/for-you')
        .then(({ data }) => {
          setRecommendations(Array.isArray(data) ? data : []);
          setRecommendationsError('');
        })
        .catch((err) => {
          setRecommendations([]);
          setRecommendationsError(err.response?.data?.error || 'Failed to load personalized materials');
        })
        .finally(() => setLoadingRecommendations(false));
    } else {
      setRecommendations([]);
      setLoadingRecommendations(false);
      setRecommendationsError('');
    }
    if (isAuthenticated) {
      const badgesCount = Array.isArray(user?.badges) ? user.badges.length : 0;
      const loginStreak = user?.streaks?.login?.count ?? 0;
      const loginBest = user?.streaks?.login?.longest ?? loginStreak;
      const lessonStreak = user?.streaks?.lesson?.count ?? 0;
      const lessonBest = user?.streaks?.lesson?.longest ?? lessonStreak;
      const lessonsCompleted = user?.dailyGoal?.lessonsCompletedToday ?? 0;
      const lessonsTarget = user?.dailyGoal?.lessonsTarget ?? 1;
      const loginsCompleted = user?.dailyGoal?.loginsCompletedToday ?? 0;
      const loginsTarget = user?.dailyGoal?.loginsTarget ?? 1;
      setStats({
        likes: 12,
        comments: 5,
        bookmarked: 3,
        xp: user?.xp ?? 0,
        badges: badgesCount,
        loginStreak,
        loginBest,
        lessonStreak,
        lessonBest,
        dailyGoal: {
          lessonsCompleted,
          lessonsTarget,
          lessonGoalMet: Boolean(user?.dailyGoal?.lessonGoalMet),
          loginsCompleted,
          loginsTarget,
          loginGoalMet: Boolean(user?.dailyGoal?.loginGoalMet)
        }
      }); // TODO replace with real API
    } else {
      setStats(createDefaultStats());
    }
  }, [initializing, userType, isAuthenticated, user?.xp, user?.badges?.length, user?.streaks, user?.dailyGoal]);
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
            <div className="box" style={{ textAlign: 'center', color: '#f8fafc' }}>
              <h3 className="title" style={{ fontWeight: 700, fontSize: '2rem', marginBottom: '1rem' }}>Likes and Comments</h3>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-heart" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Total Likes : <span>{stats.likes}</span>
                <Link to="/likes" className="inline-btn" style={{ marginLeft: '1rem' }}>View Likes</Link>
              </div>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-comment" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Total Comments : <span>{stats.comments}</span>
                <Link to="/comments" className="inline-btn" style={{ marginLeft: '1rem' }}>View Comments</Link>
              </div>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-bookmark" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Saved Playlist : <span>{stats.bookmarked}</span>
                <Link to="/bookmark" className="inline-btn" style={{ marginLeft: '1rem' }}>View Bookmark</Link>
              </div>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-bolt" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Total XP : <span>{stats.xp}</span>
              </div>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-medal" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Badges Unlocked : <span>{stats.badges}</span>
              </div>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-fire" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Login Streak : <span>{stats.loginStreak} day{stats.loginStreak === 1 ? '' : 's'}</span>
                <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>(Best {stats.loginBest})</span>
              </div>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-seedling" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Lesson Streak : <span>{stats.lessonStreak} day{stats.lessonStreak === 1 ? '' : 's'}</span>
                <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>(Best {stats.lessonBest})</span>
              </div>
              <div style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                <i className="fas fa-bullseye" style={{ color: 'var(--main-color)', marginRight: '0.5rem' }}></i>
                Daily Goal :
                <span style={{ marginLeft: '0.5rem' }}>
                  Lessons {stats.dailyGoal.lessonsCompleted}/{stats.dailyGoal.lessonsTarget} · Logins {stats.dailyGoal.loginsCompleted}/{stats.dailyGoal.loginsTarget}
                </span>
                {(stats.dailyGoal.lessonGoalMet && stats.dailyGoal.loginGoalMet) && (
                  <span style={{ marginLeft: '0.5rem', color: '#22d3ee' }}>Completed!</span>
                )}
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
        </div>
      </section>
      <section className="courses">
        <h1 className="heading">For You</h1>
        {userType === 'Student' ? (
          loadingRecommendations ? (
            <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" /></div>
          ) : recommendationsError ? (
            <p className="empty">{recommendationsError}</p>
          ) : recommendations.length === 0 ? (
            <p className="empty">We&apos;ll recommend lessons here once you start enrolling in courses.</p>
          ) : (
            <div className="box-container">
              {recommendations.map(item => (
                <div
                  key={`${item.course.id}-${item.material.id}`}
                  className="box for-you-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/courses/${item.course.id}/materials/${item.material.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      navigate(`/courses/${item.course.id}/materials/${item.material.id}`);
                    }
                  }}
                >
                  <div className="for-you-thumb">
                    <img
                      src={item.material.thumbUrl || item.course.thumbUrl || '/images/placeholder-course.jpg'}
                      alt={item.material.title}
                      loading="lazy"
                    />
                  </div>
                  <div className="for-you-meta">
                    <span className="for-you-course">{item.course.title}</span>
                    <h4>{item.material.title}</h4>
                    <p>{item.material.description || 'Tailored to your learning style.'}</p>
                    <div className="for-you-tags">
                      {item.material.annotations?.category && <span>{item.material.annotations.category}</span>}
                      {item.material.annotations?.format && <span>{item.material.annotations.format}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/courses/${item.course.id}/materials/${item.material.id}`);
                    }}
                  >
                    Open material
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="box-container">
            <p className="empty">No courses added yet!</p>
          </div>
        )}
        <div className="more-btn">
          <Link to={userType === 'Student' ? '/student/courses' : '/courses'} className="inline-option-btn">View more</Link>
        </div>
      </section>
    </div>
  );
}
export default Home;



