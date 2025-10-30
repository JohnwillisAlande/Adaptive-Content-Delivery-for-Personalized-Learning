import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';  // Changed to useGoogleLogin hook
import { toast } from 'react-toastify';
import api from './api';
import { useAuth } from './context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('Student');
  const [error, setError] = useState('');
  const { login } = useAuth();
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
      const res = await api.post('/login', { email, password, userType });
      const token = res.data.token;
      await login(token);
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
        const res = await api.post('/auth/google', {
          token: tokenResponse.access_token,
          userType
        });
        const token = res.data.token;
        await login(token);
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
    <section className="form-screen">
      <form onSubmit={handleSubmit} className="form-card form-card--wide">
        <h2 className="form-card__title">Log in to ApexLearn</h2>
        <p className="form-card__subtitle">Choose the correct account type to unlock your personalised dashboard.</p>

        <div className="form-tab-group" role="radiogroup" aria-label="Select user type">
          <label>
            <input
              type="radio"
              name="userType"
              value="Student"
              checked={userType === 'Student'}
              onChange={handleUserTypeChange}
              aria-label="Login as Student option"
            />
            <span>Login as Student</span>
          </label>
          <label>
            <input
              type="radio"
              name="userType"
              value="Teacher"
              checked={userType === 'Teacher'}
              onChange={handleUserTypeChange}
              aria-label="Login as Teacher option"
            />
            <span>Login as Teacher</span>
          </label>
          <label>
            <input
              type="radio"
              name="userType"
              value="Admin"
              checked={userType === 'Admin'}
              onChange={handleUserTypeChange}
              aria-label="Login as Admin option"
            />
            <span>Login as Admin</span>
          </label>
        </div>

        <div>
          <label htmlFor="login-email">
            Your email <span className="required-indicator">*</span>
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            maxLength={50}
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="login-password">
            Your password <span className="required-indicator">*</span>
          </label>
          <input
            id="login-password"
            type="password"
            name="pass"
            placeholder="Enter your password"
            maxLength={20}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div className="form-link-row">
          <span className="form-link">
            Don't have an account? <Link to="/register">Register now</Link>
          </span>
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {error && <div className="form-message error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn" name="submit">
            Login now
          </button>
        </div>

        <div className="supporting-text">Or continue with</div>
        <div className="social-buttons">
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={userType === 'Admin'}
            className="social-button google"
            aria-label="Sign in with Google"
          >
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" width="18" height="18" />
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={userType === 'Admin'}
            className="social-button github"
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
