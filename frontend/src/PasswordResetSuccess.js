// Mirrors password_reset_success.php confirmation
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function PasswordResetSuccess() {
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="main-content" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--white)', borderRadius: '.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '2.5rem', maxWidth: '400px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ color: '#00a085', fontSize: '3rem', marginBottom: '1rem' }}>
          <i className="fas fa-check-circle" style={{ fontSize: '3rem' }}></i>
        </div>
        <div style={{ fontWeight: 700, fontSize: '2rem', color: 'var(--main-color)', marginBottom: '1rem' }}>Password Reset Successful!</div>
        <div style={{ color: 'var(--black)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Your password has been updated. You can now log in with your new password.
        </div>
        <Link to="/login" className="btn" style={{ background: '#00a085', color: '#fff', borderRadius: '.5rem', fontWeight: 700, fontSize: '1.1rem', width: '100%', padding: '1rem', marginTop: '.5rem', textDecoration: 'none' }}>
          Go to Login
        </Link>
        <div style={{ color: 'var(--main-color)', fontSize: '1rem', marginTop: '1rem' }}>
          You will be redirected automatically in 5 seconds.
        </div>
      </div>
    </div>
  );
}

export default PasswordResetSuccess;
