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
    return tutors.filter((tutor = {}) => {
      const name = tutor.name || '';
      const email = tutor.email || '';
      return name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
    });
  }, [tutors, search]);

  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated) {
      toast.error('Please login to view teachers');
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    const endpoint = userType === 'Admin' ? '/admin/teachers' : '/teachers';
    api.get(endpoint)
      .then(({ data }) => {
        setTutors(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        toast.error('Failed to load teachers');
      })
      .finally(() => setLoading(false));
  }, [initializing, isAuthenticated, navigate, userType]);

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
        <div className="admin-teachers-board">
          {filteredTutors.length === 0 ? (
            <p className="empty">No teachers found.</p>
          ) : (
            filteredTutors.map((tutor) => (
              <article
                key={tutor.id}
                className="admin-teacher-row"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/teachers/${tutor.id}`)}
                onKeyPress={(event) => {
                  if (event.key === 'Enter') navigate(`/admin/teachers/${tutor.id}`);
                }}
              >
                <div className="admin-teacher-row__identity">
                  <img src={resolveImage(tutor.image)} alt={tutor.name} />
                  <div>
                    <h3>{tutor.name}</h3>
                    <p>{tutor.email}</p>
                    <span className={`status-dot${tutor.online ? ' status-dot--online' : ''}`}>
                      {tutor.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="admin-teacher-row__metrics">
                  <div>
                    <span>Courses</span>
                    <strong>{tutor.courseCount ?? 0}</strong>
                  </div>
                  <div>
                    <span>Students</span>
                    <strong>{tutor.totalStudents ?? 0}</strong>
                  </div>
                  <div>
                    <span>Registered</span>
                    <strong>{tutor.registeredAt ? new Date(tutor.registeredAt).toLocaleDateString() : '—'}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-btn admin-teacher-row__cta"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/admin/teachers/${tutor.id}`);
                  }}
                >
                  View Profile
                </button>
              </article>
            ))
          )}
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
