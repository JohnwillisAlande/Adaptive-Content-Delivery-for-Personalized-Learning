import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import api from './api';
import { useAuth } from './context/AuthContext';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';

const FORMAT_OPTIONS = [
  { value: 'Visual', label: 'Visual (video, diagrams, animations)' },
  { value: 'Verbal', label: 'Verbal (text-heavy, lecture-style)' },
  { value: 'Audio', label: 'Audio (podcasts, spoken lectures)' }
];

const TYPE_OPTIONS = [
  { value: 'Abstract', label: 'Abstract (theory, concepts, definitions)' },
  { value: 'Concrete', label: 'Concrete (worked examples, real cases)' }
];

const CATEGORY_OPTIONS = [
  { value: 'Video', label: 'Video lesson' },
  { value: 'Example', label: 'Example or case study' },
  { value: 'Exercise', label: 'Practice exercise' },
  { value: 'Quiz', label: 'Quiz or assessment' },
  { value: 'Reading', label: 'Reading or article' },
  { value: 'Outline', label: 'Course outline / overview' },
  { value: 'Concept Map', label: 'Concept map / diagram' },
  { value: 'Audio', label: 'Audio lesson' },
  { value: 'Flashcards', label: 'Flashcards set' },
  { value: 'PDF', label: 'PDF handout or workbook' }
];

const VIDEO_CATEGORIES = new Set(['Video', 'Example']);
const FILE_CATEGORIES = new Set(['Reading', 'Exercise', 'Concept Map', 'Audio', 'Flashcards', 'PDF', 'Outline']);
const QUIZ_CATEGORY = 'Quiz';
const TEXT_OR_FILE_CATEGORIES = new Set(['Reading', 'Exercise', 'Flashcards', 'Outline']);

const resolveAssetUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('blob:')) return value;
  if (value.startsWith('http')) return value;
  if (value.startsWith('/')) return `${FILE_BASE_URL}${value}`;
  return `${FILE_BASE_URL}/uploaded_files/${value}`;
};

const blankQuizQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0
});

