import React, { useState } from 'react';

export default function Typing({ word, image, checkAnswer, speakText, language, feedback, failedAttempts, setFeedback, onNext }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      checkAnswer(input);
      setInput('');
    }
  };

  const handleSubmit = () => {
    checkAnswer(input);
    setInput('');
  };

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

        <h3>Type the word for:</h3>
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
            <input
              autoFocus
              type="text"
              className="typing-input"
              placeholder="Type the word..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="submit-btn" onClick={handleSubmit}>Submit</button>
            {failedAttempts > 0 && (
              <button className="reveal-btn" onClick={() => setFeedback('show-answer')}>Reveal Answer</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}