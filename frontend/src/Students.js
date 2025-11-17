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
    api.get('/admin/students')
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
      <div className="admin-students-board">
        {filteredStudents.map(student => (
          <article
            key={student.id}
            className="admin-student-row"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/admin/students/${student.id}`)}
            onKeyPress={(event) => {
              if (event.key === 'Enter') navigate(`/admin/students/${student.id}`);
            }}
          >
            <div className="admin-student-row__identity">
              <img src={resolveImage(student.image)} alt={student.name} />
              <div>
                <h3>{student.name}</h3>
                <p>{student.email}</p>
                <span className={`status-dot${student.online ? ' status-dot--online' : ''}`}>
                  {student.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="admin-student-row__metrics">
              <div>
                <span>Learning Style</span>
                <strong>{student.learningStyleLabel || 'Not predicted'}</strong>
              </div>
              <div>
                <span>Courses Enrolled</span>
                <strong>{student.courseCount ?? 0}</strong>
              </div>
              <div>
                <span>Joined</span>
                <strong>{student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : '—'}</strong>
              </div>
            </div>
            <button
              type="button"
              className="inline-btn admin-student-row__cta"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/admin/students/${student.id}`);
              }}
            >
              View Profile
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Students;
