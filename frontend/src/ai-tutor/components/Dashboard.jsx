import React from 'react';
import { getStyleLabels } from '../services/classifier';
import ChatBot from './ChatBot';

const Dashboard = ({ profile, onRetake }) => {
  const labels = getStyleLabels(profile);
  const chartData = [
    { name: 'Processing', val: profile.activeReflective, label: labels.processing, low: 'Active', high: 'Reflective' },
    { name: 'Perception', val: profile.sensingIntuitive, label: labels.perception, low: 'Sensing', high: 'Intuitive' },
    { name: 'Input', val: profile.visualVerbal, label: labels.input, low: 'Visual', high: 'Verbal' },
    { name: 'Understanding', val: profile.sequentialGlobal, label: labels.understanding, low: 'Sequential', high: 'Global' }
  ];

  const renderStrategy = () => {
    const tips = [];
    if (labels.input === 'Visual') tips.push('Seek out diagrams, flowcharts, and video tutorials.');
    if (labels.input === 'Verbal') tips.push('Write summaries in your own words. Discuss concepts aloud.');
    if (labels.processing === 'Active') tips.push('Study in groups or teach a friend what you learned.');
    if (labels.processing === 'Reflective') tips.push('Review notes quietly and think through new information before acting.');
    return tips;
  };

  return (
    <div className="ai-dashboard">
      <header className="ai-dashboard__header">
        <div>
          <h1>Your Learning Dashboard</h1>
          <p>Personalised insights & adaptive tutoring</p>
        </div>
        <button type="button" onClick={onRetake}>
          Retake Assessment
        </button>
      </header>

      <div className="ai-dashboard__grid">
        <div className="ai-dashboard__column">
          <section className="ai-panel theme-locked fslsm-panel">
            <div className="fslsm-panel__head">
              <div className="fslsm-panel__badge">
                <i className="fas fa-wave-square" />
              </div>
              <div>
                <h2>FSLSM Profile</h2>
                <p>Felder-Silverman learning style balance</p>
              </div>
            </div>
            <div className="fslsm-panel__chart">
              <div className="fslsm-panel__axis">
                {chartData.map((d) => (
                  <span key={`axis-${d.name}`}>{d.name}</span>
                ))}
              </div>
              <div className="fslsm-panel__bars">
                {chartData.map((d) => {
                  const percentage = Math.min(100, Math.max(0, ((d.val + 4) / 8) * 100));
                  const isPositive = d.val >= 0;
                  return (
                    <div key={d.name} className="fslsm-panel__track">
                      <div
                        className={`fslsm-panel__fill${isPositive ? ' is-positive' : ' is-negative'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fslsm-panel__legend">
              {chartData.map((d) => (
                <div key={`legend-${d.name}`} className="fslsm-panel__legend-row">
                  <div>
                    <p>{d.name}</p>
                    <small>{d.low} vs {d.high}</small>
                  </div>
                  <span className="fslsm-panel__chip">{d.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ai-panel theme-locked">
            <h2>Recommended Strategies</h2>
            <ul>
              {renderStrategy().map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
              <li className="ai-panel__note">
                The chatbot automatically adapts to these preferences.
              </li>
            </ul>
          </section>
        </div>

        <div className="ai-dashboard__column ai-dashboard__column--chat">
          <ChatBot profile={profile} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
