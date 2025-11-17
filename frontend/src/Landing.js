import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChalkboardTeacher, FaAward, FaUsers, FaBookOpen, FaBolt } from 'react-icons/fa';

const features = [
  {
    icon: <FaChalkboardTeacher />,
    title: 'Adaptive Pathways',
    copy: 'Lessons rearrange to match each learner’s pace, cognitive preference, and completion streaks.'
  },
  {
    icon: <FaAward />,
    title: 'Gamified Motivation',
    copy: 'XP, badges, streaks, and daily goals keep momentum high while surfacing meaningful mastery moments.'
  },
  {
    icon: <FaBookOpen />,
    title: 'Deep Content Studio',
    copy: 'Teachers upload rich multimedia lessons, flashcards, quizzes, and outlines in minutes.'
  },
  {
    icon: <FaUsers />,
    title: 'Community Insights',
    copy: 'Likes, discussions, and completion dashboards help cohorts learn together and stay accountable.'
  }
];

const testimonials = [
  {
    quote:
      'ApexLearn transformed our hybrid classrooms. The learning-style updates mean every student gets a path that fits them.',
    name: 'Ms. Kamau',
    role: 'Lead Educator, Nairobi STEM Hub'
  },
  {
    quote:
      'The gamification layer keeps our teams returning every day. XP, streaks, and badges are simple but incredibly powerful.',
    name: 'Jacob Otieno',
    role: 'Training Partner, FutureLabs'
  }
];

const stats = [
  { label: 'Learning paths optimized', value: 100, suffix: '+' },
  { label: 'Teacher uploads hosted', value: 50, suffix: '+' },
  { label: 'Average learner rating', value: 4.9, suffix: ' / 5', decimals: 1 }
];

function Landing() {
  const [typedTagline, setTypedTagline] = useState('');
  const [statValues, setStatValues] = useState(stats.map(() => 0));
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const tagline = 'Personalised learning for ambitious learners and teams.';

  useEffect(() => {
    let frame;
    const type = (index) => {
      if (index <= tagline.length) {
        setTypedTagline(tagline.slice(0, index));
        frame = requestAnimationFrame(() => type(index + 1));
      }
    };
    frame = requestAnimationFrame(() => type(1));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let start;
    const duration = 1800;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setStatValues(
        stats.map((stat) => {
          const target = stat.value;
          if (stat.decimals) {
            const current = (target * progress).toFixed(stat.decimals);
            return Number(current);
          }
          return Math.floor(target * progress);
        })
      );
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="landing-shell landing-shell--standalone">
      <section className="landing-hero">
        <p className="landing-hero__eyebrow">Welcome to ApexLearn</p>
        <h1>Welcome to ApexLearn</h1>
        <p className="landing-hero__sub">{typedTagline}</p>
        <p>
          ApexLearn blends adaptive intelligence, teacher-crafted materials, and motivation mechanics so every learner hits
          their stride. Predict, personalise, and celebrate progress from one immersive workspace.
        </p>
        <div className="landing-hero__cta">
          <Link to="/register" className="btn">
            Get started
          </Link>
        </div>
        <div className="landing-hero__stats">
          {stats.map((item, index) => (
            <div key={item.label}>
              <strong>
                {item.decimals
                  ? statValues[index].toFixed(item.decimals)
                  : statValues[index]}
                {item.suffix}
              </strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-grid">
        {features.map((feature, index) => (
          <article
            key={feature.title}
            className={`landing-card${index === activeFeature ? ' is-active' : ''}`}
            onMouseEnter={() => setActiveFeature(index)}
          >
            <div className="landing-card__icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="landing-highlight">
        <div>
          <h2>Intelligent, ML-informed personalisation</h2>
          <p>
            Every interaction—from video watch time to example clicks—feeds our feature engineering pipeline. When
            teachers or students tap <em>Update Style</em>, ApexLearn sends a rich 11-feature vector to your ML API,
            updating the learner profile instantly.
          </p>
        </div>
        <div className="landing-highlight__badge">
          <FaBolt />
          <span>Live learning-style predictions</span>
        </div>
      </section>

      <section className="landing-testimonials">
        <h2>Loved by modern learning teams</h2>
        <div className="landing-testimonials__grid">
          {testimonials.map((item, index) => (
            <article
              key={item.name}
              className={index === activeTestimonial ? 'is-active' : ''}
              onMouseEnter={() => setActiveTestimonial(index)}
            >
              <p>“{item.quote}”</p>
              <div>
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <h3>Ready to personalise your learning landscape?</h3>
          <p>
            Launch blended cohorts, track every second of engagement, and keep students motivated with XP-driven goals.
          </p>
        </div>
        <div className="landing-cta__actions">
          <Link to="/register" className="btn">
            Create free account
          </Link>
          <Link to="/login" className="landing-hero__ghost">
            I already have an account
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Landing;
