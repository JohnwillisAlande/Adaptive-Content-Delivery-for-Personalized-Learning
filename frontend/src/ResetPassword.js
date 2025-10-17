// Mirrors reset_password.php (transitional handler)
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ResetPassword() {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate immediate redirect to success (or error handling)
    const timer = setTimeout(() => {
      navigate('/password-reset-success');
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="main-content" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--white)', borderRadius: '.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '2.5rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ color: 'var(--main-color)', fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Resetting Password...</div>
        <div style={{ color: 'var(--black)', fontSize: '1.1rem' }}>Please wait while we update your password.</div>
      </div>
    </div>
  );
}

export default ResetPassword;
