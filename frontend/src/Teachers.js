import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import './App.css';
import { useAuth } from './context/AuthContext';
import api from './api';

const FILE_BASE_URL = process.env.REACT_APP_FILE_BASE_URL || 'http://localhost:5000';
const resolveImage = (image) => {
  if (!image) return '/images/pic-2.jpg';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/uploaded_files')) return `${FILE_BASE_URL}${image}`;
  return `${FILE_BASE_URL}/uploaded_files/${image}`;
};

const Teachers = () => {
  const [tutors, setTutors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthenticated, initializing } = useAuth();

  const userType = user?.userType || null;
  const filteredTutors = useMemo(() => {
    const term = search.toLowerCase();
    return tutors.filter(tutor =>
      tutor.name.toLowerCase().includes(term) ||
      tutor.email.toLowerCase().includes(term)
    );
  }, [tutors, search]);

  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated) {
      toast.error('Please login to view teachers');
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    api.get('/teachers')
      .then(({ data }) => {
        setTutors(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load teachers');
        setLoading(false);
      });
  }, [initializing, isAuthenticated, navigate]);

  const handleToggleActive = async (id, active) => {
    try {
      const { data } = await api.put(`/teachers/${id}/active`, { active: !active });
      toast.success(data.message || 'Status updated');
      setTutors(prev => prev.map(t => (t._id === id ? { ...t, active: !active } : t)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <section className="teachers">
      <h1 className="heading">Expert tutors</h1>
      <form action="#" className="search-tutor" onSubmit={e => e.preventDefault()} autoComplete="off">
        <input
          type="text"
          name="search_tutor"
          maxLength="100"
          placeholder="Search tutor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" name="search_tutor_btn" className="fas fa-search"></button>
      </form>
      {loading ? (
        <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" size={32} /></div>
      ) : userType === 'Admin' ? (
        <div className="overflow-x-auto mt-8">
          <table className="min-w-full bg-[#1a1d2e] text-white rounded-xl shadow-lg">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Profession</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTutors.map(tutor => (
                <tr key={tutor._id} className="border-b border-gray-700">
                  <td className="px-4 py-2">
                    <img src={resolveImage(tutor.image)} alt="profile" className="w-12 h-12 object-cover rounded-lg" />
                  </td>
                  <td className="px-4 py-2 font-bold">{tutor.name}</td>
                  <td className="px-4 py-2">{tutor.profession}</td>
                  <td className="px-4 py-2">{tutor.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${tutor.active ? 'bg-green-600' : 'bg-red-600'}`}>
                      {tutor.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <button onClick={() => navigate(`/teachers/${tutor._id}`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all duration-300">View</button>
                    <button
                      onClick={() => handleToggleActive(tutor._id, tutor.active)}
                      className={`px-4 py-2 ${tutor.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-bold transition-all duration-300`}
                    >
                      {tutor.active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="box-container">
          <div className="box offer">
            <h3>Become a tutor</h3>
            <p>Share your expertise and inspire learners by joining our <br />platform as a tutor. Help students achieve their goals and <br />grow your professional network.</p>
            <a href="/admin/register" className="inline-btn">Get started</a>
          </div>
          {filteredTutors.length === 0 ? (
            <p className="empty">No tutors found!</p>
          ) : (
            filteredTutors.map(tutor => (
              <div className="box" key={tutor._id}>
                <div className="tutor">
                  <img src={resolveImage(tutor.image)} alt="" />
                  <div>
                    <h3>{tutor.name}</h3>
                    <span>{tutor.profession}</span>
                  </div>
                </div>
                <form action="#" method="post" onSubmit={e => { e.preventDefault(); navigate('/tutor_profile', { state: { tutor_email: tutor.email } }); }}>
                  <input type="hidden" name="tutor_email" value={tutor.email} />
                  <input type="submit" value="view profile" name="tutor_fetch" className="inline-btn" />
                </form>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};

export default Teachers;
