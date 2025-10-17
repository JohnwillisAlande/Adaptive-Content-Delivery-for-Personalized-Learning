import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import ClipLoader from 'react-spinners/ClipLoader';

const PAGE_SIZE = 10;

const CoursesDetail = React.memo(() => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [progress, setProgress] = useState(null);

  // Auth protection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to view course materials');
      navigate('/login');
    }
  }, [navigate]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/courses/${courseId}?page=${page}&search=${search}`);
      if (page === 1) {
        setMaterials(res.data.materials);
      } else {
        setMaterials(prev => [...prev, ...res.data.materials]);
      }
      setHasMore(res.data.materials.length === PAGE_SIZE);
      setProgress(res.data.progress);
    } catch (err) {
      toast.error('Failed to load materials');
    }
    setLoading(false);
  }, [courseId, page, search]);

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line
  }, [page, search]);

  const handleSearch = e => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/courses')}
          className="mr-4 p-2 rounded bg-gray-800 hover:bg-teal-600 focus:ring-2 focus:ring-teal-400"
          aria-label="Back to courses"
        >
          <FaArrowLeft className="text-teal-400" />
        </button>
        <h1 className="text-2xl font-bold text-teal-400">Course Materials</h1>
      </div>
      <input
        type="text"
        value={search}
        onChange={handleSearch}
        placeholder="Search materials..."
        className="mb-6 w-full max-w-md px-4 py-2 rounded bg-gray-800 text-white focus:ring-2 focus:ring-teal-400"
        aria-label="Search materials"
      />
      {progress !== null && (
        <div className="mb-4">
          <div className="text-sm mb-1">Your Progress</div>
          <div className="w-full bg-gray-700 rounded h-3">
            <div
              className="bg-teal-400 h-3 rounded"
              style={{ width: `${progress}%` }}
              aria-label={`Progress: ${progress}%`}
            />
          </div>
        </div>
      )}
      {loading && page === 1 ? (
        <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" /></div>
      ) : materials.length === 0 ? (
        <p className="text-center text-gray-400">No materials found.</p>
      ) : (
        <InfiniteScroll
          dataLength={materials.length}
          next={() => setPage(p => p + 1)}
          hasMore={hasMore}
          loader={<div className="flex justify-center py-6"><ClipLoader color="#14b8a6" /></div>}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {materials.map(mat => (
            <div
              key={mat._id || mat.id}
              className="relative group rounded-xl overflow-hidden shadow-lg bg-gray-900 focus:outline-none"
              tabIndex={0}
              aria-label={`View material: ${mat.title}`}
              style={{ minHeight: '220px' }}
            >
              <div className="w-full aspect-video bg-black">
                <img
                  src={mat.thumb || '/images/default-thumb.jpg'}
                  alt={`${mat.title} video thumbnail`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  style={{ aspectRatio: '16/9', background: 'transparent' }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <FaArrowLeft className="hidden" />
                  <span className="absolute top-2 left-2 bg-black bg-opacity-60 text-xs px-2 py-1 rounded text-white">{mat.title}</span>
                  <span className="absolute bottom-2 right-2 bg-teal-400 rounded-full p-2 shadow-lg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7L8 5z" fill="#14b8a6"/></svg>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </InfiniteScroll>
      )}
    </div>
  );
});

export default CoursesDetail;
