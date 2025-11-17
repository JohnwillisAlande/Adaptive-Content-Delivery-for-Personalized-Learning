import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClipLoader from 'react-spinners/ClipLoader';
import { FaArrowLeft, FaEnvelope, FaUserTie, FaUsers, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const resolveImage = (image) => {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/uploaded_files')) return `${FILE_BASE_URL}${image}`;
  return `${FILE_BASE_URL}/uploaded_files/${image}`;
};

const formatNumber = (value = 0) => Number(value || 0).toLocaleString();
const formatTime = (seconds = 0) => {
  if (!seconds) return '0 mins';
  const minutes = Math.round(seconds / 60);
  return `${minutes.toLocaleString()} mins`;
};
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

function AdminTeacherDetail() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.userType !== 'Admin') {
      toast.error('Administrators only');
      navigate('/teachers', { replace: true });
      return;
    }
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/teachers/${teacherId}`);
        if (!active) return;
        setPayload(data);
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load teacher details');
        navigate('/teachers', { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [teacherId, user?.userType, navigate]);

  const recentEntries = useMemo(() => payload?.recentInteractions || [], [payload]);
  const teacher = payload?.teacher;
  const overview = payload?.overview || {};
  const courses = payload?.courses || [];

  if (loading) {
    return (
      <div className="admin-teacher-detail admin-teacher-detail--loading">
        <ClipLoader color="#14b8a6" size={46} />
      </div>
    );
  }

  if (!payload || !teacher) {
    return null;
  }

  return (
    <div className="admin-teacher-detail">
      <button type="button" className="option-btn admin-teacher-detail__back" onClick={() => navigate('/teachers')}>
        <FaArrowLeft /> Back to Teachers
      </button>

      <header className="admin-teacher-detail__hero">
        <div className="admin-teacher-detail__identity">
          <div className="avatar">
            {teacher.image ? <img src={resolveImage(teacher.image)} alt={teacher.name} /> : <FaUserTie />}
          </div>
          <div>
            <h1>{teacher.name}</h1>
            <p><FaEnvelope /> {teacher.email}</p>
            <p className="muted">Registered {formatDate(teacher.registeredAt)}</p>
            <p className="muted">
              Last seen {formatDate(teacher.lastActiveAt)} • {teacher.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="admin-teacher-detail__hero-stats">
          <div>
            <span>Total Courses</span>
            <strong>{overview.totalCourses ?? 0}</strong>
          </div>
          <div>
            <span>Total Students</span>
            <strong>{formatNumber(overview.totalStudents)}</strong>
          </div>
          <div>
            <span>Total Materials</span>
            <strong>{formatNumber(overview.totalMaterials)}</strong>
          </div>
          <div>
            <span>Unique Learners</span>
            <strong>{formatNumber(overview.uniqueLearners)}</strong>
          </div>
        </div>
      </header>

      <section className="admin-teacher-detail__grid">
        <article>
          <h2><FaUsers /> Engagement Overview</h2>
          <ul>
            <li>
              <span>Total Visits</span>
              <strong>{formatNumber(overview.totalVisits)}</strong>
            </li>
            <li>
              <span>Learning Minutes</span>
              <strong>{formatTime(overview.totalTimeSpentSeconds)}</strong>
            </li>
            <li>
              <span>Avg Time / Course</span>
              <strong>{formatTime(overview.averageTimePerCourse)}</strong>
            </li>
          </ul>
        </article>
        <article>
          <h2><FaClock /> Recent Activity</h2>
          {recentEntries.length === 0 ? (
            <p className="muted">No recent activity recorded.</p>
          ) : (
            <ul className="admin-teacher-detail__activity">
              {recentEntries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <span>Course</span>
                    <strong>{entry.courseTitle}</strong>
                  </div>
                  <div>
                    <span>Time Spent</span>
                    <strong>{formatTime(entry.timeSpentSeconds)}</strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>{entry.completed ? 'Yes' : 'No'}</strong>
                  </div>
                  <div>
                    <span>When</span>
                    <strong>{formatDate(entry.timestamp)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="admin-teacher-detail__courses">
        <div className="header">
          <h2>Courses Taught</h2>
        </div>
        {courses.length === 0 ? (
          <p className="muted">This teacher has not published any courses yet.</p>
        ) : (
          <div className="admin-teacher-detail__courses-table">
            <div className="table-row table-row--head">
              <span>Course</span>
              <span>Created</span>
              <span>Students</span>
              <span>Materials</span>
              <span>Visits</span>
              <span>Learning Time</span>
            </div>
            {courses.map((course) => (
              <div key={course.courseId} className="table-row">
                <span className="table-cell table-cell--title">{course.title}</span>
                <span className="table-cell">{formatDate(course.createdAt)}</span>
                <span className="table-cell">{formatNumber(course.students)}</span>
                <span className="table-cell">{formatNumber(course.materialsCount)}</span>
                <span className="table-cell">{formatNumber(course.totalVisits)}</span>
                <span className="table-cell">{formatTime(course.totalTimeSpentSeconds)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-teacher-detail__actions">
        <button type="button" className="inline-btn" onClick={() => navigate(`/admin/teachers/${teacherId}/logs`)}>
          View Logs
        </button>
      </div>
    </div>
  );
}

export default AdminTeacherDetail;
