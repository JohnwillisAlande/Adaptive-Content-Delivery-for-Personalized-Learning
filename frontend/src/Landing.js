import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChalkboardTeacher, FaAward, FaUsers, FaBookOpen, FaBolt } from 'react-icons/fa';

const features = [
  {
    icon: <FaChalkboardTeacher />,
    title: 'Adaptive Pathways',
    copy: "Lessons rearrange to match each learner's pace, cognitive preference, and completion streaks."
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
  },
  {
    quote:
      'Our onboarding cohorts now complete twice as fast. The adaptive playlists and streak nudges keep every intern focused.',
    name: 'Elaine Njoroge',
    role: 'People Ops Lead, Mombasa Fintech'
  },
  {
    quote:
      'Teachers love how quickly we can upload multimodal lessons. The auto-tagging saves us hours every semester.',
    name: 'Dr. Achieng',
    role: 'Dean of Studies, Lumina University'
  },
  {
    quote:
      'The analytics dashboard finally gives us clarity on which materials resonate. That insight alone paid for the rollout.',
    name: 'Tony Wairimu',
    role: 'Program Director, BrightFuture Initiative'
  },
  {
    quote:
      'Students rave about the personalised paths and the XP system. Engagement has never been this consistent.',
    name: 'Fatma Khalid',
    role: 'Learning Experience Manager, EduGrowth Africa'
  },
  {
    quote:
      'With ApexLearn, we launch cross-continent cohorts without losing visibility. The ML signals tell us exactly who needs help.',
    name: 'Samuel Mburu',
    role: 'Global L&D Lead, NexaLabs'
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
  const [graphicTilt, setGraphicTilt] = useState({ x: 0, y: 0 });
  const [activeBar, setActiveBar] = useState(0);
  const [codeFocus, setCodeFocus] = useState(0);
  const [orbitStep, setOrbitStep] = useState(0);
  const tagline = 'Personalised learning for ambitious learners and teams.';
  const barHeights = [40, 58, 85, 52];
  const barPercents = [31, 47, 71, 59];
  const codeBlocks = [
    { keyword: 'while', value: 'learning' },
    { keyword: 'if', value: 'doing' },
    { keyword: 'keep', value: 'growing' },
    { keyword: 'else', value: 'bummer' }
  ];
  const orbitWaypoints = [
    { x: 0, y: 0 },
    { x: -90, y: 34 },
    { x: -170, y: -8 },
    { x: -250, y: 22 }
  ];
  const axisTicks = Array.from({ length: 11 });

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
  }, [tagline]);

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

  useEffect(() => {
    const ticker = setInterval(() => {
      setActiveBar((prev) => (prev + 1) % barHeights.length);
      setCodeFocus((prev) => (prev + 1) % codeBlocks.length);
      setOrbitStep((prev) => (prev + 1) % orbitWaypoints.length);
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(ticker);
  }, [barHeights.length, codeBlocks.length, orbitWaypoints.length]);

  const handleGraphicMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    setGraphicTilt({ x: -(offsetY * 6), y: offsetX * 6 });
  };

  const resetGraphicTilt = () => setGraphicTilt({ x: 0, y: 0 });

  return (
    <div className="landing-shell landing-shell--standalone">
      <section className="landing-hero">
        <h1>Welcome to ApexLearn</h1>
        <div
          className="learn-visual"
          onMouseMove={handleGraphicMove}
          onMouseLeave={resetGraphicTilt}
          style={{ transform: `perspective(1200px) rotateX(${graphicTilt.x}deg) rotateY(${graphicTilt.y}deg)` }}
        >
          <div className="learn-visual__halo" aria-hidden="true" />
          <div className="learn-visual__board">
            <div className="learn-visual__axis learn-visual__axis--top">
              {axisTicks.map((_, index) => (
                <span key={`top-${index}`} />
              ))}
            </div>
            <div className="learn-visual__axis learn-visual__axis--bottom">
              {axisTicks.map((_, index) => (
                <span key={`bottom-${index}`} />
              ))}
            </div>
            <div className="learn-visual__bars">
              <div className="learn-visual__dial">
                <div className="learn-visual__dial-eye" />
              </div>
              {barHeights.map((height, index) => (
                <span
                  key={`bar-${index}`}
                  style={{ height: `${height}%` }}
                  className={index === activeBar ? 'is-active' : ''}
                  onMouseEnter={() => setActiveBar(index)}
                />
              ))}
              <div className="learn-visual__bars-indicator">{barPercents[activeBar]}%</div>
            </div>
            <div className="learn-visual__title">
              <span>Learn</span>
              <span>by</span>
              <span>doing</span>
            </div>
            <div className="learn-visual__code">
              {codeBlocks.map((snippet, index) => (
                <button
                  key={snippet.keyword}
                  type="button"
                  className={index === codeFocus ? 'is-active' : ''}
                  onMouseEnter={() => setCodeFocus(index)}
                >
                  <span>{snippet.keyword}</span>
                  <span>{snippet.value}</span>
                </button>
              ))}
            </div>
            <div className="learn-visual__dots" aria-hidden="true" />
            <div className="learn-visual__orbit">
              <div className="learn-visual__orbit-line" />
              <div
                className="learn-visual__orbit-dot"
                style={{
                  transform: `translate(${orbitWaypoints[orbitStep].x}px, ${orbitWaypoints[orbitStep].y}px)`
                }}
              />
            </div>
            <div className="learn-visual__sine">
              <svg viewBox="0 0 120 40" preserveAspectRatio="none">
                <path d="M0,20 C20,5 40,35 60,20 C80,5 100,35 120,20" />
              </svg>
              <span className="learn-visual__sine-dot" />
            </div>
          </div>
        </div>
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
                {item.decimals ? statValues[index].toFixed(item.decimals) : statValues[index]}
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
            Every interaction - from video watch time to example clicks - feeds our feature engineering pipeline. When teachers
            or students tap <em>Update Style</em>, ApexLearn sends a rich 11-feature vector to your ML API, updating the learner
            profile instantly.
          </p>
        </div>
        <div className="landing-highlight__badge">
          <FaBolt />
          <span>Live learning-style predictions</span>
        </div>
      </section>

      <section className="landing-testimonials">
        <h2>Loved by modern learning teams</h2>
        <div className="landing-testimonials__carousel">
          <button
            type="button"
            aria-label="Previous testimonial"
            className="landing-testimonials__nav"
            onClick={() =>
              setActiveTestimonial(
                (activeTestimonial - 1 + testimonials.length) % testimonials.length
              )
            }
          >
            ‹
          </button>
          <div className="landing-testimonials__viewport">
            {testimonials.map((item, index) => {
              const offset = (index - activeTestimonial + testimonials.length) % testimonials.length;
              const positionClass =
                offset === 0
                  ? 'is-center'
                  : offset === 1
                  ? 'is-right'
                  : offset === testimonials.length - 1
                  ? 'is-left'
                  : 'is-hidden';
              return (
                <article key={item.name} className={`testimonial-card ${positionClass}`}>
                  <p>"{item.quote}"</p>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </article>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Next testimonial"
            className="landing-testimonials__nav"
            onClick={() => setActiveTestimonial((activeTestimonial + 1) % testimonials.length)}
          >
            ›
          </button>
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
