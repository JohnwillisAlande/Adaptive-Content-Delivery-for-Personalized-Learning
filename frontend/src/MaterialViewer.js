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

  const handleToggleNotepad = () => {
    setShowNotepad(prev => !prev);
  };

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
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
  };

  const handleQuizAnswerChange = (questionIndex, optionIndex) => {
    setQuizAnswers(prev => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
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
            <div className="material-media material-media--video">
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
            />
          </div>
        );
      case 'Audio':
        return (
          <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg flex flex-col items-center gap-4">
            <FaHeadphones className="text-4xl text-teal-400" />
            <audio controls src={fileUrl || videoUrl} className="w-full" />
          </div>
        );
      case 'PDF':
      case 'Reading':
        return fileUrl ? (
          <div className="teacher-preview__pdf-wrapper">
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
          <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg">
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
            />
          );
        }
        return (
          <div className="bg-[#1a1d2e] p-6 rounded-2xl shadow-lg">
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
          <div className="bg-[#1a1d2e] p-8 rounded-2xl shadow-lg flex flex-col items-center gap-6">
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
    </div>
  );
}

export default MaterialViewer;



