import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaCalculator, FaGlobeAfrica, FaLeaf, FaAppleAlt, FaPray, FaPaintBrush } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';
import api from './api';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';

const COURSE_LIST = [
  {
    id: 'english',
    name: 'English',
    subtitle: 'Master Language Skills',
    icon: FaBook,
    description: 'Comprehensive English language course covering reading, writing, grammar, and communication skills',
    backgroundImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80',
    color: '#3b82f6',
    lessons: 24,
    duration: '8 weeks',
    students: 1250,
    featured: true
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    subtitle: 'Build Problem-Solving Skills',
    icon: FaCalculator,
    description: 'Advanced mathematical concepts and problem-solving techniques for all levels',
    backgroundImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
    color: '#10b981',
    lessons: 30,
    duration: '10 weeks',
    students: 980,
    featured: true
  },
  {
    id: 'kiswahili',
    name: 'Kiswahili',
    subtitle: 'Learn East African Language',
    icon: FaGlobeAfrica,
    description: 'Learn to speak, read and write Kiswahili fluently with native speakers',
    backgroundImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
    color: '#f59e0b',
    lessons: 20,
    duration: '7 weeks',
    students: 760,
    featured: true
  },
  {
    id: 'environmental',
    name: 'Environmental Activities',
    subtitle: 'Protect Our Planet',
    icon: FaLeaf,
    description: 'Understand climate change, sustainability, and environmental conservation',
    backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    color: '#059669',
    lessons: 18,
    duration: '6 weeks',
    students: 520,
    featured: false
  },
  {
    id: 'hygiene-nutrition',
    name: 'Hygiene and Nutrition',
    subtitle: 'Build Healthy Habits',
    icon: FaAppleAlt,
    description: 'Essential knowledge about nutrition, healthy eating, and personal hygiene',
    backgroundImage: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80',
    color: '#ef4444',
    lessons: 16,
    duration: '5 weeks',
    students: 890,
    featured: false
  },
  {
    id: 'religious',
    name: 'Religious Activities',
    subtitle: 'Spiritual Growth',
    icon: FaPray,
    description: 'Explore faith, ethics, and spiritual development across traditions',
    backgroundImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80',
    color: '#8b5cf6',
    lessons: 22,
    duration: '8 weeks',
    students: 640,
    featured: false
  },
  {
    id: 'creative-movement',
    name: 'Creative and Movement',
    subtitle: 'Express Through Art',
    icon: FaPaintBrush,
    description: 'Develop creativity through arts, crafts, music, and physical activities',
    backgroundImage: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80',
    color: '#eab308',
    lessons: 26,
    duration: '9 weeks',
    students: 1100,
    featured: false
  },
];

function Courses() {

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [enrolledCourses, setEnrolledCourses] = useState(new Set());
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();

  const userType = user?.userType || null;

  useEffect(() => {
    if (initializing) return;

    if (userType === 'Admin') {
      setLoading(false);
      return;
    }

    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/courses');
        if (!active) return;
        const resolvedCourses = data && data.length ? data : COURSE_LIST;
        setCourses(resolvedCourses);
        const enrolled = (data || [])
          .filter(course => course.isEnrolled)
          .map(course => course.id);
        setEnrolledCourses(new Set(enrolled));
      } catch (err) {
        if (!active) return;
        toast.error(err.response?.data?.error || 'Failed to fetch courses');
        setCourses(COURSE_LIST);
        setEnrolledCourses(new Set());
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [initializing, userType]);

  const filteredCourses = useMemo(() => {
    switch (activeTab) {
      case 'featured':
        return courses.filter(c => c.featured);
      case 'enrolled':
        return courses.filter(c => enrolledCourses.has(c.id));
      default:
        return courses;
    }
  }, [courses, activeTab, enrolledCourses]);

  const resolveThumb = (course) => {
    if (course.thumb) {
      if (course.thumb.startsWith('http')) return course.thumb;
      return `${FILE_BASE_URL}/uploaded_files/${course.thumb}`;
    }
    return course.backgroundImage || 'https://via.placeholder.com/640x360/111827/ffffff?text=Course';
  };

  const handleCardClick = (courseId) => {
    if (!courseId) return;
    navigate(`/courses/${courseId}`);
  };

  const handleEnroll = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please login to enroll');
      navigate('/login');
      return;
    }

    try {
      await api.post(`/courses/enroll/${courseId}`);
      setEnrolledCourses(prev => new Set([...prev, courseId]));
      setCourses(prevCourses => 
        prevCourses.map(c => 
          c.id === courseId ? { ...c, isEnrolled: true } : c
        )
      );
      toast.success('Successfully enrolled!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Enrollment failed. Please try again.');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-500 mb-4"></div>
          <p className="text-gray-400 text-lg font-semibold">Loading courses...</p>
        </div>
      </div>
    );
  }
  // Teacher quick access view

  if (userType === 'Teacher') {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center">
        <div className="w-full max-w-xl mx-auto flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-center py-20">
          <button
            onClick={() => navigate('/teacher/courses')}
            className="flex-1 px-8 py-6 rounded-2xl bg-teal-600 text-white text-2xl font-bold shadow-lg hover:bg-teal-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-400"
            style={{ minWidth: 220 }}
          >
            Manage My Courses
          </button>
          <button
            onClick={() => navigate('/teacher/materials')}
            className="flex-1 px-8 py-6 rounded-2xl bg-teal-600 text-white text-2xl font-bold shadow-lg hover:bg-teal-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-400"
            style={{ minWidth: 220 }}
          >
            Upload Material
          </button>
        </div>
      <style>{`
          @media (max-width: 768px) {
            .flex-col.md\\:flex-row {
              flex-direction: column !important;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1 className="heading">Courses</h1>
      {userType !== 'Teacher' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            className={`option-btn${activeTab === 'all' ? ' active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`option-btn${activeTab === 'featured' ? ' active' : ''}`}
            onClick={() => setActiveTab('featured')}
          >
            Featured
          </button>
          <button
            className={`option-btn${activeTab === 'enrolled' ? ' active' : ''}`}
            onClick={() => setActiveTab('enrolled')}
          >
            Enrolled
          </button>
        </div>
      )}
      <div className="box-container">
        {filteredCourses.length === 0 ? (
          <div className="empty">No courses found.</div>
        ) : (
          filteredCourses.map(course => {
            const isEnrolled = enrolledCourses.has(course.id);
            return (
              <div
                className="box"
                key={course.id}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(course.id)}
                onKeyPress={(event) => {
                  if (event.key === 'Enter') handleCardClick(course.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="relative mb-4">
                  <img
                    src={resolveThumb(course)}
                    alt={course.name}
                    className="thumb"
                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '0.75rem' }}
                    loading="lazy"
                  />
                  {isEnrolled && (
                    <span className="absolute top-3 left-3 bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                      Enrolled
                    </span>
                  )}
                </div>
                <div className="title">{course.name}</div>
                <div style={{ color: '#8892b0', marginBottom: '0.5rem' }}>{course.subtitle}</div>
                <div style={{ marginBottom: '1rem', color: '#94a3b8' }}>{course.description}</div>
                <div style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#14b8a6' }}>
                  {course.lessons} lessons &bull; {course.duration || 'Self-paced'}
                </div>
                <button
                  className={`inline-btn${isEnrolled ? ' tutor' : ''}`}
                  onClick={e => handleEnroll(course.id, e)}
                  aria-label={`Enroll in ${course.name}`}
                  disabled={isEnrolled}
                  style={{ marginTop: 'auto' }}
                >
                  {isEnrolled ? 'Enrolled' : 'Enroll'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default React.memo(Courses);
