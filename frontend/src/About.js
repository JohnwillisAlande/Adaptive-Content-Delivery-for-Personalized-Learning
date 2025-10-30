import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import './App.css';
import { useAuth } from './context/AuthContext';
import api from './api';

function About() {
  const [about, setAbout] = useState({ title: '', description: '', mission: '', vision: '' });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const { user, initializing } = useAuth();

  const userType = user?.userType || '';

  useEffect(() => {
    if (initializing) return;
    api.get('/about')
      .then(({ data }) => {
        setAbout(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load About Us');
        setLoading(false);
      });
  }, [initializing]);

  const handleChange = e => {
    setAbout({ ...about, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/about', about);
      toast.success('About Us updated!');
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
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
        <div className="form-screen form-screen--plain form-screen--stacked">
          <form className="form-card form-card--wide" onSubmit={handleSubmit}>
            <h2 className="form-card__title form-card__title--left">Update your organisation story</h2>
            <p className="form-card__subtitle form-card__subtitle--left">
              Keep the public-facing copy current so students, guardians, and partners always understand your mission.
            </p>

            <div>
              <label htmlFor="about-title">
                Title <span className="required-indicator">*</span>
              </label>
              <input
                id="about-title"
                type="text"
                name="title"
                value={about.title}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="about-description">
                Description <span className="required-indicator">*</span>
              </label>
              <textarea
                id="about-description"
                name="description"
                value={about.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>
            <div>
              <label htmlFor="about-mission">
                Mission <span className="required-indicator">*</span>
              </label>
              <textarea
                id="about-mission"
                name="mission"
                value={about.mission}
                onChange={handleChange}
                rows={3}
                required
              />
            </div>
            <div>
              <label htmlFor="about-vision">
                Vision <span className="required-indicator">*</span>
              </label>
              <textarea
                id="about-vision"
                name="vision"
                value={about.vision}
                onChange={handleChange}
                rows={3}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn">
                Save changes
              </button>
            </div>
          </form>
        </div>
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
