// Mirrors forgot_password.php email submission
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      const res = await axios.post('/api/forgot-password', { email });
      if (res.data && res.data.success) {
        setSuccess('Reset link sent to your email.');
      } else {
        setError(res.data?.message || 'Email not found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email not found.');
    }
  };

  return (
    <div className="main-content" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        className="forgot-password-form"
        onSubmit={handleSubmit}
        autoComplete="off"
        style={{
          background: 'var(--white)',
          borderRadius: '.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          padding: '2.5rem 2.5rem 2rem 2.5rem',
          width: '100%',
          maxWidth: '400px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}
      >
        <h3 style={{ textAlign: 'center', fontWeight: 700, fontSize: '2rem', color: '#fff', background: 'var(--main-color)', padding: '1rem', borderRadius: '.5rem' }}>Forgot Password?</h3>
        <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
          Email Address
        </label>
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ border: '1px solid #4a5568', borderRadius: '4px', outline: 'none', background: 'var(--light-bg)', color: 'var(--black)', width: '100%', boxSizing: 'border-box', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}
        />
        {error && <div className="error" style={{ color: 'var(--red)', fontSize: '1rem', marginBottom: '.5rem', textAlign: 'center' }}>{error}</div>}
        {success && <div className="success" style={{ color: 'var(--main-color)', fontSize: '1rem', marginBottom: '.5rem', textAlign: 'center' }}>{success}</div>}
        <button
          type="submit"
          className="btn"
          style={{ background: '#00a085', color: '#fff', borderRadius: '.5rem', fontWeight: 700, fontSize: '1.1rem', width: '100%', padding: '1rem', marginTop: '.5rem' }}
        >
          Send Reset Link
        </button>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/login" style={{ color: '#00a085', textDecoration: 'underline', fontWeight: 600 }}>Back to Login</Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;
