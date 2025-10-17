import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBook, FaCalculator, FaGlobeAfrica, FaLeaf, FaAppleAlt, FaPray, FaPaintBrush, FaArrowRight, FaTh, FaList, FaStar, FaClock, FaPlay } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';

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
  const [viewMode, setViewMode] = useState('grid');
  const [enrolledCourses, setEnrolledCourses] = useState(new Set());
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const navigate = useNavigate();
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    // Decode JWT to get userType
    const token = localStorage.getItem('token');
    if (token) {
      try {
  const decoded = jwtDecode(token);
        setUserType(decoded.userType);
      } catch (err) {
        setUserType(null);
      }
    }
    // Fetch courses for non-admins
    if (!token || userType !== 'Admin') {
      const fetchData = async () => {
        try {
          const coursesRes = await fetch('/api/courses', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (coursesRes.ok) {
            const coursesData = await coursesRes.json();
            const enrichedCourses = COURSE_LIST.map(localCourse => {
              const backendCourse = coursesData.find(bc => bc.id === localCourse.id);
              return { 
                ...localCourse, 
                ...(backendCourse || {}),
                isEnrolled: backendCourse?.isEnrolled || false
              };
            });
            setCourses(enrichedCourses);
            const enrolled = enrichedCourses
              .filter(c => c.isEnrolled)
              .map(c => c.id);
            setEnrolledCourses(new Set(enrolled));
          } else {
            setCourses(COURSE_LIST);
          }
        } catch (err) {
          setCourses(COURSE_LIST);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setLoading(false);
    }
  }, [userType]);

  const filteredCourses = useMemo(() => {
    let filtered = [...courses];
    
    if (activeTab === 'my') {
      filtered = courses.filter(c => enrolledCourses.has(c.id));
    } else if (activeTab === 'featured') {
      filtered = courses.filter(c => c.featured);
    }
    
    return filtered;
  }, [courses, activeTab, enrolledCourses]);

  const handleEnroll = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to enroll');
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`/api/courses/enroll/${courseId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (res.ok) {
        setEnrolledCourses(prev => new Set([...prev, courseId]));
        setCourses(prevCourses => 
          prevCourses.map(c => 
            c.id === courseId ? { ...c, isEnrolled: true } : c
          )
        );
        toast.success('Successfully enrolled!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Enrollment failed');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      toast.error('Enrollment failed. Please try again.');
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

  // Admin view: show two prominent buttons
  if (userType === 'Admin') {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center">
        <div className="w-full max-w-xl mx-auto flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-center py-20">
          <button
            onClick={() => navigate('/courses/create')}
            className="flex-1 px-8 py-6 rounded-2xl bg-teal-600 text-white text-2xl font-bold shadow-lg hover:bg-teal-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-400"
            style={{ minWidth: 220 }}
          >
            Create New Course
          </button>
          <button
            onClick={() => navigate('/courses/modify')}
            className="flex-1 px-8 py-6 rounded-2xl bg-teal-600 text-white text-2xl font-bold shadow-lg hover:bg-teal-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-400"
            style={{ minWidth: 220 }}
          >
            Modify Course Material
          </button>
        </div>
        <style>{`
          @media (max-width: 768px) {
            .flex-col.md\:flex-row {
              flex-direction: column !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // ...existing code for non-admins (course grid)...
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* ...existing code for tabs, grid, etc... */}
    </div>
  );
}

export default React.memo(Courses);