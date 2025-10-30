import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { useAuth } from './context/AuthContext';
import api from './api';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const resolveImage = (image) => {
  if (!image) return '/images/pic-2.jpg';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/uploaded_files')) return `${FILE_BASE_URL}${image}`;
  return `${FILE_BASE_URL}/uploaded_files/${image}`;
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();

  const userType = user?.userType || null;

  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated) {
      toast.error('Please login to view students');
      navigate('/login', { replace: true });
      return;
    }

    if (userType !== 'Admin') {
      toast.error('Access restricted to administrators.');
      navigate('/home', { replace: true });
      return;
    }

    setLoading(true);
    api.get('/students')
      .then(({ data }) => {
        const payload = Array.isArray(data) ? data : [];
        setStudents(payload);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load students');
        setLoading(false);
      });
  }, [initializing, isAuthenticated, userType, navigate]);

  const filteredStudents = useMemo(() => {
    const term = search.toLowerCase();
    return students.filter(student =>
      student.name.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term)
    );
  }, [students, search]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  if (loading) {
    return <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" size={32} /></div>;
  }

  return (
    <section className="students">
      <h1 className="heading">All Students</h1>
      <form className="search-student" onSubmit={handleSearch} autoComplete="off">
        <input
          type="text"
          name="search_student"
          maxLength="100"
          placeholder="Search student..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="fas fa-search"></button>
      </form>
      <div className="overflow-x-auto mt-8">
        <table className="min-w-full bg-[#1a1d2e] text-white rounded-xl shadow-lg">
          <thead>
            <tr className="bg-teal-700 text-white">
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Enrolled Courses</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student._id} className="border-b border-gray-700">
                <td className="px-4 py-2">
                  <img src={resolveImage(student.image)} alt="profile" className="w-12 h-12 object-cover rounded-lg" />
                </td>
                <td className="px-4 py-2 font-bold">{student.name}</td>
                <td className="px-4 py-2">{student.email}</td>
                <td className="px-4 py-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600">{student.enrolledCourses?.length || 0}</span>
                  {student.enrolledCourses && student.enrolledCourses.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-300">
                      {student.enrolledCourses.map((course, idx) => (
                        <li key={idx}>{course}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => navigate(`/students/${student._id}`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all duration-300">View</button>
                  <button onClick={() => toast.info('Delete functionality coming soon!')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all duration-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Students;
