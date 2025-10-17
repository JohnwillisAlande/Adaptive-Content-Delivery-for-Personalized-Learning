


import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    pass: '',
    cpass: '',
    image: null
  });
  const [userType, setUserType] = useState('Student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value, files } = e.target;
    setForm(f => ({
      ...f,
      [name]: files ? files[0] : value
    }));
  };

  const handleUserTypeChange = e => {
    setUserType(e.target.value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!['Student', 'Teacher'].includes(userType)) {
      toast.error('Please select Student or Teacher as user type.');
      return;
    }
    if (form.pass !== form.cpass) {
      setError('Confirm password does not match!');
      return;
    }
    if (!form.image) {
      setError('Please select a profile picture!');
      return;
    }
    const data = new FormData();
    data.append('name', form.name);
    data.append('email', form.email);
    data.append('password', form.pass);
    data.append('image', form.image);
    data.append('userType', userType);
    try {
      await axios.post('http://localhost:5000/api/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="register-main-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        className="register-form"
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        autoComplete="off"
        style={{
          background: 'var(--white)',
          borderRadius: '.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          padding: '2.5rem 2.5rem 2rem 2.5rem',
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}
      >
        {/* User type selection */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
          <label>
            <input
              type="radio"
              name="userType"
              value="Student"
              checked={userType === 'Student'}
              onChange={handleUserTypeChange}
              aria-label="Sign up as Student option"
              style={{ marginRight: '0.5rem' }}
            />
            Sign up as Student
          </label>
          <label>
            <input
              type="radio"
              name="userType"
              value="Teacher"
              checked={userType === 'Teacher'}
              onChange={handleUserTypeChange}
              aria-label="Sign up as Teacher option"
              style={{ marginRight: '0.5rem' }}
            />
            Sign up as Teacher
          </label>
        </div>
        {/* Remove green/teal outlines from all input fields in this form */}
        <style>{`
          .register-form input[type="text"],
          .register-form input[type="email"],
          .register-form input[type="password"],
          .register-form input[type="file"] {
            border: 1px solid var(--border, #ccc) !important;
            outline: none !important;
            box-shadow: none !important;
            transition: border-color 0.2s;
          }
          .register-form input[type="text"]:focus,
          .register-form input[type="email"]:focus,
          .register-form input[type="password"]:focus,
          .register-form input[type="file"]:focus {
            border: 1px solid #bbb !important;
            outline: none !important;
            box-shadow: none !important;
          }
        `}</style>
        <h3 style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '2.5rem',
          color: 'var(--black)',
          marginBottom: '1.5rem',
          letterSpacing: '.01em',
          textTransform: 'capitalize',
        }}>Create Account</h3>
        <div className="register-flex-row" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div className="register-col" style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
              Your name <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="Amani Havi"
              maxLength={50}
              required
              className="box"
              value={form.name}
              onChange={handleChange}
              autoComplete="off"
              style={{ marginBottom: '1.2rem' }}
            />
            <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
              Your password <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="password"
              name="pass"
              placeholder="Enter your password"
              maxLength={20}
              required
              className="box"
              value={form.pass}
              onChange={handleChange}
              autoComplete="new-password"
              style={{ marginBottom: '1.2rem' }}
            />
          </div>
          <div className="register-col" style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
              Your email <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="amanihavi@gmail.com"
              maxLength={40}
              required
              className="box"
              value={form.email}
              onChange={handleChange}
              autoComplete="off"
              style={{ marginBottom: '1.2rem' }}
            />
            <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
              Confirm password <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="password"
              name="cpass"
              placeholder="Confirm your password"
              maxLength={20}
              required
              className="box"
              value={form.cpass}
              onChange={handleChange}
              autoComplete="new-password"
              style={{ marginBottom: '1.2rem' }}
            />
          </div>
        </div>
        <div style={{ marginTop: '.5rem', marginBottom: '.5rem' }}>
          <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
            Select profile picture <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            type="file"
            name="image"
            accept="image/*"
            required
            className="box"
            onChange={handleChange}
            style={{ background: 'var(--light-bg)', padding: '1.1rem', fontSize: '1.1rem', borderRadius: '.5rem', border: 'none', width: '100%' }}
          />
        </div>
        <div className="link" style={{ textAlign: 'center', fontSize: '1.3rem', color: 'var(--main-color)', marginBottom: '.5rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--main-color)', textDecoration: 'underline', fontWeight: 600 }}>Login now</Link>
        </div>
        {error && <div className="error" style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--red)', fontSize: '1.1rem' }}>{error}</div>}
        {success && <div className="success" style={{ textAlign: 'center', color: 'var(--main-color)', marginBottom: '1rem', fontSize: '1.2rem' }}>{success}</div>}
        <input
          type="submit"
          name="submit"
          value="Register now"
          className="btn"
          style={{ width: '100%', borderRadius: '.5rem', fontWeight: 700, fontSize: '1.2rem', marginTop: '.5rem', background: 'var(--main-color)', color: '#fff', letterSpacing: '.01em' }}
        />
      </form>
    </div>
  );
}

export default Register;
