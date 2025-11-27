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
    <section className="form-screen form-screen--plain">
      <form
        className="form-card"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <h2 className="form-card__title">Set a new password</h2>
        <p className="form-card__subtitle">Create a strong password you have not used before.</p>

        <div>
          <label htmlFor="new-pass">
            New password <span className="required-indicator">*</span>
          </label>
          <input
            id="new-pass"
            type="password"
            name="pass"
            placeholder="Enter new password"
            required
            value={pass}
            onChange={e => setPass(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="new-confirm">
            Confirm password <span className="required-indicator">*</span>
          </label>
          <input
            id="new-confirm"
            type="password"
            name="cpass"
            placeholder="Confirm new password"
            required
            value={cpass}
            onChange={e => setCpass(e.target.value)}
          />
        </div>

        {error && <div className="form-message error">{error}</div>}
        {success && <div className="form-message success">{success}</div>}

        <div className="form-actions">
          <button type="submit" className="btn">
            Reset password
          </button>
        </div>

        <div className="form-link">
          <Link to="/forgot-password">Back to forgot password</Link>
        </div>
      </form>
    </section>
  );
}

export default NewPassword;
