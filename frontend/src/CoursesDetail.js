import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const PAGE_SIZE = 12;

const resolveThumb = (thumb, fallback) => {
  if (thumb) {
    if (thumb.startsWith('http')) return thumb;
    if (thumb.startsWith('/')) return `${FILE_BASE_URL}${thumb}`;
    return `${FILE_BASE_URL}/uploaded_files/${thumb}`;
  }
  return fallback || 'https://via.placeholder.com/640x360/111827/ffffff?text=Material';
};

const CoursesDetail = React.memo(() => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();

  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [filters, setFilters] = useState({ categories: [], activeCategory: 'All' });
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [enrollmentRequired, setEnrollmentRequired] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [enrolling, setEnrolling] = useState(false);

  const categoryOptions = useMemo(() => {
    if (filters.categories && filters.categories.length) {
      return filters.categories;
    }
    return [{ key: 'All', label: 'All', count: materials.length }];
  }, [filters.categories, materials.length]);

  useEffect(() => {
    if (initializing) return;
    if (!isAuthenticated) {
      toast.error('Please login to view course materials');
      navigate('/login', { replace: true });
    }
  }, [initializing, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || initializing) return;

    let active = true;
    const loadMaterials = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/courses/${courseId}`, {
          params: {
            page,
            search,
            category
          }
        });
        if (!active) return;

        setCourse(data.course || null);
        setFilters(data.filters || { categories: [], activeCategory: 'All' });
        setEnrollmentRequired(Boolean(data.enrollmentRequired));

        const incomingMaterials = Array.isArray(data.materials) ? data.materials : [];
        if (page === 1) {
          setMaterials(incomingMaterials);
        } else {
          setMaterials(prev => [...prev, ...incomingMaterials]);
        }

        const pagination = data.pagination || {};
        const totalItems = pagination.totalItems ?? incomingMaterials.length;
        const pageSize = pagination.pageSize ?? PAGE_SIZE;
        setHasMore(!data.enrollmentRequired && page * pageSize < totalItems);
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load materials');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMaterials();
    return () => {
      active = false;
    };
  }, [courseId, page, search, category, refreshToken, isAuthenticated, initializing]);

  useEffect(() => {
    const keys = categoryOptions.map(cat => cat.key);
    if (keys.length && !keys.includes(category)) {
      const fallback = filters.activeCategory && keys.includes(filters.activeCategory)
        ? filters.activeCategory
        : keys[0];
      if (fallback && fallback !== category) {
        setCategory(fallback);
      }
    }
  }, [categoryOptions, category, filters.activeCategory]);

  useEffect(() => {
    setPage(1);
    setMaterials([]);
    setHasMore(true);
  }, [search, category]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please login to enroll');
      navigate('/login');
      return;
    }
    setEnrolling(true);
    try {
      await api.post(`/courses/enroll/${courseId}`);
      toast.success('Enrollment successful!');
      setEnrollmentRequired(false);
      setCourse(prev => (prev ? { ...prev, isEnrolled: true } : prev));
      setRefreshToken(token => token + 1);
      setPage(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const courseProgress = useMemo(() => (course ? Math.max(0, Math.min(100, course.progressPercent || 0)) : 0), [course]);

  if (loading && page === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <ClipLoader color="#14b8a6" size={32} />
      </div>
    );
  }

  const canAccessMaterials = !enrollmentRequired;
  const isStudent = user?.userType === 'Student';

  return (
    <section className="courses" style={{ minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          className="option-btn flex items-center gap-2"
          onClick={() => navigate('/courses')}
        >
          <FaArrowLeft /> Back
        </button>
        {course && <span className="text-sm text-slate-400">{course.title}</span>}
      </div>
      {course && (
        <header className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{course.title}</h1>
              {course.subtitle && <p className="text-slate-300">{course.subtitle}</p>}
            </div>
            {isStudent && !course.isEnrolled && (
              <button
                type="button"
                className="inline-btn"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? 'Enrolling...' : 'Enroll to Unlock'}
              </button>
            )}
          </div>
          {course.description && <p className="text-slate-400">{course.description}</p>}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{courseProgress}%</span>
            </div>
            <div className="w-full bg-[#0f172a] rounded-full h-3 overflow-hidden">
              <div
                className="bg-teal-400 h-full transition-all duration-500"
                style={{ width: `${courseProgress}%` }}
              />
            </div>
          </div>
        </header>
      )}

        <div className="flex flex-wrap gap-3 mb-6">
        {categoryOptions.map(cat => (
          <button
            key={cat.key}
            type="button"
            className={`option-btn${category === cat.key ? ' active' : ''}`}
            onClick={() => handleCategoryChange(cat.key)}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search materials..."
          className="flex-1 min-w-[220px] px-4 py-2 rounded bg-[#1a1d2e] text-white focus:ring-2 focus:ring-teal-400"
          aria-label="Search materials"
        />
      </div>

        {enrollmentRequired && (
        <div className="bg-[#1f2937] border border-dashed border-teal-500 rounded-2xl p-8 text-center text-slate-300 mb-8">
          <p className="text-lg font-semibold text-white mb-3">
            Enroll to unlock personalized materials for this course.
          </p>
          {isStudent ? (
            <button
              type="button"
              className="inline-btn"
              onClick={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? 'Enrolling...' : 'Enroll Now'}
            </button>
          ) : (
            <p>Login with a student account to enroll.</p>
          )}
        </div>
      )}
      {!materials.length && !loading ? (
        enrollmentRequired ? null : <p className="empty">No materials available yet.</p>
      ) : (
        <InfiniteScroll
          dataLength={materials.length}
          next={handleLoadMore}
          hasMore={hasMore}
          loader={<div className="flex justify-center py-6"><ClipLoader color="#14b8a6" /></div>}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {materials.map(material => {
            const thumb = resolveThumb(material.thumb, course?.backgroundImage);
            const completed = Boolean(material.isCompleted);
            return (
              <article
                key={material._id || material.id}
                className={`relative bg-[#1a1d2e] rounded-2xl overflow-hidden shadow-lg border border-transparent hover:border-teal-500 transition ${!canAccessMaterials ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                onClick={() => canAccessMaterials && navigate(`/courses/${courseId}/materials/${material._id || material.id}`)}
                onKeyPress={(event) => {
                  if (event.key === 'Enter' && canAccessMaterials) {
                    navigate(`/courses/${courseId}/materials/${material._id || material.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="relative">
                  <img
                    src={thumb}
                    alt={material.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 text-xs uppercase tracking-widest px-3 py-1 rounded-full">
                    {material.annotations?.category || 'Material'}
                  </div>
                  {completed && (
                    <span className="absolute top-3 right-3 bg-teal-500 text-white p-2 rounded-full shadow">
                      <FaCheck />
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="text-xl font-semibold text-white">{material.title}</h3>
                  <p className="text-sm text-slate-300 line-clamp-2">{material.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    {material.annotations?.format && <span>{material.annotations.format}</span>}
                    {material.annotations?.type && <span>{material.annotations.type}</span>}
                    {typeof material.order === 'number' && material.order > 0 && (
                      <span>Lesson {material.order}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </InfiniteScroll>
      )}
    </section>
  );
});

export default CoursesDetail;
