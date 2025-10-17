
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import './App.css';

const Teachers = () => {

  const [tutors, setTutors] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setUserType(jwtDecode(token).userType);
      } catch {}
    }
    axios.get('/api/teachers', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => {
        setTutors(res.data);
        setFilteredTutors(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);


  const handleSearch = (e) => {
    e.preventDefault();
    setFilteredTutors(
      tutors.filter(tutor =>
        tutor.name.toLowerCase().includes(search.toLowerCase()) ||
        tutor.email.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const handleToggleActive = async (id, active) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.put(`/api/teachers/${id}/active`, { active: !active }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success(res.data.message);
      setTutors(tutors => tutors.map(t => t._id === id ? { ...t, active: !active } : t));
      setFilteredTutors(filteredTutors => filteredTutors.map(t => t._id === id ? { ...t, active: !active } : t));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <section className="teachers">
      <h1 className="heading">Expert tutors</h1>
      <form action="#" method="post" className="search-tutor" onSubmit={handleSearch} autoComplete="off">
        <input
          type="text"
          name="search_tutor"
          maxLength="100"
          placeholder="Search tutor..."
          required
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
                    <img src={tutor.image ? `/uploaded_files/${tutor.image}` : '/images/pic-2.jpg'} alt="profile" className="w-12 h-12 object-cover rounded-lg" />
                  </td>
                  <td className="px-4 py-2 font-bold">{tutor.name}</td>
                  <td className="px-4 py-2">{tutor.profession}</td>
                  <td className="px-4 py-2">{tutor.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${tutor.active ? 'bg-green-600' : 'bg-red-600'}`}>{tutor.active ? 'Active' : 'Disabled'}</span>
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <button onClick={() => navigate(`/teachers/${tutor._id}`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all duration-300">View</button>
                    <button onClick={() => handleToggleActive(tutor._id, tutor.active)} className={`px-4 py-2 ${tutor.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-bold transition-all duration-300`}>
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
                  <img src={tutor.image ? `/uploaded_files/${tutor.image}` : '/images/pic-2.jpg'} alt="" />
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
