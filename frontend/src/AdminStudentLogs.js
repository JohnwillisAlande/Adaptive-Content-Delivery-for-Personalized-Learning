import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClipLoader from 'react-spinners/ClipLoader';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaStream } from 'react-icons/fa';
import api from './api';
import { useAuth } from './context/AuthContext';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');
const formatDuration = (seconds = 0) => `${Math.round((seconds || 0) / 60)} mins`;

function AdminStudentLogs() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (user?.userType !== 'Admin') {
      toast.error('Administrators only');
      navigate('/students', { replace: true });
      return;
    }
    let active = true;
    const loadLogs = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/students/${studentId}/logs`);
        if (!active) return;
        setPayload(data);
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load logs');
        navigate(`/admin/students/${studentId}`);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadLogs();
    return () => {
      active = false;
    };
  }, [studentId, user?.userType, navigate]);

  if (loading) {
    return (
      <div className="admin-teacher-logs admin-teacher-logs--loading">
        <ClipLoader color="#14b8a6" size={46} />
      </div>
    );
  }

  const logs = payload?.logs || [];

  return (
    <div className="admin-teacher-logs">
      <button type="button" className="option-btn admin-student-detail__back" onClick={() => navigate(`/admin/students/${studentId}`)}>
        <FaArrowLeft /> Back to Student
      </button>
      <header>
        <h1><FaStream /> Interaction Logs</h1>
        <p>Latest material interactions for this student.</p>
      </header>
      {logs.length === 0 ? (
        <p className="muted">No activity logs available.</p>
      ) : (
        <div className="admin-teacher-logs__list">
          <div className="admin-teacher-logs__row admin-teacher-logs__row--head">
            <span>Course</span>
            <span>Format</span>
            <span>Category</span>
            <span>Time Spent</span>
            <span>Completed</span>
            <span>Timestamp</span>
          </div>
          {logs.map((entry) => (
            <div key={entry.id} className="admin-teacher-logs__row">
              <span>{entry.courseTitle}</span>
              <span>{entry.format}</span>
              <span>{entry.category}</span>
              <span>{formatDuration(entry.timeSpentSeconds)}</span>
              <span>{entry.completed ? 'Yes' : 'No'}</span>
              <span>{formatDate(entry.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminStudentLogs;

