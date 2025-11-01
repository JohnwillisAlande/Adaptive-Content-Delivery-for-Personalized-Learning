import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1200&q=80';

const resolveThumb = (course) => {
  const candidate =
    course?.thumbnail ||
    course?.thumb ||
    course?.backgroundImage ||
    course?.image;

  if (!candidate) return FALLBACK_IMAGE;
  if (candidate.startsWith('http')) return candidate;
  if (candidate.startsWith('/')) return `${FILE_BASE_URL}${candidate}`;
  return `${FILE_BASE_URL}/uploaded_files/${candidate}`;
};

const clampProgress = (value) => {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
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

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const progressA = clampProgress(a?.progressPercent ?? a?.progress ?? 0);
      const progressB = clampProgress(b?.progressPercent ?? b?.progress ?? 0);
      return progressB - progressA;
    });
  }, [courses]);

  const handleOpenCourse = async (course) => {
    const courseId = course?.id || course?._id || course?.courseId;
    if (!courseId) return;

    let targetPath = `/courses/${courseId}`;
    try {
      const { data } = await api.get(`/courses/${courseId}`, {
        params: { page: 1, pageSize: 1, format: 'All' }
      });
      const requiresEnrollment = Boolean(data?.enrollmentRequired);
      const materials = Array.isArray(data?.materials) ? data.materials : [];
      if (!requiresEnrollment && materials.length > 0) {
        const firstMaterial = materials[0];
        const materialId = firstMaterial?._id || firstMaterial?.id;
        if (materialId) {
          targetPath = `/courses/${courseId}/materials/${materialId}`;
        }
      }
    } catch (err) {
      // Ignore errors and fall back to the course overview
    }

    navigate(targetPath);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <ClipLoader color="#14b8a6" size={32} />
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1 className="heading">My Courses</h1>
      <p className="subheading">
        Track your progress, revisit completed lessons, and pick up exactly where you left off.
      </p>

      <div className="box-container">
        {sortedCourses.length === 0 ? (
          <div className="empty">
            You have not enrolled in any courses yet. Visit the catalogue to start learning.
          </div>
        ) : (
          sortedCourses.map((course) => {
            const id = course.id || course._id || course.courseId;
            const title = course.title || course.name || 'Untitled course';
            const subtitle = course.subtitle || course.tagline || '';
            const description = course.description || course.summary || '';
            const duration = course.duration || course.length || '';
            const completed = course.completedMaterials ?? course.completedLessons ?? 0;
            const total = course.totalMaterials ?? course.totalLessons ?? course.lessons ?? 0;
            const progress = clampProgress(course?.progressPercent ?? course?.progress ?? 0);
            const progressLabel = `${progress}% complete`;

            return (
              <div
                className="box my-course-card"
                key={id || title}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenCourse(course)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleOpenCourse(course);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="relative mb-4">
                  <img
                    src={resolveThumb(course)}
                    alt={title}
                    className="thumb"
                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '0.75rem' }}
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                    {progressLabel}
                  </span>
                </div>

                <div className="title">{title}</div>
                {subtitle && <div style={{ color: '#8892b0', marginBottom: '0.5rem' }}>{subtitle}</div>}
                {description && <div style={{ marginBottom: '1rem', color: '#94a3b8' }}>{description}</div>}

                <div className="my-course-meta">
                  {duration && <span>{duration}</span>}
                  {total > 0 && (
                    <span>
                      {completed} / {total} materials
                    </span>
                  )}
                </div>

                <div className="my-course-progress" aria-label={`Course completion ${progressLabel}`} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="my-course-progress__track">
                    <div className="my-course-progress__value" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="my-course-progress__label">{progress}%</span>
                </div>

                <button
                  type="button"
                  className="inline-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCourse(course);
                  }}
                  aria-label={`Continue learning ${title}`}
                >
                  Continue learning
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StudentCourses;
