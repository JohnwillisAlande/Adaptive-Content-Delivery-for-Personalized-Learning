import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClipLoader from 'react-spinners/ClipLoader';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaFilePdf,
  FaHeadphones,
  FaVideo,
  FaRegStickyNote,
  FaCheckCircle
} from 'react-icons/fa';
import api from './api';
import { useAuth } from './context/AuthContext';
import { useMediaTracker } from './hooks/useMediaTracker';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';

const resolveAssetUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('blob:')) return value;
  if (value.startsWith('http')) return value;
  if (value.startsWith('/')) return `${FILE_BASE_URL}${value}`;
  return `${FILE_BASE_URL}/uploaded_files/${value}`;
};

const extractYouTubeEmbed = (url) => {
  if (!url) return null;
  try {
    const YT_DOMAINS = ['youtube.com', 'youtu.be'];
    const parsed = new URL(url);
    if (!YT_DOMAINS.some(domain => parsed.hostname.includes(domain))) return null;
    if (parsed.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace('/', '')}`;
    }
    const videoId = parsed.searchParams.get('v');
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    const pathParts = parsed.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch (err) {
    return null;
  }
};

const buildFlashcards = (material) => {
  if (!material) return [];
  if (Array.isArray(material.quizData) && material.quizData.length) {
    return material.quizData.map((item, index) => ({
      front: item.question || item.front || `Card ${index + 1}`,
      back: item.answer || item.back || item.options?.[item.correctIndex] || ''
    }));
  }

  if (material.textContent) {
    const segments = material.textContent.split(/\n-{3,}\n/).map(chunk => chunk.trim()).filter(Boolean);
    if (segments.length > 1) {
      return segments.map((segment, index) => {
        const [front, ...rest] = segment.split(/\n{2,}/);
        return {
          front: front || `Card ${index + 1}`,
          back: rest.join('\n\n') || front
        };
      });
    }
  }
  return [];
};

function MaterialViewer() {
  const { courseId, materialId } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [material, setMaterial] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [expandedPdf, setExpandedPdf] = useState(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showNotepad, setShowNotepad] = useState(false);
  const [notes, setNotes] = useState('');
  const [aiQuizState, setAiQuizState] = useState({
    quiz: null,
    loading: false,
    generating: false,
    error: ''
  });
  const [aiQuizAnswers, setAiQuizAnswers] = useState({});
  const [aiQuizSubmitted, setAiQuizSubmitted] = useState(false);

  const notesHydratedRef = useRef(false);

  const timerRef = useRef(null);
  const completedRef = useRef(false);
  const hasTrackedRef = useRef(false);
  const lessonGoalProgressRef = useRef(user?.dailyGoal?.lessonsCompletedToday ?? 0);
  const lessonStreakRef = useRef(user?.streaks?.lesson?.count ?? 0);

  const isStudent = user?.userType === 'Student';
  const notesStorageKey = useMemo(() => {
    const userId = user?._id || user?.id || user?.userId || 'guest';
    return `materialViewerNotes:${userId}`;
  }, [user?._id, user?.id, user?.userId]);

const flashcards = useMemo(() => buildFlashcards(material), [material]);
const youtubeEmbed = useMemo(() => extractYouTubeEmbed(material?.videoUrl), [material]);

  const resourceId = useMemo(
    () => material?.id || material?._id?.toString() || material?.content_id || materialId,
    [material?.id, material?._id, material?.content_id, materialId]
  );
  const resourceType = material?.annotations?.format || 'Visual';

  const {
    startTracking: startMediaTracking,
    stopTracking: stopMediaTracking,
    reportActivity: reportMediaActivity
  } = useMediaTracker({
    resourceId,
    resourceType
  });

  const buildContentObject = useCallback(() => {
    if (!material) return null;
    const annotations = material.annotations || {};
    return {
      id: material.id || material._id || material.content_id,
      playlist_id: material.playlist_id || course?.playlistId || material.playlistId || courseId,
      order: material.order ?? annotations.order ?? 0,
      annotations: {
        format: annotations.format || 'Visual',
        type: annotations.type || 'Abstract',
        category: annotations.category || 'Video'
      }
    };
  }, [material, course?.playlistId, courseId]);

  const trackInteraction = useCallback(
    async (elapsed, overrideCompleted) => {
      if (hasTrackedRef.current) return;
      if (!user || user.userType !== 'Student') return;
      hasTrackedRef.current = true;
      try {
        const { data } = await api.post(`/courses/${courseId}/materials/${materialId}/interaction`, {
          timeSpentSeconds: Math.max(0, elapsed),
          completed: overrideCompleted ?? completedRef.current
        });
        const contentObject = buildContentObject();
        if (contentObject) {
          try {
            await api.post('/track', {
              timeSpentSeconds: Math.max(0, elapsed),
              contentObject
            });
          } catch (trackErr) {
            console.warn('Failed to persist ML tracking data', trackErr);
          }
        }
        let refreshed = false;
        if (data?.xpAwarded) {
          const totalXpLabel = data.totalXp ? ` (total ${data.totalXp} XP)` : '';
          toast.success(`+${data.xpAwarded} XP earned${totalXpLabel}!`);
          if (typeof refresh === 'function') {
            await refresh();
            refreshed = true;
          }
        }
        if (typeof data?.streaks?.lesson?.count === 'number') {
          if (data.streaks.lesson.count > lessonStreakRef.current) {
            toast.success(`🔥 Lesson streak is now ${data.streaks.lesson.count} day${data.streaks.lesson.count === 1 ? '' : 's'}!`);
          }
          lessonStreakRef.current = data.streaks.lesson.count;
        }
        if (typeof data?.dailyGoal?.lessonsCompletedToday === 'number') {
          const previous = lessonGoalProgressRef.current;
          const current = data.dailyGoal.lessonsCompletedToday;
          if (
            current > previous &&
            data.dailyGoal.lessonGoalMet &&
            current >= (data.dailyGoal.lessonsTarget ?? 1)
          ) {
            toast.success('🎯 Daily lesson goal complete!');
          }
          lessonGoalProgressRef.current = current;
        }
        if (Array.isArray(data?.badgesAwarded) && data.badgesAwarded.length) {
          data.badgesAwarded.forEach((badge) => {
            toast.success(`Badge unlocked: ${badge.title}`);
          });
          if (!refreshed && typeof refresh === 'function') {
            await refresh();
            refreshed = true;
          }
        }
      } catch (err) {
        console.warn('Failed to record interaction', err);
      }
    },
    [courseId, materialId, user, refresh]
  );

  const loadAiQuiz = useCallback(async () => {
    if (!courseId || !materialId) return;
    setAiQuizState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const { data } = await api.get(`/courses/${courseId}/materials/${materialId}/quiz`);
      setAiQuizState({
        quiz: data?.quiz || null,
        loading: false,
        generating: false,
        error: ''
      });
      setAiQuizAnswers({});
      setAiQuizSubmitted(false);
    } catch (err) {
      setAiQuizState((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Failed to load quiz'
      }));
    }
  }, [courseId, materialId]);

  const generateAiQuiz = useCallback(
    async (forceRefresh = false) => {
      if (!courseId || !materialId) return;
      setAiQuizState((prev) => ({ ...prev, generating: true, error: '' }));
      try {
        const endpoint = `/courses/${courseId}/materials/${materialId}/quiz${forceRefresh ? '?refresh=true' : ''}`;
        const { data } = await api.post(endpoint);
        setAiQuizState({
          quiz: data?.quiz || null,
          loading: false,
          generating: false,
          error: ''
        });
        setAiQuizAnswers({});
        setAiQuizSubmitted(false);
      } catch (err) {
        setAiQuizState((prev) => ({
          ...prev,
          generating: false,
          error: err.response?.data?.error || 'Failed to generate quiz'
        }));
      }
    },
    [courseId, materialId]
  );

  useEffect(() => {
    setAiQuizState({
      quiz: null,
      loading: false,
      generating: false,
      error: ''
    });
    setAiQuizAnswers({});
    setAiQuizSubmitted(false);
    loadAiQuiz();
  }, [courseId, materialId, loadAiQuiz]);

  const handleAiQuizSelection = (questionIndex, option) => {
    setAiQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: option
    }));
  };

  const handleAiQuizSubmit = () => {
    if (!aiQuizState.quiz) return;
    setAiQuizSubmitted(true);
  };

  useEffect(() => {
    let active = true;
    const loadMaterial = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/courses/${courseId}/materials/${materialId}`);
        if (!active) return;
        setCourse(data.course);
        setMaterial(data.material);
        if (data.material?.annotations?.category !== 'Quiz') {
          completedRef.current = true;
        }
        if (Array.isArray(data.material?.quizData)) {
          setQuizAnswers(new Array(data.material.quizData.length).fill(null));
        }
        hasTrackedRef.current = false;
        timerRef.current = Date.now();
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to load material');
        navigate(`/courses/${courseId}`, { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMaterial();
    return () => {
      active = false;
      if (timerRef.current) {
        const elapsed = Math.floor((Date.now() - timerRef.current) / 1000);
        trackInteraction(elapsed).catch(() => {});
      }
    };
  }, [courseId, materialId, navigate, trackInteraction]);

  useEffect(() => {
    if (!isStudent || !material || !resourceId) return undefined;
    reportMediaActivity();
    startMediaTracking();
    return () => {
      stopMediaTracking();
    };
  }, [
    isStudent,
    material,
    resourceId,
    reportMediaActivity,
    startMediaTracking,
    stopMediaTracking
  ]);

  useEffect(() => {
    if (!isStudent) return;
    if (typeof window === 'undefined') return;
    notesHydratedRef.current = false;
    let initialNotes = '';
    try {
      const stored = window.localStorage.getItem(notesStorageKey);
      if (stored !== null) {
        initialNotes = stored;
      }
    } catch (err) {
      console.warn('Failed to load notepad notes', err);
    }
    setNotes(initialNotes);
    notesHydratedRef.current = true;
  }, [isStudent, notesStorageKey]);

  useEffect(() => {
    if (!isStudent) return;
    if (typeof window === 'undefined') return;
    if (!notesHydratedRef.current) return;
    try {
      window.localStorage.setItem(notesStorageKey, notes);
    } catch (err) {
      console.warn('Failed to persist notepad notes', err);
    }
  }, [notes, isStudent, notesStorageKey]);

  useEffect(() => {
    lessonGoalProgressRef.current = user?.dailyGoal?.lessonsCompletedToday ?? 0;
  }, [user?.dailyGoal?.lessonsCompletedToday]);

  useEffect(() => {
    lessonStreakRef.current = user?.streaks?.lesson?.count ?? 0;
  }, [user?.streaks?.lesson?.count]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  const handleMediaPlay = () => {
    if (!isStudent) return;
    reportMediaActivity();
    startMediaTracking();
  };

  const handleMediaPause = () => {
    if (!isStudent) return;
    stopMediaTracking();
  };

  const handleMediaEnded = () => {
    if (!isStudent) return;
    stopMediaTracking();
  };

  const handleToggleNotepad = () => {
    setShowNotepad(prev => !prev);
    if (isStudent) reportMediaActivity();
  };

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
    if (isStudent) reportMediaActivity();
  };

  const handleClearNotes = () => {
    setNotes('');
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(notesStorageKey);
      } catch (err) {
        console.warn('Failed to clear notepad notes', err);
      }
    }
    if (isStudent) reportMediaActivity();
  };

  const handleQuizAnswerChange = (questionIndex, optionIndex) => {
    setQuizAnswers(prev => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
    if (isStudent) reportMediaActivity();
  };

  const handleQuizSubmit = (event) => {
    event.preventDefault();
    if (!material?.quizData) return;
    let correct = 0;
    material.quizData.forEach((question, index) => {
      if (quizAnswers[index] === question.correctIndex) correct += 1;
    });
    setQuizScore({ correct, total: material.quizData.length });
    setQuizSubmitted(true);
    completedRef.current = true;
    if (timerRef.current) {
      const elapsed = Math.floor((Date.now() - timerRef.current) / 1000);
      trackInteraction(elapsed, true).catch(() => {});
      timerRef.current = Date.now();
      hasTrackedRef.current = false;
    }
    if (isStudent) reportMediaActivity();
  };

  const category = material?.annotations?.category || 'Material';
  const description = material?.description || '';
  const fileUrl = resolveAssetUrl(material?.fileUrl);
  const videoUrl = material?.videoUrl ? resolveAssetUrl(material.videoUrl) : '';
  const textContent = material?.textContent || '';

  const renderContent = () => {
    if (!material) return null;

    switch (category) {
      case 'Video':
      case 'Example':
        if (youtubeEmbed) {
          return (
            <div
              className="material-media material-media--video"
              onMouseMove={isStudent ? reportMediaActivity : undefined}
            >
              <iframe
                title={material.title}
                src={`${youtubeEmbed}?rel=0`}
                allow="autoplay; fullscreen"
                className="material-media__iframe"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <div className="material-media material-media--video">
            <video
              controls
              className="material-media__player"
              src={videoUrl}
              poster={resolveAssetUrl(material.thumb)}
              onPlay={handleMediaPlay}
              onPause={handleMediaPause}
              onEnded={handleMediaEnded}
            />
          </div>
        );
      case 'Audio':
        return (
          <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg flex flex-col items-center gap-4">
            <FaHeadphones className="text-4xl text-teal-400" />
            <audio
              controls
              src={fileUrl || videoUrl}
              className="w-full"
              onPlay={handleMediaPlay}
              onPause={handleMediaPause}
              onEnded={handleMediaEnded}
            />
          </div>
        );
      case 'PDF':
      case 'Reading':
        return fileUrl ? (
          <div
            className="teacher-preview__pdf-wrapper"
            onMouseMove={isStudent ? reportMediaActivity : undefined}
            onScroll={isStudent ? reportMediaActivity : undefined}
          >
            <iframe
              src={`${fileUrl}#toolbar=0`}
              title={material.title}
              className="teacher-preview__pdf"
            />
            <button
              type="button"
              className="teacher-preview__expand"
              onClick={(event) => {
                event.stopPropagation();
                setExpandedPdf(fileUrl);
              }}
              aria-label="Expand PDF"
            >
              {'\u2197'}
            </button>
          </div>
        ) : (
          <div
            className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg"
            onMouseMove={isStudent ? reportMediaActivity : undefined}
            onScroll={isStudent ? reportMediaActivity : undefined}
          >
            <p className="text-slate-300 whitespace-pre-line">{textContent}</p>
          </div>
        );
      case 'Concept Map':
      case 'Outline':
      case 'Exercise':
        if (fileUrl) {
          return (
            <img
              src={fileUrl}
              alt={material.title}
              className="w-full rounded-2xl shadow-lg object-contain bg-[#0f1117]"
              onMouseMove={isStudent ? reportMediaActivity : undefined}
            />
          );
        }
        return (
          <div
            className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg"
            onMouseMove={isStudent ? reportMediaActivity : undefined}
            onScroll={isStudent ? reportMediaActivity : undefined}
          >
            <p className="text-slate-300 whitespace-pre-line">{textContent}</p>
          </div>
        );
      case 'Flashcards':
        if (!flashcards.length) {
          return (
            <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg">
              <p className="text-slate-300">No flashcards available for this lesson yet.</p>
            </div>
          );
        }
        const card = flashcards[flashcardIndex];
        return (
          <div
            className="bg-[#1a1d2e] p-8 rounded-2xl shadow-lg flex flex-col items-center gap-6"
            onMouseMove={isStudent ? reportMediaActivity : undefined}
          >
            <div className="w-full text-center">
              <p className="text-xs text-slate-400 mb-2">Card {flashcardIndex + 1} of {flashcards.length}</p>
              <div className="bg-[#0f1117] rounded-xl p-6 text-white text-lg font-semibold shadow-inner">
                {card.front}
              </div>
            </div>
            <div className="bg-[#0f1117] rounded-xl p-6 text-slate-200 w-full shadow-inner">
              {card.back || 'Reveal the answer in class discussion.'}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                className="option-btn"
                onClick={() => setFlashcardIndex(i => (i - 1 + flashcards.length) % flashcards.length)}
              >
                Previous
              </button>
              <button
                type="button"
                className="inline-btn"
                onClick={() => setFlashcardIndex(i => (i + 1) % flashcards.length)}
              >
                Next
              </button>
            </div>
          </div>
        );
      case 'Quiz':
        if (!material.quizData || !material.quizData.length) {
          return (
            <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg">
              <p className="text-slate-300">Quiz data is unavailable. Please check back later.</p>
            </div>
          );
        }
        return (
          <form onSubmit={handleQuizSubmit} className="space-y-6">
            {material.quizData.map((question, qIndex) => (
              <div key={`quiz-q-${qIndex}`} className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg space-y-4">
                <h3 className="text-lg font-semibold text-white">Question {qIndex + 1}</h3>
                <p className="text-slate-300">{question.question}</p>
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const isChecked = quizAnswers[qIndex] === optionIndex;
                    const isCorrect = quizSubmitted && optionIndex === question.correctIndex;
                    const isWrongSelection = quizSubmitted && isChecked && optionIndex !== question.correctIndex;
                    return (
                      <label
                        key={`quiz-q-${qIndex}-opt-${optionIndex}`}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition ${isCorrect ? 'border-teal-400 bg-teal-400/10' : isWrongSelection ? 'border-red-500 bg-red-500/10' : 'border-transparent bg-[#0f1117]'}`}
                      >
                        <input
                          type="radio"
                          name={`quiz-${qIndex}`}
                          checked={isChecked}
                          onChange={() => handleQuizAnswerChange(qIndex, optionIndex)}
                          disabled={quizSubmitted}
                        />
                        <span className="text-slate-200">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4">
              {!quizSubmitted ? (
                <button type="submit" className="inline-btn">
                  Submit Quiz
                </button>
              ) : (
                <div className="flex items-center gap-3 text-teal-400">
                  <FaCheckCircle />
                  <span>
                    You scored {quizScore?.correct} out of {quizScore?.total}
                  </span>
                </div>
              )}
              <button type="button" className="option-btn" onClick={handleBack}>
                Back to Materials
              </button>
            </div>
          </form>
        );
      default:
        return (
          <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg">
            <p className="text-slate-300 whitespace-pre-line">{textContent || 'Material will be available soon.'}</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <ClipLoader color="#14b8a6" size={32} />
      </div>
    );
  }

  if (!material) {
    return null;
  }

  return (
    <div className={`material-viewer-shell${showNotepad ? ' material-viewer-shell--split' : ''}`}>
      {isStudent && (
        <button
          type="button"
          className={`notepad-toggle${showNotepad ? ' notepad-toggle--active' : ''}`}
          onClick={handleToggleNotepad}
          aria-label={showNotepad ? 'Hide notepad' : 'Open notepad'}
        >
          <FaRegStickyNote />
          <span>{showNotepad ? 'Hide notes' : 'Open notes'}</span>
        </button>
      )}
      <section className="courses material-viewer-content" style={{ minHeight: '100vh' }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="option-btn flex items-center gap-2"
            onClick={handleBack}
          >
            <FaArrowLeft /> Back
          </button>
          <span className="text-sm text-slate-400">
            {course?.title || 'Course'}
          </span>
        </div>

        <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg space-y-6">
          <div>
            <div className="flex items-center gap-3 text-teal-400 text-sm uppercase tracking-widest mb-2">
              {category === 'Video' && <FaVideo />}
              {category === 'Audio' && <FaHeadphones />}
              {category === 'PDF' && <FaFilePdf />}
              {category === 'Reading' && <FaRegStickyNote />}
              <span>{category}</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{material.title}</h1>
            {description && <p className="text-slate-300">{description}</p>}
          </div>

          {renderContent()}

          {category !== 'Quiz' && textContent && category !== 'Flashcards' && (
            <div className="bg-[#111827] p-6 rounded-2xl shadow-inner">
              <h2 className="text-xl font-semibold text-white mb-3">Lesson Notes</h2>
              <p className="text-slate-300 whitespace-pre-line">{textContent}</p>
            </div>
          )}

          {fileUrl && category !== 'PDF' && category !== 'Audio' && category !== 'Video' && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-btn"
            >
              Download Resource
            </a>
          )}
        </div>
      </section>

      {showNotepad && (
        <aside className="material-notepad" aria-label="Lesson notepad">
          <header className="material-notepad__header">
            <div className="material-notepad__title">
              <FaRegStickyNote />
              <span>My Notes</span>
            </div>
            <button
              type="button"
              className="material-notepad__action"
              onClick={handleClearNotes}
            >
              Clear
            </button>
          </header>
          <p className="material-notepad__hint">
            Jot ideas, questions, or summaries as you review the material. Notes stay here until you close this browser session.
          </p>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Start typing your thoughts..."
            className="material-notepad__textarea"
          />
        </aside>
      )}
      {expandedPdf && (
        <div
          className="teacher-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded PDF"
          onClick={() => setExpandedPdf(null)}
        >
          <div
            className="teacher-preview-modal__content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teacher-preview-modal__controls">
              <button
                type="button"
                className="teacher-preview-modal__close"
                onClick={() => setExpandedPdf(null)}
                aria-label="Close full size preview"
              >
                &times;
              </button>
            </div>
            <div className="teacher-preview-modal__body">
              <iframe
                title="Expanded lesson preview"
                src={`${resolveAssetUrl(expandedPdf)}#toolbar=1`}
                className="teacher-preview-modal__frame"
              />
            </div>
          </div>
        </div>
      )}
      <section className="material-quiz-card">
        <div className="material-quiz-card__header">
          <div>
            <h2>AI Practice Quiz</h2>
            <p>Let Gemini generate targeted questions from this material.</p>
          </div>
          <div className="material-quiz-card__actions">
            <button
              type="button"
              className="inline-btn inline-btn--ghost"
              onClick={() => loadAiQuiz()}
              disabled={aiQuizState.loading || aiQuizState.generating}
            >
              Refresh
            </button>
            <button
              type="button"
              className="inline-btn"
              onClick={() => generateAiQuiz(Boolean(aiQuizState.quiz))}
              disabled={aiQuizState.generating}
            >
              {aiQuizState.generating ? 'Generating…' : aiQuizState.quiz ? 'Regenerate' : 'Generate Quiz'}
            </button>
          </div>
        </div>
        {aiQuizState.error && <p className="text-red-400 mb-3">{aiQuizState.error}</p>}
        {aiQuizState.loading ? (
          <div className="flex justify-center py-6">
            <ClipLoader color="#14b8a6" />
          </div>
        ) : aiQuizState.quiz ? (
          <div className="material-quiz-card__body">
            {aiQuizState.quiz.questions.map((item, index) => {
              const selected = aiQuizAnswers[index];
              const isCorrect = aiQuizSubmitted && selected === item.answer;
              const isWrong = aiQuizSubmitted && selected && selected !== item.answer;
              return (
                <article key={`quiz-${index}`} className={`quiz-question${isCorrect ? ' quiz-question--correct' : ''}${isWrong ? ' quiz-question--incorrect' : ''}`}>
                  <h3>
                    {index + 1}. {item.question}
                  </h3>
                  <div className="quiz-options">
                    {item.options?.map((option) => (
                      <label key={`${index}-${option}`} className="quiz-option">
                        <input
                          type="radio"
                          name={`quiz-${index}`}
                          value={option}
                          checked={selected === option}
                          onChange={() => handleAiQuizSelection(index, option)}
                          disabled={aiQuizSubmitted}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {aiQuizSubmitted && (
                    <div className="quiz-feedback">
                      <p>{isCorrect ? 'Correct!' : `Correct answer: ${item.answer}`}</p>
                      {item.explanation && <p className="quiz-feedback__explanation">{item.explanation}</p>}
                    </div>
                  )}
                </article>
              );
            })}
            {!aiQuizSubmitted && aiQuizState.quiz.questions.length > 0 && (
              <button
                type="button"
                className="inline-btn"
                onClick={handleAiQuizSubmit}
                disabled={aiQuizState.generating || aiQuizState.loading}
              >
                Check Answers
              </button>
            )}
          </div>
        ) : (
          <p className="muted">No quiz has been generated for this material yet. Click “Generate Quiz” to get started.</p>
        )}
      </section>
    </div>
  );
}

export default MaterialViewer;
