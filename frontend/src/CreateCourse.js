import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { ClipLoader } from 'react-spinners';

function CreateCourse() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  let userType = null;
  if (token) {
    try {
      userType = jwtDecode(token).userType;
    } catch {}
  }
  if (userType !== 'Admin') {
    toast.error('Access denied. Admins only.');
    navigate('/login');
    return null;
  }

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumb, setThumb] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (thumb) formData.append('thumb', thumb);
    try {
      const res = await fetch('/api/courses/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Course created successfully!');
        setTitle('');
        setDescription('');
        setThumb(null);
        setTimeout(() => navigate('/courses'), 1200);
      } else {
        toast.error(data.error || 'Failed to create course');
      }
    } catch (err) {
      toast.error('Error creating course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-[#1a1d2e] p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-teal-400 mb-6">Create New Course</h2>
        <label className="block mb-4 text-white font-semibold" htmlFor="title">Course Title</label>
        <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-teal-400" aria-label="Course Title" />
        <label className="block mb-4 text-white font-semibold" htmlFor="description">Description</label>
        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-teal-400" aria-label="Course Description" />
        <label className="block mb-4 text-white font-semibold" htmlFor="thumb">Thumbnail</label>
        <input id="thumb" type="file" accept="image/*" onChange={e => setThumb(e.target.files[0])} className="w-full mb-6 text-white" aria-label="Course Thumbnail" />
        <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all duration-300" disabled={loading} aria-label="Create Course">
          {loading ? <ClipLoader color="#fff" size={24} /> : 'Create Course'}
        </button>
      </form>
    </div>
  );
}

export default CreateCourse;
