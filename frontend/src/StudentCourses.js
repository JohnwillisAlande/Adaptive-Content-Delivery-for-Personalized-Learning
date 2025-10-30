import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';

const resolveThumb = (thumb, fallback) => {
  if (thumb) {
    if (thumb.startsWith('http')) return thumb;
    if (thumb.startsWith('/')) return `${FILE_BASE_URL}${thumb}`;
    return `${FILE_BASE_URL}/uploaded_files/${thumb}`;
  }
  return fallback || 'https://via.placeholder.com/640x360/1e293b/ffffff?text=Course';
};

function StudentCourses() {
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated) {
      toast.error('Please login to view your courses');
      navigate('/login', { replace: true });
      return;
    }

    if (user?.userType !== 'Student') {
      toast.error('Students only');
      navigate('/home', { replace: true });
      return;
    }

    let active = true;
    const loadCourses = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/courses/student/my');
        if (!active) return;
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load enrolled courses');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCourses();
    return () => {
      active = false;
    };
  }, [initializing, isAuthenticated, user?.userType, navigate]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => (b.progressPercent || 0) - (a.progressPercent || 0)),
    [courses]
  );

  const handleOpenCourse = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <ClipLoader color="#14b8a6" size={32} />
      </div>
    );
  }

  return (
    <main className="main-content">
      <div className="page-shell">
        <section className="course-hero animate-in">
          <div>
            <h1 className="heading">My courses</h1>
            <p className="subheading">
              Track your progress, revisit completed lessons and continue learning where you left off.
            </p>
          </div>
        </section>

        <section className="card animate-in">
          {sortedCourses.length === 0 ? (
            <div className="empty">
              You have not enrolled in any courses yet. Visit the catalogue to start learning.
            </div>
          ) : (
            <div className="card-grid">
              {sortedCourses.map(course => {
                const thumb = resolveThumb(course.thumb, course.backgroundImage);
                const progress = Math.max(0, Math.min(100, course.progressPercent || 0));
                return (
                  <article
                    key={course.id}
                    className="card course-card animate-in"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenCourse(course.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleOpenCourse(course.id);
                    }}
                  >
                    <div className="thumb-wrapper">
                      <img src={thumb} alt={course.title} />
                      <span className="enrolled-pill">{progress}% complete</span>
                    </div>
                    <h3 className="card-title">{course.title}</h3>
                    {course.subtitle && <p className="card-meta">{course.subtitle}</p>}
                    {course.description && <p className="card-meta">{course.description}</p>}
                    <div className="chip-row">
                      {course.duration && <span className="chip">Duration: {course.duration}</span>}
                      <span className="chip">
                        {course.completedMaterials || 0} / {course.totalMaterials || 0} materials
                      </span>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default StudentCourses;
