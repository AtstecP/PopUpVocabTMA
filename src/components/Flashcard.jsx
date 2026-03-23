import React, { useState } from 'react';

export default function Flashcard({ word, onNext }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="exercise-container">
      <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
        <div className="card-front">{word.fr}</div>
        <div className="card-back">{word.en}</div>
      </div>
      {flipped && <button className="submit-btn" onClick={() => {setFlipped(false); onNext();}}>Next Word</button>}
    </div>
  );
}