import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      (async () => {
        try {
          await login(token);
          navigate('/home');
        } catch (err) {
          toast.error('Authentication failed. Please login again.');
          navigate('/login');
        }
      })();
    } else {
      toast.error('Authentication token not provided.');
      navigate('/login');
    }
  }, [searchParams, navigate, login]);

  return <div>Authenticating... Redirecting to home.</div>;  // Loading spinner
}

export default AuthCallback;
