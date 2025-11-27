import React, { useEffect, useMemo, useState } from 'react';
import ClipLoader from 'react-spinners/ClipLoader';
import api from './api';
import './App.css';

const FORMAT_COLORS = ['#38bdf8', '#f472b6', '#facc15', '#22d3ee', '#a78bfa', '#34d399'];

const formatDuration = (seconds = 0) => {
  if (!seconds) return '0m';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = (minutes / 60).toFixed(1);
  return `${hours}h`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

function StudentAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/students/me/analytics')
      .then(({ data }) => {
        if (!active) return;
        setData(data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.error || 'Failed to load analytics');
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const formatBreakdown = data?.formatBreakdown ?? [];
  const timeline = data?.timeline ?? [];
  const topMaterials = data?.topMaterials ?? [];
  const recentSessions = data?.recentSessions ?? [];
  const summary = data?.summary ?? {};

  const totalFormatTime = useMemo(
    () => formatBreakdown.reduce((sum, item) => sum + (item.timeSpentSeconds || 0), 0) || 1,
    [formatBreakdown]
  );

  const pieBackground = useMemo(() => {
    if (!formatBreakdown.length) return 'conic-gradient(#1e293b, #0f172a)';
    let offset = 0;
    const segments = formatBreakdown.map((item, index) => {
      const start = offset;
      offset += (item.timeSpentSeconds || 0) / totalFormatTime;
      const end = offset;
      const color = FORMAT_COLORS[index % FORMAT_COLORS.length];
      return `${color} ${start * 100}% ${end * 100}%`;
    });
    return `conic-gradient(${segments.join(',')})`;
  }, [formatBreakdown, totalFormatTime]);

  const maxTimelineValue = Math.max(...timeline.map((item) => item.timeSpentSeconds || 0), 1);

  if (loading) {
    return (
      <div className="student-analytics student-analytics--loading">
        <ClipLoader color="#14b8a6" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-analytics student-analytics--error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="student-analytics">
      <header className="student-analytics__hero">
        <div>
          <p className="student-analytics__eyebrow">Personalized Insights</p>
          <h1>Learning Analytics</h1>
          <p>Track how you engage with ApexLearn across every material type.</p>
        </div>
        <div className="student-analytics__profile">
          <div>
            <p className="label">XP</p>
            <p className="value">{data?.profile?.xp ?? 0}</p>
          </div>
          <div>
            <p className="label">Badges</p>
            <p className="value">{data?.profile?.badges ?? 0}</p>
          </div>
          <div>
            <p className="label">Login Streak</p>
            <p className="value">{data?.profile?.streaks?.login ?? 0} days</p>
          </div>
        </div>
      </header>

      <section className="student-analytics__summary">
        <article>
          <p className="label">Engagement Time</p>
          <p className="value">{formatDuration(summary.totalTimeSpentSeconds)}</p>
          <span>Total time spent learning</span>
        </article>
        <article>
          <p className="label">Learning Sessions</p>
          <p className="value">{summary.totalSessions ?? 0}</p>
          <span>Tracked lessons</span>
        </article>
        <article>
          <p className="label">Avg Session</p>
          <p className="value">{formatDuration(summary.avgSessionSeconds)}</p>
          <span>Per visit</span>
        </article>
        <article>
          <p className="label">Completion Rate</p>
          <p className="value">{((summary.completionRate || 0) * 100).toFixed(0)}%</p>
          <span>Marked as complete</span>
        </article>
        <article>
          <p className="label">Courses Enrolled</p>
          <p className="value">{summary.coursesEnrolled ?? 0}</p>
          <span>Active courses</span>
        </article>
        <article>
          <p className="label">Last active</p>
          <p className="value value--small">{formatDateTime(summary.lastInteractionAt)}</p>
          <span>Latest recorded interaction</span>
        </article>
      </section>

      <section className="student-analytics__section">
        <div className="student-analytics__section-header">
          <div>
            <h2>Format distribution</h2>
            <p>Track how you divide time between text, video, and audio.</p>
          </div>
          <div className="analytics-chart__controls">
            <button
              type="button"
              className="analytics-chart__toggle"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              Chart type ▾
            </button>
            {menuOpen && (
              <div className="analytics-chart__menu">
                {['bar', 'pie'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={chartType === type ? 'is-active' : ''}
                    onClick={() => {
                      setChartType(type);
                      setMenuOpen(false);
                    }}
                  >
                    {type === 'bar' ? 'Bar chart' : 'Pie chart'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`analytics-chart analytics-chart--${chartType}`}>
          {chartType === 'bar' ? (
            <div className="analytics-chart__bars">
              {formatBreakdown.length === 0 && <p className="muted">No format data yet.</p>}
              {formatBreakdown.map((item, index) => {
                const width = totalFormatTime
                  ? Math.max(8, Math.round((item.timeSpentSeconds / totalFormatTime) * 100))
                  : 0;
                return (
                  <div key={item.label} className="analytics-chart__bar">
                    <div className="analytics-chart__bar-label">
                      <span>{item.label}</span>
                      <span>{formatDuration(item.timeSpentSeconds)}</span>
                    </div>
                    <div className="analytics-chart__bar-track">
                      <div
                        className="analytics-chart__bar-fill"
                        style={{
                          width: `${width}%`,
                          background: FORMAT_COLORS[index % FORMAT_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="analytics-chart__pie">
              <div className="analytics-chart__pie-graphic" style={{ background: pieBackground }} />
              <ul className="analytics-chart__legend">
                {formatBreakdown.map((item, index) => (
                  <li key={item.label}>
                    <span
                      className="dot"
                      style={{ background: FORMAT_COLORS[index % FORMAT_COLORS.length] }}
                    />
                    <span>{item.label}</span>
                    <strong>{formatDuration(item.timeSpentSeconds)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="student-analytics__section">
        <h2>Engagement timeline</h2>
        <div className="student-analytics__timeline">
          {timeline.length === 0 && <p className="muted">Learning data will appear here soon.</p>}
          {timeline.map((point) => (
            <div key={point._id} className="timeline-point">
              <div
                className="timeline-point__bar"
                style={{ height: `${Math.max(8, (point.timeSpentSeconds / maxTimelineValue) * 90)}%` }}
              />
              <span>{point._id.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="student-analytics__section student-analytics__section--split">
        <div>
          <h2>Most engaging materials</h2>
          <ul className="student-analytics__list">
            {topMaterials.length === 0 && <li className="muted">No materials tracked yet.</li>}
            {topMaterials.map((material) => (
              <li key={material.contentId}>
                <div>
                  <strong>{material.title}</strong>
                  <span>{material.format} • {material.category}</span>
                </div>
                <div className="value">{formatDuration(material.timeSpentSeconds)}</div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Recent sessions</h2>
          <ul className="student-analytics__list">
            {recentSessions.length === 0 && <li className="muted">Start a lesson to see activity.</li>}
            {recentSessions.map((session) => (
              <li key={session.id}>
                <div>
                  <strong>{session.title}</strong>
                  <span>{session.format} • {session.completed ? 'Completed' : 'In progress'}</span>
                  <small>{formatDateTime(session.timestamp)}</small>
                </div>
                <div className="value">{formatDuration(session.timeSpentSeconds)}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default StudentAnalytics;
