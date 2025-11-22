import React, { useState } from 'react';
import { QUESTIONS } from '../constants';
import { classifyLearningStyle } from '../services/classifier';

const Assessment = ({ onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / QUESTIONS.length) * 100;

  const handleAnswer = (option) => {
    const newAnswers = { ...answers, [currentQuestion.id]: option };
    setAnswers(newAnswers);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestionIndex((prev) => prev + 1), 200);
    } else {
      const profile = classifyLearningStyle(newAnswers);
      onComplete(profile);
    }
  };

  return (
    <div className="assessment">
      <div className="assessment__intro">
        <h2>Discover Your Learning Style</h2>
        <p>
          Answer a few questions to help our AI calibrate to your brain's preferences using
          the FSLSM framework.
        </p>
      </div>

      <div className="assessment__card">
        <div className="assessment__progress">
          <div style={{ width: `${progress}%` }} />
        </div>

        <div className="assessment__question">{currentQuestion.text}</div>

        <div className="assessment__options">
          <button
            type="button"
            className={`assessment__option${answers[currentQuestion.id] === 'A' ? ' is-selected' : ''}`}
            onClick={() => handleAnswer('A')}
          >
            <span className="assessment__option-key">a)</span>
            <span>{currentQuestion.optionA}</span>
          </button>
          <button
            type="button"
            className={`assessment__option${answers[currentQuestion.id] === 'B' ? ' is-selected' : ''}`}
            onClick={() => handleAnswer('B')}
          >
            <span className="assessment__option-key">b)</span>
            <span>{currentQuestion.optionB}</span>
          </button>
        </div>

        <div className="assessment__footer">
          Question {currentQuestionIndex + 1} of {QUESTIONS.length}
        </div>
      </div>
    </div>
  );
};

export default Assessment;
