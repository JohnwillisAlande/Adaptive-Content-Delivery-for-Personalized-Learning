


import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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
      await axios.post('http://localhost:5000/api/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        (err.response?.data ? JSON.stringify(err.response.data) : '') ||
        err.message ||
        'Registration failed'
      );
    }
  };

  return (
    <section className="form-screen">
      <form
        className="form-card form-card--wide"
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        autoComplete="off"
      >
        <h2 className="form-card__title">Create your ApexLearn account</h2>
        <p className="form-card__subtitle">
          Select who you are registering as and complete the quick form to get started.
        </p>

        <div className="form-tab-group" role="radiogroup" aria-label="Select user type">
          <label>
            <input
              type="radio"
              name="userType"
              value="Student"
              checked={userType === 'Student'}
              onChange={handleUserTypeChange}
              aria-label="Sign up as Student option"
            />
            <span>Sign up as Student</span>
          </label>
          <label>
            <input
              type="radio"
              name="userType"
              value="Teacher"
              checked={userType === 'Teacher'}
              onChange={handleUserTypeChange}
              aria-label="Sign up as Teacher option"
            />
            <span>Sign up as Teacher</span>
          </label>
        </div>

        <div className="form-row">
          <div>
            <label htmlFor="register-name">
              Your name <span className="required-indicator">*</span>
            </label>
            <input
              id="register-name"
              type="text"
              name="name"
              placeholder="Amani Havi"
              maxLength={50}
              required
              value={form.name}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="register-email">
              Your email <span className="required-indicator">*</span>
            </label>
            <input
              id="register-email"
              type="email"
              name="email"
              placeholder="amanihavi@gmail.com"
              maxLength={40}
              required
              value={form.email}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="form-row">
          <div>
            <label htmlFor="register-pass">
              Your password <span className="required-indicator">*</span>
            </label>
            <input
              id="register-pass"
              type="password"
              name="pass"
              placeholder="Enter your password"
              maxLength={20}
              required
              value={form.pass}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="register-confirm">
              Confirm password <span className="required-indicator">*</span>
            </label>
            <input
              id="register-confirm"
              type="password"
              name="cpass"
              placeholder="Confirm your password"
              maxLength={20}
              required
              value={form.cpass}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-image">
            Select profile picture <span className="required-indicator">*</span>
          </label>
          <input
            id="register-image"
            type="file"
            name="image"
            accept="image/*"
            required
            onChange={handleChange}
          />
        </div>

        {error && <div className="form-message error">{error}</div>}
        {success && <div className="form-message success">{success}</div>}

        <div className="form-link">
          Already have an account? <Link to="/login">Login now</Link>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            name="submit"
            className="btn"
          >
            Register now
          </button>
        </div>
      </form>
    </section>
  );
}

export default Register;
