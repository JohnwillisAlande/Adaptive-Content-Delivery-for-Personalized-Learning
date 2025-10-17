import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import UserHeader from './UserHeader';

import Login from './Login';
import Register from './Register';
import Home from './Home';
import Profile from './Profile';
import Courses from './Courses';
import Teachers from './Teachers';
import Students from './Students';
import About from './About';
import Contact from './Contact';
import ForgotPassword from './ForgotPassword';
import { GoogleOAuthProvider } from '@react-oauth/google';
import NewPassword from './NewPassword';
import ResetPassword from './ResetPassword';
import PasswordResetSuccess from './PasswordResetSuccess';
import AuthCallback from './AuthCallback';  // Added import for GitHub callback handler
import './App.css';

import { Suspense } from 'react';
const CoursesDetail = React.lazy(() => import('./CoursesDetail'));
const CreateCourse = React.lazy(() => import('./CreateCourse'));
const ModifyCourse = React.lazy(() => import('./ModifyCourse'));


function App() {
  return (
    <>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <UserHeader />
      <div className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/create" element={<Suspense fallback={<div className='flex justify-center py-10'><span>Loading...</span></div>}><CreateCourse /></Suspense>} />
          <Route path="/courses/modify" element={<Suspense fallback={<div className='flex justify-center py-10'><span>Loading...</span></div>}><ModifyCourse /></Suspense>} />
          <Route path="/courses/:courseId" element={
            <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
              <CoursesDetail />
            </Suspense>
          } />
          <Route path="/profile" element={<Profile />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/students" element={<Students />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          {/* Password reset flow routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/new-password/:token" element={<NewPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/password-reset-success" element={<PasswordResetSuccess />} />
          {/* GitHub auth callback route */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </GoogleOAuthProvider>
    </>
  );
}

// Wrap App in BrowserRouter in index.js instead
export default App;