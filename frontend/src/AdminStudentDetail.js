import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClipLoader from 'react-spinners/ClipLoader';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaRegClock, FaUserGraduate, FaBolt } from 'react-icons/fa';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const resolveImage = (image) => {
  if (!image) return '/images/pic-2.jpg';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/uploaded_files')) return `${FILE_BASE_URL}${image}`;
  return `${FILE_BASE_URL}/uploaded_files/${image}`;
};

const formatNumber = (value = 0) => Number(value || 0).toLocaleString();
const formatDuration = (seconds = 0) => {
  if (!seconds) return '0 mins';
  const minutes = Math.round(seconds / 60);
  return `${minutes.toLocaleString()} mins`;
};
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

function AdminStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [expandedMaterialKey, setExpandedMaterialKey] = useState(null);

  useEffect(() => {
    if (user?.userType !== 'Admin') {
      toast.error('Administrators only');
      navigate('/students', { replace: true });
      return;
    }
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/students/${studentId}`);
        if (!active) return;
        setPayload(data);
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load student details');
        navigate('/students', { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [studentId, user?.userType, navigate]);

  const student = payload?.student;
  const courses = payload?.courses || [];

  const featureVectorEntries = useMemo(() => {
    if (!student?.featureVector) return [];
    return Object.entries(student.featureVector);
  }, [student?.featureVector]);

  const handleMaterialToggle = (key) => {
    setExpandedMaterialKey((prev) => (prev === key ? null : key));
  };

  if (loading) {
    return (
      <div className="admin-student-detail admin-student-detail--loading">
        <ClipLoader color="#14b8a6" size={46} />
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="admin-student-detail admin-teacher-detail">
      <button type="button" className="option-btn admin-student-detail__back" onClick={() => navigate('/students')}>
        <FaArrowLeft /> Back to Students
      </button>

      <div className="admin-teacher-detail__hero">
        <div className="admin-student-detail__identity">
          <img src={resolveImage(student.image)} alt={student.name} />
          <div>
            <p className="admin-course-analytics__eyebrow">Student Profile</p>
            <h1>{student.name}</h1>
            <p>{student.email}</p>
            <p className="muted">
              Joined {formatDate(student.registeredAt)} · Last seen {formatDate(student.lastActiveAt)} ·{' '}
              {student.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="admin-student-detail__hero-stats">
          <div>
            <span>Courses Enrolled</span>
            <strong>{formatNumber(student.courseCount)}</strong>
          </div>
          <div>
            <span>Total XP</span>
            <strong>{formatNumber(student.gamification?.xp ?? 0)}</strong>
          </div>
          <div>
            <span>Learning Style</span>
            <strong>{student.learningStyleLabel || 'Not predicted'}</strong>
          </div>
        </div>
      </div>

  <div className="admin-teacher-detail__grid">
        <article>
          <h2><FaBolt /> Gamification</h2>
          <ul>
            <li>
              <span>Login Streak</span>
              <strong>{student.gamification?.loginStreak?.count ?? 0} days (Best {student.gamification?.loginStreak?.longest ?? 0})</strong>
            </li>
            <li>
              <span>Lesson Streak</span>
              <strong>{student.gamification?.lessonStreak?.count ?? 0} days (Best {student.gamification?.lessonStreak?.longest ?? 0})</strong>
            </li>
            <li>
              <span>Daily Goal</span>
              <strong>
                Lessons {student.gamification?.dailyGoal?.lessonsCompletedToday ?? 0}/
                {student.gamification?.dailyGoal?.lessonsTarget ?? 1}
              </strong>
            </li>
            <li>
              <span>Badges</span>
              <strong>{student.gamification?.badges?.length ?? 0}</strong>
            </li>
          </ul>
        </article>
        <article>
          <h2><FaUserGraduate /> Learning Style</h2>
          <ul>
            <li><span>Perception</span><strong>{student.learningStyle?.is_intuitive ? 'Intuitive' : 'Sensory'}</strong></li>
            <li><span>Input</span><strong>{student.learningStyle?.is_verbal ? 'Verbal' : 'Visual'}</strong></li>
            <li><span>Processing</span><strong>{student.learningStyle?.is_reflective ? 'Reflective' : 'Active'}</strong></li>
            <li><span>Understanding</span><strong>{student.learningStyle?.is_global ? 'Global' : 'Sequential'}</strong></li>
          </ul>
        </article>
      </div>

      <section className="admin-course-analytics__section">
        <h3>Model Inputs</h3>
        {featureVectorEntries.length === 0 ? (
          <p className="muted">No feature vector recorded for this student yet.</p>
        ) : (
          <div className="feature-vector-grid">
            {featureVectorEntries.map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{Number(value).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-teacher-detail__courses">
        <div className="header">
          <h2>Enrolled Courses</h2>
        </div>
        {courses.length === 0 ? (
          <p className="muted">This student is not enrolled in any courses.</p>
        ) : (
          <div className="admin-student-course-list">
            {courses.map((course) => (
              <article key={course.id} className="admin-student-course">
                <header className="admin-student-course__header">
                  <div>
                    <h3>{course.title}</h3>
                    {course.subtitle && <p>{course.subtitle}</p>}
                  </div>
                  <div className="admin-student-course__metrics">
                    <div>
                      <span>Clicks</span>
                      <strong>{formatNumber(course.metrics?.clicks || 0)}</strong>
                    </div>
                    <div>
                      <span>Time Spent</span>
                      <strong>{formatDuration(course.metrics?.totalTimeSpentSeconds || 0)}</strong>
                    </div>
                    <div>
                      <span>Completions</span>
                      <strong>{formatNumber(course.metrics?.completions || 0)}</strong>
                    </div>
                    <div>
                      <span>Last Viewed</span>
                      <strong>{formatDate(course.metrics?.lastViewedAt)}</strong>
                    </div>
                  </div>
                </header>
                <div className="course-format-breakdown">
                  {course.formatBreakdown.length === 0 ? (
                    <p className="muted">No interactions logged for this course.</p>
                  ) : (
                    course.formatBreakdown.map((row) => (
                      <div key={`${course.id}-${row.format}`} className="course-format-breakdown__row">
                        <span>{row.format || 'Unspecified'}</span>
                        <small>{formatNumber(row.clicks)} clicks</small>
                        <strong>{formatDuration(row.totalTimeSpentSeconds)}</strong>
                      </div>
                    ))
                  )}
                </div>
                <div className="material-accordion">
                  {course.materials.map((material) => {
                    const materialKey = `${course.id}:${material.id}`;
                    const isExpanded = expandedMaterialKey === materialKey;
                    return (
                      <div
                        key={materialKey}
                        className={`material-accordion__item${isExpanded ? ' material-accordion__item--expanded' : ''}`}
                      >
                        <button
                          type="button"
                          className="material-accordion__header"
                          onClick={() => handleMaterialToggle(materialKey)}
                        >
                          <div>
                            <h4>{material.title}</h4>
                            <p>Last viewed {formatDate(material.lastViewedAt)}</p>
                          </div>
                          <div className="material-accordion__meta">
                            <span>{material.annotations?.format || '—'}</span>
                            <span>{material.annotations?.category || '—'}</span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="material-accordion__details">
                            <div>
                              <span>Clicks</span>
                              <strong>{formatNumber(material.clicks || 0)}</strong>
                            </div>
                            <div>
                              <span>Time Spent</span>
                              <strong>{formatDuration(material.totalTimeSpentSeconds || 0)}</strong>
                            </div>
                            <div>
                              <span>Last Viewed</span>
                              <strong>{formatDate(material.lastViewedAt)}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="admin-teacher-detail__actions">
        <button type="button" className="inline-btn" onClick={() => navigate(`/admin/students/${studentId}/logs`)}>
          View Logs
        </button>
      </div>
    </div>
  );
}

export default AdminStudentDetail;
