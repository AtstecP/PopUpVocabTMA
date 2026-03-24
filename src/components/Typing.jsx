import React, { useState, useEffect } from 'react';

export default function Typing({ word, image, checkAnswer, speakText, language, feedback }) {
  const [input, setInput] = useState('');
  const [showReveal, setShowReveal] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setInput('');
    setShowReveal(false);
    setHasFailed(false);
  }, [word]);

  useEffect(() => {
    if (feedback === 'wrong') {
      setHasFailed(true);
    }
  }, [feedback]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    checkAnswer(input);
  };

  return (
    <div className="exercise-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 1. Definition Sound (Always English) */}
      <button className="sound-btn" onClick={() => speakText(word.definition, 'en')}>🔊</button>

      {image && (
        <div className="embedded-image-container">
          <img src={image} alt="hint" className="word-image" />
        </div>
      )}

      <h3>Type the word for:</h3>
      <div className="target-word" style={{ marginBottom: '20px' }}>{word.definition}</div>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input
          type="text"
          className="typing-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type here..."
          autoComplete="off"
          style={{ width: '100%', boxSizing: 'border-box' }} // Fixed centering
        />

        {hasFailed && !showReveal && (
          <button
            type="button"
            className="reveal-btn"
            style={{
              marginTop: '12px',
              marginBottom: '12px',
              background: 'none',
              border: 'none',
              color: 'var(--text-grey)',
              textDecoration: 'underline',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onClick={() => {
              setShowReveal(true);
              // 2. Correct Language Trigger (French for 'fr')
              speakText(word.word, language); 
            }}
          >
            Show correct answer
          </button>
        )}

        {showReveal && (
          <div className="reveal-section" style={{ textAlign: 'center', margin: '15px 0' }}>
            <p style={{ color: 'var(--text-grey)', fontSize: '0.8rem', margin: 0 }}>
              The word was:
            </p>
            <div className="answer-text" style={{
              color: '#2d2d2d',
              fontWeight: '800',
              fontSize: '1.4rem',
              fontStyle: 'normal',
              marginTop: '5px'
            }}>
              {word.word}
            </div>
          </div>
        )}

        <button type="submit" className="submit-btn" style={{ marginTop: showReveal ? '10px' : '20px', width: '100%' }}>
          Submit
        </button>
      </form>
    </div>
  );
}