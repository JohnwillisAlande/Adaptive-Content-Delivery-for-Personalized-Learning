// frontend/src/AiTutor.js
import React from 'react';
import { useAuth } from './context/AuthContext';
import Assessment from './ai-tutor/components/Assessment';
import Dashboard from './ai-tutor/components/Dashboard';
import { INITIAL_PROFILE } from './ai-tutor/constants';
import api from './api';

const AiTutor = () => {
  const { user, setUser } = useAuth();

  if (!user) return <div>Please log in to access the AI Tutor.</div>;

  const hasAssessed = user?.learningProfile?.isAssessed;

  const handleAssessmentComplete = async (profile) => {
    try {
      await api.put('/learning-profile', { profile });
      setUser({ ...user, learningProfile: { ...profile, isAssessed: true } });
    } catch (error) {
      console.error('Failed to save profile', error);
    }
  };

  const handleRetake = () => {
    setUser({
      ...user,
      learningProfile: { ...(user.learningProfile || INITIAL_PROFILE), isAssessed: false }
    });
  };

  return (
    <div className="ai-tutor-shell">
      {!hasAssessed ? (
        <Assessment onComplete={handleAssessmentComplete} />
      ) : (
        <Dashboard
          profile={user.learningProfile || INITIAL_PROFILE}
          onRetake={handleRetake}
        />
      )}
    </div>
  );
};

export default AiTutor;
