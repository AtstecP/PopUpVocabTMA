import React, { useState, useEffect, useMemo } from 'react'
import koalaImg from './assets/koala.png'
import './App.css'
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import Typing from './components/Typing';


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


  const [currentImage, setCurrentImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // NEW: Fetch Image automatically when the word changes
  useEffect(() => {
    if (view === 'study' && currentWord) {
      setCurrentImage(null);
      setImageLoading(true);

      // We pass both the French word (for the DB search) and English definition (for the Pixabay search)
      fetch(`/api/image?word=${encodeURIComponent(currentWord.word)}&search_term=${encodeURIComponent(currentWord.definition)}`)
        .then(res => res.json())
        .then(data => {
          if (data.image_url) {
            setCurrentImage(data.image_url);
          }
          setImageLoading(false);
        })
        .catch(() => setImageLoading(false));
    }
  }, [currentWord, view]);

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
        <div className="modern-dashboard locked-dashboard">
          
          <header className="modern-header">
            <img src={userPhoto} alt="User Profile" className="modern-avatar" />
            <h1>Hi {userName}</h1>
          </header>

          {/* STAT CARDS */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-title">Weekly goal</span>
              <div className="stat-value">
                <strong>78</strong> <span className="stat-sub">/120 min</span>
              </div>
              <div className="progress-ring"></div>
            </div>
            
            <div className="stat-card">
              <span className="stat-title">Days until TCF</span>
              <div className="stat-value">
                <strong>24</strong> <span className="stat-sub">(10.3.2026)</span>
              </div>
            </div>
          </div>

          {/* CALENDAR STRIP */}
          <div className="calendar-strip">
            {/* Hardcoded for visual mockup, we can make this dynamic later! */}
            {[
              { day: 'MON', num: '6' }, { day: 'TUE', num: '7' }, 
              { day: 'WED', num: '8', dot: true }, { day: 'THU', num: '9', active: true }, 
              { day: 'FRI', num: '10' }, { day: 'SAT', num: '11' }, { day: 'SUN', num: '12' }
            ].map((d, i) => (
              <div key={i} className={`cal-item ${d.active ? 'active' : ''}`}>
                <span className="cal-day">{d.day}</span>
                <strong className="cal-num">{d.num}</strong>
                {d.dot && <div className="cal-dot"></div>}
              </div>
            ))}
          </div>

          {/* HERO SECTION */}
          <div className="hero-section">
            {/* Swap this with your Nano Banana generation later! */}
            <img src={koalaImg} alt="Mascot" className="hero-mascot" />
            
            <h2>READY TO LEARN?</h2> 
            {/* For now, this just starts the first category. We can add a category selector later! */}
            <button className="start-now-btn" onClick={() => categories.length > 0 && startStudy(categories[0])}>
              START NOW
            </button>
          </div>

        </div>
      )}

      {/* --- VIEW: VOCABULARY --- */}
      {view === 'vocabulary' && (
        <div className="modern-dashboard scrollable-content">
          <header className="modern-header">
            <h1>Vocabulary</h1>
          </header>
          
          <p className="section-desc">Choose a topic to begin your session.</p>
          
          <div className="modern-category-list">
            {categories.map(cat => (
              <div key={cat.id} className="modern-category-card" onClick={() => startStudy(cat)}>
                <div className="card-icon-box">
                  {cat.icon}
                </div>
                <div className="card-info">
                  <h3>{cat.title}</h3>
                  <p>{cat.count} words</p>
                </div>
                <div className="card-arrow">➔</div>
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
            <Flashcard
              word={currentWord}
              image={currentImage}
              onNext={handleNext}
              speakText={speakText}
              language={language}
            />
          )}

          {/* 2. QUIZ EXERCISE */}
          {exerciseType === 'quiz' && (
            <Quiz
              word={currentWord}
              image={currentImage}
              options={quizOptions}
              checkAnswer={checkAnswer}
              speakText={speakText}
              language={language}
              feedback={feedback}
              failedAttempts={failedAttempts}
              setFeedback={setFeedback}
              onNext={handleNext}
            />
          )}

          {/* 3. TYPING EXERCISE */}
          {exerciseType === 'typing' && (
            <Typing
              word={currentWord}
              image={currentImage}
              checkAnswer={checkAnswer}
              speakText={speakText}
              language={language}
              feedback={feedback}
              failedAttempts={failedAttempts}
              setFeedback={setFeedback}
              onNext={handleNext}
            />
          )}


          {/* Feedback Overlay */}
          {feedback === 'correct' && <div className="feedback correct">✅ Correct!</div>}
          {feedback === 'wrong' && <div className="feedback wrong">❌ Try again</div>}
        </div>
      )}

      {/* Persistent Bottom Nav - 4 Items */}
      {(view === 'dashboard' || view === 'settings' || view === 'vocabulary') && (
        <nav className="bottom-nav">
          
          <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          </div>

          {/* Dummy visual tab */}
          <div className="nav-item">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
            <span>Study</span>
          </div>

          <div className={`nav-item ${view === 'vocabulary' ? 'active' : ''}`} onClick={() => setView('vocabulary')}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Vocabulary</span>
          </div>

          {/* Changed More to Settings with a Gear icon */}
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Settings</span>
          </div>

        </nav>
      )}
    </div>
  )
}

export default App