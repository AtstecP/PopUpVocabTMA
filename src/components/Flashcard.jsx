import React, { useState, useEffect } from 'react';

export default function Flashcard({ word, image, onNext, speakText, language, autoPlay }) {
  const [flipped, setFlipped] = useState(false);

  // Auto-play the BACK side when flipped
  useEffect(() => {
    if (flipped && autoPlay) {
      // Small delay to let the animation start before speaking
      const timer = setTimeout(() => {
        speakText(word.definition, 'en-US');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [flipped, autoPlay, word.definition, speakText]);

  const handleFlip = () => {
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
            {image && (
              <div className="embedded-image-container">
                <img src={image} alt="vocabulary visual" className="word-image" />
              </div>
            )}

            <div className="target-word-container">
              <div className="target-word">{word.word}</div>
              <button className="sound-btn" onClick={(e) => { 
                e.stopPropagation(); 
                speakText(word.word, language); 
              }}>🔊</button>
            </div>
            <p className="hint">Tap to flip</p>
          </div>

          {/* BACK */}
          <div className="card-face card-back">
            <button className="sound-btn small" onClick={(e) => { 
              e.stopPropagation(); 
              speakText(word.definition, 'en-US'); 
            }}>🔊</button>
            <div className="target-word-container">
              {/* Added fontStyle normal to keep your clean look */}
              <div className="answer-text" style={{ fontStyle: 'normal' }}>
                {word.definition}
              </div>
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