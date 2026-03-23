import React, { useState, useEffect, useMemo } from 'react'
import koalaImg from './assets/koala.png'
import './App.css'

function App() {
  // --- TELEGRAM INIT ---
  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  
  const userName = tgUser?.first_name || 'Student';
  const userPhoto = tgUser?.photo_url || koalaImg;
  // Grab the unique Telegram ID (fallback to 12345 for local browser testing)
  const tgId = tgUser?.id || 12345; 

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  // --- GLOBAL STATE ---
  const [view, setView] = useState('dashboard'); // 'dashboard', 'study', 'settings'
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [allWords, setAllWords] = useState([]);
  const [language, setLanguage] = useState('fr');
  
  // Settings State
  const [autoPlaySound, setAutoPlaySound] = useState(true);
  
  // Loading States
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadingWords, setLoadingWords] = useState(true);

  // --- 1. FETCH USER SETTINGS ON LOAD ---
  useEffect(() => {
    fetch(`/api/user/${tgId}`)
      .then(res => res.json())
      .then(data => {
        setLanguage(data.language);
        setAutoPlaySound(data.autoPlaySound);
        setSettingsLoaded(true); // Unlock fetching words
      })
      .catch(err => {
        console.error("Error fetching user settings:", err);
        setSettingsLoaded(true); // Failsafe so the app still loads
      });
  }, [tgId]);

  // --- 2. FETCH WORDS (Only after settings are loaded) ---
  useEffect(() => {
    if (!settingsLoaded) return;
    
    setLoadingWords(true);
    fetch(`/api/words?lang=${language}`)
      .then(res => res.json())
      .then(data => {
        setAllWords(data);
        setLoadingWords(false);
      })
      .catch(err => {
        console.error("API Error:", err);
        setLoadingWords(false);
      });
  }, [language, settingsLoaded]);

  // --- 3. SAVE SETTINGS TO DB ---
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tg_id: tgId, language: newLang, autoPlaySound })
    });
  };

  const handleAutoPlayChange = (newVal) => {
    setAutoPlaySound(newVal);
    fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tg_id: tgId, language, autoPlaySound: newVal })
    });
  };

  // --- DYNAMIC CATEGORIES ---
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

  // --- STUDY SESSION STATE ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exerciseType, setExerciseType] = useState('flashcard');
  const [feedback, setFeedback] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const sessionWords = allWords.filter(w => w.category === selectedCategory);
  const currentWord = sessionWords[currentIndex];

  // --- TEXT TO SPEECH ENGINE ---
  const speakText = (text, langCode) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      // Default to British English instead of US for a better baseline sound
      utterance.lang = langCode === 'fr' ? 'fr-FR' : 'en-GB';
      utterance.rate = 0.9;

      // Search for premium native voices
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let selectedVoice;

        if (langCode === 'en') {
          // Look for high-quality iOS or Google voices
          selectedVoice = voices.find(v =>
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Google UK English')
          ) || voices.find(v => v.lang === 'en-GB');
        } else if (langCode === 'fr') {
          // Look for premium French voices
          selectedVoice = voices.find(v =>
            v.name.includes('Thomas') ||
            v.name.includes('Marie') ||
            v.name.includes('Google français')
          ) || voices.find(v => v.lang === 'fr-FR');
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  // SMART AUTO-PLAY: Triggers when word changes or answer is revealed
  useEffect(() => {
    if (view === 'study' && currentWord && autoPlaySound) {
      // If it's a flashcard, read the target word immediately
      if (exerciseType === 'flashcard' && feedback === null) {
        speakText(currentWord.word, language);
      }
      // If they got it correct or revealed the answer, read the target word
      if (feedback === 'correct' || feedback === 'show-answer') {
        speakText(currentWord.word, language);
      }
    }
  }, [currentIndex, view, feedback, exerciseType]);

  const quizOptions = useMemo(() => {
    if (!currentWord || !sessionWords) return [];
    const others = sessionWords.filter(w => w.word !== currentWord.word);
    const shuffledOthers = others.sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.word);

    const fallbacks = language === 'fr' ? ['Chat', 'Chien', 'Maison', 'Voiture', 'Livre'] : ['Cat', 'Dog', 'House', 'Car', 'Book'];
    while (shuffledOthers.length < 3) {
      const fallback = fallbacks.pop();
      if (fallback !== currentWord.word && !shuffledOthers.includes(fallback)) shuffledOthers.push(fallback);
    }
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

  const checkAnswer = (answer) => {
    if (!answer) return;

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

  if (loadingWords || !settingsLoaded) {
    return <div className="app-container"><h2 style={{ marginTop: '50px', textAlign: 'center' }}>Loading Words...</h2></div>;
  }

  return (
    <div className="app-container">

      {/* --- VIEW: DASHBOARD --- */}
      {view === 'dashboard' && (
        <div className="scrollable-content">
          <header className="header">
            <div className="user-profile">
              <img src={userPhoto} alt="User" className="avatar" />
              <div className="welcome-text">
                <span>Learning {language === 'fr' ? 'French' : 'English'}</span>
                <strong>{userName}</strong>
              </div>
            </div>
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
        </div>
      )}

      {/* --- VIEW: SETTINGS --- */}
      {view === 'settings' && (
        <div className="settings-view scrollable-content">
          <h2>Settings</h2>

          <div className="setting-card">
            <div className="setting-info">
              <h3>Language</h3>
              <p>Choose what you want to learn</p>
            </div>
            <select
              className="settings-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="fr">French 🇫🇷</option>
              <option value="en">English 🇬🇧</option>
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
        </div>
      )}

      {/* --- VIEW: STUDY SESSION --- */}
      {view === 'study' && currentWord && (
        <div className="study-view">
          <div className="study-header">
            <button className="back-btn" onClick={() => setView('dashboard')}>✕ Close</button>
            <div className="progress-text">Word {currentIndex + 1} of {sessionWords.length}</div>
          </div>

          {/* 1. FLASHCARD EXERCISE */}
          {exerciseType === 'flashcard' && (
            <div className="exercise-box card-mode" onClick={() => setFeedback('show-answer')}>
              <div className="target-word-container">
                <div className="target-word">{currentWord.word}</div>
                <button className="sound-btn" onClick={(e) => { e.stopPropagation(); speakText(currentWord.word, language); }}>🔊</button>
              </div>

              {feedback === 'show-answer' && (
                <div className="target-word-container answer-text-container">
                  <div className="answer-text">{currentWord.definition}</div>
                  <button className="sound-btn small" onClick={(e) => { e.stopPropagation(); speakText(currentWord.definition, 'en'); }}>🔊</button>
                </div>
              )}

              <p className="hint">Tap to flip</p>
              {feedback === 'show-answer' && <button className="submit-btn" onClick={(e) => { e.stopPropagation(); handleNext() }}>Got it!</button>}
            </div>
          )}

          {/* 2. QUIZ EXERCISE */}
          {exerciseType === 'quiz' && (
            <div className="exercise-box">
              <h3>What is the word for:</h3>
              <div className="target-word-container">
                <div className="target-word">{currentWord.definition}</div>
                <button className="sound-btn small" onClick={() => speakText(currentWord.definition, 'en')}>🔊</button>
              </div>

              {feedback === 'show-answer' ? (
                <div className="reveal-section">
                  <p>The answer is:</p>
                  <div className="target-word-container">
                    <strong>{currentWord.word}</strong>
                    <button className="sound-btn" onClick={() => speakText(currentWord.word, language)}>🔊</button>
                  </div>
                  <button className="submit-btn" onClick={handleNext}>Next Word</button>
                </div>
              ) : (
                <>
                  <div className="options-grid">
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
              <div className="target-word-container">
                <div className="target-word">{currentWord.definition}</div>
                <button className="sound-btn small" onClick={() => speakText(currentWord.definition, 'en')}>🔊</button>
              </div>

              {feedback === 'show-answer' ? (
                <div className="reveal-section">
                  <p>The answer is:</p>
                  <div className="target-word-container">
                    <strong>{currentWord.word}</strong>
                    <button className="sound-btn" onClick={() => speakText(currentWord.word, language)}>🔊</button>
                  </div>
                  <button className="submit-btn" onClick={handleNext}>Next Word</button>
                </div>
              ) : (
                <>
                  <input autoFocus type="text" className="typing-input" placeholder="Type the word..." onKeyDown={(e) => e.key === 'Enter' && checkAnswer(e.target.value)} />
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
      {(view === 'dashboard' || view === 'settings') && (
        <nav className="bottom-nav">
          <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            🏠<span>Home</span>
          </div>
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            ⚙️<span>Settings</span>
          </div>
        </nav>
      )}
    </div>
  )
}

export default App