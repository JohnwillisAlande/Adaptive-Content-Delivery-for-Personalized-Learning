import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClipLoader from 'react-spinners/ClipLoader';
import { toast } from 'react-toastify';
import { FaServer, FaSyncAlt } from 'react-icons/fa';
import api from './api';
import { useAuth } from './context/AuthContext';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

function AdminModel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ running: false, checkedAt: null, message: '' });
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    if (user?.userType !== 'Admin') {
      toast.error('Administrators only');
      navigate('/home', { replace: true });
      return;
    }

    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: statusData }, { data: logsData }] = await Promise.all([
          api.get('/model/status'),
          api.get('/admin/model/logs')
        ]);
        if (!active) return;
        setStatus(statusData);
        setLogs(Array.isArray(logsData.logs) ? logsData.logs : []);
        setMetrics(logsData.metrics || null);
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load model metrics');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.userType, navigate]);

  const statusLabel = useMemo(() => {
    if (!status) return 'Unknown';
    return status.running ? 'Model Running' : 'Model Offline';
  }, [status]);

  if (loading) {
    return (
      <div className="admin-model admin-teacher-detail--loading">
        <ClipLoader color="#14b8a6" size={48} />
      </div>
    );
  }

  return (
    <div className="admin-model">
      <header className="admin-model__header">
        <div className={`admin-model__status${status.running ? ' admin-model__status--online' : ' admin-model__status--offline'}`}>
          <FaServer />
          <div>
            <strong>{statusLabel}</strong>
            <span>Checked {formatDate(status.checkedAt)}</span>
            {status.message && <small>{status.message}</small>}
          </div>
        </div>
        {metrics && (
          <div className="admin-model__metrics">
            <div>
              <span>Total Requests</span>
              <strong>{metrics.totalRequests ?? 0}</strong>
            </div>
            <div>
              <span>Success</span>
              <strong>{metrics.successCount ?? 0}</strong>
            </div>
            <div>
              <span>Failures</span>
              <strong>{metrics.failureCount ?? 0}</strong>
            </div>
            <div>
              <span>Avg Duration</span>
              <strong>{Math.round(metrics.averageDurationMs ?? 0)} ms</strong>
            </div>
          </div>
        )}
      </header>

      <section className="admin-model__logs">
        <div className="admin-model__logs-header">
          <h2>Model Activity</h2>
          <button type="button" className="inline-btn inline-btn--ghost" onClick={() => window.location.reload()}>
            <FaSyncAlt /> Refresh
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="muted">No model invocations recorded yet.</p>
        ) : (
          <div className="admin-model__log-list">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log._id;
              return (
                <article
                  key={log._id}
                  className={`admin-model__log${log.status === 'error' ? ' admin-model__log--error' : ''}`}
                >
                  <button
                    type="button"
                    className="admin-model__log-header"
                    onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                  >
                    <div>
                      <h3>{log.status === 'success' ? 'Prediction Success' : 'Prediction Error'}</h3>
                      <p>Student ID: {log.userId || '—'}</p>
                    </div>
                    <div className="admin-model__log-meta">
                      <span>{formatDate(log.createdAt)}</span>
                      <span>{Math.round(log.durationMs || 0)} ms</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="admin-model__log-body">
                      <div>
                        <span>Feature Vector</span>
                        <pre>{JSON.stringify(log.featureVector, null, 2)}</pre>
                      </div>
                      <div>
                        <span>Model Feedback</span>
                        {log.status === 'success' ? (
                          <pre>{JSON.stringify(log.prediction, null, 2)}</pre>
                        ) : (
                          <p className="muted">{log.errorMessage || 'Unknown error'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminModel;

