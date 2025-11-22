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
import Landing from './Landing';
import AiTutor from './AiTutor';
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
const AdminCourseAnalytics = React.lazy(() => import('./AdminCourseAnalytics'));
const AdminTeacherDetail = React.lazy(() => import('./AdminTeacherDetail'));
const AdminTeacherLogs = React.lazy(() => import('./AdminTeacherLogs'));
const AdminStudentDetail = React.lazy(() => import('./AdminStudentDetail'));
const AdminStudentLogs = React.lazy(() => import('./AdminStudentLogs'));
const AdminModel = React.lazy(() => import('./AdminModel'));


function App() {
  const { initializing, isAuthenticated, user } = useAuth();

  const guard = (node) => (isAuthenticated ? node : <Landing />);
  const studentGuard = (node) =>
    isAuthenticated && user?.userType === 'Student' ? node : <Navigate to={isAuthenticated ? '/home' : '/'} replace />;

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
          <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <Landing />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/home" replace /> : <Register />} />
          <Route path="/home" element={guard(<Home />)} />
          <Route path="/courses" element={guard(<Courses />)} />
          <Route path="/ai-tutor" element={studentGuard(<AiTutor />)} />
          <Route
            path="/courses/:courseId"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <CoursesDetail />
              </Suspense>
            )}
          />
          <Route
            path="/courses/:courseId/materials/:materialId"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <MaterialViewer />
              </Suspense>
            )}
          />
          <Route
            path="/admin/courses/:courseId"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <AdminCourseAnalytics />
              </Suspense>
            )}
          />
          <Route
            path="/teacher/courses"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <TeacherCourses />
              </Suspense>
            )}
          />
          <Route
            path="/teacher/materials"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <UploadMaterial />
              </Suspense>
            )}
          />
          <Route
            path="/student/courses"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <StudentCourses />
              </Suspense>
            )}
          />
          <Route path="/profile" element={guard(<Profile />)} />
          <Route path="/teachers" element={guard(<Teachers />)} />
          <Route
            path="/admin/teachers/:teacherId"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <AdminTeacherDetail />
              </Suspense>
            )}
          />
          <Route
            path="/admin/teachers/:teacherId/logs"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <AdminTeacherLogs />
              </Suspense>
            )}
          />
          <Route
            path="/admin/model"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <AdminModel />
              </Suspense>
            )}
          />
          <Route
            path="/admin/students/:studentId"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <AdminStudentDetail />
              </Suspense>
            )}
          />
          <Route
            path="/admin/students/:studentId/logs"
            element={guard(
              <Suspense fallback={<div className="flex justify-center py-10"><span>Loading...</span></div>}>
                <AdminStudentLogs />
              </Suspense>
            )}
          />
          <Route path="/students" element={guard(<Students />)} />
          <Route path="/about" element={guard(<About />)} />
          <Route path="/contact" element={guard(<Contact />)} />
          {/* Password reset flow routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/new-password/:token" element={<NewPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/password-reset-success" element={<PasswordResetSuccess />} />
          {/* GitHub auth callback route */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={isAuthenticated ? <Navigate to="/home" replace /> : <Landing />} />
        </Routes>
      </div>
    </GoogleOAuthProvider>
    </>
  );
}

// Wrap App in BrowserRouter in index.js instead
export default App;
