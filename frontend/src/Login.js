import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';  // Changed to useGoogleLogin hook
import { jwtDecode } from "jwt-decode";

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('Student');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUserTypeChange = e => {
    setUserType(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!['Student', 'Teacher', 'Admin'].includes(userType)) {
      toast.error('Please select a user type.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/login', { email, password, userType });
      const token = res.data.token;
      localStorage.setItem('token', token);
      const decoded = jwtDecode(token);
      if (res.data.require2fa) {
        navigate('/2fa');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect email or password!');
    }
  };

  // Social logins (only for Student/Teacher)
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      if (userType === 'Admin') {
        toast.error('Admin login does not support Google login.');
        return;
      }
      try {
        const res = await axios.post('http://localhost:5000/api/auth/google', {
          token: tokenResponse.access_token,
          userType
        });
        const token = res.data.token;
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        if (res.data.require2fa) {
          navigate('/2fa');
        } else {
          navigate('/home');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Google login failed!');
      }
    },
    onError: () => {
      setError('Google login failed. Please try again.');
    },
    flow: 'auth-code',
    scope: 'profile email'
  });

  const handleGithubLogin = () => {
    if (userType === 'Admin') {
      toast.error('Admin login does not support GitHub login.');
      return;
    }
    window.location.href = `http://localhost:5000/api/auth/github?userType=${userType}`;
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  // (Removed duplicate handleGithubLogin)

  return (
    <section className="form-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="login" style={{ maxWidth: 400, width: '100%', background: 'var(--white)', borderRadius: '.5rem', padding: '2rem', boxShadow: '0 2px 8px rgba(44,62,80,0.04)' }}>
        {/* User type selection */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
          <label>
            <input
              type="radio"
              name="userType"
              value="Student"
              checked={userType === 'Student'}
              onChange={handleUserTypeChange}
              aria-label="Login as Student option"
              style={{ marginRight: '0.5rem' }}
            />
            Login as Student
          </label>
          <label>
            <input
              type="radio"
              name="userType"
              value="Teacher"
              checked={userType === 'Teacher'}
              onChange={handleUserTypeChange}
              aria-label="Login as Teacher option"
              style={{ marginRight: '0.5rem' }}
            />
            Login as Teacher
          </label>
          <label>
            <input
              type="radio"
              name="userType"
              value="Admin"
              checked={userType === 'Admin'}
              onChange={handleUserTypeChange}
              aria-label="Login as Admin option"
              style={{ marginRight: '0.5rem' }}
            />
            Login as Admin
          </label>
        </div>
        {/* ...existing form fields for email, password, links, error, submit... */}
        <p style={{ textAlign: 'left', marginBottom: '.5rem', color: 'var(--black)', fontSize: '1.2rem' }}>Your email <span style={{ color: 'var(--red)' }}>*</span></p>
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          maxLength={50}
          required
          className="box"
          style={{ marginBottom: '1rem' }}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <p style={{ textAlign: 'left', marginBottom: '.5rem', color: 'var(--black)', fontSize: '1.2rem' }}>Your password <span style={{ color: 'var(--red)' }}>*</span></p>
        <input
          type="password"
          name="pass"
          placeholder="Enter your password"
          maxLength={20}
          required
          className="box"
          style={{ marginBottom: '1rem' }}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <p className="link" style={{ textAlign: 'left', margin: 0, fontSize: '1rem', color: 'var(--black)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--main-color)', textDecoration: 'underline' }}>Register now</Link>
        </p>
        <p style={{ textAlign: 'right', margin: '0 0 1rem 0', fontSize: '1rem' }}>
          <Link to="/forgot-password" style={{ color: '#00a085', textDecoration: 'underline', fontWeight: 600 }}>Forgot Password?</Link>
        </p>
        {error && <div className="error" style={{ color: 'var(--red)', marginBottom: '1rem', fontSize: '1rem' }}>{error}</div>}
        <input type="submit" name="submit" value="Login now" className="btn" style={{ marginTop: '1.5rem' }} />

        {/* Social Logins */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--gray)' }}>Or continue with</p>
          <button
            onClick={() => googleLogin()}
            disabled={userType === 'Admin'}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'white',
              color: '#4285f4',
              border: '1px solid #dadce0',
              borderRadius: '4px',
              cursor: userType === 'Admin' ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: userType === 'Admin' ? 0.5 : 1
            }}
            aria-label="Sign in with Google"
          >
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style={{ width: '18px', height: '18px' }} />
            Sign in with Google
          </button>
          <button
            onClick={handleGithubLogin}
            disabled={userType === 'Admin'}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              background: '#24292e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: userType === 'Admin' ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: userType === 'Admin' ? 0.5 : 1
            }}
            aria-label="Sign in with GitHub"
          >
            Sign in with GitHub
          </button>
        </div>
      </form>
    </section>
  );
}

export default Login;