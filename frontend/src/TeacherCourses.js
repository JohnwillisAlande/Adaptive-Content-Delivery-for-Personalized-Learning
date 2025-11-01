import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';

const resolveAssetUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('blob:')) return value;
  if (value.startsWith('http')) return value;
  if (value.startsWith('/')) return `${FILE_BASE_URL}${value}`;
  return `${FILE_BASE_URL}/uploaded_files/${value}`;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1200&q=80';

const resolveThumb = (course) => {
  const candidate =
    course?.thumbnail ||
    course?.thumbUrl ||
    course?.thumb ||
    course?.backgroundImage;

  if (!candidate) return FALLBACK_IMAGE;
  if (candidate.startsWith('http')) return candidate;
  if (candidate.startsWith('/')) return `${FILE_BASE_URL}${candidate}`;
  return `${FILE_BASE_URL}/uploaded_files/${candidate}`;
};

const initialFormState = {
  title: '',
  description: '',
  subtitle: '',
  backgroundImage: '',
  duration: '',
  featured: false
};

const TeacherCourseCard = ({
  course,
  onViewCourse,
  onUploadMaterial,
  onEditCourse,
  onViewMaterial,
  onEditMaterial
}) => {
  const id = course.id || course._id;
  const title = course.title || course.name || 'Untitled course';
  const subtitle = course.subtitle || course.tagline || '';
  const description = course.description || course.summary || '';
  const duration = course.duration || course.length || '';
  const lessonCount = course.materialCount ?? course.lessons ?? 0;
  const featuredLabel = course.featured ? 'Featured course' : 'Not featured';

  const handleViewCourse = () => onViewCourse(course);

  const handleUploadMaterial = (event) => {
    event.stopPropagation();
    onUploadMaterial(course);
  };

  const handleEditCourse = (event) => {
    event.stopPropagation();
    onEditCourse(course);
  };

  return (
    <div
      className="box my-course-card teacher-course-card"
      role="button"
      tabIndex={0}
      onClick={handleViewCourse}
      onKeyDown={(event) => {
        if (event.key === 'Enter') handleViewCourse();
      }}
    >
      <div className="relative mb-4">
        <img
          src={resolveThumb(course)}
          alt={title}
          className="thumb"
          style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '0.75rem' }}
          loading="lazy"
        />
        <span className="teacher-course-badge">
          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
        </span>
      </div>

      <div className="title">{title}</div>
      {subtitle && <div style={{ color: '#8892b0', marginBottom: '0.5rem' }}>{subtitle}</div>}
      {description && <div style={{ marginBottom: '1rem', color: '#94a3b8' }}>{description}</div>}

      <div className="my-course-meta">
        {duration && <span>{duration}</span>}
        <span>{featuredLabel}</span>
      </div>

      <div className="teacher-course-actions">
        <button
          type="button"
          className="inline-btn"
          onClick={(event) => {
            event.stopPropagation();
            handleViewCourse();
          }}
        >
          Open course
        </button>
        <button
          type="button"
          className="inline-option-btn"
          onClick={handleUploadMaterial}
        >
          Upload material
        </button>
        <button
          type="button"
          className="inline-option-btn"
          onClick={handleEditCourse}
        >
          Edit details
        </button>
      </div>

      <div className="teacher-course-materials">
        <div className="teacher-course-materials__header">
          <span>Materials</span>
          <span className="teacher-course-materials__count">
            {lessonCount} {lessonCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        {!course.materials?.length ? (
          <div className="teacher-course-materials__empty">
            No materials yet. Upload one to get started.
          </div>
        ) : (
          course.materials.map((material) => (
            <div className="teacher-course-material" key={material._id}>
              <div className="teacher-course-material__meta">
                <strong>{material.title}</strong>
                <span>
                  Lesson {material.order} - {material.annotations?.category || 'Material'}
                </span>
              </div>
              <div className="teacher-course-material__actions">
                <button
                  type="button"
                  className="inline-option-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewMaterial(course, material);
                  }}
                >
                  View
                </button>
                <button
                  type="button"
                  className="inline-option-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditMaterial(course, material);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function TeacherCourses() {
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();

  const isTeacher = useMemo(() => user?.userType === 'Teacher', [user?.userType]);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [thumb, setThumb] = useState(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (initializing) return;
    if (!isAuthenticated || !isTeacher) {
      toast.error('Teacher access required');
      navigate('/home', { replace: true });
      return;
    }
    fetchCourses();
  }, [initializing, isAuthenticated, isTeacher]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/courses/teacher/my');
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialFormState);
    setThumb(null);
    setThumbPreview('');
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleThumbChange = (event) => {
    const file = event.target.files?.[0];
    setThumb(file || null);
    setThumbPreview(prev => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      if (file) {
        return URL.createObjectURL(file);
      }
      return prev && prev.startsWith('blob:') ? '' : prev;
    });
  };

  useEffect(() => {
    return () => {
      if (thumbPreview && thumbPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbPreview);
      }
    };
  }, [thumbPreview]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setSaving(true);
    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('description', form.description.trim());
    if (form.subtitle) payload.append('subtitle', form.subtitle);
    if (form.backgroundImage) payload.append('backgroundImage', form.backgroundImage);
    if (form.duration) payload.append('duration', form.duration);
    payload.append('featured', String(form.featured));
    if (thumb) payload.append('thumb', thumb);

    try {
      if (editingId) {
        await api.put(`/courses/teacher/${editingId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Course updated');
      } else {
        await api.post('/courses/teacher', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Course created');
      }
      resetForm();
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (course) => {
    setEditingId(course._id);
    setForm({
      title: course.title || '',
      description: course.description || '',
      subtitle: course.subtitle || '',
      backgroundImage: course.backgroundImage || '',
      duration: course.duration || '',
      featured: Boolean(course.featured)
    });
    setThumb(null);
    setThumbPreview(resolveAssetUrl(course.thumbUrl || ''));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const onViewCourse = (course) => {
    navigate(`/courses/${course.id || course._id}`);
  };

  const navigateToMaterial = (course, material) => {
    const query = material
      ? `courseId=${course._id}&materialId=${material._id}`
      : `courseId=${course._id}`;
    navigate(`/teacher/materials?${query}`);
  };

  if (initializing || !isTeacher) {
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
              Craft engaging learning experiences. Create new courses, update lessons and refine your materials in one place.
            </p>
          </div>
        </section>

        <section className="card animate-in">
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="form-card form-card--xl teacher-course-form"
          >
            <h2 className="form-card__title form-card__title--left">
              {editingId ? 'Update course' : 'Create a new course'}
            </h2>
            <p className="form-card__subtitle form-card__subtitle--left">
              Set the tone for your learners with a compelling title, concise subtitle and a clear course description.
            </p>
            <div className="form-row">
              <div>
                <label htmlFor="course-title">Course title</label>
                <input
                  id="course-title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Advanced Mathematics"
                />
              </div>
              <div>
                <label htmlFor="course-subtitle">Subtitle (optional)</label>
                <input
                  id="course-subtitle"
                  name="subtitle"
                  value={form.subtitle}
                  onChange={handleChange}
                  placeholder="Give learners a short teaser"
                />
              </div>
            </div>
            <div>
              <label htmlFor="course-description">Description</label>
              <textarea
                id="course-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe what students will learn in this course"
              />
            </div>
            <div className="form-row">
              <div>
                <label htmlFor="course-duration">Duration (optional)</label>
                <input
                  id="course-duration"
                  name="duration"
                  value={form.duration}
                  onChange={handleChange}
                  placeholder="e.g. 6 weeks"
                />
              </div>
              <div>
                <label htmlFor="course-background">Background image URL (optional)</label>
                <input
                  id="course-background"
                  name="backgroundImage"
                  value={form.backgroundImage}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="form-row">
              <div>
                <label htmlFor="course-thumb">Thumbnail</label>
                <input
                  id="course-thumb"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbChange}
                />
                {thumbPreview && (
                  <img src={thumbPreview} alt="Thumbnail preview" className="form-preview" />
                )}
              </div>
              <div className="form-checkbox">
                <input
                  id="featured"
                  type="checkbox"
                  name="featured"
                  checked={form.featured}
                  onChange={handleChange}
                />
                <label htmlFor="featured">Mark as featured course</label>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? <ClipLoader color="#fff" size={18} /> : editingId ? 'Update course' : 'Create course'}
              </button>
              {editingId && (
                <button type="button" className="option-btn" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card animate-in teacher-course-list">
          {loading ? (
            <div className="teacher-course-list__loader">
              <ClipLoader color="#14b8a6" />
            </div>
          ) : courses.length === 0 ? (
            <div className="empty">
              You haven&apos;t created any courses yet. Use the form above to publish your first course.
            </div>
          ) : (
            <div className="box-container">
              {courses.map(course => (
                <TeacherCourseCard
                  key={course._id}
                  course={course}
                  onViewCourse={onViewCourse}
                  onUploadMaterial={(selectedCourse) => navigateToMaterial(selectedCourse)}
                  onEditCourse={handleEdit}
                  onViewMaterial={(selectedCourse, material) =>
                    navigate(`/courses/${selectedCourse.id || selectedCourse._id}/materials/${material.id || material._id}`)
                  }
                  onEditMaterial={(selectedCourse, material) =>
                    navigate(`/teacher/materials?courseId=${selectedCourse._id}&materialId=${material._id}`)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default TeacherCourses;



