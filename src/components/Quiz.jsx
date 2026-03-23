import React from 'react';

export default function Quiz({ word, image, options, checkAnswer, speakText, language, feedback, failedAttempts, setFeedback, onNext }) {
  return (
    <div className="exercise-container">
      <div className="exercise-box">
        <button className="sound-btn small" onClick={() => speakText(word.definition, 'en')}>🔊</button>

        {/* 1. Image is now INSIDE the exercise-box */}
        {image && (
          <div className="embedded-image-container">
            <img src={image} alt="vocabulary visual" className="word-image" />
          </div>
        )}

        <h3>What is the word for:</h3>
        <div className="target-word-container">
          <div className="target-word">{word.definition}</div>
        </div>

        {feedback === 'show-answer' ? (
          <div className="reveal-section">
            <p>The answer is:</p>
            <div className="target-word-container">
              <strong>{word.word}</strong>
              <button className="sound-btn" onClick={() => speakText(word.word, language)}>🔊</button>
            </div>
            <button className="submit-btn" onClick={onNext}>Next Word</button>
          </div>
        ) : (
          <>
            <div className="options-grid">
              {options.map(opt => (
                <button key={opt} className="option-btn" onClick={() => checkAnswer(opt)}>{opt}</button>
              ))}
            </div>
            {failedAttempts > 0 && (
              <button className="reveal-btn" onClick={() => setFeedback('show-answer')}>Reveal Answer</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}