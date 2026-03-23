import React, { useState, useEffect, useMemo } from 'react'
import koalaImg from './assets/koala.png'
import './App.css'

function App() {
  const [view, setView] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const tg = window.Telegram?.WebApp;
  const userName = tg?.initDataUnsafe?.user?.first_name || 'Student'; // Fallback if opened in a normal browser

  useEffect(() => {
    if (tg) {
      tg.ready(); // Tells Telegram the app is loaded
      tg.expand(); // Forces the app to take up the full screen height
    }
  }, []);

  const [allWords, setAllWords] = useState([]);
  const [language, setLanguage] = useState('fr');
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH FROM DATABASE ---
  useEffect(() => {
    setLoading(true);
    fetch(`/api/words?lang=${language}`)
      .then(res => res.json())
      .then(data => {
        setAllWords(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("API Error:", err);
        setLoading(false);
      });
  }, [language]);

  // --- 2. DYNAMIC CATEGORIES ---
  const uniqueCategoryNames = [...new Set(allWords.map(w => w.category))];

  const getCategoryStyle = (catName) => {
    const styles = {
      'Food': { icon: '🍎', type: 'light-orange' },
      'School': { icon: '📚', type: 'light-blue' },
      'Magasin': { icon: '🛍️', type: 'light-grey' },
      'Work': { icon: '💼', type: 'light-green' },
      'Nature': { icon: '🌿', type: 'light-blue' },
      'Technology': { icon: '💻', type: 'light-blue' },
      'Philosophy': { icon: '🤔', type: 'light-orange' },
      'Art': { icon: '🎨', type: 'light-grey' },
      'Science': { icon: '🔬', type: 'light-green' },
    };
    return styles[catName] || { icon: '📁', type: 'light-grey' };
  };

  const categories = uniqueCategoryNames.map((cat, index) => {
    const style = getCategoryStyle(cat);
    return {
      id: index,
      title: cat,
      icon: style.icon,
      type: style.type,
      count: allWords.filter(w => w.category === cat).length
    };
  });

  // --- 3. STUDY SESSION STATE ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exerciseType, setExerciseType] = useState('flashcard');
  const [feedback, setFeedback] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const sessionWords = allWords.filter(w => w.category === selectedCategory);
  const currentWord = sessionWords[currentIndex];

  // --- NEW: SMART QUIZ OPTIONS ---
  // This automatically generates 3 wrong answers from the same category
  const quizOptions = useMemo(() => {
    if (!currentWord || !sessionWords) return [];

    // Get other words from the same category
    const others = sessionWords.filter(w => w.word !== currentWord.word);
    const shuffledOthers = others.sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.word);

    // If category has < 4 words, add safe fallbacks
    const fallbacks = language === 'fr'
      ? ['Chat', 'Chien', 'Maison', 'Voiture', 'Livre']
      : ['Cat', 'Dog', 'House', 'Car', 'Book'];

    while (shuffledOthers.length < 3) {
      const fallback = fallbacks.pop();
      if (fallback !== currentWord.word && !shuffledOthers.includes(fallback)) {
        shuffledOthers.push(fallback);
      }
    }

    // Combine correct answer with wrong answers and shuffle
    return [currentWord.word, ...shuffledOthers].sort(() => 0.5 - Math.random());
  }, [currentWord, sessionWords, language]);

  const startStudy = (cat) => {
    setSelectedCategory(cat.title);
    setCurrentIndex(0);
    setExerciseType('flashcard');
    setFeedback(null);
    setFailedAttempts(0);
    setView('study');
  };

  const handleNext = () => {
    setFeedback(null);
    setFailedAttempts(0);
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      const types = ['flashcard', 'quiz', 'typing'];
      setExerciseType(types[Math.floor(Math.random() * types.length)]);
    } else {
      setView('dashboard');
    }
  };

  // --- 4. UPDATED VALIDATION LOGIC ---
  const checkAnswer = (answer) => {
    if (!answer) return;

    // Compare answer to the WORD (French) instead of the DEFINITION (English)
    if (answer.toLowerCase().trim() === currentWord.word.toLowerCase()) {
      setFeedback('correct');
      setTimeout(handleNext, 1200);
    } else {
      setFeedback('wrong');
      setFailedAttempts(prev => prev + 1);

      setTimeout(() => {
        setFeedback(prev => prev === 'wrong' ? null : prev);
      }, 1000);
    }
  };

  if (loading) return <div className="app-container"><h2 style={{ marginTop: '50px', textAlign: 'center' }}>Loading Words...</h2></div>;

  return (
    <div className="app-container">
      {/* --- VIEW: DASHBOARD --- */}
      {view === 'dashboard' && (
        <>
          <header className="header">
            <div className="user-profile">
              <img src={koalaImg} alt="User" className="avatar" />
              <div className="welcome-text">
                <span>Learning {language === 'fr' ? 'French' : 'English'}</span>
                <strong>{userName}</strong>
              </div>
            </div>
            <button className="lang-toggle-btn" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}>
              {language === 'fr' ? '🇫🇷' : '🇬🇧'}
            </button>
          </header>

          <h2>Choose a category</h2>
          <div className="category-list">
            {categories.map(cat => (
              <div key={cat.id} className={`category-card ${cat.type}`} onClick={() => startStudy(cat)}>
                <div className="card-info">
                  <h3>{cat.title}</h3>
                  <p>{cat.count} words</p>
                </div>
                <div className="card-icon">{cat.icon}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- VIEW: STUDY SESSION --- */}
      {view === 'study' && currentWord && (
        <div className="study-view">
          <div className="study-header">
            <button className="back-btn" onClick={() => setView('dashboard')}>✕ Close</button>
            <div className="progress-text">Word {currentIndex + 1} of {sessionWords.length}</div>
          </div>

          {/* 1. FLASHCARD EXERCISE */}
          {/* I left this as Word -> Definition, as that is standard for initial learning before testing */}
          {exerciseType === 'flashcard' && (
            <div className="exercise-box card-mode" onClick={() => setFeedback('show-answer')}>
              <div className="target-word">{currentWord.word}</div>
              {feedback === 'show-answer' && <div className="answer-text">{currentWord.definition}</div>}
              <p className="hint">Tap to flip</p>
              {feedback === 'show-answer' && <button className="submit-btn" onClick={(e) => { e.stopPropagation(); handleNext() }}>Got it!</button>}
            </div>
          )}

          {/* 2. QUIZ EXERCISE */}
          {exerciseType === 'quiz' && (
            <div className="exercise-box">
              <h3>What is the word for:</h3>
              {/* Show the Definition as the prompt */}
              <div className="target-word">{currentWord.definition}</div>

              {feedback === 'show-answer' ? (
                <div className="reveal-section">
                  {/* Reveal the actual Word */}
                  <p>The answer is: <br /><strong>{currentWord.word}</strong></p>
                  <button className="submit-btn" onClick={handleNext}>Next Word</button>
                </div>
              ) : (
                <>
                  <div className="options-grid">
                    {/* Map through our newly generated smart options */}
                    {quizOptions.map(opt => (
                      <button key={opt} className="option-btn" onClick={() => checkAnswer(opt)}>{opt}</button>
                    ))}
                  </div>
                  {failedAttempts > 0 && <button className="reveal-btn" onClick={() => setFeedback('show-answer')}>Reveal Answer</button>}
                </>
              )}
            </div>
          )}

          {/* 3. TYPING EXERCISE */}
          {exerciseType === 'typing' && (
            <div className="exercise-box">
              <h3>Type the word for:</h3>
              {/* Show the Definition as the prompt */}
              <div className="target-word">{currentWord.definition}</div>

              {feedback === 'show-answer' ? (
                <div className="reveal-section">
                  {/* Reveal the actual Word */}
                  <p>The answer is: <br /><strong>{currentWord.word}</strong></p>
                  <button className="submit-btn" onClick={handleNext}>Next Word</button>
                </div>
              ) : (
                <>
                  <input
                    autoFocus
                    type="text"
                    className="typing-input"
                    placeholder="Type the word..."
                    onKeyDown={(e) => e.key === 'Enter' && checkAnswer(e.target.value)}
                  />
                  <button className="submit-btn" onClick={(e) => checkAnswer(e.target.previousSibling.value)}>Submit</button>
                  {failedAttempts > 0 && <button className="reveal-btn" onClick={() => setFeedback('show-answer')}>Reveal Answer</button>}
                </>
              )}
            </div>
          )}

          {/* Feedback Overlay */}
          {feedback === 'correct' && <div className="feedback correct">✅ Correct!</div>}
          {feedback === 'wrong' && <div className="feedback wrong">❌ Try again</div>}
        </div>
      )}

      {/* Persistent Bottom Nav */}
      {view === 'dashboard' && (
        <nav className="bottom-nav">
          <div className="nav-item active">🏠<span>Home</span></div>
          <div className="nav-item">📚<span>Words</span></div>
        </nav>
      )}
    </div>
  )
}

export default App