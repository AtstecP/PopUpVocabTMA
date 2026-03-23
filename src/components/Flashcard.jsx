import React, { useState } from 'react';

export default function Flashcard({ word, image, onNext, speakText, language }) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    if (!flipped) {
      speakText(word.definition, 'en');
    }
    setFlipped(!flipped);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setFlipped(false);
    onNext();
  };

  return (
    <div className="exercise-container">
      
      <div className="flashcard-scene" onClick={handleFlip}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          
          {/* FRONT */}
          <div className="card-face card-front">
            
            {/* The image is now INSIDE the card with the correct square CSS class */}
            {image && (
              <div className="embedded-image-container">
                <img src={image} alt="vocabulary visual" className="word-image" />
              </div>
            )}

            <div className="target-word-container">
              <div className="target-word">{word.word}</div>
              <button className="sound-btn" onClick={(e) => { e.stopPropagation(); speakText(word.word, language); }}>🔊</button>
            </div>
            <p className="hint">Tap to flip</p>
          </div>

          {/* BACK */}
          <div className="card-face card-back">
            <div className="target-word-container">
              <div className="answer-text">{word.definition}</div>
              <button className="sound-btn small" onClick={(e) => { e.stopPropagation(); speakText(word.definition, 'en'); }}>🔊</button>
            </div>
          </div>

        </div>
      </div>

      {flipped && (
        <button className="submit-btn" style={{ marginTop: '20px' }} onClick={handleNext}>
          Got it!
        </button>
      )}
    </div>
  );
}