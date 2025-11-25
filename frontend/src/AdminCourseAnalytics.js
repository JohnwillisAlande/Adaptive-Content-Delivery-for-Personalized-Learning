import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClipLoader from 'react-spinners/ClipLoader';
import { FaArrowLeft, FaUsers, FaRegClock, FaBook, FaChartPie } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from './api';
import { useAuth } from './context/AuthContext';

const formatNumber = (value = 0) => {
  if (value == null) return '0';
  return value.toLocaleString();
};

const secondsToMinutes = (seconds = 0) => {
  if (!seconds) return '0 min';
  const minutes = Math.round(seconds / 60);
  return `${minutes.toLocaleString()} min`;
};

function AdminCourseAnalytics() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.userType === 'Admin';
  const isTeacher = user?.userType === 'Teacher';
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [expandedMaterialId, setExpandedMaterialId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const metricsEndpoint = useMemo(() => {
    if (isAdmin) return `/courses/admin/${courseId}/metrics`;
    if (isTeacher) return `/courses/teacher/${courseId}/metrics`;
    return null;
  }, [isAdmin, isTeacher, courseId]);
  const backPath = isAdmin ? '/courses' : '/teacher/courses';

  useEffect(() => {
    if (!metricsEndpoint) {
      toast.error('You are not authorized to view course metrics');
      navigate('/courses', { replace: true });
      return;
    }
    let active = true;
    const loadMetrics = async ({ showSpinner = false } = {}) => {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const { data } = await api.get(metricsEndpoint);
        if (!active) return;
        setPayload(data);
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load course metrics');
      } finally {
        if (!active) return;
        if (showSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    };
    loadMetrics({ showSpinner: true });
    const intervalId = setInterval(() => loadMetrics({ showSpinner: false }), 15000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [courseId, navigate, metricsEndpoint]);

  const creationDate = useMemo(() => {
    if (!payload?.course?.createdAt) return '—';
    return new Date(payload.course.createdAt).toLocaleString();
  }, [payload?.course?.createdAt]);

  const formatGraphData = useMemo(() => {
    const metrics = payload?.metrics;
    if (!metrics) return [];
    const desiredOrder = ['Visual', 'Verbal', 'Audio'];
    const lookup = {};
    (metrics.formatBreakdown || []).forEach((item) => {
      lookup[item.label] = item.count;
    });
    return desiredOrder.map((label) => ({
      label,
      count: lookup[label] || 0
    }));
  }, [payload?.metrics]);
  const formatGraphTotal = formatGraphData.reduce((sum, item) => sum + item.count, 0);
  const materials = payload?.metrics?.materials || [];

  const handleToggleMaterial = (materialId) => {
    setExpandedMaterialId((prev) => (prev === materialId ? null : materialId));
  };

  const formatMaterialDate = (value) => (value ? new Date(value).toLocaleString() : '—');

  if (loading) {
    return (
      <div className="admin-course-analytics admin-course-analytics--loading">
        <ClipLoader color="#14b8a6" size={42} />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="admin-course-analytics">
        <div className="admin-course-analytics__empty">
          <p>Unable to load course analytics.</p>
          <button type="button" className="inline-btn" onClick={() => navigate(backPath)}>
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const { course, metrics } = payload;

  const summaryTiles = [
    {
      label: 'Students Enrolled',
      value: formatNumber(metrics.totalEnrollments),
      icon: <FaUsers />
    },
    {
      label: 'Total Visits',
      value: formatNumber(metrics.totalVisits),
      icon: <FaChartPie />
    },
    {
      label: 'Learning Minutes',
      value: secondsToMinutes(metrics.totalTimeSpentSeconds),
      icon: <FaRegClock />
    },
    {
      label: 'Materials Published',
      value: formatNumber(metrics.totalMaterials),
      icon: <FaBook />
    }
  ];

  return (
    <div className="admin-course-analytics">
      <button
        type="button"
        className="option-btn admin-course-analytics__back"
        onClick={() => navigate(backPath)}
      >
        <FaArrowLeft /> Back to Courses
      </button>
      {refreshing && <span className="admin-course-analytics__refresh-indicator">Updating metrics…</span>}
      <div className="admin-course-analytics__hero">
        <div>
          <p className="admin-course-analytics__eyebrow">Course Insights</p>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
        <dl>
          <div>
            <dt>Teacher</dt>
            <dd>{course.teacherName || 'Unknown'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{creationDate}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{course.suspended ? 'Suspended' : 'Active'}</dd>
          </div>
        </dl>
      </div>

      <div className="admin-course-analytics__grid">
        {summaryTiles.map((tile) => (
          <article key={tile.label} className="admin-course-analytics__tile">
            <div className="admin-course-analytics__tile-icon">{tile.icon}</div>
            <div>
              <p className="label">{tile.label}</p>
              <p className="value">{tile.value}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="admin-course-analytics__section">
        <h2>Engagement Metrics</h2>
        <div className="admin-course-analytics__stats">
          <div>
            <p className="label">Unique Learners</p>
            <p className="value">{formatNumber(metrics.uniqueLearners)}</p>
          </div>
          <div>
            <p className="label">Average Time / Visit</p>
            <p className="value">{secondsToMinutes(metrics.averageTimePerVisit)}</p>
          </div>
          <div>
            <p className="label">Completed Sessions</p>
            <p className="value">
              {formatNumber(metrics.completionCount)} ({(metrics.completionRate * 100).toFixed(1)}%)
            </p>
          </div>
          <div>
            <p className="label">Last Interaction</p>
            <p className="value">
              {metrics.lastInteractionAt ? new Date(metrics.lastInteractionAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
      </section>

      <section className="admin-course-analytics__section admin-course-analytics__section--split">
        <div>
          <h3>Materials by Category</h3>
          <ul>
            {(metrics.materialBreakdown || []).map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{formatNumber(item.count)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Materials by Format</h3>
          <ul>
            {(metrics.formatBreakdown || []).map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{formatNumber(item.count)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="admin-course-analytics__section">
        <h3>Visual vs Verbal vs Audio</h3>
        <div className="format-distribution">
          {formatGraphData.map((item) => {
            const percent = formatGraphTotal ? (item.count / formatGraphTotal) * 100 : 0;
            return (
              <div key={item.label} className="format-distribution__row">
                <span className="format-distribution__label">{item.label}</span>
                <div className="format-distribution__bar">
                  <div style={{ width: `${percent}%` }} />
                </div>
                <span className="format-distribution__value">{item.count}</span>
              </div>
            );
          })}
          {formatGraphTotal === 0 && (
            <p className="muted">No materials have been uploaded for this distribution yet.</p>
          )}
        </div>
      </section>

      <section className="admin-course-analytics__section">
        <h3>Recent Activity</h3>
        {metrics.recentInteractions && metrics.recentInteractions.length ? (
          <div className="admin-course-analytics__recent">
            {metrics.recentInteractions.map((entry) => (
              <article key={entry._id || entry.id} className="admin-course-analytics__recent-item">
                <div>
                  <p className="label">Learner</p>
                  <p>#{(entry.userId || entry.user_id || '').slice(-6) || '—'}</p>
                </div>
                <div>
                  <p className="label">Category</p>
                  <p>{entry.annotations?.category || '—'}</p>
                </div>
                <div>
                  <p className="label">Time Spent</p>
                  <p>{secondsToMinutes(entry.timeSpentSeconds)}</p>
                </div>
                <div>
                  <p className="label">Completed</p>
                  <p>{entry.completed ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="label">When</p>
                  <p>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted">No recent interactions captured.</p>
        )}
      </section>

      <section className="admin-course-analytics__section admin-course-analytics__materials">
        <h3>Course Materials</h3>
        {materials.length === 0 ? (
          <p className="muted">No materials have been uploaded for this course.</p>
        ) : (
          <div className="material-accordion">
            {materials.map((material) => {
              const materialKey = material._id || material.id;
              const isExpanded = expandedMaterialId === materialKey;
              return (
                <div
                  key={materialKey}
                  className={`material-accordion__item${isExpanded ? ' material-accordion__item--expanded' : ''}`}
                >
                  <button
                    type="button"
                    className="material-accordion__header"
                    onClick={() => handleToggleMaterial(materialKey)}
                  >
                    <div>
                      <h4>{material.title}</h4>
                      <p>Uploaded {formatMaterialDate(material.uploadedAt)}</p>
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
                        <strong>{formatNumber(material.stats?.clicks || 0)}</strong>
                      </div>
                      <div>
                        <span>Avg View Time</span>
                        <strong>{secondsToMinutes(material.stats?.avgTimeSpentSeconds || 0)}</strong>
                      </div>
                      <div>
                        <span>Completions</span>
                        <strong>{formatNumber(material.stats?.completions || 0)}</strong>
                      </div>
                      <div>
                        <span>Last Viewed</span>
                        <strong>{formatMaterialDate(material.stats?.lastViewedAt)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminCourseAnalytics;
