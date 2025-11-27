import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';

const resolveThumbPreview = (thumbValue) => {
  if (!thumbValue) return '';
  if (thumbValue.startsWith('http')) return thumbValue;
  if (thumbValue.startsWith('/uploaded_files')) return `${FILE_BASE_URL}${thumbValue}`;
  return `${FILE_BASE_URL}/uploaded_files/${thumbValue}`;
};

function ModifyCourse() {
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumb, setThumb] = useState(null);
  const [preview, setPreview] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = useMemo(() => user?.userType === 'Admin', [user?.userType]);

  useEffect(() => {
    if (initializing) return;
    if (!isAuthenticated) {
      toast.error('You must be logged in.');
      navigate('/login', { replace: true });
      return;
    }
    if (!isAdmin) {
      toast.error('Access denied. Admins only.');
      navigate('/home', { replace: true });
    }
  }, [initializing, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin || !isAuthenticated) return;
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const { data } = await api.get('/courses/manage');
        setCourses(data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to fetch courses');
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [isAdmin, isAuthenticated]);

  const handleEdit = (course) => {
    setSelected(course);
    setTitle(course.title);
    setDescription(course.description);
    setPreview(resolveThumbPreview(course.thumb));
    setThumb(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (thumb) formData.append('thumb', thumb);

    try {
      const { data } = await api.put(`/courses/${selected._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.course) {
        toast.success('Course updated successfully!');
        setCourses(prev =>
          prev.map(course => (course._id === data.course._id ? data.course : course))
        );
        setSelected(data.course);
        setTitle(data.course.title);
        setDescription(data.course.description);
        setPreview(resolveThumbPreview(data.course.thumb));
        setThumb(null);
      } else {
        toast.error(data.error || 'Failed to update course');
      }
    } catch (err) {
      toast.error('Error updating course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-screen form-screen--top">
      <div className="form-card form-card--xl">
        <h2 className="form-card__title form-card__title--left">Modify course material</h2>
        <p className="form-card__subtitle form-card__subtitle--left">
          Choose a course to refresh its details or upload a new thumbnail before publishing updates to learners.
        </p>

        {loadingCourses && (
          <div className="form-loader">
            <ClipLoader color="#14b8a6" size={32} />
          </div>
        )}

        {!loadingCourses && !selected && (
          <div className="form-selection">
            <p className="form-card__subtitle form-card__subtitle--left">Select a course to edit:</p>
            <ul className="form-list">
              {courses.length === 0 ? (
                <li className="form-list__empty">No courses found. Create a course first.</li>
              ) : (
                courses.map(course => (
                  <li key={course._id} className="form-list__item">
                    <div>
                      <p className="form-list__title">{course.title}</p>
                      <p className="form-list__meta">{course.description}</p>
                    </div>
                    <button type="button" className="option-btn" onClick={() => handleEdit(course)}>
                      Edit
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {!loadingCourses && selected && (
          <form onSubmit={handleUpdate} className="form-grid" aria-label="Modify course form">
            <div>
              <label htmlFor="course-edit-title">
                Course title <span className="required-indicator">*</span>
              </label>
              <input
                id="course-edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                aria-label="Course title"
              />
            </div>

            <div>
              <label htmlFor="course-edit-description">
                Description <span className="required-indicator">*</span>
              </label>
              <textarea
                id="course-edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                aria-label="Course description"
              />
            </div>

            <div>
              <label htmlFor="course-edit-thumb">Thumbnail</label>
              <input
                id="course-edit-thumb"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setThumb(file);
                  setPreview(URL.createObjectURL(file));
                }}
                aria-label="Course thumbnail"
              />
              {preview && (
                <img
                  src={preview}
                  alt="Thumbnail preview"
                  className="form-preview"
                />
              )}
            </div>

            <div className="form-actions horizontal">
              <button
                type="submit"
                className="btn"
                disabled={saving}
                aria-label="Update course"
              >
                {saving ? <ClipLoader color="#fff" size={20} /> : 'Update course'}
              </button>
              <button
                type="button"
                className="option-btn"
                onClick={() => setSelected(null)}
              >
                Back to course list
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default ModifyCourse;
