import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { useAuth } from './context/AuthContext';

import { Suspense } from 'react';
const CoursesDetail = React.lazy(() => import('./CoursesDetail'));
const TeacherCourses = React.lazy(() => import('./TeacherCourses'));
const UploadMaterial = React.lazy(() => import('./UploadMaterial'));
const StudentCourses = React.lazy(() => import('./StudentCourses'));
const MaterialViewer = React.lazy(() => import('./MaterialViewer'));


function App() {
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        Loading session...
      </div>
    );
  }

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
          <Route path="/courses/:courseId" element={
            <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
              <CoursesDetail />
            </Suspense>
          } />
          <Route path="/courses/:courseId/materials/:materialId" element={
            <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
              <MaterialViewer />
            </Suspense>
          } />
          <Route path="/teacher/courses" element={
            <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
              <TeacherCourses />
            </Suspense>
          } />
          <Route path="/teacher/materials" element={
            <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
              <UploadMaterial />
            </Suspense>
          } />
          <Route path="/student/courses" element={
            <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
              <StudentCourses />
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
