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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [material, setMaterial] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);

  const timerRef = useRef(null);
  const completedRef = useRef(false);
  const hasTrackedRef = useRef(false);

  const flashcards = useMemo(() => buildFlashcards(material), [material]);
  const youtubeEmbed = useMemo(() => extractYouTubeEmbed(material?.videoUrl), [material]);

  const trackInteraction = useCallback(
    async (elapsed, overrideCompleted) => {
      if (hasTrackedRef.current) return;
      if (!user || user.userType !== 'Student') return;
      hasTrackedRef.current = true;
      try {
        await api.post(`/courses/${courseId}/materials/${materialId}/interaction`, {
          timeSpentSeconds: Math.max(0, elapsed),
          completed: overrideCompleted ?? completedRef.current
        });
      } catch (err) {
        console.warn('Failed to record interaction', err);
      }
    },
    [courseId, materialId, user]
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/courses/${courseId}`);
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
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg">
              <iframe
                title={material.title}
                src={`${youtubeEmbed}?rel=0`}
                allow="autoplay; fullscreen"
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <video
            controls
            className="w-full rounded-2xl shadow-lg bg-black"
            src={videoUrl}
            poster={resolveAssetUrl(material.thumb)}
          />
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
          <iframe
            src={fileUrl}
            title={material.title}
            className="w-full min-h-[70vh] rounded-2xl shadow-lg bg-white"
          />
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
    <section className="courses" style={{ minHeight: '100vh' }}>
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
  );
}

export default MaterialViewer;
