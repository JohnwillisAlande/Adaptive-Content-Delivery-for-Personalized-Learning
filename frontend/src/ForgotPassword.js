// Mirrors forgot_password.php email submission
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    <section className="form-screen form-screen--plain">
      <form
        className="form-card"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <h2 className="form-card__title">Forgot password?</h2>
        <p className="form-card__subtitle">Enter the email linked to your account and we&apos;ll send you a secure reset link.</p>

        <div>
          <label htmlFor="forgot-email">
            Email address <span className="required-indicator">*</span>
          </label>
          <input
            id="forgot-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {error && <div className="form-message error">{error}</div>}
        {success && <div className="form-message success">{success}</div>}

        <div className="form-actions">
          <button type="submit" className="btn">
            Send reset link
          </button>
        </div>

        <div className="form-link">
          <Link to="/login">Back to login</Link>
        </div>
      </form>
    </section>
  );
}

export default ForgotPassword;
