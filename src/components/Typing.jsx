import React, { useState } from 'react';

export default function Typing({ word, onAnswer }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    onAnswer(input.toLowerCase().trim() === word.en.toLowerCase());
    setInput('');
  };

  return (
    <div className="exercise-container">
      <h3>Type the English for:</h3>
      <h2 className="target-word">{word.fr}</h2>
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type here..."
      />
      <button className="submit-btn" onClick={handleSubmit}>Submit</button>
    </div>
  );
}