import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    if (token && userStr) {
      localStorage.setItem('token', token);
      const user = JSON.parse(decodeURIComponent(userStr));
      localStorage.setItem('user', JSON.stringify(user));  // Optional: Store user too
      const decoded = jwtDecode(token);
      console.log('Decoded JWT from GitHub callback:', decoded);
      navigate('/home');
    } else {
      console.error('No token in callback');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return <div>Authenticating... Redirecting to home.</div>;  // Loading spinner
}

export default AuthCallback;