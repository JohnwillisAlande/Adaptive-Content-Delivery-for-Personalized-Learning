import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import './App.css';


function About() {
  const [about, setAbout] = useState({ title: '', description: '', mission: '', vision: '' });
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setUserType(jwtDecode(token).userType);
      } catch {}
    }
    fetch('/api/about', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        setAbout(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load About Us');
        setLoading(false);
      });
  }, []);

  const handleChange = e => {
    setAbout({ ...about, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/about', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(about)
      });
      if (res.ok) {
        toast.success('About Us updated!');
        setEditMode(false);
      } else {
        toast.error('Update failed');
      }
    } catch {
      toast.error('Update failed');
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><ClipLoader color="#14b8a6" size={32} /></div>;
  }

  if (userType === 'Admin') {
    return (
      <section className="about">
        <h1 className="heading">About Us (Admin)</h1>
        <form className="about-form max-w-xl mx-auto bg-[#1a1d2e] p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          <label className="block mb-2 font-bold text-teal-400">Title</label>
          <input type="text" name="title" value={about.title} onChange={handleChange} className="w-full mb-4 p-2 rounded bg-[#23263a] text-white" required />
          <label className="block mb-2 font-bold text-teal-400">Description</label>
          <textarea name="description" value={about.description} onChange={handleChange} className="w-full mb-4 p-2 rounded bg-[#23263a] text-white" rows={3} required />
          <label className="block mb-2 font-bold text-teal-400">Mission</label>
          <textarea name="mission" value={about.mission} onChange={handleChange} className="w-full mb-4 p-2 rounded bg-[#23263a] text-white" rows={2} required />
          <label className="block mb-2 font-bold text-teal-400">Vision</label>
          <textarea name="vision" value={about.vision} onChange={handleChange} className="w-full mb-4 p-2 rounded bg-[#23263a] text-white" rows={2} required />
          <button type="submit" className="w-full py-2 mt-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded transition-all duration-300">Save Changes</button>
        </form>
      </section>
    );
  }

  // Non-admin: read-only view
  return (
    <section className="about">
      <h1 className="heading">About Us</h1>
      <div className="about-content max-w-xl mx-auto bg-[#1a1d2e] p-8 rounded-xl shadow-lg">
        <h2 className="text-teal-400 text-xl font-bold mb-2">{about.title}</h2>
        <p className="mb-4 text-gray-200">{about.description}</p>
        <h3 className="text-teal-300 font-bold">Our Mission</h3>
        <p className="mb-4 text-gray-200">{about.mission}</p>
        <h3 className="text-teal-300 font-bold">Our Vision</h3>
        <p className="mb-4 text-gray-200">{about.vision}</p>
      </div>
    </section>
  );
}

export default About;