function UploadMaterial() {
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();
  const [searchParams] = useSearchParams();

  const isTeacher = useMemo(() => user?.userType === 'Teacher', [user?.userType]);
  const courseParam = searchParams.get('courseId') || '';
  const materialParam = searchParams.get('materialId') || '';

  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    courseId: '',
    title: '',
    description: '',
    order: '',
    format: FORMAT_OPTIONS[0].value,
    type: TYPE_OPTIONS[0].value,
    category: CATEGORY_OPTIONS[0].value,
    status: 'active',
    videoSource: 'upload',
    videoUrl: '',
    textContent: '',
    fileUrl: ''
  });
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [contentFile, setContentFile] = useState(null);
  const [existingFilePath, setExistingFilePath] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [materialId, setMaterialId] = useState(null);
  const [existingVideoType, setExistingVideoType] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([blankQuizQuestion()]);

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
    setLoadingCourses(true);
    try {
      const { data } = await api.get('/courses/teacher/my');
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    if (loadingCourses) return;
    if (!courses.length) {
      setForm(prev => ({ ...prev, courseId: '' }));
      return;
    }
    // Determine initial course selection
    if (courseParam && courses.find(course => course._id === courseParam)) {
      setForm(prev => ({ ...prev, courseId: courseParam }));
    } else if (!form.courseId) {
      setForm(prev => ({ ...prev, courseId: courses[0]._id }));
    }
  }, [loadingCourses, courses, courseParam]);

  useEffect(() => {
    if (!materialParam || !isTeacher || loadingCourses) return;
    const loadMaterial = async () => {
      setLoadingMaterial(true);
      try {
        const { data } = await api.get(`/courses/teacher/materials/${materialParam}`);
        setMaterialId(data._id);
        const detectedCategory = data.annotations?.category || CATEGORY_OPTIONS[0].value;
        setForm(prev => ({
          ...prev,
          courseId: data.courseId || prev.courseId || courseParam || '',
          title: data.title || '',
          description: data.description || '',
          order: data.order ?? '',
          format: data.annotations?.format || FORMAT_OPTIONS[0].value,
          type: data.annotations?.type || TYPE_OPTIONS[0].value,
          category: detectedCategory,
          status: data.status || 'active',
          videoSource: data.video && data.video.startsWith('http') ? 'link' : 'upload',
          videoUrl: data.video && data.video.startsWith('http') ? data.video : '',
          textContent: data.textContent || '',
          fileUrl: data.fileUrl && data.fileUrl.startsWith('http') ? data.fileUrl : ''
        }));
        setThumbPreview(resolveAssetUrl(data.thumbUrl || ''));
        setExistingVideoType(data.video ? (data.video.startsWith('http') ? 'link' : 'file') : null);
        setExistingFilePath(data.fileUrl || '');
        if (Array.isArray(data.quizData) && data.quizData.length) {
          setQuizQuestions(
            data.quizData.map(q => ({
              question: q.question || '',
              options: Array.isArray(q.options) && q.options.length ? [...q.options] : ['', '', '', ''],
              correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0
            }))
          );
        } else {
          setQuizQuestions([blankQuizQuestion()]);
        }
        setContentFile(null);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load material details');
      } finally {
        setLoadingMaterial(false);
      }
    };
    loadMaterial();
  }, [materialParam, isTeacher, loadingCourses]);

  useEffect(() => {
    if (materialId) return; // do not override order when editing
    const selected = courses.find(course => course._id === form.courseId);
    if (!selected) return;
    setForm(prev => ({
      ...prev,
      order: prev.order || selected.materialCount + 1
    }));
  }, [form.courseId, courses, materialId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'category') {
      const requiresVideo = VIDEO_CATEGORIES.has(value);
      const requiresFile = FILE_CATEGORIES.has(value);
      const isQuiz = value === QUIZ_CATEGORY;
      const allowsText = TEXT_OR_FILE_CATEGORIES.has(value);
      setForm(prev => ({
        ...prev,
        category: value,
        videoSource: requiresVideo ? prev.videoSource : 'upload',
        videoUrl: requiresVideo ? prev.videoUrl : '',
        fileUrl: requiresFile ? prev.fileUrl : '',
        textContent: (isQuiz || allowsText) ? prev.textContent : ''
      }));
      if (!requiresVideo) {
        setVideoFile(null);
        setExistingVideoType(null);
      }
      if (!requiresFile) {
        setContentFile(null);
        setExistingFilePath('');
      }
      if (!isQuiz) {
        setQuizQuestions(prev => (prev.length ? prev : [blankQuizQuestion()]));
      } else if (quizQuestions.length === 0) {
        setQuizQuestions([blankQuizQuestion()]);
      }
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleVideoSourceChange = (event) => {
    if (!VIDEO_CATEGORIES.has(form.category)) {
      return;
    }
    const { value } = event.target;
    setForm(prev => ({
      ...prev,
      videoSource: value,
      videoUrl: value === 'link' ? prev.videoUrl : ''
    }));
    if (value === 'link') {
      setVideoFile(null);
      setExistingVideoType(prevType => (prevType === 'link' ? 'link' : null));
    } else {
      setExistingVideoType(prevType => (prevType === 'file' ? 'file' : null));
    }
  };

const handleThumbChange = (event) => {
  const file = event.target.files?.[0];
  setThumbFile(file || null);
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

const handleVideoFileChange = (event) => {
  const file = event.target.files?.[0];
  setVideoFile(file || null);
  if (file) {
    setExistingVideoType('file');
  }
};

const handleContentFileChange = (event) => {
  const file = event.target.files?.[0];
  setContentFile(file || null);
  if (file) {
    setExistingFilePath('');
  }
};

useEffect(() => {
  return () => {
    if (thumbPreview && thumbPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbPreview);
    }
  };
}, [thumbPreview]);
  const requiresVideo = useMemo(() => VIDEO_CATEGORIES.has(form.category), [form.category]);
  const requiresFile = useMemo(() => FILE_CATEGORIES.has(form.category), [form.category]);
  const isQuizCategory = form.category === QUIZ_CATEGORY;
  const allowsTextFallback = useMemo(() => TEXT_OR_FILE_CATEGORIES.has(form.category), [form.category]);
  const resolvedExistingFileLink = useMemo(
    () => resolveAssetUrl(existingFilePath),
    [existingFilePath]
  );
  const existingFileName = useMemo(() => {
    if (!existingFilePath) return '';
    const segments = existingFilePath.split(/[/\\]/);
    return segments[segments.length - 1] || '';
  }, [existingFilePath]);

  const handleQuestionTextChange = (index, value) => {
    setQuizQuestions(prev => prev.map((question, i) => (
      i === index ? { ...question, question: value } : question
    )));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setQuizQuestions(prev => prev.map((question, i) => {
      if (i !== questionIndex) return question;
      const options = [...question.options];
      options[optionIndex] = value;
      return { ...question, options };
    }));
  };

  const handleCorrectIndexChange = (questionIndex, optionIndex) => {
    setQuizQuestions(prev => prev.map((question, i) => (
      i === questionIndex ? { ...question, correctIndex: optionIndex } : question
    )));
  };

  const handleAddQuestion = () => {
    setQuizQuestions(prev => [...prev, blankQuizQuestion()]);
  };

  const handleRemoveQuestion = (index) => {
    setQuizQuestions(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const hasExistingVideo = Boolean(materialId && existingVideoType);
    const hasExistingFile = Boolean(materialId && existingFilePath);
    const trimmedTextContent = form.textContent && form.textContent.trim() ? form.textContent.trim() : '';
    const trimmedFileUrl = form.fileUrl && form.fileUrl.trim() ? form.fileUrl.trim() : '';

    if (!form.courseId) {
      toast.error('Please choose a course');
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (!form.order || Number(form.order) < 1) {
      toast.error('Lesson number must be at least 1');
      return;
    }
    if (!materialId && !thumbFile) {
      toast.error('Thumbnail image is required for new materials');
      return;
    }

    if (requiresVideo) {
      if (form.videoSource === 'link') {
        if (!form.videoUrl.trim() && !(hasExistingVideo && existingVideoType === 'link')) {
          toast.error('Provide a video link or upload a video file');
          return;
        }
      } else if (!videoFile && !(hasExistingVideo && existingVideoType === 'file')) {
        toast.error('Upload a video file or switch to link mode');
        return;
      }
    }

    if (requiresFile && !contentFile && !trimmedFileUrl && !hasExistingFile) {
      if (!(allowsTextFallback && trimmedTextContent)) {
        toast.error('Upload a file, provide a file link, or supply text instructions for this content type');
        return;
      }
    }

    let sanitizedQuiz = null;
    if (isQuizCategory) {
      sanitizedQuiz = quizQuestions.map(question => ({
        question: question.question.trim(),
        options: question.options.map(opt => opt.trim()),
        correctIndex: question.correctIndex
      }));
      for (const q of sanitizedQuiz) {
        if (!q.question) {
          toast.error('Each quiz question needs text');
          return;
        }
        if (q.options.some(opt => !opt)) {
          toast.error('Quiz questions require all answer options');
          return;
        }
        if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
          toast.error('Select a correct answer for each quiz question');
          return;
        }
      }
    }

    setSaving(true);
    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('description', form.description.trim());
    payload.append('order', form.order);
    payload.append('format', form.format);
    payload.append('type', form.type);
    payload.append('category', form.category);
    payload.append('status', form.status);
    payload.append('textContent', trimmedTextContent);
    payload.append('fileUrl', trimmedFileUrl);

    if (requiresVideo) {
      if (form.videoSource === 'link' && form.videoUrl.trim()) {
        payload.append('videoUrl', form.videoUrl.trim());
      } else if (videoFile) {
        payload.append('videoFile', videoFile);
      }
    } else if (form.videoSource === 'link' && form.videoUrl.trim()) {
      payload.append('videoUrl', form.videoUrl.trim());
    } else if (videoFile) {
      payload.append('videoFile', videoFile);
    }

    if (contentFile) {
      payload.append('contentFile', contentFile);
    }

    if (thumbFile) {
      payload.append('thumb', thumbFile);
    }

    if (isQuizCategory && sanitizedQuiz) {
      payload.append('quizData', JSON.stringify(sanitizedQuiz));
    }

    const endpoint = materialId
      ? `/courses/teacher/${form.courseId}/materials/${materialId}`
      : `/courses/teacher/${form.courseId}/materials`;
    try {
      if (materialId) {
        await api.put(endpoint, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Material updated');
      } else {
        await api.post(endpoint, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Material uploaded');
      }
      navigate('/teacher/courses');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  if (initializing || !isTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <ClipLoader color="#14b8a6" size={32} />
      </div>
    );
  }

  return (
    <section className="teachers upload-page">
      <h1 className="heading">{materialId ? 'Edit Course Material' : 'Upload Course Material'}</h1>
      <div className="form-screen form-screen--plain form-screen--stacked">
        <div className="form-card form-card--xl upload-card">
          <p className="form-card__subtitle form-card__subtitle--left upload-card__intro">
            Every field below feeds your adaptive learning engine. Use the lesson number to keep modules in sequence,
            select the primary format and purpose of the lesson, and label the category so the recommender can match
            students with the right activities. Accurate metadata keeps the ML models smart.
          </p>

          {loadingCourses || loadingMaterial ? (
            <div className="form-loader">
              <ClipLoader color="#14b8a6" size={32} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="upload-form form-grid-two" encType="multipart/form-data">
              <div className="full-span">
                <label htmlFor="material-course">
                  Course <span className="required-indicator">*</span>
                </label>
                <select
                  id="material-course"
                  name="courseId"
                  value={form.courseId}
                  onChange={handleInputChange}
                  required
                >
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="material-order">
                  Lesson number <span className="required-indicator">*</span>
                </label>
                <input
                  id="material-order"
                  type="number"
                  min={1}
                  name="order"
                  value={form.order}
                  onChange={handleInputChange}
                  required
                  placeholder="1"
                />
              </div>
              <div>
                <label htmlFor="material-format">Primary format</label>
                <select
                  id="material-format"
                  name="format"
                  value={form.format}
                  onChange={handleInputChange}
                >
                  {FORMAT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="material-type">Content purpose</label>
                <select
                  id="material-type"
                  name="type"
                  value={form.type}
                  onChange={handleInputChange}
                >
                  {TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="material-category">Content category</label>
                <select
                  id="material-category"
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                >
                  {CATEGORY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="material-status">Material status</label>
                <select
                  id="material-status"
                  name="status"
                  value={form.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Active &ndash; visible to students</option>
                  <option value="deactive">Inactive &ndash; hidden from students</option>
                </select>
                <p className="field-hint">
                  Deactivate content to hide it from learners without deleting the file.
                </p>
              </div>
              <div className="full-span">
                <label htmlFor="material-title">
                  Title <span className="required-indicator">*</span>
                </label>
                <input
                  id="material-title"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Lesson title"
                />
              </div>
              <div className="full-span">
                <label htmlFor="material-description">
                  Description <span className="required-indicator">*</span>
                </label>
                <textarea
                  id="material-description"
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  placeholder="Summarize what this lesson covers"
                />
              </div>
              <div>
                <label htmlFor="material-thumb">Thumbnail image</label>
                <input
                  id="material-thumb"
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
                  id="material-featured"
                  type="checkbox"
                  name="featured"
                  checked={form.featured}
                  onChange={handleInputChange}
                />
                <label htmlFor="material-featured">Mark as featured course</label>
              </div>

              {requiresVideo && (
                <div className="full-span upload-form__segment">
                  <label>Video source</label>
                  <div className="form-tab-group">
                    <label>
                      <input
                        type="radio"
                        value="upload"
                        checked={form.videoSource === 'upload'}
                        onChange={handleVideoSourceChange}
                      />
                      <span>Upload file</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="link"
                        checked={form.videoSource === 'link'}
                        onChange={handleVideoSourceChange}
                      />
                      <span>YouTube / video link</span>
                    </label>
                  </div>
                  {form.videoSource === 'upload' ? (
                    <div className="upload-form__field">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileChange}
                      />
                      {existingVideoType === 'file' && !videoFile && materialId && (
                        <p className="form-note">Current video will be kept unless you upload a new file.</p>
                      )}
                    </div>
                  ) : (
                    <input
                      type="url"
                      name="videoUrl"
                      value={form.videoUrl}
                      onChange={handleInputChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  )}
                  {existingVideoType === 'link' && form.videoSource !== 'link' && materialId && (
                    <p className="form-note">Current linked video will remain unless you change it.</p>
                  )}
                </div>
              )}

              {requiresFile && (
                <div>
                  <label htmlFor="material-file-upload">Upload file (PDF, audio, etc.)</label>
                  <input
                    id="material-file-upload"
                    type="file"
                    onChange={handleContentFileChange}
                  />
                  {existingFilePath && !contentFile && materialId && (
                    <p className="form-note">
                      Current file:{' '}
                      {resolvedExistingFileLink ? (
                        <a
                          href={resolvedExistingFileLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {existingFileName}
                        </a>
                      ) : (
                        <span>{existingFileName}</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {requiresFile && (
                <div>
                  <label htmlFor="material-file-url">File link (optional)</label>
                  <input
                    id="material-file-url"
                    type="url"
                    name="fileUrl"
                    value={form.fileUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>
              )}

              {(requiresFile || isQuizCategory) && (
                <div className="full-span">
                  <label htmlFor="material-text-content">Supporting text / instructions (optional)</label>
                  <textarea
                    id="material-text-content"
                    name="textContent"
                    value={form.textContent}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Add guidance, reading excerpts, or exercise instructions"
                  />
                </div>
              )}

              {isQuizCategory && (
                <div className="full-span quiz-builder">
                  <label>Quiz builder</label>
                  <div className="quiz-builder__list">
                    {quizQuestions.map((question, qIndex) => (
                      <div key={`quiz-question-${qIndex}`} className="quiz-card">
                        <div className="quiz-card__header">
                          <div className="quiz-card__question">
                            <label htmlFor={`quiz-question-${qIndex}`}>Question {qIndex + 1}</label>
                            <input
                              id={`quiz-question-${qIndex}`}
                              type="text"
                              value={question.question}
                              onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                              placeholder="Enter the quiz question"
                            />
                          </div>
                          {quizQuestions.length > 1 && (
                            <button
                              type="button"
                              className="option-btn"
                              onClick={() => handleRemoveQuestion(qIndex)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="quiz-card__options">
                          {question.options.map((option, optionIndex) => (
                            <label
                              key={`quiz-question-${qIndex}-option-${optionIndex}`}
                              className="quiz-option"
                            >
                              <input
                                type="radio"
                                name={`question-${qIndex}-correct`}
                                checked={question.correctIndex === optionIndex}
                                onChange={() => handleCorrectIndexChange(qIndex, optionIndex)}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(qIndex, optionIndex, e.target.value)}
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="inline-option-btn"
                      onClick={handleAddQuestion}
                    >
                      Add another question
                    </button>
                  </div>
                </div>
              )}

              <div className="full-span form-actions horizontal">
                <button
                  type="submit"
                  className="btn"
                  disabled={saving}
                >
                  {saving ? <ClipLoader color="#fff" size={18} /> : materialId ? 'Update material' : 'Upload material'}
                </button>
                <button
                  type="button"
                  className="option-btn"
                  onClick={() => navigate('/teacher/courses')}
                >
                  Cancel
                </button>
              </div>
          </form>
        )}
      </div>
    </div>
    </section>
  );
}

export default UploadMaterial;
