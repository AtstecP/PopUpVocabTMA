import React from 'react';

export default function Quiz({ word, options, onAnswer }) {
  return (
    <div className="exercise-container">
      <h3>Translate: "{word.fr}"</h3>
      <div className="options-grid">
        {options.map(opt => (
          <button key={opt} className="option-btn" onClick={() => onAnswer(opt === word.en)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}