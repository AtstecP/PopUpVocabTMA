import React from 'react';

export default function Settings({ 
  language, 
  handleLanguageChange, 
  autoPlaySound, 
  handleAutoPlayChange, 
  activeModes, 
  handleModeToggle 
}) {
  return (
    <div className="settings-view scrollable-content">
      <h2>Settings</h2>

      <div className="setting-card">
        <div className="setting-info">
          <h3>Language</h3>
          <p>Choose what to learn</p>
        </div>
        <select
          className="settings-select"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="fr">French</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="setting-card">
        <div className="setting-info">
          <h3>Auto-Play Pronunciation</h3>
          <p>Hear words automatically</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={autoPlaySound}
            onChange={(e) => handleAutoPlayChange(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>

      <h3 className="settings-section-title">Active Exercises</h3>
      <div className="settings-group-card">
        <div className="setting-row">
          <div className="setting-info">
            <h3>Flashcards</h3>
            <p>Learn new vocabulary</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={activeModes.flashcard} onChange={() => handleModeToggle('flashcard')} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h3>Multiple Choice</h3>
            <p>Test word recognition</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={activeModes.quiz} onChange={() => handleModeToggle('quiz')} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h3>Typing</h3>
            <p>Practice exact spelling</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={activeModes.typing} onChange={() => handleModeToggle('typing')} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>
    </div>
  );
}