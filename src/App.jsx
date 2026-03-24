import React, { useState, useEffect } from 'react'
import koalaImg from './assets/koala.png'
import './App.css'

// Internal Components
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import Typing from './components/Typing';

// New Split Components
import Dashboard from './components/Dashboard';
import CategoryList from './components/CategoryList';
import Settings from './components/Settings';
import BottomNav from './components/BottomNav';

function App() {
  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  const userName = tgUser?.first_name || 'Student';
  const userPhoto = tgUser?.photo_url || koalaImg;
  const tgId = tgUser?.id || 12345;

  const [view, setView] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [allWords, setAllWords] = useState([]);
  const [language, setLanguage] = useState('fr');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [autoPlaySound, setAutoPlaySound] = useState(true);
  const [activeModes, setActiveModes] = useState({ flashcard: true, quiz: true, typing: true });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadingWords, setLoadingWords] = useState(true);
  const [exerciseType, setExerciseType] = useState('flashcard');
  const [feedback, setFeedback] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [currentImage, setCurrentImage] = useState(null);

  const sessionWords = allWords.filter(w => w.category === selectedCategory);
  const currentWord = sessionWords[currentIndex];

  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }
    fetch(`/api/user/${tgId}`)
      .then(res => res.json())
      .then(data => {
        setLanguage(data.language);
        setAutoPlaySound(data.autoPlaySound);
        setSettingsLoaded(true);
      }).catch(() => setSettingsLoaded(true));
  }, [tgId]);

  useEffect(() => {
    if (!settingsLoaded) return;
    setLoadingWords(true);
    fetch(`/api/words?lang=${language}`)
      .then(res => res.json())
      .then(data => { setAllWords(data); setLoadingWords(false); })
      .catch(() => setLoadingWords(false));
  }, [language, settingsLoaded]);

  useEffect(() => {
    if (view !== 'study' || !currentWord) return;
    const others = sessionWords.filter(w => w.word !== currentWord.word).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.word);
    const fallbacks = language === 'fr' ? ['Chat', 'Chien', 'Maison'] : ['Cat', 'Dog', 'House'];
    let finalOthers = [...others];
    while (finalOthers.length < 3) {
      const fb = fallbacks.pop();
      if (fb && !finalOthers.includes(fb)) finalOthers.push(fb);
    }
    setCurrentOptions([currentWord.word, ...finalOthers].sort(() => 0.5 - Math.random()));
  }, [currentIndex, selectedCategory, view]);

  useEffect(() => {
    if (view === 'study' && currentWord) {
      setCurrentImage(null);
      fetch(`/api/image?word=${encodeURIComponent(currentWord.word)}&search_term=${encodeURIComponent(currentWord.definition)}`)
        .then(res => res.json()).then(data => setCurrentImage(data.image_url)).catch(() => {});
    }
  }, [currentWord, view]);

  const speakText = (text, langCode) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === 'fr' ? 'fr-FR' : 'en-GB';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleModeToggle = (modeName) => {
    const newModes = { ...activeModes, [modeName]: !activeModes[modeName] };
    if (!newModes.flashcard && !newModes.quiz && !newModes.typing) return;
    setActiveModes(newModes);
    saveSettings({ activeModes: newModes });
  };

  const saveSettings = (updatedFields) => {
    fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tg_id: tgId, language, autoPlaySound, activeModes, ...updatedFields })
    });
  };

  const getCategoryStyle = (catName) => {
    const styles = {
      'Food': { icon: '🍎', type: 'light-orange' },
      'Work': { icon: '💼', type: 'light-green' },
      'Travel': { icon: '✈️', type: 'light-green' },
      'Home': { icon: '🏠', type: 'light-blue' },
      'Advanced': { icon: '🚀', type: 'light-blue' },
      'Celpip Advice': { icon: '🇨🇦', type: 'light-orange' },
    };
    return styles[catName] || { icon: '📁', type: 'light-grey' };
  };

  const categories = [...new Set(allWords.map(w => w.category))].map((cat, i) => {
    const style = getCategoryStyle(cat);
    return { id: i, title: cat, icon: style.icon, type: style.type, count: allWords.filter(w => w.category === cat).length };
  });

  const startStudy = (cat) => {
    setSelectedCategory(cat.title);
    setCurrentIndex(0);
    const available = Object.keys(activeModes).filter(k => activeModes[k]);
    setExerciseType(activeModes.flashcard ? 'flashcard' : available[0]);
    setView('study');
  };

  const handleNext = () => {
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      const available = Object.keys(activeModes).filter(k => activeModes[k]);
      setExerciseType(available[Math.floor(Math.random() * available.length)]);
    } else { setView('dashboard'); }
  };

  const checkAnswer = (ans) => {
    if (ans.toLowerCase().trim() === currentWord.word.toLowerCase()) {
      setFeedback('correct'); setTimeout(handleNext, 1200);
    } else {
      setFeedback('wrong'); setFailedAttempts(a => a + 1);
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  if (loadingWords || !settingsLoaded) return <div className="app-container"><h2>Loading...</h2></div>;

  return (
    <div className="app-container">
      {view === 'dashboard' && <Dashboard userPhoto={userPhoto} userName={userName} setView={setView} koalaImg={koalaImg} />}
      
      {view === 'vocabulary' && <CategoryList categories={categories} onSelectCategory={startStudy} />}

      {view === 'settings' && (
        <Settings 
          language={language} 
          handleLanguageChange={(l) => { setLanguage(l); saveSettings({language: l}); }}
          autoPlaySound={autoPlaySound}
          handleAutoPlayChange={(v) => { setAutoPlaySound(v); saveSettings({autoPlaySound: v}); }}
          activeModes={activeModes}
          handleModeToggle={handleModeToggle}
        />
      )}

      {view === 'study' && currentWord && (
        <div className="study-view">
          <div className="study-header">
            <button className="back-btn" onClick={() => setView('dashboard')}>✕ Close</button>
            <div className="progress-text">Word {currentIndex + 1} of {sessionWords.length}</div>
          </div>
          {exerciseType === 'flashcard' && <Flashcard word={currentWord} image={currentImage} onNext={handleNext} speakText={speakText} language={language} />}
          {exerciseType === 'quiz' && <Quiz word={currentWord} image={currentImage} options={currentOptions} checkAnswer={checkAnswer} speakText={speakText} language={language} feedback={feedback} onNext={handleNext} />}
          {exerciseType === 'typing' && <Typing word={currentWord} image={currentImage} checkAnswer={checkAnswer} speakText={speakText} language={language} feedback={feedback} onNext={handleNext} />}
          {feedback === 'correct' && <div className="feedback correct">✅ Correct!</div>}
          {feedback === 'wrong' && <div className="feedback wrong">❌ Try again</div>}
        </div>
      )}

      {(view === 'dashboard' || view === 'settings' || view === 'vocabulary') && <BottomNav view={view} setView={setView} />}
    </div>
  )
}

export default App