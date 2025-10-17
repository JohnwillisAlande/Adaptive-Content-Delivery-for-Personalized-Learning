// Mirrors new_password.php token-verified new password entry
import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';

function NewPassword() {
  const { token } = useParams();
  const [pass, setPass] = useState('');
  const [cpass, setCpass] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (pass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (pass !== cpass) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await axios.post('/api/new-password', { token, pass });
      setSuccess('Password reset successful!');
      setTimeout(() => navigate('/password-reset-success'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired token.');
      setTimeout(() => navigate('/forgot-password'), 2000);
    }
  };

  return (
    <div className="main-content" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        className="new-password-form"
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
        <h3 style={{ textAlign: 'center', fontWeight: 700, fontSize: '2rem', color: '#fff', background: 'var(--main-color)', padding: '1rem', borderRadius: '.5rem' }}>Enter New Password</h3>
        <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
          New Password
        </label>
        <input
          type="password"
          name="pass"
          placeholder="Enter new password"
          required
          value={pass}
          onChange={e => setPass(e.target.value)}
          style={{ border: '1px solid #4a5568', borderRadius: '4px', outline: 'none', background: 'var(--light-bg)', color: 'var(--black)', width: '100%', boxSizing: 'border-box', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}
        />
        <label style={{ fontSize: '1.1rem', color: 'var(--black)', fontWeight: 500, marginBottom: '.2rem', display: 'block' }}>
          Confirm Password
        </label>
        <input
          type="password"
          name="cpass"
          placeholder="Confirm new password"
          required
          value={cpass}
          onChange={e => setCpass(e.target.value)}
          style={{ border: '1px solid #4a5568', borderRadius: '4px', outline: 'none', background: 'var(--light-bg)', color: 'var(--black)', width: '100%', boxSizing: 'border-box', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}
        />
        {error && <div className="error" style={{ color: 'var(--red)', fontSize: '1rem', marginBottom: '.5rem', textAlign: 'center' }}>{error}</div>}
        {success && <div className="success" style={{ color: 'var(--main-color)', fontSize: '1rem', marginBottom: '.5rem', textAlign: 'center' }}>{success}</div>}
        <button
          type="submit"
          className="btn"
          style={{ background: '#00a085', color: '#fff', borderRadius: '.5rem', fontWeight: 700, fontSize: '1.1rem', width: '100%', padding: '1rem', marginTop: '.5rem' }}
        >
          Reset Password
        </button>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/forgot-password" style={{ color: '#00a085', textDecoration: 'underline', fontWeight: 600 }}>Back to Forgot Password</Link>
        </div>
      </form>
    </div>
  );
}

export default NewPassword;
