import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import './App.css';
import { useAuth } from './context/AuthContext';
import api from './api';

const defaultStory = {
  title: 'Learning without limits',
  description: 'AdaptiveEduApp blends personalisation, community, and rigorous content so every learner can progress with confidence.',
  mission: 'Empower students and educators through adaptive pathways, actionable insights, and delightful tooling.',
  vision: 'Create the most trusted companion for lifelong learning across classrooms, teams, and communities.'
};

function About() {
  const [about, setAbout] = useState({ title: '', description: '', mission: '', vision: '' });
  const [loading, setLoading] = useState(true);
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
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
    setLoading(false);
  };

  const story = useMemo(() => {
    return {
      title: about.title || defaultStory.title,
      description: about.description || defaultStory.description,
      mission: about.mission || defaultStory.mission,
      vision: about.vision || defaultStory.vision
    };
  }, [about]);

  const stats = [
    { label: 'Learners Impacted', value: '12k+', icon: 'fas fa-user-graduate' },
    { label: 'Courses Curated', value: '320+', icon: 'fas fa-layer-group' },
    { label: 'Avg. Satisfaction', value: '4.8/5', icon: 'fas fa-star' }
  ];

  const timeline = [
    { title: 'Founding Spark', copy: 'We began by pairing adaptive recommendations with tutor-led cohorts for local schools.' },
    { title: 'Platform Launch', copy: 'The full MERN experience unlocked hybrid classrooms, live uploads, and data-rich dashboards.' },
    { title: 'Today & Beyond', copy: 'We continue to weave AI, learning science, and human mentorship so every learner thrives.' }
  ];

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

  return (
    <section className="about about--immersive">
      <div className="about-hero">
        <div className="about-hero__glow" aria-hidden="true" />
        <p className="about-hero__eyebrow">Our story</p>
        <h1 className="about-hero__title">{story.title}</h1>
        <p className="about-hero__copy">{story.description}</p>
        <div className="about-hero__cta">
          <span>Building the future of adaptive learning</span>
          <i className="fas fa-arrow-trend-up" />
        </div>
      </div>

      <div className="about-panels">
        <article className="about-panel">
          <h3>Our Mission</h3>
          <p>{story.mission}</p>
        </article>
        <article className="about-panel">
          <h3>Our Vision</h3>
          <p>{story.vision}</p>
        </article>
      </div>

      <div className="about-stats">
        {stats.map((item) => (
          <div key={item.label} className="about-stat-card">
            <i className={item.icon} aria-hidden="true" />
            <span className="about-stat-card__value">{item.value}</span>
            <span className="about-stat-card__label">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="about-timeline">
        {timeline.map((node, index) => (
          <div key={node.title} className="about-timeline__node">
            <span className="about-timeline__dot" />
            <div className="about-timeline__content">
              <p className="about-timeline__step">
                Step {index + 1}
              </p>
              <h4>{node.title}</h4>
              <p>{node.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default About;
