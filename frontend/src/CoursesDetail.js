import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import { FaArrowLeft, FaCheck, FaHeart, FaRegHeart, FaRegCommentDots } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const PAGE_SIZE = 12;
const FORMAT_FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'Visual', label: 'Visual' },
  { key: 'Verbal', label: 'Verbal' },
  { key: 'Audio', label: 'Audio' }
];

const resolveThumb = (thumb, fallback) => {
  if (thumb) {
    if (thumb.startsWith('http')) return thumb;
    if (thumb.startsWith('/')) return `${FILE_BASE_URL}${thumb}`;
    return `${FILE_BASE_URL}/uploaded_files/${thumb}`;
  }
  return fallback || 'https://via.placeholder.com/640x360/111827/ffffff?text=Material';
};

const resolveAssetUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('blob:')) return value;
  if (value.startsWith('http')) return value;
  if (value.startsWith('/')) return `${FILE_BASE_URL}${value}`;
  return `${FILE_BASE_URL}/uploaded_files/${value}`;
};

const CoursesDetail = React.memo(() => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();

  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [formatFilter, setFormatFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [enrollmentRequired, setEnrollmentRequired] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedMaterial, setExpandedMaterial] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [socialLoading, setSocialLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentValue, setCommentValue] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

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
            format: formatFilter
          }
        });
        if (!active) return;

        setCourse(data.course || null);
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
  }, [courseId, page, search, formatFilter, refreshToken, isAuthenticated, initializing]);

  useEffect(() => {
    setPage(1);
    setMaterials([]);
    setHasMore(true);
  }, [search, formatFilter]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/courses');
    }
  };

  const handleFormatChange = (nextFormat) => {
    if (nextFormat === formatFilter) return;
    setFormatFilter(nextFormat);
  };

  const formatCommentDate = useCallback((value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch (err) {
      return '';
    }
  }, []);

  const fetchCourseSocial = useCallback(async () => {
    setSocialLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/social`);
      setLikesCount(data?.likesCount || 0);
      setHasLiked(Boolean(data?.hasLiked));
      setComments(Array.isArray(data?.comments) ? data.comments : []);
    } catch (err) {
      console.warn('Failed to load course feedback', err);
      setLikesCount(0);
      setHasLiked(false);
      setComments([]);
      toast.error(err.response?.data?.error || 'Failed to load course feedback');
    } finally {
      setSocialLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseSocial();
  }, [fetchCourseSocial]);

  const handleToggleLike = useCallback(async () => {
    if (!isAuthenticated) {
      toast.info('Please login to like this course');
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/courses/${courseId}/like`);
      setHasLiked(Boolean(data?.liked));
      setLikesCount(data?.likesCount ?? 0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to update like');
    }
  }, [courseId, isAuthenticated, navigate]);

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      toast.info('Please login to comment on this course');
      navigate('/login');
      return;
    }
    const trimmed = commentValue.trim();
    if (!trimmed) {
      toast.warn('Enter a comment before submitting');
      return;
    }
    if (trimmed.length > 1000) {
      toast.warn('Comment is too long');
      return;
    }
    setCommentSubmitting(true);
    try {
      const { data } = await api.post(`/courses/${courseId}/comments`, { comment: trimmed });
      setComments(prev => [data, ...prev]);
      setCommentValue('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setCommentSubmitting(false);
    }
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
  const canAccessMaterials = !enrollmentRequired;
  const isStudent = user?.userType === 'Student';
  const isTeacher = user?.userType === 'Teacher';
  const isAdmin = user?.userType === 'Admin';

  const sortedPreviewMaterials = useMemo(() => {
    return [...materials].sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  }, [materials]);

  const renderTeacherPreview = (material) => {
    const category = material.annotations?.category || '';
    const format = material.annotations?.format || '';
    const fileUrl = resolveAssetUrl(material.fileUrl);
    const videoUrl = resolveAssetUrl(material.video);
    const textContent = material.textContent;

    const hasPdf = fileUrl && /\.pdf($|#|\?)/i.test(fileUrl);
    const hasAudio = fileUrl && /\.(mp3|m4a|aac|wav|ogg)$/i.test(fileUrl);
    const hasVideoFile = videoUrl && /\.(mp4|webm|ogg)$/i.test(videoUrl);

    if (material.video || category === 'Video' || hasVideoFile) {
      const source = videoUrl || fileUrl;
      return source ? (
        <video controls className="teacher-preview__media">
          <source src={source} />
          Your browser does not support the video tag.
        </video>
      ) : (
        <p className="teacher-preview__placeholder">Video unavailable.</p>
      );
    }

    if (category === 'Audio' || format === 'Audio' || hasAudio) {
      const source = fileUrl || videoUrl;
      return source ? (
        <audio controls className="teacher-preview__media">
          <source src={source} />
          Your browser does not support the audio element.
        </audio>
      ) : (
        <p className="teacher-preview__placeholder">Audio unavailable.</p>
      );
    }

    if (hasPdf) {
      return (
        <div className="teacher-preview__pdf-wrapper">
          <iframe
            title={material.title}
            src={`${fileUrl}#toolbar=0`}
            className="teacher-preview__pdf"
          />
          <button
            type="button"
            className="teacher-preview__expand"
            onClick={(event) => {
            event.stopPropagation();
            setExpandedMaterial({ ...material, assetUrl: fileUrl, mode: 'pdf' });
          }}
            aria-label="Expand PDF"
          >
            {'\u2197'}
          </button>
        </div>
      );
    }

    if (category === 'Reading' || category === 'Outline' || format === 'Verbal') {
      if (textContent) {
        return (
          <div className="teacher-preview__text">
            {textContent.split('\n').map((paragraph, idx) => (
              <p key={`paragraph-${idx}`}>{paragraph}</p>
            ))}
          </div>
        );
      }
      if (fileUrl) {
        return (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-btn teacher-preview__link">
            Open document
          </a>
        );
      }
    }

    if (category === 'Flashcards' && Array.isArray(material.quizData) && material.quizData.length) {
      return (
        <ul className="teacher-preview__flashcards">
          {material.quizData.map((card, index) => (
            <li key={`card-${index}`}>
              <strong>{card.question || card.front || `Card ${index + 1}`}</strong>
              <span>{card.answer || (card.options && card.options[card.correctIndex]) || card.back}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (category === 'Quiz') {
      return (
        <div className="teacher-preview__quiz">
          <p>This lesson contains a quiz with {material.quizData?.length || 0} questions.</p>
        </div>
      );
    }

    return (
      <p className="teacher-preview__placeholder">
        Preview not available.{' '}
        {(fileUrl || videoUrl) ? (
          <a href={fileUrl || videoUrl} target="_blank" rel="noreferrer">
            Open resource
          </a>
        ) : (
          'Resource missing.'
        )}
      </p>
    );
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <ClipLoader color="#14b8a6" size={32} />
      </div>
    );
  }

  return (
    <section className="courses" style={{ minHeight: '100vh' }}>
      <div className="course-detail-nav-wrapper">
        <div className="courses-nav course-detail-nav">
          <button
            type="button"
            className="course-detail-back"
            onClick={handleBack}
            aria-label="Back to previous page"
          >
            <FaArrowLeft />
          </button>
          {FORMAT_FILTERS.map(option => (
            <button
              key={option.key}
              type="button"
              className={`nav-btn${formatFilter === option.key ? ' active' : ''}`}
              onClick={() => handleFormatChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {course && <span className="course-detail-nav-course">{course.title}</span>}
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

      <div className="course-social-card">
        <button
          type="button"
          className={`course-social-like${hasLiked ? ' course-social-like--active' : ''}`}
          onClick={handleToggleLike}
          disabled={socialLoading}
        >
          {hasLiked ? <FaHeart /> : <FaRegHeart />}
          <span>{socialLoading ? '—' : `${likesCount} ${likesCount === 1 ? 'Like' : 'Likes'}`}</span>
        </button>
        <div className="course-social-summary">
          <FaRegCommentDots />
          <span>{socialLoading ? 'Loading comments...' : `${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}`}</span>
        </div>
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
      {!isTeacher && (
        !materials.length && !loading ? (
          enrollmentRequired ? null : <p className="empty">No materials available yet.</p>
        ) : (
          <InfiniteScroll
            dataLength={materials.length}
            next={handleLoadMore}
            hasMore={hasMore}
            loader={<div className="flex justify-center py-6"><ClipLoader color="#14b8a6" /></div>}
            className={isAdmin ? 'admin-materials-list' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'}
          >
            {materials.map(material => {
              const thumb = resolveThumb(material.thumb, course?.backgroundImage);
              const completed = Boolean(material.isCompleted);
              const key = material._id || material.id;

              if (isAdmin) {
                return (
                  <article
                    key={key}
                    className={`admin-material-card ${!canAccessMaterials ? 'admin-material-card--disabled' : ''}`}
                    onClick={() => canAccessMaterials && navigate(`/courses/${courseId}/materials/${key}`)}
                    onKeyPress={(event) => {
                      if (event.key === 'Enter' && canAccessMaterials) {
                        navigate(`/courses/${courseId}/materials/${key}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="admin-material-card__thumb-wrapper">
                      <img
                        src={thumb}
                        alt={material.title}
                        className="admin-material-card__thumb"
                        loading="lazy"
                      />
                      <div className="admin-material-card__tag">
                        {material.annotations?.category || 'Material'}
                      </div>
                    </div>
                    <div className="admin-material-card__body">
                      <div className="admin-material-card__header">
                        <h3>{material.title}</h3>
                        {completed && (
                          <span className="admin-material-card__status" aria-label="Completed">
                            <FaCheck />
                          </span>
                        )}
                      </div>
                      <p className="admin-material-card__description">{material.description}</p>
                      <div className="admin-material-card__meta">
                        {material.annotations?.format && <span>{material.annotations.format}</span>}
                        {material.annotations?.type && <span>{material.annotations.type}</span>}
                        {typeof material.order === 'number' && material.order > 0 && (
                          <span>Lesson {material.order}</span>
                        )}
                      </div>
                      <div className="admin-material-card__actions">
                        <button
                          type="button"
                          className="inline-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canAccessMaterials) {
                              navigate(`/courses/${courseId}/materials/${key}`);
                            }
                          }}
                        >
                          View material
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={key}
                  className={`relative bg-[#1a1d2e] rounded-2xl overflow-hidden shadow-lg border border-transparent hover:border-teal-500 transition ${!canAccessMaterials ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                  onClick={() => canAccessMaterials && navigate(`/courses/${courseId}/materials/${key}`)}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter' && canAccessMaterials) {
                      navigate(`/courses/${courseId}/materials/${key}`);
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
        )
      )}


      {isTeacher && sortedPreviewMaterials.length > 0 && (
        <section className="teacher-preview">
          <h2 className="teacher-preview__title">Course Materials (Teacher View)</h2>
          <p className="teacher-preview__subtitle">
            Review every resource without opening each lesson individually. Materials appear in upload order.
          </p>
          <div className="teacher-preview__list">
            {sortedPreviewMaterials.map((material) => (
              <article key={`preview-${material._id || material.id}`} className="teacher-preview__item">
                <header className="teacher-preview__item-header">
                  <span className="teacher-preview__badge">Lesson {material.order ?? '-'}</span>
                  <div>
                    <h3>{material.title}</h3>
                    <div className="teacher-preview__meta">
                      {material.annotations?.category && <span>{material.annotations.category}</span>}
                      {material.annotations?.format && <span>{material.annotations.format}</span>}
                      {material.fileUrl && (
                        <a href={resolveAssetUrl(material.fileUrl)} target="_blank" rel="noreferrer">
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </header>
                <div className="teacher-preview__body">
                  {renderTeacherPreview(material)}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="course-comments-card">
        <h2 className="course-comments-card__title">Course Discussion</h2>
        {isAuthenticated ? (
          <form className="course-comments-card__form" onSubmit={handleCommentSubmit}>
            <textarea
              value={commentValue}
              onChange={(event) => setCommentValue(event.target.value)}
              placeholder="Share a thought, question, or insight about this course..."
              rows={3}
              className="course-comments-card__textarea"
              aria-label="Add a comment"
              disabled={commentSubmitting}
            />
            <div className="course-comments-card__actions">
              <button type="submit" className="inline-btn" disabled={commentSubmitting}>
                {commentSubmitting ? 'Posting...' : 'Post comment'}
              </button>
            </div>
          </form>
        ) : (
          <p className="course-comments-card__cta">
            <Link to="/login" className="inline-option-btn">Log in</Link> to join the conversation.
          </p>
        )}

        {socialLoading ? (
          <div className="flex justify-center py-6">
            <ClipLoader color="#14b8a6" size={24} />
          </div>
        ) : comments.length === 0 ? (
          <p className="course-comments-card__empty">No comments yet. Be the first to start the discussion.</p>
        ) : (
          <ul className="course-comments-card__list">
            {comments.map((item) => (
              <li key={item.id} className="course-comments-card__item">
                <div className="course-comments-card__meta">
                  <span className="course-comments-card__author">{item.userName || 'Learner'}</span>
                  <time className="course-comments-card__date">
                    {formatCommentDate(item.createdAt)}
                  </time>
                </div>
                <p className="course-comments-card__text">{item.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {expandedMaterial && (
        <div
          className="teacher-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label={expandedMaterial.title}
          onClick={() => setExpandedMaterial(null)}
        >
          <div
            className="teacher-preview-modal__content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teacher-preview-modal__controls">
              <button
                type="button"
                className="teacher-preview-modal__close"
                onClick={() => setExpandedMaterial(null)}
                aria-label="Close full size preview"
              >
                �
              </button>
            </div>
            <h3>{expandedMaterial.title}</h3>
            <div className="teacher-preview-modal__body">
              {expandedMaterial.mode === 'pdf' && (
                <iframe
                  title={`${expandedMaterial.title} full preview`}
                  src={`${resolveAssetUrl(expandedMaterial.assetUrl)}#toolbar=1`}
                  className="teacher-preview-modal__frame"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

export default CoursesDetail;



