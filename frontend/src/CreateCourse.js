import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import api from './api';
import { useAuth } from './context/AuthContext';

function CreateCourse() {
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumb, setThumb] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated) {
      toast.error('You must be logged in.');
      navigate('/login', { replace: true });
      return;
    }

    if (user?.userType !== 'Admin') {
      toast.error('Access denied. Admins only.');
      navigate('/home', { replace: true });
      return;
    }

    setAuthorized(true);
  }, [initializing, isAuthenticated, user?.userType, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (thumb) formData.append('thumb', thumb);
    try {
      const { data } = await api.post('/courses/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Course created successfully!');
      setTitle('');
      setDescription('');
      setThumb(null);
      setTimeout(() => navigate('/courses'), 1200);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  if (initializing || !authorized) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-white">
        <ClipLoader color="#14b8a6" size={32} />
      </div>
    );
  }

  return (
    <section className="form-screen form-screen--plain">
      <form onSubmit={handleSubmit} className="form-card form-card--wide" aria-label="Create course form">
        <h2 className="form-card__title">Create a new course</h2>
        <p className="form-card__subtitle">
          Give your course a clear identity and an inviting description before you add learning materials.
        </p>

        <div>
          <label htmlFor="course-title">
            Course title <span className="required-indicator">*</span>
          </label>
          <input
            id="course-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            aria-label="Course title"
          />
        </div>

        <div>
          <label htmlFor="course-description">
            Description <span className="required-indicator">*</span>
          </label>
          <textarea
            id="course-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            rows={4}
            aria-label="Course description"
          />
        </div>

        <div>
          <label htmlFor="course-thumb">Thumbnail</label>
          <input
            id="course-thumb"
            type="file"
            accept="image/*"
            onChange={e => setThumb(e.target.files[0])}
            aria-label="Course thumbnail"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={loading} aria-label="Create Course">
            {loading ? <ClipLoader color="#fff" size={20} /> : 'Create course'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CreateCourse;
